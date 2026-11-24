from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.spare_part import SparePart
from app.repositories.base import BaseRepository


class SparePartRepository(BaseRepository[SparePart]):
    """Specialized repository for querying the spare parts catalog."""

    def __init__(self, db: AsyncSession):
        super().__init__(SparePart, db)

    async def get_by_barcode(self, barcode: str) -> SparePart | None:
        """Instant lookup by barcode scanner gun at the billing counter."""
        result = await self.db.execute(select(SparePart).where(SparePart.barcode == barcode))
        return result.scalar_one_or_none()

    async def get_by_part_number(self, part_number: str) -> SparePart | None:
        """Lookup by exact OEM part number."""
        result = await self.db.execute(select(SparePart).where(SparePart.part_number == part_number))
        return result.scalar_one_or_none()

    async def search_parts(
        self,
        query: str | None = None,
        brand: str | None = None,
        low_stock_only: bool = False,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[SparePart], int]:
        """
        Multi-field search across item name, part number, and bike model
        with optional brand filter and low-stock threshold alert.
        """
        # Base query
        stmt = select(SparePart)

        # 1. Full-text search across item name, part number, and compatible bikes
        if query:
            search_pattern = f"%{query}%"
            stmt = stmt.where(
                or_(
                    SparePart.item_name.ilike(search_pattern),
                    SparePart.part_number.ilike(search_pattern),
                    SparePart.compatible_bikes.ilike(search_pattern),
                )
            )

        # 2. Filter by brand
        if brand:
            stmt = stmt.where(SparePart.brand_name.ilike(brand))

        # 3. Filter low stock
        if low_stock_only:
            stmt = stmt.where(SparePart.quantity <= SparePart.min_stock_alert)

        # Count total matching rows (for pagination)
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one() or 0

        # Apply ordering and pagination
        stmt = stmt.order_by(SparePart.item_name.asc()
                             ).offset(skip).limit(limit)
        items_result = await self.db.execute(stmt)
        items = list(items_result.scalars().all())

        return items, total
