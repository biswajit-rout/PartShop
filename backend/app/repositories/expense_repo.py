from datetime import date
from decimal import Decimal
from typing import Sequence
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.expense import Expense, ExpenseCategory


class ExpenseRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, expense: Expense) -> Expense:
        self.db.add(expense)
        await self.db.commit()
        await self.db.refresh(expense)
        return expense

    async def get_by_id(self, expense_id: int) -> Expense | None:
        stmt = select(Expense).where(Expense.id == expense_id)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def list_expenses(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
        category: ExpenseCategory | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Sequence[Expense]:
        stmt = select(Expense)
        conditions = []
        if start_date:
            conditions.append(Expense.expense_date >= start_date)
        if end_date:
            conditions.append(Expense.expense_date <= end_date)
        if category:
            conditions.append(Expense.category == category)

        if conditions:
            stmt = stmt.where(and_(*conditions))

        stmt = stmt.order_by(Expense.expense_date.desc(), Expense.id.desc()).limit(limit).offset(offset)
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def delete(self, expense: Expense) -> None:
        await self.db.delete(expense)
        await self.db.commit()

    async def get_daily_total(self, target_date: date) -> tuple[Decimal, int]:
        stmt = select(
            func.coalesce(func.sum(Expense.amount), Decimal("0.00")).label("total_amt"),
            func.count(Expense.id).label("cnt"),
        ).where(Expense.expense_date == target_date)
        res = await self.db.execute(stmt)
        row = res.one()
        return row.total_amt, row.cnt

    async def get_daily_category_breakdown(self, target_date: date) -> Sequence[tuple[ExpenseCategory, Decimal, int]]:
        stmt = (
            select(
                Expense.category,
                func.coalesce(func.sum(Expense.amount), Decimal("0.00")).label("total_amt"),
                func.count(Expense.id).label("cnt"),
            )
            .where(Expense.expense_date == target_date)
            .group_by(Expense.category)
            .order_by(func.sum(Expense.amount).desc())
        )
        res = await self.db.execute(stmt)
        return res.all()
