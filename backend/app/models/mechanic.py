from decimal import Decimal
from sqlalchemy import String, Text, Numeric, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class Mechanic(Base, TimestampMixin):
    """Database table representing an auto mechanic / garage partner."""
    __tablename__ = "mechanics"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    garage_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Default fallback commission % if a brand-specific rate is not configured
    default_commission_percentage: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("5.00"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    brand_commissions: Mapped[list["MechanicBrandCommission"]] = relationship(
        "MechanicBrandCommission", back_populates="mechanic", cascade="all, delete-orphan"
    )
    sales: Mapped[list["Sale"]] = relationship("Sale", back_populates="mechanic")

    def __repr__(self) -> str:
        return f"<Mechanic id={self.id} name='{self.name}' garage='{self.garage_name}'>"


class MechanicBrandCommission(Base, TimestampMixin):
    """Configured commission percentage for a specific mechanic and brand."""
    __tablename__ = "mechanic_brand_commissions"
    __table_args__ = (
        UniqueConstraint("mechanic_id", "brand_id", name="uq_mechanic_brand_commission"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    mechanic_id: Mapped[int] = mapped_column(
        ForeignKey("mechanics.id", ondelete="CASCADE"), nullable=False, index=True
    )
    brand_id: Mapped[int] = mapped_column(
        ForeignKey("brands.id", ondelete="CASCADE"), nullable=False, index=True
    )
    commission_percentage: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False
    )

    # Relationships
    mechanic: Mapped["Mechanic"] = relationship("Mechanic", back_populates="brand_commissions")
    brand: Mapped["Brand"] = relationship("Brand", back_populates="mechanic_commissions")

    def __repr__(self) -> str:
        return f"<MechanicBrandCommission mech={self.mechanic_id} brand={self.brand_id} pct={self.commission_percentage}%>"
