from datetime import date
from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import UserRole
from app.schemas.reports import DailySalesSummary, TopSellingPart, LowStockItem, WeeklyTrendPoint
from app.services.report_service import ReportService
from app.api.deps import require_role

router = APIRouter(prefix="/reports", tags=["Business Reports & Analytics"])


# 1. Daily Sales Reconciliation
@router.get(
    "/daily-sales",
    response_model=DailySalesSummary,
    dependencies=[Depends(require_role(
        [UserRole.ADMIN, UserRole.STORE_MANAGER, UserRole.COUNTER_STAFF]))],
)
async def get_daily_sales(
    db: Annotated[AsyncSession, Depends(get_db)],
    target_date: date = Query(default_factory=date.today,
                              description="Date for sales settlement (YYYY-MM-DD)"),
):
    """
    Get aggregated sales settlement report for a specific date:
    - Total invoices generated.
    - Gross subtotal, discounts given, GST tax liability, and grand total.
    - Cash drawer vs. UPI / Card / Credit settlement breakdown.
    """
    service = ReportService(db)
    return await service.get_daily_sales_summary(target_date)


# 2. Top-Selling High-Velocity Parts
@router.get(
    "/top-selling",
    response_model=list[TopSellingPart],
    dependencies=[Depends(require_role(
        [UserRole.ADMIN, UserRole.STORE_MANAGER, UserRole.COUNTER_STAFF]))],
)
async def get_top_selling_parts(
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(default=10, ge=1, le=50,
                       description="Number of top items to return"),
):
    """List high-velocity spare parts ranked by units sold and generated revenue."""
    service = ReportService(db)
    return await service.get_top_selling_parts(limit=limit)


# 3. Urgent Low-Stock Alerts
@router.get(
    "/low-stock",
    response_model=list[LowStockItem],
    dependencies=[Depends(require_role(
        [UserRole.ADMIN, UserRole.STORE_MANAGER, UserRole.COUNTER_STAFF]))],
)
async def get_low_stock_report(
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List all parts where current inventory is at or below the minimum re-order threshold."""
    service = ReportService(db)
    return await service.get_low_stock_report()


# 4. Weekly Sales vs Purchase Cash Flow Trend
@router.get(
    "/weekly-trend",
    response_model=list[WeeklyTrendPoint],
    dependencies=[Depends(require_role(
        [UserRole.ADMIN, UserRole.STORE_MANAGER, UserRole.COUNTER_STAFF]))],
)
async def get_weekly_trend(
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get 7-day rolling sales vs purchase comparison for cash flow analytics."""
    service = ReportService(db)
    return await service.get_weekly_trend()
