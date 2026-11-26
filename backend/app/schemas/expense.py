from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field
from app.models.expense import ExpenseCategory


class ExpenseBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=200, description="Expense description/title")
    category: ExpenseCategory = Field(default=ExpenseCategory.OTHER, description="Expense category")
    amount: Decimal = Field(..., gt=0, description="Amount spent in INR")
    payment_mode: str = Field(default="CASH", description="Payment mode (CASH, UPI, BANK_TRANSFER)")
    expense_date: date = Field(default_factory=date.today, description="Date of expenditure")
    notes: str | None = Field(default=None, description="Optional receipt number or additional context")


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    title: str | None = None
    category: ExpenseCategory | None = None
    amount: Decimal | None = None
    payment_mode: str | None = None
    expense_date: date | None = None
    notes: str | None = None


class ExpenseResponse(ExpenseBase):
    id: int
    created_by_user_id: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CategoryExpenseBreakdown(BaseModel):
    category: str
    total_amount: Decimal
    count: int


class DailyExpenseSummary(BaseModel):
    report_date: date
    total_expense: Decimal
    expense_count: int
    category_breakdown: list[CategoryExpenseBreakdown] = []
    # Profit Calculation
    total_sales: Decimal = Decimal("0.00")
    estimated_profit: Decimal = Decimal("0.00") # total_sales - total_expense
