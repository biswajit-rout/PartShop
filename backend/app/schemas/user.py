from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.user import UserRole

# 1. Base User Schema (Shared fields)


class UserBase(BaseModel):
    username: str
    email: str
    full_name: str
    role: UserRole = UserRole.COUNTER_STAFF

# 2. Schema for Registering a New User (Includes plain password)


class UserCreate(UserBase):
    password: str


# 3. Schema for Returning User Data (NEVER includes password!)

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    # Pydantic v2: automatically reads from SQLAlchemy ORM models
    model_config = ConfigDict(from_attributes=True)
