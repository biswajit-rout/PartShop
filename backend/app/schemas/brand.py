from datetime import datetime
from pydantic import BaseModel, ConfigDict


class BrandBase(BaseModel):
    name: str
    code: str | None = None
    description: str | None = None


class BrandCreate(BrandBase):
    pass


class BrandUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    description: str | None = None


class BrandResponse(BrandBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
