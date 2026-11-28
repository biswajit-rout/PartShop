from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


# 1. Commission rule per brand
class MechanicBrandCommissionCreate(BaseModel):
    brand_id: int
    commission_percentage: Decimal


class MechanicBrandCommissionResponse(BaseModel):
    id: int
    mechanic_id: int
    brand_id: int
    brand_name: str | None = None
    commission_percentage: Decimal

    model_config = ConfigDict(from_attributes=True)


# 2. Base Mechanic Model
class MechanicBase(BaseModel):
    name: str
    phone: str
    garage_name: str | None = None
    address: str | None = None
    default_commission_percentage: Decimal = Decimal("5.00")


class MechanicCreate(MechanicBase):
    commissions: list[MechanicBrandCommissionCreate] = []


class MechanicUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    garage_name: str | None = None
    address: str | None = None
    default_commission_percentage: Decimal | None = None
    is_active: bool | None = None
    commissions: list[MechanicBrandCommissionCreate] | None = None


class MechanicResponse(MechanicBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    brand_commissions: list[MechanicBrandCommissionResponse] = []

    model_config = ConfigDict(from_attributes=True)


# 3. Item Ledger / Sales History for a Mechanic
class MechanicItemDetailResponse(BaseModel):
    sale_id: int
    invoice_number: str
    date: datetime
    spare_part_id: int
    item_name: str
    part_number: str
    brand_name: str
    quantity: int
    unit_price: Decimal
    total_price: Decimal
    commission_percentage: Decimal
    commission_amount: Decimal
    customer_name: str | None = None
    customer_phone: str | None = None


# 4. Mechanic Performance Summary
class MechanicSummaryResponse(BaseModel):
    mechanic_id: int
    mechanic_name: str
    garage_name: str | None = None
    total_items_taken: int
    total_sales_volume: Decimal
    total_commission_earned: Decimal
