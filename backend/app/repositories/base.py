from typing import Generic, TypeVar
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import Base

# ModelType represents any SQLAlchemy model (SparePart, User, etc.)
ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """
    Generic repository providing common database CRUD operations
    so we don't have to repeat standard SQL queries for every model.
    """

    def __init__(self, model: type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db

    async def get_by_id(self, id: int) -> ModelType | None:
        """Fetch a single record by primary key."""
        result = await self.db.execute(select(self.model).where(self.model.id == id))
        return result.scalar_one_or_none()

    async def count(self) -> int:
        """Return total row count."""
        result = await self.db.execute(select(func.count(self.model.id)))
        return result.scalar_one() or 0

    async def create(self, instance: ModelType) -> ModelType:
        """Add and commit a new record."""
        self.db.add(instance)
        await self.db.commit()
        await self.db.refresh(instance)
        return instance

    async def delete(self, instance: ModelType) -> None:
        """Delete a record."""
        await self.db.delete(instance)
        await self.db.commit()
