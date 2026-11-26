from decimal import Decimal
from sqlalchemy import String, Integer, Numeric, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class SparePart(Base, TimestampMixin):
    """Database table representing an auto/motorcycle spare part item."""
    __tablename__ = "spare_parts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    item_name: Mapped[str] = mapped_column(String(150), nullable=False)
    brand_name: Mapped[str] = mapped_column(
        String(100), index=True, nullable=False)  # e.g., Hero, Bajaj
    part_number: Mapped[str] = mapped_column(
        String(100), index=True, nullable=False)  # OEM Part #
    model_number: Mapped[str | None] = mapped_column(
        String(100), nullable=True)
    compatible_bikes: Mapped[str | None] = mapped_column(
        Text, nullable=True)  # e.g., "Splendor, Passion Pro"

    # Supplier / Wholesaler Mapping
    supplier_id: Mapped[int | None] = mapped_column(
        ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    supplier_name: Mapped[str | None] = mapped_column(
        String(150), nullable=True, index=True
    )
    supplier_discount: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("0.00"), nullable=False
    )  # Purchase discount % provided by supplier to the shop

    # Inventory & Shelf Locator
    quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    min_stock_alert: Mapped[int] = mapped_column(
        Integer, default=5, nullable=False)
    rack_number: Mapped[str | None] = mapped_column(
        String(50), nullable=True)  # e.g., "Rack-B, Shelf-2"

    # Pricing & Discounts (Numeric prevents floating-point penny rounding bugs)
    purchase_price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False)
    selling_price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False)
    customer_discount: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    mechanic_discount: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("0.00"), nullable=False)

    # Scannable Barcode for POS Counter
    barcode: Mapped[str | None] = mapped_column(
        String(100), unique=True, index=True, nullable=True)
    qr_code: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationship to Supplier
    supplier = relationship("Supplier", back_populates="parts")

    def __repr__(self) -> str:
        return f"<SparePart id={self.id} item='{self.item_name}' part_no='{self.part_number}' stock={self.quantity}>"
