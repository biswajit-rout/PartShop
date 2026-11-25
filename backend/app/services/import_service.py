import io
from decimal import Decimal
import openpyxl
from fastapi import UploadFile, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.spare_part import SparePart
from app.models.stock_movement import StockMovement, StockMovementType
from app.schemas.imports import ImportSummaryResponse, RowErrorDetail


class ImportService:
    """
    Service for parsing, validating, and bulk-importing
    spare parts catalogs from Excel (.xlsx) workbooks.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def import_parts_from_excel(self, file: UploadFile) -> ImportSummaryResponse:
        # 1. Validate file extension
        if not file.filename or not file.filename.endswith((".xlsx", ".xlsm")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file format. Please upload an Excel file ending with .xlsx.",
            )

        # 2. Read file bytes into memory
        contents = await file.read()
        try:
            workbook = openpyxl.load_workbook(
                io.BytesIO(contents), data_only=True)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unable to read Excel workbook: {str(e)}",
            )

        sheet = workbook.active
        if not sheet or sheet.max_row < 2:
            return ImportSummaryResponse(
                filename=file.filename,
                total_rows_processed=0,
                imported_count=0,
                skipped_count=0,
                errors=[],
            )

        # 3. Read & normalize header row (Row 1)
        headers: dict[str, int] = {}
        header_row = [cell.value for cell in sheet[1]]
        for idx, col_name in enumerate(header_row):
            if col_name:
                normalized = str(col_name).strip().lower().replace(" ", "_")
                headers[normalized] = idx

        # Allow 'brand' as alias for 'brand_name'
        if "brand" in headers and "brand_name" not in headers:
            headers["brand_name"] = headers["brand"]

        # Verify mandatory columns
        required_headers = ["item_name", "brand_name",
                            "part_number", "purchase_price", "selling_price"]
        missing = [h for h in required_headers if h not in headers]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Missing required columns in Excel sheet: {', '.join(missing)}. "
                    f"Detected columns: {', '.join(headers.keys())}."
                ),
            )

        # 4. Cache existing part numbers and barcodes (O(1) duplicate checks)
        existing_part_res = await self.db.execute(select(SparePart.part_number))
        existing_part_numbers = set(existing_part_res.scalars().all())

        existing_barcode_res = await self.db.execute(
            select(SparePart.barcode).where(SparePart.barcode.isnot(None))
        )
        existing_barcodes = set(existing_barcode_res.scalars().all())

        batch_part_numbers: set[str] = set()
        batch_barcodes: set[str] = set()

        imported_count = 0
        skipped_count = 0
        errors: list[RowErrorDetail] = []
        total_rows = 0

        # 5. Process each data row (Row 2 onwards)
        for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            # Skip if row is completely empty
            if not any(row):
                continue

            total_rows += 1

            def get_val(key: str, default=None):
                col_i = headers.get(key)
                if col_i is not None and col_i < len(row):
                    val = row[col_i]
                    return val if val is not None else default
                return default

            item_name = str(get_val("item_name", "")).strip()
            brand_name = str(get_val("brand_name", "")).strip()
            part_number = str(get_val("part_number", "")).strip()
            barcode = str(get_val("barcode", "")).strip() or None

            # Validation: Missing primary text fields
            if not item_name or not brand_name or not part_number:
                errors.append(RowErrorDetail(
                    row_number=row_idx,
                    part_number=part_number or None,
                    reason="item_name, brand_name, and part_number cannot be empty.",
                ))
                skipped_count += 1
                continue

            # Validation: Duplicate part number
            if part_number in existing_part_numbers or part_number in batch_part_numbers:
                errors.append(RowErrorDetail(
                    row_number=row_idx,
                    part_number=part_number,
                    reason=f"Part number '{part_number}' already exists in database or spreadsheet.",
                ))
                skipped_count += 1
                continue

            # Validation: Duplicate barcode
            if barcode and (barcode in existing_barcodes or barcode in batch_barcodes):
                errors.append(RowErrorDetail(
                    row_number=row_idx,
                    part_number=part_number,
                    reason=f"Barcode '{barcode}' already registered in database or spreadsheet.",
                ))
                skipped_count += 1
                continue

            # Validation: Numeric fields
            try:
                purchase_price = Decimal(str(get_val("purchase_price", 0)))
                selling_price = Decimal(str(get_val("selling_price", 0)))
                quantity = int(get_val("quantity", 0) or 0)
                min_stock_alert = int(get_val("min_stock_alert", 5) or 5)
                cust_disc = Decimal(str(get_val("customer_discount", 0) or 0))
                mech_disc = Decimal(str(get_val("mechanic_discount", 0) or 0))
            except Exception as e:
                errors.append(RowErrorDetail(
                    row_number=row_idx,
                    part_number=part_number,
                    reason=f"Invalid numeric format: {str(e)}",
                ))
                skipped_count += 1
                continue

            # Create new catalog item
            new_part = SparePart(
                item_name=item_name,
                brand_name=brand_name,
                part_number=part_number,
                model_number=str(get_val("model_number", "")).strip() or None,
                compatible_bikes=str(
                    get_val("compatible_bikes", "")).strip() or None,
                quantity=quantity,
                min_stock_alert=min_stock_alert,
                rack_number=str(get_val("rack_number", "")).strip() or None,
                purchase_price=purchase_price,
                selling_price=selling_price,
                customer_discount=cust_disc,
                mechanic_discount=mech_disc,
                barcode=barcode,
            )

            self.db.add(new_part)
            await self.db.flush()  # Populates new_part.id

            # If opening stock > 0, log opening audit trail entry
            if quantity > 0:
                movement = StockMovement(
                    spare_part_id=new_part.id,
                    movement_type=StockMovementType.PURCHASE_IN,
                    quantity_change=quantity,
                    balance_after=quantity,
                    reference_type="EXCEL_IMPORT",
                )
                self.db.add(movement)

            batch_part_numbers.add(part_number)
            if barcode:
                batch_barcodes.add(barcode)
            imported_count += 1

        # Commit all successfully validated parts
        await self.db.commit()

        return ImportSummaryResponse(
            filename=file.filename or "uploaded.xlsx",
            total_rows_processed=total_rows,
            imported_count=imported_count,
            skipped_count=skipped_count,
            errors=errors,
        )
