from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


# 1. Base Shared Fields
class SparePartBase(BaseModel):
    item_name: str
    brand_name: str
    part_number: str
    model_number: str | None = None
    compatible_bikes: str | None = None
    supplier_id: int | None = None
    supplier_name: str | None = None
    supplier_discount: Decimal = Decimal("0.00")
    quantity: int = 0
    min_stock_alert: int = 5
    rack_number: str | None = None
    purchase_price: Decimal
    selling_price: Decimal
    customer_discount: Decimal = Decimal("0.00")
    mechanic_discount: Decimal = Decimal("0.00")
    barcode: str | None = None
    qr_code: str | None = None
    is_confirmed: bool = True


# 2. Schema for Creating a Part (POST)
class SparePartCreate(SparePartBase):
    is_confirmed: bool | None = None


# 3. Schema for Updating a Part (PUT)
class SparePartUpdate(BaseModel):
    item_name: str | None = None
    brand_name: str | None = None
    part_number: str | None = None
    model_number: str | None = None
    compatible_bikes: str | None = None
    supplier_id: int | None = None
    supplier_name: str | None = None
    supplier_discount: Decimal | None = None
    quantity: int | None = None
    min_stock_alert: int | None = None
    rack_number: str | None = None
    purchase_price: Decimal | None = None
    selling_price: Decimal | None = None
    customer_discount: Decimal | None = None
    mechanic_discount: Decimal | None = None
    barcode: str | None = None
    qr_code: str | None = None
    is_confirmed: bool | None = None


# 4. Schema Returned to Frontend (GET)
class SparePartResponse(SparePartBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# 5. Paginated Catalog Response
class PaginatedSpareParts(BaseModel):
    total: int
    skip: int
    limit: int
    items: list[SparePartResponse]


# 6. Schema for Fast Goods Inward / Restock (POST)
class SparePartRestock(BaseModel):
    quantity_to_add: int
    purchase_price: Decimal | None = None
    rack_number: str | None = None


# 7. Schema for Batch Confirming Unconfirmed Items
class SparePartBatchConfirmRequest(BaseModel):
    part_ids: list[int]


# 8. Schema for Single Item Confirmation
class SparePartSingleConfirmRequest(BaseModel):
    rack_number: str | None = None


# 9. Batch Confirmation Response
class BatchConfirmResponse(BaseModel):
    confirmed_count: int
    part_ids: list[int]


