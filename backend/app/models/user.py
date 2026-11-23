import enum
from app.core.database import Base
from sqlalchemy import String, Boolean, Enum
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import TimestampMixin


class UserRole(str, enum.Enum):
    """Available system roles for PartShop."""
    ADMIN = "ADMIN"
    STORE_MANAGER = "STORE_MANAGER"
    COUNTER_STAFF = "COUNTER_STAFF"


class User(Base, TimestampMixin):
    """Database table storing cashier and staff credentials."""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole), default=UserRole.COUNTER_STAFF, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False)

    def __repr__(self) -> str:
        return f"<User id={self.id} username='{self.username}' role='{self.role}'>"
