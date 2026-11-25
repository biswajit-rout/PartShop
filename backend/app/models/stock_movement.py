import enum
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, ForeignKey, Enum, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class StockMovementType(str, enum.Enum):
    SALE_OUT = "SALE_OUT"          # Sold at counter
    PURCHASE_IN = "PURCHASE_IN"    # Received from supplier
    RETURN_IN = "RETURN_IN"        # Customer return
    ADJUSTMENT = "ADJUSTMENT"      # Manual count adjustment / damage


class StockMovement(Base):
    """Immutable audit trail for every inventory change."""
    __tablename__ = "stock_movements"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    spare_part_id: Mapped[int] = mapped_column(
        ForeignKey("spare_parts.id"), nullable=False)

    movement_type: Mapped[StockMovementType] = mapped_column(
        Enum(StockMovementType), nullable=False)
    quantity_change: Mapped[int] = mapped_column(
        Integer, nullable=False)  # -2 for sale, +10 for purchase
    balance_after: Mapped[int] = mapped_column(
        Integer, nullable=False)    # New stock level after change

    reference_type: Mapped[str | None] = mapped_column(
        String(50), nullable=True)  # e.g., "SALE"
    reference_id: Mapped[int | None] = mapped_column(
        Integer, nullable=True)        # Invoice ID

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
