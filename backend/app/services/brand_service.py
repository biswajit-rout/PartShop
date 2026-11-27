from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.brand import Brand
from app.schemas.brand import BrandCreate, BrandUpdate


class BrandService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self) -> list[Brand]:
        result = await self.db.execute(select(Brand).order_by(Brand.name.asc()))
        return list(result.scalars().all())

    async def get_by_id(self, brand_id: int) -> Brand:
        result = await self.db.execute(select(Brand).where(Brand.id == brand_id))
        brand = result.scalar_one_or_none()
        if not brand:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Brand with ID {brand_id} not found."
            )
        return brand

    async def create_brand(self, data: BrandCreate) -> Brand:
        existing = await self.db.execute(
            select(Brand).where(Brand.name.ilike(data.name.strip()))
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Brand '{data.name}' already exists."
            )

        new_brand = Brand(
            name=data.name.strip(),
            code=data.code.strip() if data.code else None,
            description=data.description.strip() if data.description else None,
            default_customer_discount=data.default_customer_discount,
            default_mechanic_discount=data.default_mechanic_discount,
        )
        self.db.add(new_brand)
        await self.db.commit()
        await self.db.refresh(new_brand)
        return new_brand

    async def update_brand(self, brand_id: int, data: BrandUpdate) -> Brand:
        brand = await self.get_by_id(brand_id)
        if data.name:
            existing = await self.db.execute(
                select(Brand).where(
                    Brand.name.ilike(data.name.strip()),
                    Brand.id != brand_id
                )
            )
            if existing.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Brand '{data.name}' already exists."
                )
            brand.name = data.name.strip()

        if data.code is not None:
            brand.code = data.code.strip() if data.code else None
        if data.description is not None:
            brand.description = data.description.strip() if data.description else None
        if data.default_customer_discount is not None:
            brand.default_customer_discount = data.default_customer_discount
        if data.default_mechanic_discount is not None:
            brand.default_mechanic_discount = data.default_mechanic_discount

        await self.db.commit()
        await self.db.refresh(brand)
        return brand

    async def delete_brand(self, brand_id: int) -> None:
        brand = await self.get_by_id(brand_id)
        await self.db.delete(brand)
        await self.db.commit()
