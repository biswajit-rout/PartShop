from typing import Annotated
from fastapi import APIRouter, Depends, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import UserRole
from app.schemas.imports import ImportSummaryResponse
from app.services.import_service import ImportService
from app.api.deps import require_role

router = APIRouter(prefix="/imports", tags=["Excel Bulk Imports"])


@router.post(
    "/parts-excel",
    response_model=ImportSummaryResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role(
        [UserRole.ADMIN, UserRole.STORE_MANAGER]))],
)
async def import_parts_from_excel(
    file: Annotated[UploadFile, File(description="Excel workbook (.xlsx) containing spare parts")],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Bulk import spare parts catalog from an Excel (.xlsx) file:
    - Validates header schema (item_name, brand, part_number, prices, etc.).
    - Skips and reports rows with missing data or duplicates.
    - Atomically persists valid parts and creates audit trail entries.
    - Guarded: Requires ADMIN or STORE_MANAGER role.
    """
    service = ImportService(db)
    return await service.import_parts_from_excel(file)
