from decimal import Decimal
from typing import Annotated
from fastapi import APIRouter, Depends, UploadFile, File, Form, status
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
        [UserRole.ADMIN, UserRole.STORE_MANAGER, UserRole.COUNTER_STAFF]))],
)
async def import_parts_from_excel(
    file: Annotated[UploadFile, File(description="Excel workbook (.xlsx) containing spare parts")],
    db: Annotated[AsyncSession, Depends(get_db)],
    supplier_id: Annotated[int | None, Form(description="Optional Supplier ID to map imported items to")] = None,
    brand_name: Annotated[str | None, Form(description="Optional brand override for imported items")] = None,
    default_supplier_discount: Annotated[float | None, Form(description="Optional supplier discount percentage")] = None,
):
    """
    Bulk import spare parts catalog from an Excel (.xlsx) file:
    - Maps items to selected supplier and records purchase discount percentage.
    - Validates header schema (item_name, brand, part_number, prices, etc.).
    - Skips and reports rows with missing data or duplicates.
    - Atomically persists valid parts and creates audit trail entries.
    """
    service = ImportService(db)
    discount_dec = Decimal(str(default_supplier_discount)) if default_supplier_discount is not None else None
    return await service.import_parts_from_excel(
        file=file,
        supplier_id=supplier_id,
        brand_name_override=brand_name,
        default_supplier_discount=discount_dec,
    )
