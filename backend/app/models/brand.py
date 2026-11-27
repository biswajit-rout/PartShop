from decimal import Decimal
from sqlalchemy import String, Text, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class Brand(Base, TimestampMixin):
    """Database table representing an auto spare part brand / manufacturer."""
    __tablename__ = "brands"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Selling discount defaults
    default_customer_discount: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("0.00"), nullable=False
    )
    default_mechanic_discount: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("0.00"), nullable=False
    )

    # Relationships
    mechanic_commissions: Mapped[list["MechanicBrandCommission"]] = relationship(
        "MechanicBrandCommission", back_populates="brand", cascade="all, delete-orphan"
    )
    supplier_discounts: Mapped[list["SupplierBrandDiscount"]] = relationship(
        "SupplierBrandDiscount", back_populates="brand", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Brand id={self.id} name='{self.name}'>"
