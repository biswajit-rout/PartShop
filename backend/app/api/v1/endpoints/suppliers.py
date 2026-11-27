from typing import Annotated
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierResponse
from app.schemas.spare_part import PaginatedSpareParts, SparePartResponse
from app.services.supplier_service import SupplierService
from app.api.deps import get_current_user, require_role

router = APIRouter(prefix="/suppliers", tags=["Supplier Directory & Wholesale Partners"])


# 1. List Suppliers (All authenticated staff)
@router.get("", response_model=list[SupplierResponse])
@router.get("/", response_model=list[SupplierResponse], include_in_schema=False)
async def list_suppliers(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    active_only: bool = Query(False, description="Filter only active suppliers"),
):
    """Retrieve full directory of wholesale suppliers and distributors with part counts."""
    service = SupplierService(db)
    return await service.list_suppliers(active_only=active_only)


# 2. Register New Supplier (Admin, Store Manager, Counter Staff)
@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_supplier(
    data: SupplierCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.ADMIN, UserRole.STORE_MANAGER, UserRole.COUNTER_STAFF]))],
):
    """Register a new supplier / distributor partner with brand discounts."""
    service = SupplierService(db)
    return await service.create_supplier(data)


# 3. Get Single Supplier
@router.get("/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(
    supplier_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get supplier details by ID including brand discounts and part counts."""
    service = SupplierService(db)
    return await service.get_supplier_response(supplier_id)


# 4. Update Supplier
@router.put("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: int,
    data: SupplierUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.ADMIN, UserRole.STORE_MANAGER, UserRole.COUNTER_STAFF]))],
):
    """Update supplier contact info, GSTIN, default discount percentage, or brand discounts."""
    service = SupplierService(db)
    return await service.update_supplier(supplier_id, data)


# 5. Delete Supplier
@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_supplier(
    supplier_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.ADMIN, UserRole.STORE_MANAGER]))],
):
    """Remove a supplier from directory."""
    service = SupplierService(db)
    await service.delete_supplier(supplier_id)


# 6. Get All Items Provided by a Supplier
@router.get("/{supplier_id}/parts", response_model=PaginatedSpareParts)
async def get_supplier_parts(
    supplier_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    skip: int = Query(0, ge=0, description="Offset"),
    limit: int = Query(100, ge=1, le=500, description="Page limit"),
):
    """View the complete inventory list of spare parts provided by this supplier."""
    service = SupplierService(db)
    items, total = await service.get_supplier_parts(supplier_id, skip=skip, limit=limit)
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": [SparePartResponse.model_validate(i) for i in items],
    }
