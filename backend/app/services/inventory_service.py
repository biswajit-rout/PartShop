from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.spare_part import SparePart
from app.repositories.spare_part_repo import SparePartRepository
from app.schemas.spare_part import SparePartCreate, SparePartUpdate


class InventoryService:
    """
    Business Logic Layer for managing Spare Parts.
    Enforces business rules (duplicate checks, validation) before saving to PostgreSQL.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = SparePartRepository(db)

    async def create_part(self, part_data: SparePartCreate) -> SparePart:
        """Create a new spare part ensuring no duplicate part numbers or barcodes exist."""
        # Check duplicate part number
        existing_part_no = await self.repo.get_by_part_number(part_data.part_number)
        if existing_part_no:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Spare part with Part Number '{part_data.part_number}' already exists.",
            )

        # Check duplicate barcode (if barcode is provided)
        if part_data.barcode:
            existing_barcode = await self.repo.get_by_barcode(part_data.barcode)
            if existing_barcode:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Spare part with Barcode '{part_data.barcode}' already exists.",
                )

        # Create new SparePart model instance
        new_part = SparePart(**part_data.model_dump())
        return await self.repo.create(new_part)

    async def get_part_by_id(self, part_id: int) -> SparePart:
        """Fetch part by ID or raise HTTP 404."""
        part = await self.repo.get_by_id(part_id)
        if not part:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Spare part with ID {part_id} not found.",
            )
        return part

    async def get_part_by_barcode(self, barcode: str) -> SparePart:
        """Instant lookup for counter barcode scanner guns."""
        part = await self.repo.get_by_barcode(barcode)
        if not part:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No spare part found with barcode '{barcode}'.",
            )
        return part

    async def search_catalog(
        self,
        query: str | None = None,
        brand: str | None = None,
        low_stock_only: bool = False,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[SparePart], int]:
        """Search parts with filters and pagination."""
        return await self.repo.search_parts(
            query=query,
            brand=brand,
            low_stock_only=low_stock_only,
            skip=skip,
            limit=limit,
        )

    async def update_part(self, part_id: int, update_data: SparePartUpdate) -> SparePart:
        """Update part details."""
        part = await self.get_part_by_id(part_id)

        # Check barcode conflict if barcode is changing
        if update_data.barcode and update_data.barcode != part.barcode:
            existing = await self.repo.get_by_barcode(update_data.barcode)
            if existing and existing.id != part_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Barcode '{update_data.barcode}' is already assigned to another part.",
                )

        # Update only fields that were provided (exclude_unset=True)
        for field, value in update_data.model_dump(exclude_unset=True).items():
            setattr(part, field, value)

        await self.db.commit()
        await self.db.refresh(part)
        return part

    async def delete_part(self, part_id: int) -> None:
        """Delete part from inventory."""
        part = await self.get_part_by_id(part_id)
        await self.repo.delete(part)
