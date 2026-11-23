from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings
# 1. Create the Async Engine
# The engine is the central connection hub that talks to PostgreSQL.
# echo=True prints the generated SQL queries to your console (great for learning!).
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.ENVIRONMENT == "development",
    future=True,
    pool_pre_ping=True,  # Automatically tests connection health before executing queries
)
# 2. Create the Session Factory
# An async_sessionmaker produces individual database sessions for each HTTP request.
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Prevents attributes from expiring after commit
    autoflush=False,
)
# 3. Declarative Base Class
# All database models (User, SparePart, Sale, etc.) will inherit from this Base class.


class Base(DeclarativeBase):
    pass

# 4. Database Session Dependency (get_db)
# FastAPI will inject this into our route handlers using Depends(get_db).
# It guarantees that every request gets its own session and cleans it up after.


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
