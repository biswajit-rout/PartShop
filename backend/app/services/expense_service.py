from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import Sequence
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.expense import Expense, ExpenseCategory
from app.models.sale import Sale
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse,
    DailyExpenseSummary,
    CategoryExpenseBreakdown,
)
from app.repositories.expense_repo import ExpenseRepository


class ExpenseService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ExpenseRepository(db)

    async def create_expense(self, data: ExpenseCreate, user_id: int | None = None) -> ExpenseResponse:
        expense = Expense(
            title=data.title.strip(),
            category=data.category,
            amount=data.amount,
            payment_mode=data.payment_mode.strip().upper(),
            expense_date=data.expense_date,
            notes=data.notes.strip() if data.notes else None,
            created_by_user_id=user_id,
        )
        saved = await self.repo.create(expense)
        return ExpenseResponse.model_validate(saved)

    async def list_expenses(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
        category: ExpenseCategory | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[ExpenseResponse]:
        items = await self.repo.list_expenses(start_date, end_date, category, limit, offset)
        return [ExpenseResponse.model_validate(item) for item in items]

    async def delete_expense(self, expense_id: int) -> None:
        expense = await self.repo.get_by_id(expense_id)
        if not expense:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Expense with id {expense_id} not found"
            )
        await self.repo.delete(expense)

    async def get_daily_summary(self, target_date: date) -> DailyExpenseSummary:
        total_exp, count = await self.repo.get_daily_total(target_date)
        cat_rows = await self.repo.get_daily_category_breakdown(target_date)
        breakdowns = [
            CategoryExpenseBreakdown(
                category=cat.value if hasattr(cat, "value") else str(cat),
                total_amount=amt,
                count=cnt,
            )
            for cat, amt, cnt in cat_rows
        ]

        # Calculate today's sales to determine Net Daily Profit
        start_dt = datetime.combine(target_date, time.min).replace(tzinfo=timezone.utc)
        end_dt = datetime.combine(target_date, time.max).replace(tzinfo=timezone.utc)
        sales_stmt = select(func.coalesce(func.sum(Sale.grand_total), Decimal("0.00"))).where(
            Sale.created_at >= start_dt, Sale.created_at <= end_dt
        )
        sales_res = await self.db.execute(sales_stmt)
        total_sales = sales_res.scalar() or Decimal("0.00")

        return DailyExpenseSummary(
            report_date=target_date,
            total_expense=total_exp,
            expense_count=count,
            category_breakdown=breakdowns,
            total_sales=total_sales,
            estimated_profit=total_sales - total_exp,
        )
