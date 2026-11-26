from sqlalchemy import select, or_, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.spare_part import SparePart
from app.repositories.base import BaseRepository

# Domain-specific synonym dictionary for automotive spare parts catalogs.
# Maps common technician queries to the abbreviations and stems used in OEM part descriptions.
AUTOMOTIVE_SYNONYMS: dict[str, list[str]] = {
    "filter": ["filter", "filt"],
    "filters": ["filter", "filt"],
    "filt": ["filter", "filt"],
    "brake": ["brake", "brk", "pad", "shoe"],
    "brakes": ["brake", "brk", "pad", "shoe"],
    "brk": ["brake", "brk", "pad", "shoe"],
    "pad": ["pad", "brake", "brk"],
    "pads": ["pad", "pads", "brake", "brk"],
    "shoe": ["shoe", "shoes", "brake", "brk"],
    "shoes": ["shoe", "shoes", "brake", "brk"],
    "clutch": ["clutch", "clt"],
    "clt": ["clutch", "clt"],
    "shock": ["shock", "cushion", "cush", "absorber", "damper"],
    "cushion": ["cushion", "cush", "shock", "absorber", "damper"],
    "cush": ["cushion", "cush", "shock"],
    "absorber": ["absorber", "shock", "cushion", "damper"],
    "damper": ["damper", "shock", "cushion"],
    "bearing": ["bearing", "brg"],
    "brg": ["bearing", "brg"],
    "cable": ["cable", "cbl"],
    "cbl": ["cable", "cbl"],
    "chain": ["chain", "chn"],
    "chn": ["chain", "chn"],
    "spark": ["spark", "spk", "plug"],
    "plug": ["plug", "spark", "spk"],
    "spk": ["spark", "spk", "plug"],
    "gasket": ["gasket", "gskt"],
    "gskt": ["gasket", "gskt"],
    "switch": ["switch", "sw"],
    "sw": ["switch", "sw"],
    "cylinder": ["cylinder", "cyl"],
    "cyl": ["cylinder", "cyl"],
    "element": ["element", "elem", "elt"],
    "elem": ["element", "elem", "elt"],
    "elt": ["element", "elem", "elt"],
    "assembly": ["assembly", "assy", "asy"],
    "assy": ["assembly", "assy", "asy"],
    "lever": ["lever", "lvr"],
    "lvr": ["lever", "lvr"],
    "indicator": ["indicator", "ind", "winker"],
    "ind": ["indicator", "ind", "winker"],
    "winker": ["winker", "indicator", "ind"],
    "headlight": ["headlight", "headlamp", "hl"],
    "headlamp": ["headlight", "headlamp", "hl"],
    "mirror": ["mirror", "mrr", "rearview"],
    "mrr": ["mirror", "mrr", "rearview"],
    "oil": ["oil", "lubricant", "lub"],
}


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
        supplier_id: int | None = None,
        low_stock_only: bool = False,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[SparePart], int]:
        """
        Tokenized multi-attribute search across item name, part number, compatible bikes,
        model number, brand name, supplier name, and barcode with synonym expansion and low-stock filter.
        
        Requires all tokens in the query to match across any field (AND-joined tokens).
        """
        stmt = select(SparePart)

        # Full-text multi-token multi-field search with automotive synonym expansion
        if query and query.strip():
            raw_tokens = [t.strip() for t in query.strip().split() if t.strip()]
            for raw_token in raw_tokens:
                token_clean = raw_token.replace("%", "").replace("_", "").lower()
                if not token_clean:
                    continue
                patterns = AUTOMOTIVE_SYNONYMS.get(token_clean, [token_clean])
                clauses = []
                for p in patterns:
                    like_pat = f"%{p}%"
                    clauses.extend([
                        SparePart.item_name.ilike(like_pat),
                        SparePart.part_number.ilike(like_pat),
                        SparePart.compatible_bikes.ilike(like_pat),
                        SparePart.model_number.ilike(like_pat),
                        SparePart.brand_name.ilike(like_pat),
                        SparePart.supplier_name.ilike(like_pat),
                        SparePart.barcode.ilike(like_pat),
                    ])
                stmt = stmt.where(or_(*clauses))

        # Filter by brand
        if brand:
            stmt = stmt.where(SparePart.brand_name.ilike(brand))

        # Filter by supplier
        if supplier_id is not None:
            stmt = stmt.where(SparePart.supplier_id == supplier_id)

        # Filter low stock
        if low_stock_only:
            stmt = stmt.where(SparePart.quantity <= SparePart.min_stock_alert)

        # Count total matching rows
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one() or 0

        # Apply ordering and pagination
        stmt = stmt.order_by(SparePart.item_name.asc()).offset(skip).limit(limit)
        items_result = await self.db.execute(stmt)
        items = list(items_result.scalars().all())

        return items, total
