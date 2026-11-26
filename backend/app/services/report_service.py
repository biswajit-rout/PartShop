from datetime import date, datetime, time, timezone, timedelta
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sale import Sale, SaleItem
from app.models.spare_part import SparePart
from app.models.stock_movement import StockMovement, StockMovementType
from app.schemas.reports import (
    DailySalesSummary,
    PaymentBreakdown,
    TopSellingPart,
    LowStockItem,
    WeeklyTrendPoint,
)


class ReportService:
    """
    Business intelligence service for generating daily sales reconciliation,
    item velocity analytics, and stock health audits.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_daily_sales_summary(self, target_date: date) -> DailySalesSummary:
        """Aggregates sales metrics and payment channel totals for a specific date."""
        start_datetime = datetime.combine(
            target_date, time.min).replace(tzinfo=timezone.utc)
        end_datetime = datetime.combine(
            target_date, time.max).replace(tzinfo=timezone.utc)

        # 1. Aggregate day totals
        summary_stmt = select(
            func.count(Sale.id).label("total_invoices"),
            func.coalesce(func.sum(Sale.subtotal), Decimal(
                "0.00")).label("total_subtotal"),
            func.coalesce(func.sum(Sale.discount_amount),
                          Decimal("0.00")).label("total_discount"),
            func.coalesce(func.sum(Sale.tax_amount),
                          Decimal("0.00")).label("total_tax"),
            func.coalesce(func.sum(Sale.grand_total),
                          Decimal("0.00")).label("grand_total"),
        ).where(Sale.created_at >= start_datetime, Sale.created_at <= end_datetime)

        summary_res = await self.db.execute(summary_stmt)
        row = summary_res.one()

        # 2. Group by payment channel (CASH, CARD, UPI, CREDIT)
        payment_stmt = (
            select(
                Sale.payment_method,
                func.count(Sale.id).label("count"),
                func.coalesce(func.sum(Sale.grand_total),
                              Decimal("0.00")).label("total_amount"),
            )
            .where(Sale.created_at >= start_datetime, Sale.created_at <= end_datetime)
            .group_by(Sale.payment_method)
        )

        payment_res = await self.db.execute(payment_stmt)
        breakdowns = [
            PaymentBreakdown(
                payment_method=r.payment_method.value if hasattr(
                    r.payment_method, "value") else str(r.payment_method),
                count=r.count,
                total_amount=r.total_amount,
            )
            for r in payment_res.all()
        ]

        return DailySalesSummary(
            report_date=target_date,
            total_invoices=row.total_invoices or 0,
            total_subtotal=row.total_subtotal,
            total_discount=row.total_discount,
            total_tax=row.total_tax,
            grand_total=row.grand_total,
            payments_breakdown=breakdowns,
        )

    async def get_top_selling_parts(self, limit: int = 10) -> list[TopSellingPart]:
        """Calculates top-selling spare parts ordered by total units sold."""
        stmt = (
            select(
                SparePart.id.label("spare_part_id"),
                SparePart.item_name,
                SparePart.part_number,
                SparePart.brand_name,
                func.sum(SaleItem.quantity).label("units_sold"),
                func.coalesce(func.sum(SaleItem.total_price),
                              Decimal("0.00")).label("total_revenue"),
            )
            .join(SaleItem, SaleItem.spare_part_id == SparePart.id)
            .group_by(SparePart.id)
            .order_by(func.sum(SaleItem.quantity).desc())
            .limit(limit)
        )

        result = await self.db.execute(stmt)
        return [
            TopSellingPart(
                spare_part_id=r.spare_part_id,
                item_name=r.item_name,
                part_number=r.part_number,
                brand_name=r.brand_name,
                units_sold=r.units_sold,
                total_revenue=r.total_revenue,
            )
            for r in result.all()
        ]

    async def get_low_stock_report(self) -> list[LowStockItem]:
        """Finds all catalog items where available stock is <= min_stock_alert threshold."""
        stmt = (
            select(SparePart)
            .where(SparePart.quantity <= SparePart.min_stock_alert)
            .order_by(SparePart.quantity.asc())
        )
        result = await self.db.execute(stmt)
        parts = result.scalars().all()

        return [
            LowStockItem(
                id=p.id,
                item_name=p.item_name,
                brand_name=p.brand_name,
                part_number=p.part_number,
                rack_number=p.rack_number,
                quantity=p.quantity,
                min_stock_alert=p.min_stock_alert,
            )
            for p in parts
        ]

    async def get_weekly_trend(self) -> list[WeeklyTrendPoint]:
        """Calculates 7-day rolling sales vs purchase trend for financial flow charts."""
        today = date.today()
        start_date = today - timedelta(days=6)
        start_dt = datetime.combine(start_date, time.min).replace(tzinfo=timezone.utc)

        # 1. Query sales grouped by date
        sales_stmt = (
            select(
                func.date(Sale.created_at).label("sale_date"),
                func.coalesce(func.sum(Sale.grand_total), Decimal("0.00")).label("day_sales"),
            )
            .where(Sale.created_at >= start_dt)
            .group_by(func.date(Sale.created_at))
        )
        sales_res = await self.db.execute(sales_stmt)
        # Note: func.date in asyncpg/Postgres returns datetime.date or str
        sales_by_date = {}
        for r in sales_res.all():
            d_key = r.sale_date if isinstance(r.sale_date, date) else date.fromisoformat(str(r.sale_date))
            sales_by_date[d_key] = r.day_sales

        # 2. Query purchases from StockMovement (PURCHASE_IN) grouped by date
        purch_stmt = (
            select(
                func.date(StockMovement.created_at).label("purch_date"),
                func.coalesce(
                    func.sum(StockMovement.quantity_change * SparePart.purchase_price),
                    Decimal("0.00")
                ).label("day_purch"),
            )
            .join(SparePart, SparePart.id == StockMovement.spare_part_id)
            .where(
                StockMovement.created_at >= start_dt,
                StockMovement.movement_type == StockMovementType.PURCHASE_IN,
            )
            .group_by(func.date(StockMovement.created_at))
        )
        purch_res = await self.db.execute(purch_stmt)
        purch_by_date = {}
        for r in purch_res.all():
            d_key = r.purch_date if isinstance(r.purch_date, date) else date.fromisoformat(str(r.purch_date))
            purch_by_date[d_key] = r.day_purch

        # 3. Build ordered 7-day array
        trend: list[WeeklyTrendPoint] = []
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        for offset in range(7):
            cur_date = start_date + timedelta(days=offset)
            cur_sales = sales_by_date.get(cur_date, Decimal("0.00"))
            cur_purch = purch_by_date.get(cur_date, Decimal("0.00"))
            trend.append(
                WeeklyTrendPoint(
                    day=day_names[cur_date.weekday()],
                    date=cur_date,
                    sales=cur_sales,
                    purchase=cur_purch,
                )
            )
        return trend
