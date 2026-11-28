from decimal import Decimal
from sqlalchemy import String, Boolean, Numeric, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class Supplier(Base, TimestampMixin):
    """Database table representing an auto spare parts wholesaler / distributor."""
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    contact_person: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str | None] = mapped_column(String(100), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    gst_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    default_discount_percentage: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("0.00"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    parts = relationship("SparePart", back_populates="supplier")
    brand_discounts: Mapped[list["SupplierBrandDiscount"]] = relationship(
        "SupplierBrandDiscount", back_populates="supplier", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Supplier id={self.id} name='{self.name}' phone='{self.phone}'>"


class SupplierBrandDiscount(Base, TimestampMixin):
    """Configured purchase discount percentage for a specific supplier and brand."""
    __tablename__ = "supplier_brand_discounts"
    __table_args__ = (
        UniqueConstraint("supplier_id", "brand_id", name="uq_supplier_brand_discount"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    supplier_id: Mapped[int] = mapped_column(
        ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    brand_id: Mapped[int] = mapped_column(
        ForeignKey("brands.id", ondelete="CASCADE"), nullable=False, index=True
    )
    discount_percentage: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False
    )

    # Relationships
    supplier: Mapped["Supplier"] = relationship("Supplier", back_populates="brand_discounts")
    brand: Mapped["Brand"] = relationship("Brand", back_populates="supplier_discounts")

    def __repr__(self) -> str:
        return f"<SupplierBrandDiscount supplier={self.supplier_id} brand={self.brand_id} disc={self.discount_percentage}%>"
