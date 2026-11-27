from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class BrandBase(BaseModel):
    name: str
    code: str | None = None
    description: str | None = None
    default_customer_discount: Decimal = Decimal("0.00")
    default_mechanic_discount: Decimal = Decimal("0.00")


class BrandCreate(BrandBase):
    pass


class BrandUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    description: str | None = None
    default_customer_discount: Decimal | None = None
    default_mechanic_discount: Decimal | None = None


class BrandResponse(BrandBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
