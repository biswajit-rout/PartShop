from typing import Annotated
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.spare_part import (
    SparePartCreate,
    SparePartUpdate,
    SparePartResponse,
    PaginatedSpareParts,
)
from app.services.inventory_service import InventoryService
from app.api.deps import get_current_user, require_role

router = APIRouter(prefix="/parts", tags=["Spare Parts Catalog"])


# 1. Create a New Spare Part (Admin & Store Manager only)
@router.post(
    "",
    response_model=SparePartResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(
        [UserRole.ADMIN, UserRole.STORE_MANAGER]))],
)
@router.post(
    "/",
    response_model=SparePartResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(
        [UserRole.ADMIN, UserRole.STORE_MANAGER]))],
    include_in_schema=False,
)
async def create_spare_part(
    part_in: SparePartCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Add a new spare part to inventory. Requires Admin or Store Manager role."""
    service = InventoryService(db)
    return await service.create_part(part_in)


# 2. Search & List Spare Parts (All Authenticated Staff)
@router.get("", response_model=PaginatedSpareParts)
@router.get("/", response_model=PaginatedSpareParts, include_in_schema=False)
async def list_spare_parts(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    q: str | None = Query(
        None, description="Search term across name, part #, or bike model"),
    brand: str | None = Query(
        None, description="Filter by brand (e.g. Hero, Bajaj)"),
    supplier_id: int | None = Query(
        None, description="Filter by supplier ID"),
    low_stock_only: bool = Query(
        False, description="Filter only items below min stock threshold"),
    skip: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(50, ge=1, le=500, description="Page size limit"),
):
    """Search and browse spare parts with pagination and filters."""
    service = InventoryService(db)
    items, total = await service.search_catalog(
        query=q,
        brand=brand,
        supplier_id=supplier_id,
        low_stock_only=low_stock_only,
        skip=skip,
        limit=limit,
    )
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": items,
    }


# 3. Barcode Gun Scanner Lookup (Fast Point-of-Sale check)
@router.get("/barcode/{barcode}", response_model=SparePartResponse)
async def get_by_barcode(
    barcode: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Instant lookup when scanning a physical barcode at the billing counter."""
    service = InventoryService(db)
    return await service.get_part_by_barcode(barcode)


# 4. Get Part Details by ID
@router.get("/{part_id}", response_model=SparePartResponse)
async def get_spare_part(
    part_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get spare part details by unique ID."""
    service = InventoryService(db)
    return await service.get_part_by_id(part_id)


# 5. Update Spare Part (Admin, Store Manager & Counter Staff)
@router.put(
    "/{part_id}",
    response_model=SparePartResponse,
    dependencies=[Depends(require_role(
        [UserRole.ADMIN, UserRole.STORE_MANAGER, UserRole.COUNTER_STAFF]))],
)
async def update_spare_part(
    part_id: int,
    part_update: SparePartUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update spare part details, pricing, stock levels, or rack location."""
    service = InventoryService(db)
    return await service.update_part(part_id, part_update)
