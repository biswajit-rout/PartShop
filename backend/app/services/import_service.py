import io
from decimal import Decimal
import openpyxl
from fastapi import UploadFile, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.spare_part import SparePart
from app.models.supplier import Supplier
from app.models.stock_movement import StockMovement, StockMovementType
from app.schemas.imports import ImportSummaryResponse, RowErrorDetail


class ImportService:
    """
    Intelligent Service for parsing, validating, and bulk-importing
    spare parts catalogs and distributor bills (such as Honda Compatibility Sheets)
    from Excel (.xlsx) workbooks.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def import_parts_from_excel(
        self,
        file: UploadFile,
        supplier_id: int | None = None,
        brand_name_override: str | None = None,
        default_supplier_discount: Decimal | None = None,
    ) -> ImportSummaryResponse:
        # 1. Validate file extension
        if not file.filename or not file.filename.endswith((".xlsx", ".xlsm")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file format. Please upload an Excel file ending with .xlsx.",
            )

        # Look up supplier details if supplier_id was passed
        supplier_name: str | None = None
        supplier_default_disc: Decimal = Decimal("0.00")
        if supplier_id:
            supp_res = await self.db.execute(select(Supplier).where(Supplier.id == supplier_id))
            supplier = supp_res.scalar_one_or_none()
            if supplier:
                supplier_name = supplier.name
                supplier_default_disc = supplier.default_discount_percentage

        # 2. Read file bytes into memory
        contents = await file.read()
        try:
            workbook = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
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
        raw_headers: dict[str, int] = {}
        header_row = [cell.value for cell in sheet[1]]
        for idx, col_name in enumerate(header_row):
            if col_name:
                normalized = (
                    str(col_name)
                    .strip()
                    .lower()
                    .replace(" ", "_")
                    .replace("-", "_")
                    .replace(".", "")
                )
                raw_headers[normalized] = idx

        # Flexible Header Alias Resolution Dictionary
        alias_map: dict[str, list[str]] = {
            "part_number": [
                "part_number", "part_no", "part_#", "part_num", "sku", "oem_number", "part_id"
            ],
            "item_name": [
                "item_name", "description", "part_description", "item_description", "part_name", "name"
            ],
            "brand_name": [
                "brand_name", "brand", "make", "manufacturer"
            ],
            "compatible_bikes": [
                "compatible_bikes", "compatible_vehicle_model", "vehicle_model",
                "compatible_model", "bike_model", "model_compatibility", "models"
            ],
            "selling_price": [
                "selling_price", "price_(mrp)", "price_mrp", "mrp", "price", "retail_price", "rate", "mrp_price"
            ],
            "purchase_price": [
                "purchase_price", "cost_price", "dealer_price", "purchase_rate", "cost"
            ],
            "quantity": [
                "quantity", "qty", "stock", "opening_stock", "units"
            ],
            "discount": [
                "discount", "disc", "trade_discount", "distributor_discount"
            ],
            "rack_number": [
                "rack_number", "rack", "shelf", "bin", "location"
            ],
            "barcode": [
                "barcode", "barcode_no", "ean", "upc"
            ],
            "model_number": [
                "model_number", "model_no"
            ],
        }

        resolved_headers: dict[str, int] = {}
        for canonical, aliases in alias_map.items():
            for alias in aliases:
                if alias in raw_headers:
                    resolved_headers[canonical] = raw_headers[alias]
                    break

        # Verify core essential columns
        if "part_number" not in resolved_headers or "item_name" not in resolved_headers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Could not find Part Number and Description headers. "
                    f"Detected columns: {', '.join(raw_headers.keys())}."
                ),
            )

        # 4. Cache existing part numbers and barcodes for O(1) duplicate checks
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
            if not any(row):
                continue

            def get_val(key: str, default=None):
                col_i = resolved_headers.get(key)
                if col_i is not None and col_i < len(row):
                    val = row[col_i]
                    return val if val is not None else default
                return default

            part_number = str(get_val("part_number", "")).strip()

            # Skip summary / total rows at bottom of distributor sheets
            if not part_number or part_number.upper() in ["GRAND TOTAL", "TOTAL", "SUBTOTAL", "SUMMARY", "TOTALS"]:
                continue

            total_rows += 1

            item_name = str(get_val("item_name", "")).strip()
            barcode = str(get_val("barcode", "")).strip() or None
            compatible_bikes = str(get_val("compatible_bikes", "")).strip() or None

            # Infer brand if not provided
            brand_name = (
                brand_name_override.strip()
                if brand_name_override and brand_name_override.strip()
                else str(get_val("brand_name", "")).strip()
            )
            if not brand_name:
                if compatible_bikes and "honda" in compatible_bikes.lower():
                    brand_name = "Honda"
                elif "honda" in item_name.lower():
                    brand_name = "Honda"
                else:
                    brand_name = "OEM Genuine"

            if not item_name or not part_number:
                errors.append(
                    RowErrorDetail(
                        row_number=row_idx,
                        part_number=part_number or None,
                        reason="Part Number and Description cannot be blank.",
                    )
                )
                skipped_count += 1
                continue

            # Check duplicate part number in catalog
            if part_number in existing_part_numbers or part_number in batch_part_numbers:
                errors.append(
                    RowErrorDetail(
                        row_number=row_idx,
                        part_number=part_number,
                        reason=f"Part number '{part_number}' already exists in catalog or sheet.",
                    )
                )
                skipped_count += 1
                continue

            # Check duplicate barcode
            if barcode and (barcode in existing_barcodes or barcode in batch_barcodes):
                errors.append(
                    RowErrorDetail(
                        row_number=row_idx,
                        part_number=part_number,
                        reason=f"Barcode '{barcode}' is already registered in catalog.",
                    )
                )
                skipped_count += 1
                continue

            # Pricing and Discount Resolution
            try:
                raw_selling = get_val("selling_price", 0)
                selling_price = Decimal(str(raw_selling or 0))

                # Determine supplier discount percentage
                raw_discount = get_val("discount")
                if raw_discount is not None and str(raw_discount).strip() != "":
                    val = Decimal(str(raw_discount))
                    if val > 1:
                        supplier_discount = round(val, 2)
                        discount_rate = val / Decimal("100.00")
                    else:
                        supplier_discount = round(val * Decimal("100.00"), 2)
                        discount_rate = val
                elif default_supplier_discount is not None and default_supplier_discount > 0:
                    supplier_discount = round(Decimal(str(default_supplier_discount)), 2)
                    discount_rate = supplier_discount / Decimal("100.00")
                elif supplier_default_disc > 0:
                    supplier_discount = supplier_default_disc
                    discount_rate = supplier_default_disc / Decimal("100.00")
                else:
                    supplier_discount = Decimal("0.00")
                    discount_rate = Decimal("0.00")

                raw_purchase = get_val("purchase_price")
                if raw_purchase is not None and str(raw_purchase).strip() != "":
                    purchase_price = Decimal(str(raw_purchase))
                elif discount_rate > 0 and selling_price > 0:
                    # Automatically compute dealer cost after wholesale discount
                    purchase_price = round(selling_price * (Decimal("1.00") - discount_rate), 2)
                else:
                    # Default conservative 85% trade cost
                    purchase_price = round(selling_price * Decimal("0.85"), 2)

                quantity = int(get_val("quantity", 0) or 0)
                min_stock_alert = int(get_val("min_stock_alert", 5) or 5)
            except Exception as e:
                errors.append(
                    RowErrorDetail(
                        row_number=row_idx,
                        part_number=part_number,
                        reason=f"Invalid numeric pricing or quantity format: {str(e)}",
                    )
                )
                skipped_count += 1
                continue

            # Instantiate SparePart with mapped supplier attributes
            new_part = SparePart(
                item_name=item_name,
                brand_name=brand_name,
                part_number=part_number,
                model_number=str(get_val("model_number", "")).strip() or None,
                compatible_bikes=compatible_bikes,
                supplier_id=supplier_id,
                supplier_name=supplier_name,
                supplier_discount=supplier_discount,
                quantity=quantity,
                min_stock_alert=min_stock_alert,
                rack_number=str(get_val("rack_number", "")).strip() or None,
                purchase_price=purchase_price,
                selling_price=selling_price,
                customer_discount=Decimal("0.00"),
                mechanic_discount=Decimal("0.00"),
                barcode=barcode,
            )

            self.db.add(new_part)
            await self.db.flush()

            # Record Opening Stock Movement
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

        # Commit all parts and stock movements atomically
        await self.db.commit()

        return ImportSummaryResponse(
            filename=file.filename or "uploaded.xlsx",
            supplier_id=supplier_id,
            supplier_name=supplier_name,
            total_rows_processed=total_rows,
            imported_count=imported_count,
            skipped_count=skipped_count,
            errors=errors,
        )
