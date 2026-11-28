from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.spare_part import SparePart
from app.models.supplier import Supplier, SupplierBrandDiscount
from app.models.brand import Brand
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

        # If supplier_id is provided, auto-populate supplier_name and brand-specific purchase discount
        if part_data.supplier_id:
            supp_stmt = (
                select(Supplier)
                .options(
                    selectinload(Supplier.brand_discounts).selectinload(SupplierBrandDiscount.brand)
                )
                .where(Supplier.id == part_data.supplier_id)
            )
            supp_res = await self.db.execute(supp_stmt)
            supplier = supp_res.scalar_one_or_none()
            if supplier:
                if not part_dict.get("supplier_name"):
                    part_dict["supplier_name"] = supplier.name
                
                # Check brand-specific supplier discount
                effective_disc = supplier.default_discount_percentage
                brand_clean = (part_data.brand_name or "").strip().lower()
                for bd in supplier.brand_discounts:
                    if bd.brand and bd.brand.name.strip().lower() == brand_clean:
                        effective_disc = bd.discount_percentage
                        break
                
                if not part_dict.get("supplier_discount"):
                    part_dict["supplier_discount"] = effective_disc

                # Auto-calculate purchase price if missing and selling price is given
                if (not part_dict.get("purchase_price") or part_dict.get("purchase_price") == 0) and part_dict.get("selling_price", 0) > 0:
                    part_dict["purchase_price"] = round(
                        part_dict["selling_price"] * (Decimal("1.00") - (effective_disc / Decimal("100.00"))), 2
                    )

        # Auto-populate brand-default customer & mechanic selling discounts if not set
        if part_data.brand_name:
            brand_res = await self.db.execute(
                select(Brand).where(Brand.name.ilike(part_data.brand_name.strip()))
            )
            brand = brand_res.scalar_one_or_none()
            if brand:
                if not part_dict.get("customer_discount") and brand.default_customer_discount > 0:
                    part_dict["customer_discount"] = brand.default_customer_discount
                if not part_dict.get("mechanic_discount") and brand.default_mechanic_discount > 0:
                    part_dict["mechanic_discount"] = brand.default_mechanic_discount

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

    async def get_part_by_id(self, part_id: int, include_deleted: bool = False) -> SparePart:
        """Fetch part by ID or raise HTTP 404."""
        part = await self.repo.get_by_id(part_id)
        if not part or (not include_deleted and part.is_deleted):
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
        is_confirmed: bool | None = None,
        is_deleted: bool = False,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[SparePart], int]:
        """Search parts across name, part #, bike model, brand, supplier with filters and pagination."""
        return await self.repo.search_parts(
            query=query,
            brand=brand,
            supplier_id=supplier_id,
            low_stock_only=low_stock_only,
            is_confirmed=is_confirmed,
            is_deleted=is_deleted,
            skip=skip,
            limit=limit,
        )

    async def confirm_parts(self, part_ids: list[int]) -> tuple[int, list[int]]:
        """
        Batch confirm imported or unconfirmed spare parts.
        Transitions parts to confirmed catalog status, making them fully active for counter sales.
        """
        if not part_ids:
            return 0, []

        stmt = select(SparePart).where(SparePart.id.in_(part_ids))
        res = await self.db.execute(stmt)
        parts = list(res.scalars().all())

        confirmed_ids: list[int] = []
        for part in parts:
            part.is_confirmed = True
            confirmed_ids.append(part.id)

        await self.db.commit()
        return len(confirmed_ids), confirmed_ids

    async def confirm_single_part(self, part_id: int, rack_number: str | None = None) -> SparePart:
        """
        Confirm an individual spare part, optionally updating its rack location before confirmation.
        """
        part = await self.get_part_by_id(part_id)
        if rack_number is not None and rack_number.strip():
            part.rack_number = rack_number.strip()
        part.is_confirmed = True
        await self.db.commit()
        await self.db.refresh(part)
        return part

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
        """Soft delete part from active inventory, preserving historical sales audit and moving to recycle bin."""
        part = await self.get_part_by_id(part_id)
        part.is_deleted = True
        part.deleted_at = func.now()
        await self.db.commit()

    async def delete_parts_batch(self, part_ids: list[int]) -> tuple[int, list[int]]:
        """Batch soft-delete parts into recycle bin."""
        if not part_ids:
            return 0, []
        stmt = select(SparePart).where(SparePart.id.in_(part_ids), SparePart.is_deleted == False)
        res = await self.db.execute(stmt)
        parts = list(res.scalars().all())
        deleted_ids = []
        for p in parts:
            p.is_deleted = True
            p.deleted_at = func.now()
            deleted_ids.append(p.id)
        await self.db.commit()
        return len(deleted_ids), deleted_ids

    async def restore_part(self, part_id: int) -> SparePart:
        """Restore a soft-deleted part back to active inventory."""
        part = await self.get_part_by_id(part_id, include_deleted=True)
        part.is_deleted = False
        part.deleted_at = None
        await self.db.commit()
        await self.db.refresh(part)
        return part

    async def restore_parts_batch(self, part_ids: list[int]) -> tuple[int, list[int]]:
        """Batch restore soft-deleted parts back to inventory."""
        if not part_ids:
            return 0, []
        stmt = select(SparePart).where(SparePart.id.in_(part_ids), SparePart.is_deleted == True)
        res = await self.db.execute(stmt)
        parts = list(res.scalars().all())
        restored_ids = []
        for p in parts:
            p.is_deleted = False
            p.deleted_at = None
            restored_ids.append(p.id)
        await self.db.commit()
        return len(restored_ids), restored_ids

    async def restock_part(self, part_id: int, restock_data: SparePartRestock) -> SparePart:
        """
        Fast Goods Inward / Restock action:
        Increments stock level, updates purchase cost / rack location if provided,
        and logs a PURCHASE_IN immutable stock movement audit entry.
        """
        part = await self.get_part_by_id(part_id)

        if part.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot restock deleted part '{part.item_name}'. Restore it from the Recycle Bin first.",
            )

        if not part.is_confirmed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot restock unconfirmed part '{part.item_name}'. Please verify and confirm this item in Inventory before restocking.",
            )

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
