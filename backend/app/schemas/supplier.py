from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class SupplierBase(BaseModel):
    name: str = Field(..., max_length=150, description="Wholesaler / distributor name")
    contact_person: str | None = Field(None, max_length=100, description="Primary contact person")
    phone: str = Field(..., max_length=20, description="Mobile / phone number")
    email: str | None = Field(None, max_length=100, description="Email address")
    address: str | None = Field(None, description="Physical shop / warehouse address")
    gst_number: str | None = Field(None, max_length=50, description="GSTIN compliance number")
    default_discount_percentage: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
        le=100,
        description="Default discount percentage provided by this supplier to the shop",
    )
    is_active: bool = True


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: str | None = Field(None, max_length=150)
    contact_person: str | None = Field(None, max_length=100)
    phone: str | None = Field(None, max_length=20)
    email: str | None = Field(None, max_length=100)
    address: str | None = None
    gst_number: str | None = Field(None, max_length=50)
    default_discount_percentage: Decimal | None = Field(None, ge=0, le=100)
    is_active: bool | None = None


class SupplierResponse(SupplierBase):
    id: int
    total_parts_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
