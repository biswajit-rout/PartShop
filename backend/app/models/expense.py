import enum
from datetime import date, datetime, timezone
from decimal import Decimal
from sqlalchemy import String, Numeric, Date, DateTime, Text, ForeignKey, func, Enum
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class ExpenseCategory(str, enum.Enum):
    RENT = "RENT"
    ELECTRICITY = "ELECTRICITY"
    TEA_REFRESHMENT = "TEA_REFRESHMENT"
    SALARY_WAGES = "SALARY_WAGES"
    MAINTENANCE = "MAINTENANCE"
    TRANSPORT = "TRANSPORT"
    STATIONERY = "STATIONERY"
    OTHER = "OTHER"


class Expense(Base):
    """
    Shop operational expenses ledger for daily overhead calculation
    and net profit reconciliation.
    """
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[ExpenseCategory] = mapped_column(
        Enum(ExpenseCategory), default=ExpenseCategory.OTHER, nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_mode: Mapped[str] = mapped_column(String(50), default="CASH", nullable=False)
    expense_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
