from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.supplier import Supplier, SupplierBrandDiscount
from app.models.brand import Brand
from app.models.spare_part import SparePart
from app.schemas.supplier import (
    SupplierCreate,
    SupplierUpdate,
    SupplierResponse,
    SupplierBrandDiscountResponse,
)


class SupplierService:
    """Business logic for Wholesalers and Parts Distributors."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_suppliers(self, active_only: bool = False) -> list[SupplierResponse]:
        """List all suppliers along with brand discount matrix and mapped inventory parts count."""
        stmt = (
            select(Supplier)
            .options(
                selectinload(Supplier.brand_discounts).selectinload(SupplierBrandDiscount.brand)
            )
        )
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
            discounts_list = [
                SupplierBrandDiscountResponse(
                    id=bd.id,
                    supplier_id=bd.supplier_id,
                    brand_id=bd.brand_id,
                    brand_name=bd.brand.name if bd.brand else None,
                    discount_percentage=bd.discount_percentage,
                )
                for bd in s.brand_discounts
            ]
            resp = SupplierResponse(
                id=s.id,
                name=s.name,
                contact_person=s.contact_person,
                phone=s.phone,
                email=s.email,
                address=s.address,
                gst_number=s.gst_number,
                default_discount_percentage=s.default_discount_percentage,
                is_active=s.is_active,
                total_parts_count=count_map.get(s.id, 0),
                created_at=s.created_at,
                updated_at=s.updated_at,
                brand_discounts=discounts_list,
            )
            result.append(resp)

        return result

    async def get_supplier_by_id(self, supplier_id: int) -> Supplier:
        """Fetch single supplier or raise 404."""
        stmt = (
            select(Supplier)
            .options(
                selectinload(Supplier.brand_discounts).selectinload(SupplierBrandDiscount.brand)
            )
            .where(Supplier.id == supplier_id)
        )
        res = await self.db.execute(stmt)
        supplier = res.scalar_one_or_none()
        if not supplier:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Supplier with ID {supplier_id} not found.",
            )
        return supplier

    async def get_supplier_response(self, supplier_id: int) -> SupplierResponse:
        """Fetch single supplier response with brand discounts and part counts."""
        s = await self.get_supplier_by_id(supplier_id)
        parts_count_stmt = select(func.count(SparePart.id)).where(SparePart.supplier_id == supplier_id)
        count_res = await self.db.execute(parts_count_stmt)
        parts_count = count_res.scalar_one() or 0

        discounts_list = [
            SupplierBrandDiscountResponse(
                id=bd.id,
                supplier_id=bd.supplier_id,
                brand_id=bd.brand_id,
                brand_name=bd.brand.name if bd.brand else None,
                discount_percentage=bd.discount_percentage,
            )
            for bd in s.brand_discounts
        ]
        return SupplierResponse(
            id=s.id,
            name=s.name,
            contact_person=s.contact_person,
            phone=s.phone,
            email=s.email,
            address=s.address,
            gst_number=s.gst_number,
            default_discount_percentage=s.default_discount_percentage,
            is_active=s.is_active,
            total_parts_count=parts_count,
            created_at=s.created_at,
            updated_at=s.updated_at,
            brand_discounts=discounts_list,
        )

    async def create_supplier(self, data: SupplierCreate) -> SupplierResponse:
        """Register a new wholesaler/distributor along with optional brand discounts."""
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
        await self.db.flush()

        if data.brand_discounts:
            for bd in data.brand_discounts:
                discount_entry = SupplierBrandDiscount(
                    supplier_id=supplier.id,
                    brand_id=bd.brand_id,
                    discount_percentage=bd.discount_percentage,
                )
                self.db.add(discount_entry)

        await self.db.commit()
        return await self.get_supplier_response(supplier.id)

    async def update_supplier(self, supplier_id: int, data: SupplierUpdate) -> SupplierResponse:
        """Update supplier contact, GSTIN, default discount percentage, and brand discounts."""
        supplier = await self.get_supplier_by_id(supplier_id)

        update_dict = data.model_dump(exclude_unset=True)
        if "name" in update_dict and update_dict["name"]:
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

        # Handle Brand Discounts update
        if data.brand_discounts is not None:
            for old_bd in supplier.brand_discounts:
                await self.db.delete(old_bd)
            await self.db.flush()

            for bd in data.brand_discounts:
                new_bd = SupplierBrandDiscount(
                    supplier_id=supplier.id,
                    brand_id=bd.brand_id,
                    discount_percentage=bd.discount_percentage,
                )
                self.db.add(new_bd)

        await self.db.commit()
        return await self.get_supplier_response(supplier_id)

    async def get_effective_discount(
        self,
        supplier_id: int,
        brand_name_or_id: str | int,
    ) -> Decimal:
        """
        Calculates the effective purchase discount percentage for a part.
        Checks for a brand-specific rate in supplier_brand_discounts;
        falls back to supplier.default_discount_percentage.
        """
        supplier = await self.get_supplier_by_id(supplier_id)
        if isinstance(brand_name_or_id, int):
            for bd in supplier.brand_discounts:
                if bd.brand_id == brand_name_or_id:
                    return bd.discount_percentage
        else:
            brand_clean = str(brand_name_or_id).strip().lower()
            for bd in supplier.brand_discounts:
                if bd.brand and bd.brand.name.strip().lower() == brand_clean:
                    return bd.discount_percentage
        return supplier.default_discount_percentage

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
