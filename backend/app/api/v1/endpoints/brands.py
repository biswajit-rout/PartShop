from typing import Annotated
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.brand import BrandCreate, BrandUpdate, BrandResponse
from app.services.brand_service import BrandService
from app.api.deps import get_current_user, require_role

router = APIRouter(prefix="/brands", tags=["Brands Master"])


@router.get("", response_model=list[BrandResponse])
@router.get("/", response_model=list[BrandResponse], include_in_schema=False)
async def list_brands(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """List all spare part brands."""
    service = BrandService(db)
    return await service.get_all()


@router.post("", response_model=BrandResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=BrandResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_brand(
    brand_in: BrandCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Add a new spare part brand/manufacturer."""
    service = BrandService(db)
    return await service.create_brand(brand_in)


@router.put("/{brand_id}", response_model=BrandResponse)
async def update_brand(
    brand_id: int,
    brand_update: BrandUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Update brand information."""
    service = BrandService(db)
    return await service.update_brand(brand_id, brand_update)


@router.delete("/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_brand(
    brand_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.ADMIN, UserRole.STORE_MANAGER]))],
):
    """Delete a brand."""
    service = BrandService(db)
    await service.delete_brand(brand_id)
