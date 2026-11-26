from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.supplier import Supplier
from app.models.spare_part import SparePart
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierResponse


class SupplierService:
    """Business logic for Wholesalers and Parts Distributors."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_suppliers(self, active_only: bool = False) -> list[SupplierResponse]:
        """List all suppliers along with the count of active inventory parts mapped to each."""
        stmt = select(Supplier)
        if active_only:
            stmt = stmt.where(Supplier.is_active.is_(True))
        stmt = stmt.order_by(Supplier.name.asc())

        res = await self.db.execute(stmt)
        suppliers = list(res.scalars().all())

        # Count mapped parts per supplier
        parts_count_stmt = (
            select(SparePart.supplier_id, func.count(SparePart.id).label("cnt"))
            .group_by(SparePart.supplier_id)
        )
        counts_res = await self.db.execute(parts_count_stmt)
        count_map = {row.supplier_id: row.cnt for row in counts_res.all() if row.supplier_id is not None}

        result: list[SupplierResponse] = []
        for s in suppliers:
            resp = SupplierResponse.model_validate(s)
            resp.total_parts_count = count_map.get(s.id, 0)
            result.append(resp)

        return result

    async def get_supplier_by_id(self, supplier_id: int) -> Supplier:
        """Fetch single supplier or raise 404."""
        stmt = select(Supplier).where(Supplier.id == supplier_id)
        res = await self.db.execute(stmt)
        supplier = res.scalar_one_or_none()
        if not supplier:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Supplier with ID {supplier_id} not found.",
            )
        return supplier

    async def create_supplier(self, data: SupplierCreate) -> Supplier:
        """Register a new wholesaler/distributor."""
        # Check duplicate name
        existing = await self.db.execute(select(Supplier).where(Supplier.name.ilike(data.name.strip())))
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Supplier with name '{data.name}' already exists.",
            )

        supplier = Supplier(
            name=data.name.strip(),
            contact_person=data.contact_person.strip() if data.contact_person else None,
            phone=data.phone.strip(),
            email=data.email.strip() if data.email else None,
            address=data.address.strip() if data.address else None,
            gst_number=data.gst_number.strip().upper() if data.gst_number else None,
            default_discount_percentage=data.default_discount_percentage,
            is_active=data.is_active,
        )
        self.db.add(supplier)
        await self.db.commit()
        await self.db.refresh(supplier)
        return supplier

    async def update_supplier(self, supplier_id: int, data: SupplierUpdate) -> Supplier:
        """Update supplier contact, GSTIN, or default discount percentage."""
        supplier = await self.get_supplier_by_id(supplier_id)

        update_dict = data.model_dump(exclude_unset=True)
        if "name" in update_dict and update_dict["name"]:
            # Check unique name conflict
            existing = await self.db.execute(
                select(Supplier).where(
                    Supplier.name.ilike(update_dict["name"].strip()),
                    Supplier.id != supplier_id,
                )
            )
            if existing.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Another supplier with name '{update_dict['name']}' already exists.",
                )
            supplier.name = update_dict["name"].strip()

        if "contact_person" in update_dict:
            supplier.contact_person = update_dict["contact_person"]
        if "phone" in update_dict and update_dict["phone"]:
            supplier.phone = update_dict["phone"].strip()
        if "email" in update_dict:
            supplier.email = update_dict["email"]
        if "address" in update_dict:
            supplier.address = update_dict["address"]
        if "gst_number" in update_dict:
            supplier.gst_number = update_dict["gst_number"].strip().upper() if update_dict["gst_number"] else None
        if "default_discount_percentage" in update_dict and update_dict["default_discount_percentage"] is not None:
            supplier.default_discount_percentage = update_dict["default_discount_percentage"]
        if "is_active" in update_dict and update_dict["is_active"] is not None:
            supplier.is_active = update_dict["is_active"]

        await self.db.commit()
        await self.db.refresh(supplier)
        return supplier

    async def delete_supplier(self, supplier_id: int) -> None:
        """Delete or deactivate supplier."""
        supplier = await self.get_supplier_by_id(supplier_id)
        await self.db.delete(supplier)
        await self.db.commit()

    async def get_supplier_parts(
        self,
        supplier_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[SparePart], int]:
        """Fetch all spare parts mapped to a specific supplier with pagination."""
        await self.get_supplier_by_id(supplier_id)

        count_stmt = select(func.count(SparePart.id)).where(SparePart.supplier_id == supplier_id)
        count_res = await self.db.execute(count_stmt)
        total = count_res.scalar_one() or 0

        stmt = (
            select(SparePart)
            .where(SparePart.supplier_id == supplier_id)
            .order_by(SparePart.item_name.asc())
            .offset(skip)
            .limit(limit)
        )
        parts_res = await self.db.execute(stmt)
        items = list(parts_res.scalars().all())

        return items, total
