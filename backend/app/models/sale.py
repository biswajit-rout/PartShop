import enum
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from sqlalchemy import String, Integer, Numeric, ForeignKey, Enum, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.mechanic import Mechanic
    from app.models.spare_part import SparePart


class PaymentMethod(str, enum.Enum):
    """Payment channels supported at the counter."""
    CASH = "CASH"
    CARD = "CARD"
    UPI = "UPI"
    CREDIT = "CREDIT"


class SaleStatus(str, enum.Enum):
    """Lifecycle status of customer counter sales."""
    COMPLETED = "COMPLETED"
    VOIDED = "VOIDED"


class Sale(Base, TimestampMixin):
    """Customer sales invoice record."""
    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    invoice_number: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False)

    customer_name: Mapped[str | None] = mapped_column(
        String(100), nullable=True)
    customer_phone: Mapped[str | None] = mapped_column(
        String(20), nullable=True)

    # Staff member who handled this checkout
    cashier_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False)

    # Optional Mechanic Partner who referred / took parts for customer
    mechanic_id: Mapped[int | None] = mapped_column(
        ForeignKey("mechanics.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Financial Breakdown
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("0.00"), nullable=False)  # GST
    grand_total: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False)

    payment_method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod), default=PaymentMethod.CASH, nullable=False
    )

    # Invoice Cancellation / Return State
    status: Mapped[SaleStatus] = mapped_column(
        Enum(SaleStatus), default=SaleStatus.COMPLETED, server_default="COMPLETED", nullable=False, index=True
    )
    cancellation_reason: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    items: Mapped[list["SaleItem"]] = relationship(
        "SaleItem", back_populates="sale", cascade="all, delete-orphan")
    mechanic: Mapped["Mechanic | None"] = relationship("Mechanic", back_populates="sales")


class SaleItem(Base):
    """Individual line item sold within an invoice."""
    __tablename__ = "sale_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    sale_id: Mapped[int] = mapped_column(
        ForeignKey("sales.id"), nullable=False)
    spare_part_id: Mapped[int] = mapped_column(
        ForeignKey("spare_parts.id"), nullable=False)

    # Optional mechanic attribution & commission breakdown per line item
    mechanic_id: Mapped[int | None] = mapped_column(
        ForeignKey("mechanics.id", ondelete="SET NULL"), nullable=True, index=True
    )
    commission_percentage: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("0.00"), nullable=False
    )
    commission_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("0.00"), nullable=False
    )

    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    discount_percent: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    total_price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False)

    # Relationships
    sale: Mapped["Sale"] = relationship("Sale", back_populates="items")
    spare_part: Mapped["SparePart"] = relationship("SparePart")
