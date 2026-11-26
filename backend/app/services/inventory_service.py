from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.spare_part import SparePart
from app.models.supplier import Supplier
from app.models.stock_movement import StockMovement, StockMovementType
from app.repositories.spare_part_repo import SparePartRepository
from app.schemas.spare_part import SparePartCreate, SparePartUpdate, SparePartRestock


class InventoryService:
    """
    Business Logic Layer for managing Spare Parts.
    Enforces business rules (duplicate checks, validation, audit movements) before saving to PostgreSQL.
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

        part_dict = part_data.model_dump()

        # If supplier_id is provided, auto-populate supplier_name and discount if missing
        if part_data.supplier_id:
            supp_res = await self.db.execute(select(Supplier).where(Supplier.id == part_data.supplier_id))
            supplier = supp_res.scalar_one_or_none()
            if supplier:
                if not part_dict.get("supplier_name"):
                    part_dict["supplier_name"] = supplier.name
                if not part_dict.get("supplier_discount"):
                    part_dict["supplier_discount"] = supplier.default_discount_percentage

        new_part = SparePart(**part_dict)
        created = await self.repo.create(new_part)

        # Record opening stock movement if initial quantity > 0
        if created.quantity > 0:
            movement = StockMovement(
                spare_part_id=created.id,
                movement_type=StockMovementType.PURCHASE_IN,
                quantity_change=created.quantity,
                balance_after=created.quantity,
                reference_type="OPENING_STOCK",
            )
            self.db.add(movement)
            await self.db.commit()

        return created

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
        supplier_id: int | None = None,
        low_stock_only: bool = False,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[SparePart], int]:
        """Search parts across name, part #, bike model, brand, supplier with filters and pagination."""
        return await self.repo.search_parts(
            query=query,
            brand=brand,
            supplier_id=supplier_id,
            low_stock_only=low_stock_only,
            skip=skip,
            limit=limit,
        )

    async def update_part(self, part_id: int, update_data: SparePartUpdate) -> SparePart:
        """Update part details, prices, or stock level with audit trail."""
        part = await self.get_part_by_id(part_id)

        # Check barcode conflict if barcode is changing
        if update_data.barcode and update_data.barcode != part.barcode:
            existing = await self.repo.get_by_barcode(update_data.barcode)
            if existing and existing.id != part_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Barcode '{update_data.barcode}' is already assigned to another part.",
                )

        old_quantity = part.quantity
        new_quantity = update_data.quantity

        update_dict = update_data.model_dump(exclude_unset=True)

        # If supplier_id was updated without explicit supplier_name, resolve it
        if "supplier_id" in update_dict and update_dict["supplier_id"]:
            if not update_dict.get("supplier_name"):
                supp_res = await self.db.execute(select(Supplier).where(Supplier.id == update_dict["supplier_id"]))
                supplier = supp_res.scalar_one_or_none()
                if supplier:
                    update_dict["supplier_name"] = supplier.name

        # Update only fields that were provided
        for field, value in update_dict.items():
            setattr(part, field, value)

        # If quantity was modified, record an audit movement
        if new_quantity is not None and new_quantity != old_quantity:
            diff = new_quantity - old_quantity
            movement = StockMovement(
                spare_part_id=part.id,
                movement_type=StockMovementType.ADJUSTMENT,
                quantity_change=diff,
                balance_after=new_quantity,
                reference_type="MANUAL_EDIT",
            )
            self.db.add(movement)

        await self.db.commit()
        await self.db.refresh(part)
        return part

    async def delete_part(self, part_id: int) -> None:
        """Delete part from inventory."""
        part = await self.get_part_by_id(part_id)
        await self.repo.delete(part)

    async def restock_part(self, part_id: int, restock_data: SparePartRestock) -> SparePart:
        """
        Fast Goods Inward / Restock action:
        Increments stock level, updates purchase cost / rack location if provided,
        and logs a PURCHASE_IN immutable stock movement audit entry.
        """
        part = await self.get_part_by_id(part_id)

        if restock_data.quantity_to_add <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quantity to add must be greater than zero.",
            )

        old_quantity = part.quantity
        new_quantity = old_quantity + restock_data.quantity_to_add
        part.quantity = new_quantity

        if restock_data.purchase_price is not None:
            part.purchase_price = restock_data.purchase_price
        if restock_data.rack_number is not None:
            part.rack_number = restock_data.rack_number

        # Create immutable audit movement entry
        movement = StockMovement(
            spare_part_id=part.id,
            movement_type=StockMovementType.PURCHASE_IN,
            quantity_change=restock_data.quantity_to_add,
            balance_after=new_quantity,
            reference_type="RESTOCK_SCAN",
        )
        self.db.add(movement)

        await self.db.commit()
        await self.db.refresh(part)
        return part
