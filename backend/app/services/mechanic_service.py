from datetime import date
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mechanic import Mechanic, MechanicBrandCommission
from app.models.brand import Brand
from app.models.sale import Sale, SaleItem
from app.models.spare_part import SparePart
from app.schemas.mechanic import (
    MechanicCreate,
    MechanicUpdate,
    MechanicResponse,
    MechanicBrandCommissionResponse,
    MechanicItemDetailResponse,
    MechanicSummaryResponse,
)


class MechanicService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, active_only: bool = False) -> list[MechanicResponse]:
        stmt = select(Mechanic).options(
            selectinload(Mechanic.brand_commissions).selectinload(MechanicBrandCommission.brand)
        )
        if active_only:
            stmt = stmt.where(Mechanic.is_active == True)
        stmt = stmt.order_by(Mechanic.name.asc())

        result = await self.db.execute(stmt)
        mechanics = list(result.scalars().all())

        responses = []
        for m in mechanics:
            comm_list = [
                MechanicBrandCommissionResponse(
                    id=bc.id,
                    mechanic_id=bc.mechanic_id,
                    brand_id=bc.brand_id,
                    brand_name=bc.brand.name if bc.brand else None,
                    commission_percentage=bc.commission_percentage,
                )
                for bc in m.brand_commissions
            ]
            responses.append(
                MechanicResponse(
                    id=m.id,
                    name=m.name,
                    phone=m.phone,
                    garage_name=m.garage_name,
                    address=m.address,
                    default_commission_percentage=m.default_commission_percentage,
                    is_active=m.is_active,
                    created_at=m.created_at,
                    updated_at=m.updated_at,
                    brand_commissions=comm_list,
                )
            )
        return responses

    async def get_by_id(self, mechanic_id: int) -> Mechanic:
        stmt = (
            select(Mechanic)
            .options(
                selectinload(Mechanic.brand_commissions).selectinload(MechanicBrandCommission.brand)
            )
            .where(Mechanic.id == mechanic_id)
        )
        result = await self.db.execute(stmt)
        mech = result.scalar_one_or_none()
        if not mech:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Mechanic with ID {mechanic_id} not found."
            )
        return mech

    async def get_response_by_id(self, mechanic_id: int) -> MechanicResponse:
        m = await self.get_by_id(mechanic_id)
        comm_list = [
            MechanicBrandCommissionResponse(
                id=bc.id,
                mechanic_id=bc.mechanic_id,
                brand_id=bc.brand_id,
                brand_name=bc.brand.name if bc.brand else None,
                commission_percentage=bc.commission_percentage,
            )
            for bc in m.brand_commissions
        ]
        return MechanicResponse(
            id=m.id,
            name=m.name,
            phone=m.phone,
            garage_name=m.garage_name,
            address=m.address,
            default_commission_percentage=m.default_commission_percentage,
            is_active=m.is_active,
            created_at=m.created_at,
            updated_at=m.updated_at,
            brand_commissions=comm_list,
        )

    async def create_mechanic(self, data: MechanicCreate) -> MechanicResponse:
        existing = await self.db.execute(
            select(Mechanic).where(Mechanic.phone == data.phone.strip())
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mechanic with phone '{data.phone}' already exists."
            )

        new_mech = Mechanic(
            name=data.name.strip(),
            phone=data.phone.strip(),
            garage_name=data.garage_name.strip() if data.garage_name else None,
            address=data.address.strip() if data.address else None,
            default_commission_percentage=data.default_commission_percentage,
            is_active=True,
        )
        self.db.add(new_mech)
        await self.db.flush()

        for comm in data.commissions:
            bc = MechanicBrandCommission(
                mechanic_id=new_mech.id,
                brand_id=comm.brand_id,
                commission_percentage=comm.commission_percentage,
            )
            self.db.add(bc)

        await self.db.commit()
        return await self.get_response_by_id(new_mech.id)

    async def update_mechanic(self, mechanic_id: int, data: MechanicUpdate) -> MechanicResponse:
        mech = await self.get_by_id(mechanic_id)

        if data.phone and data.phone.strip() != mech.phone:
            existing = await self.db.execute(
                select(Mechanic).where(
                    Mechanic.phone == data.phone.strip(),
                    Mechanic.id != mechanic_id
                )
            )
            if existing.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Mechanic with phone '{data.phone}' already exists."
                )
            mech.phone = data.phone.strip()

        if data.name is not None:
            mech.name = data.name.strip()
        if data.garage_name is not None:
            mech.garage_name = data.garage_name.strip() if data.garage_name else None
        if data.address is not None:
            mech.address = data.address.strip() if data.address else None
        if data.default_commission_percentage is not None:
            mech.default_commission_percentage = data.default_commission_percentage
        if data.is_active is not None:
            mech.is_active = data.is_active

        if data.commissions is not None:
            for old_comm in mech.brand_commissions:
                await self.db.delete(old_comm)
            await self.db.flush()

            for comm in data.commissions:
                bc = MechanicBrandCommission(
                    mechanic_id=mech.id,
                    brand_id=comm.brand_id,
                    commission_percentage=comm.commission_percentage,
                )
                self.db.add(bc)

        await self.db.commit()
        return await self.get_response_by_id(mechanic_id)

    async def delete_mechanic(self, mechanic_id: int) -> None:
        mech = await self.get_by_id(mechanic_id)
        await self.db.delete(mech)
        await self.db.commit()

    async def get_mechanic_items(
        self,
        mechanic_id: int,
        start_date: date | None = None,
        end_date: date | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[MechanicItemDetailResponse]:
        """Fetch date-wise line items taken/sold by this mechanic with commission rates and earnings."""
        stmt = (
            select(SaleItem, Sale, SparePart)
            .join(Sale, SaleItem.sale_id == Sale.id)
            .join(SparePart, SaleItem.spare_part_id == SparePart.id)
            .where(
                (SaleItem.mechanic_id == mechanic_id) | (Sale.mechanic_id == mechanic_id)
            )
        )

        if start_date:
            stmt = stmt.where(func.date(Sale.created_at) >= start_date)
        if end_date:
            stmt = stmt.where(func.date(Sale.created_at) <= end_date)

        stmt = stmt.order_by(Sale.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        rows = result.all()

        details = []
        for item, sale, part in rows:
            details.append(
                MechanicItemDetailResponse(
                    sale_id=sale.id,
                    invoice_number=sale.invoice_number,
                    date=sale.created_at,
                    spare_part_id=part.id,
                    item_name=part.item_name,
                    part_number=part.part_number,
                    brand_name=part.brand_name,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    total_price=item.total_price,
                    commission_percentage=item.commission_percentage,
                    commission_amount=item.commission_amount,
                    customer_name=sale.customer_name,
                    customer_phone=sale.customer_phone,
                )
            )
        return details

    async def get_mechanic_summary(
        self,
        mechanic_id: int,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> MechanicSummaryResponse:
        mech = await self.get_by_id(mechanic_id)

        stmt = (
            select(
                func.coalesce(func.sum(SaleItem.quantity), 0).label("total_items"),
                func.coalesce(func.sum(SaleItem.total_price), Decimal("0.00")).label("total_sales"),
                func.coalesce(func.sum(SaleItem.commission_amount), Decimal("0.00")).label("total_commission"),
            )
            .join(Sale, SaleItem.sale_id == Sale.id)
            .where(
                (SaleItem.mechanic_id == mechanic_id) | (Sale.mechanic_id == mechanic_id)
            )
        )

        if start_date:
            stmt = stmt.where(func.date(Sale.created_at) >= start_date)
        if end_date:
            stmt = stmt.where(func.date(Sale.created_at) <= end_date)

        result = await self.db.execute(stmt)
        total_items, total_sales, total_commission = result.one()

        return MechanicSummaryResponse(
            mechanic_id=mech.id,
            mechanic_name=mech.name,
            garage_name=mech.garage_name,
            total_items_taken=int(total_items),
            total_sales_volume=Decimal(str(total_sales)),
            total_commission_earned=Decimal(str(total_commission)),
        )
