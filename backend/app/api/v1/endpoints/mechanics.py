from typing import Annotated
from datetime import date
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.mechanic import (
    MechanicCreate,
    MechanicUpdate,
    MechanicResponse,
    MechanicItemDetailResponse,
    MechanicSummaryResponse,
)
from app.services.mechanic_service import MechanicService
from app.api.deps import get_current_user, require_role

router = APIRouter(prefix="/mechanics", tags=["Mechanics & Commissions"])


@router.get("", response_model=list[MechanicResponse])
@router.get("/", response_model=list[MechanicResponse], include_in_schema=False)
async def list_mechanics(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    active_only: bool = Query(False, description="Filter only active mechanics"),
):
    """List all mechanics with their brand commission rates."""
    service = MechanicService(db)
    return await service.get_all(active_only=active_only)


@router.post("", response_model=MechanicResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=MechanicResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_mechanic(
    mech_in: MechanicCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Register a new mechanic partner with custom brand commission percentages."""
    service = MechanicService(db)
    return await service.create_mechanic(mech_in)


@router.get("/{mechanic_id}", response_model=MechanicResponse)
async def get_mechanic(
    mechanic_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Fetch mechanic profile with brand commission matrix."""
    service = MechanicService(db)
    return await service.get_response_by_id(mechanic_id)


@router.put("/{mechanic_id}", response_model=MechanicResponse)
async def update_mechanic(
    mechanic_id: int,
    mech_update: MechanicUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Update mechanic profile and brand commission rates."""
    service = MechanicService(db)
    return await service.update_mechanic(mechanic_id, mech_update)


@router.delete("/{mechanic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mechanic(
    mechanic_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.ADMIN, UserRole.STORE_MANAGER]))],
):
    """Deactivate or remove mechanic."""
    service = MechanicService(db)
    await service.delete_mechanic(mechanic_id)


@router.get("/{mechanic_id}/items", response_model=list[MechanicItemDetailResponse])
async def get_mechanic_items(
    mechanic_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    start_date: date | None = Query(None, description="Filter from date (YYYY-MM-DD)"),
    end_date: date | None = Query(None, description="Filter to date (YYYY-MM-DD)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
):
    """
    Get date-wise list of parts taken/sold by this mechanic:
    Includes invoice #, part name, OEM #, brand, qty, rate, total, commission %, and commission payout.
    """
    service = MechanicService(db)
    return await service.get_mechanic_items(
        mechanic_id=mechanic_id,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit,
    )


@router.get("/{mechanic_id}/summary", response_model=MechanicSummaryResponse)
async def get_mechanic_summary(
    mechanic_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    start_date: date | None = Query(None, description="Filter from date (YYYY-MM-DD)"),
    end_date: date | None = Query(None, description="Filter to date (YYYY-MM-DD)"),
):
    """Get total parts count, total billing volume, and total commission earned by this mechanic."""
    service = MechanicService(db)
    return await service.get_mechanic_summary(
        mechanic_id=mechanic_id,
        start_date=start_date,
        end_date=end_date,
    )
