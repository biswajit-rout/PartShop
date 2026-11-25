from datetime import date, datetime, time, timezone
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sale import Sale, SaleItem
from app.models.spare_part import SparePart
from app.schemas.reports import (
    DailySalesSummary,
    PaymentBreakdown,
    TopSellingPart,
    LowStockItem,
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
