from datetime import date
from typing import Annotated
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.expense import ExpenseCategory
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseResponse,
    DailyExpenseSummary,
)
from app.services.expense_service import ExpenseService
from app.api.deps import get_current_user, require_role

router = APIRouter(prefix="/expenses", tags=["Operational Expenses & Profit"])


@router.post(
    "",
    response_model=ExpenseResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.STORE_MANAGER, UserRole.COUNTER_STAFF]))],
)
async def create_expense(
    data: ExpenseCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Record an operational expenditure (e.g. rent, electricity, refreshments, wages)."""
    service = ExpenseService(db)
    return await service.create_expense(data, user_id=current_user.id)


@router.get(
    "",
    response_model=list[ExpenseResponse],
    dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.STORE_MANAGER, UserRole.COUNTER_STAFF]))],
)
async def list_expenses(
    db: Annotated[AsyncSession, Depends(get_db)],
    start_date: date | None = Query(default=None, description="Filter from date (YYYY-MM-DD)"),
    end_date: date | None = Query(default=None, description="Filter to date (YYYY-MM-DD)"),
    category: ExpenseCategory | None = Query(default=None, description="Filter by expense category"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    """List recorded expenditures with optional date and category filtering."""
    service = ExpenseService(db)
    return await service.list_expenses(start_date, end_date, category, limit, offset)


@router.get(
    "/daily-summary",
    response_model=DailyExpenseSummary,
    dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.STORE_MANAGER, UserRole.COUNTER_STAFF]))],
)
async def get_daily_expense_summary(
    db: Annotated[AsyncSession, Depends(get_db)],
    target_date: date = Query(default_factory=date.today, description="Target reconciliation date"),
):
    """
    Get aggregated daily expenditures, category breakdown, and net profit
    (Daily Sales Revenue minus Daily Expenses).
    """
    service = ExpenseService(db)
    return await service.get_daily_summary(target_date)


@router.delete(
    "/{expense_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.STORE_MANAGER]))],
)
async def delete_expense(
    expense_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Remove a wrongly recorded expense record (Admin/Store Manager only)."""
    service = ExpenseService(db)
    await service.delete_expense(expense_id)
