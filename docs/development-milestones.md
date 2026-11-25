# PartShop — Backend Development Milestones & Learning Roadmap

> **Document Purpose**: Living progress tracker, detailed curriculum, code change ledger, and architectural guide for developing the PartShop production FastAPI backend.  
> **Source of Truth**: Active Codebase (`d:/Programming/PartShop`)  
> **Governance**: Maintained according to rules established in `AGENTS.md`.  
> **Last Updated**: 2026-11-25  

---

## 1. Learning Philosophy & Collaboration Model

This backend is built following a **Mentorship & Learning-First Engineering Model**:
- **You write the code**: You create each file and write the code yourself to build muscle memory and deep practical understanding.
- **Guidance on "Where" & "Why"**: Every step specifies the exact file location, clean beginner-friendly code, and plain-English explanations of *why* production systems are built that way.
- **Living Code Ledger**: Every file created, along with its full code and explanation, is recorded right here in this document as our permanent reference manual.
- **Synchronized Documentation**: Project documentation (`docs/`), diagrams, and change histories are kept 100% updated in lockstep.

```mermaid
flowchart LR
    M0["Milestone 0<br/>Virtualenv & Pip<br/>(Done)"] --> M1["Milestone 1<br/>Core & Config<br/>(Done)"]
    M1 --> M2["Milestone 2<br/>Models & Alembic<br/>(Done)"]
    M2 --> M3["Milestone 3<br/>JWT Auth & RBAC<br/>(Done)"]
    M3 --> M4["Milestone 4<br/>Parts & Repositories<br/>(Done)"]
    M4 --> M5["Milestone 5<br/>Atomic POS Billing<br/>(Done)"]
    M5 --> M6["Milestone 6<br/>Excel Imports & Reports<br/>(Done)"]
    M6 --> M7["Milestone 7<br/>Docker & Full Stack<br/>(In Progress)"]

    classDef done fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#ecfdf5;
    classDef current fill:#1e1b4b,stroke:#a855f7,stroke-width:2px,color:#cbd5e1;
    classDef pending fill:#0f172a,stroke:#64748b,stroke-width:1px,color:#94a3b8;

    class M0,M1,M2,M3,M4,M5,M6 done;
    class M7 current;
```

---

## 2. Master Milestone Status Tracker

| Milestone | Title | Key Objective | Status | Completed Date |
| :--- | :--- | :--- | :--- | :---: |
| **Milestone 0** | **Environment & Pip Setup** | Isolate dependencies in `.venv` and pin packages in `requirements.txt`. | `Completed` | 2026-11-22 |
| **Milestone 1** | **Core Foundation & First API** | Pydantic `BaseSettings`, Async SQLAlchemy Engine, CORS, and `/health`. | `Completed` | 2026-11-23 |
| **Milestone 2** | **Database Models & Alembic Migrations** | Define `User` and `SparePart` models, configure Alembic, and run migrations. | `Completed` | 2026-11-23 |
| **Milestone 3** | **Security & Authentication (JWT + RBAC)** | Password hashing (bcrypt), JWT tokens, and role-based guards (`ADMIN`, `STAFF`). | `Completed` | 2026-11-23 |
| **Milestone 4** | **Clean Architecture & Spare Parts Catalog** | Repository Pattern, Inventory Service, barcode and bike model search. | `Completed` | 2026-11-24 |
| **Milestone 5** | **Atomic POS Billing Engine** | Row-level locking (`SELECT FOR UPDATE`), stock decrement, GST, and invoices. | `Completed` | 2026-11-25 |
| **Milestone 6** | **Excel Bulk Imports & Business Reporting** | Import `.xlsx` catalogs, batch validation, daily counter analytics. | `Completed` | 2026-11-25 |
| **Milestone 7** | **Dockerization & Next.js UI Integration** | Connect Next.js frontend calls to live FastAPI backend in Docker Compose. | `In Progress` | *Active* |

---

## 3. Milestone Code Changes & Detailed Explanations

---

### Milestone 0: Environment & Pip Setup
- **Status**: `Completed` (2026-11-22)
- **Objective**: Set up an isolated Python workspace without system library conflicts.

#### 1. File Created: `backend/requirements.txt`
```text
# Web Framework & Server
fastapi==0.115.6
uvicorn[standard]==0.34.0

# Database & Async Drivers
sqlalchemy==2.0.36
asyncpg==0.30.0
alembic==1.14.0

# Data Validation & Environment Settings
pydantic==2.10.4
pydantic-settings==2.7.0

# Security, Passwords & JWT
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0
python-multipart==0.0.20
```

> **Why each package exists**:
> - `fastapi` & `uvicorn`: Web framework and ASGI server running on port 8000.
> - `sqlalchemy` & `asyncpg`: Asynchronous ORM and non-blocking PostgreSQL driver.
> - `alembic`: Database migration tool to evolve tables safely.
> - `pydantic` & `pydantic-settings`: Type validation and reading `.env` variables.
> - `passlib` & `python-jose`: Password hashing (bcrypt) and digital signature token creation (JWT).

#### Commands Used:
```powershell
cd d:\Programming\PartShop
mkdir backend
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

---

### Milestone 1: Core Foundation & First API
- **Status**: `Completed` (2026-11-23)
- **Objective**: Establish the FastAPI application, environment configuration, database connection, and CORS middleware.

#### 1. File Created: `backend/app/core/config.py`
```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application Settings:
    Automatically reads environment variables from the root .env file.
    If a variable is not found in .env, it uses the default value provided here.
    """
    # Project Info
    PROJECT_NAME: str = "PartShop API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"

    # Server Settings
    PORT: int = 8000

    # Database Configuration (matches our PostgreSQL container)
    POSTGRES_USER: str = "partshop_user"
    POSTGRES_PASSWORD: str = "partshop_secret_change_me"
    POSTGRES_DB: str = "partshop_db"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    # JWT Authentication Secrets
    SECRET_KEY: str = "partshop_default_jwt_secret_key_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Computed Database URL for Async PostgreSQL (asyncpg driver)
    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # Read from the root .env file if available
    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        extra="ignore"  # ignores other variables like FRONTEND_PORT
    )


# Create a single instance that the rest of the application can import
settings = Settings()
```
> **Why**: Pydantic `BaseSettings` prevents hardcoding passwords in code and guarantees strict type validation for ports, URLs, and secrets.

---

#### 2. File Created: `backend/app/core/database.py`
```python
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

# 1. Create the Async Engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.ENVIRONMENT == "development",
    future=True,
    pool_pre_ping=True,  # Automatically tests connection health before executing queries
)

# 2. Create the Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Prevents attributes from expiring after commit
    autoflush=False,
)


# 3. Declarative Base Class
class Base(DeclarativeBase):
    pass


# 4. Database Session Dependency (get_db)
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```
> **Why**: 
> - `create_async_engine`: Asynchronous database connection pool.
> - `get_db()`: Uses `yield` to inject a clean database session per request and guarantees session closure in `finally:` block.

---

#### 3. File Created: `backend/app/main.py`
```python
from fastapi import FastAPI, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import get_db

# 1. Initialize the FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for PartShop Motorcycle Spare Parts Management & POS",
)

# 2. Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js local development
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allows GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],  # Allows Authorization headers, JSON content types
)


# 3. Root Endpoint
@app.get("/")
async def root():
    """Simple greeting to confirm the server is running."""
    return {
        "message": "Welcome to PartShop API",
        "docs": "/docs",
        "environment": settings.ENVIRONMENT
    }


# 4. Health Check Endpoint
@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Health check endpoint that verifies server and PostgreSQL connectivity."""
    db_status = "connected"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"disconnected: {str(e)}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "environment": settings.ENVIRONMENT,
        "version": settings.VERSION,
    }
```
> **Why**: Exposes CORS headers to allow Next.js (port 3000) to communicate with FastAPI (port 8001), and provides a `/health` endpoint verifying PostgreSQL connectivity.

---

#### 4. File Created: `backend/Dockerfile`
```dockerfile
# 1. Use official lightweight Python 3.12 Linux image
FROM python:3.12-slim

# 2. Prevent Python from buffering outputs and writing .pyc files
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# 3. Set the working directory inside the container
WORKDIR /app

# 4. Copy and install dependencies first (Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy the rest of the application code
COPY . .

# 6. Expose FastAPI port
EXPOSE 8000

# 7. Start Uvicorn with auto-reload enabled
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

---

#### 5. File Updated: `docker-compose.yml` (Backend Service)
```yaml
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: partshop-backend
    restart: unless-stopped
    ports:
      - "${BACKEND_PORT:-8001}:8000"
    volumes:
      - ./backend:/app
    environment:
      - ENVIRONMENT=development
      - DATABASE_URL=postgresql+asyncpg://${POSTGRES_USER:-partshop_user}:${POSTGRES_PASSWORD:-partshop_secret_change_me}@postgres:5432/${POSTGRES_DB:-partshop_db}
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_USER=${POSTGRES_USER:-partshop_user}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-partshop_secret_change_me}
      - POSTGRES_DB=${POSTGRES_DB:-partshop_db}
      - SECRET_KEY=${BACKEND_SECRET_KEY:-partshop_default_jwt_secret_key_change_in_production}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - partshop-network
```
> **Why**: Mounts `./backend:/app` for hot-reloading on Windows while executing inside Python 3.12 Linux, avoiding Windows Visual C++ compilation issues. Remaps host port to `8001` to resolve local port `8000` conflicts.

---

### Milestone 2: Database Models & Alembic Migrations
- **Status**: `In Progress`
- **Objective**: Translate real-world spare parts and cashier data into Python SQLAlchemy models and version-control them with Alembic.

#### 1. File Created: `backend/app/models/base.py`
```python
from datetime import datetime, timezone
from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column


class TimestampMixin:
    """
    Reusable mixin that automatically adds created_at and updated_at
    timestamps (in UTC) to any database table.
    """
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
```
> **Why**: Avoids code duplication across tables; guarantees all database records maintain UTC creation and modification timestamps.

---

#### 2. File Created: `backend/app/models/user.py`
```python
import enum
from sqlalchemy import String, Boolean, Enum
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
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
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole),
        default=UserRole.COUNTER_STAFF,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    def __repr__(self) -> str:
        return f"<User id={self.id} username='{self.username}' role='{self.role}'>"
```
> **Why**: Provides indexed username/email lookups (`< 1ms`), stores secure password hashes, and provides role-based access control.

---

#### 3. File Created: `backend/app/models/spare_part.py`
```python
from decimal import Decimal
from sqlalchemy import String, Integer, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.models.base import TimestampMixin


class SparePart(Base, TimestampMixin):
    """Database table representing an auto/motorcycle spare part item."""
    __tablename__ = "spare_parts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    item_name: Mapped[str] = mapped_column(String(150), nullable=False)
    brand_name: Mapped[str] = mapped_column(String(100), index=True, nullable=False)  # e.g., Hero, Bajaj
    part_number: Mapped[str] = mapped_column(String(100), index=True, nullable=False)  # OEM Part #
    model_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    compatible_bikes: Mapped[str | None] = mapped_column(Text, nullable=True)  # e.g., "Splendor, Passion Pro"

    # Inventory & Shelf Locator
    quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    min_stock_alert: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    rack_number: Mapped[str | None] = mapped_column(String(50), nullable=True)  # e.g., "Rack-B, Shelf-2"

    # Pricing & Discounts (Numeric prevents floating-point penny rounding bugs)
    purchase_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    selling_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    customer_discount: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    mechanic_discount: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)

    # Scannable Barcode for POS Counter
    barcode: Mapped[str | None] = mapped_column(String(100), unique=True, index=True, nullable=True)
    qr_code: Mapped[str | None] = mapped_column(String(255), nullable=True)

    def __repr__(self) -> str:
        return f"<SparePart id={self.id} item='{self.item_name}' part_no='{self.part_number}' stock={self.quantity}>"
```
> **Why**:
> - Uses `Numeric(10, 2)` instead of `Float` to eliminate floating-point currency rounding errors.
> - Indexes `barcode` and `part_number` for instant counter barcode gun scans.
> - Tracks physical shelf/rack positions (`rack_number`).

---

#### 4. File Created: `backend/app/models/__init__.py`
```python
from app.models.base import TimestampMixin
from app.models.user import User, UserRole
from app.models.spare_part import SparePart

__all__ = ["TimestampMixin", "User", "UserRole", "SparePart"]
```

---

#### 5. File Created: `backend/alembic.ini`
```ini
[alembic]
script_location = alembic
prepend_sys_path = .
version_path_separator = os

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

---

#### 6. File Created: `backend/alembic/env.py`
```python
import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

from app.core.config import settings
from app.core.database import Base
import app.models  # Ensures all models (User, SparePart) are registered

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

---

#### 7. File Created: `backend/alembic/script.py.mako`
```mako
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

# revision identifiers, used by Alembic.
revision: str = ${repr(up_revision)}
down_revision: Union[str, None] = ${repr(down_revision)}
branch_labels: Union[str, Sequence[str], None] = ${repr(branch_labels)}
depends_on: Union[str, Sequence[str], None] = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
```

---

#### 8. Generated Migration: `backend/alembic/versions/5a6b63d2eae3_create_users_and_spare_parts_tables.py`
```powershell
docker compose exec backend alembic revision --autogenerate -m "create users and spare_parts tables"
```
> Generated migration code creating `users` and `spare_parts` tables and all associated indexes in PostgreSQL.

---

---

### Milestone 3: Security & Authentication (JWT + RBAC)
- **Status**: `In Progress`
- **Objective**: Secure the application with cashier login, hashed passwords, cryptographic JSON Web Tokens (JWT), and role-based guards (`ADMIN`, `STAFF`).

#### 1. File Created: `backend/app/core/security.py`
```python
from datetime import datetime, timedelta, timezone
from typing import Any
import bcrypt
from jose import jwt
from app.core.config import settings


def hash_password(password: str) -> str:
    """Transforms a plain-text password into a secure bcrypt hash."""
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain-text password against a stored bcrypt hash."""
    pwd_bytes = plain_password.encode("utf-8")[:72]
    hash_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(pwd_bytes, hash_bytes)


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """
    Creates an encrypted JSON Web Token (JWT) with user claims and expiration.
    """
    to_encode = data.copy()

    # Set token expiration time (default from settings: 24 hours)
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})

    # Digitally sign the token using our SECRET_KEY and HS256 algorithm
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt
```
> **Why**:
> - Direct `bcrypt`: Eliminates legacy `passlib` wrap-bug crashes on modern Python/bcrypt releases. Automatically truncates to bcrypt's 72-byte limit and handles salting securely.
> - `create_access_token`: Generates signed, tamper-proof tokens containing the cashier's identity and permissions.

---

#### 2. File Created: `backend/app/schemas/user.py`
```python
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
```
> **Why**: Strict separation between data coming in (`UserCreate`) and data sent out (`UserResponse`). Passwords are never sent back in API responses.

---

#### 3. File Created: `backend/app/schemas/auth.py`
```python
from pydantic import BaseModel


class LoginRequest(BaseModel):
    """Payload sent by the cashier when logging in."""
    username: str
    password: str


class TokenResponse(BaseModel):
    """Payload returned upon successful authentication."""
    access_token: str
    token_type: str = "bearer"
```
> **Why**: Provides standardized token response DTOs matching OAuth2 standards.

---

#### 4. File Created: `backend/app/api/deps.py`
```python
from collections.abc import AsyncGenerator
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, UserRole

# 1. OAuth2 scheme: Tells FastAPI that tokens arrive in the Authorization header
# tokenUrl points to our login endpoint so Swagger UI's "Authorize" lock button works!
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# 2. Dependency: Get Current Logged-in User
async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """
    Decodes the JWT token from the request header, verifies its digital signature,
    and loads the authenticated User from PostgreSQL.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )

    return user


# 3. Role-Based Access Control Guard (RBAC)
def require_role(allowed_roles: list[UserRole]):
    """
    Dependency factory to protect sensitive endpoints (e.g. Admin-only operations).
    """
    async def role_checker(current_user: Annotated[User, Depends(get_current_user)]) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required role: {[r.value for r in allowed_roles]}",
            )
        return current_user

    return role_checker
```
> **Why**:
> - Centralized security gate: Every protected endpoint uses `Depends(get_current_user)`.
> - If an expired or forged token arrives, it is rejected immediately with HTTP 401 before any database transactions occur.

---

#### 5. File Created: `backend/app/api/v1/endpoints/auth.py`
```python
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse
from app.schemas.auth import TokenResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


# 1. Register Endpoint (Create New User)
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Register a new staff member or administrator account."""
    existing_user = await db.execute(
        select(User).where((User.username == user_in.username) | (User.email == user_in.email))
    )
    if existing_user.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email is already registered",
        )

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        password_hash=hash_password(user_in.password),
        role=user_in.role,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


# 2. Login Endpoint (OAuth2 Form & JSON compatible)
@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Authenticate cashier credentials and return a Bearer JWT Token.
    Compatible with Swagger UI's built-in Authorize dialog.
    """
    result = await db.execute(select(User).where(User.username == form_data.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    access_token = create_access_token(data={"sub": user.username, "role": user.role.value})

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


# 3. Current User Profile Endpoint (Protected)
@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get profile details of the currently authenticated user."""
    return current_user
```

---

#### 6. File Created: `backend/app/api/v1/router.py`
```python
from fastapi import APIRouter
from app.api.v1.endpoints import auth

api_router = APIRouter()

# Register Authentication endpoints under /api/v1/auth
api_router.include_router(auth.router)
```

---

#### 7. File Updated: `backend/app/main.py`
Mounted the central `api_router`:
```python
from app.api.v1.router import api_router

# Mount API v1 router under /api/v1
app.include_router(api_router, prefix="/api/v1")
```

---

---

### Milestone 4: Clean Architecture & Spare Parts Catalog
- **Status**: `Completed` (2026-11-24)
- **Objective**: Implement Clean Layered Architecture (Schemas -> Repositories -> Services -> Endpoints) for spare parts management, case-insensitive multi-field search, barcode scanning, and low-stock alerts.

#### 1. File Created: `backend/app/schemas/spare_part.py`
```python
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
    quantity: int = 0
    min_stock_alert: int = 5
    rack_number: str | None = None
    purchase_price: Decimal
    selling_price: Decimal
    customer_discount: Decimal = Decimal("0.00")
    mechanic_discount: Decimal = Decimal("0.00")
    barcode: str | None = None
    qr_code: str | None = None


# 2. Schema for Creating a Part (POST)
class SparePartCreate(SparePartBase):
    pass


# 3. Schema for Updating a Part (PUT)
class SparePartUpdate(BaseModel):
    item_name: str | None = None
    brand_name: str | None = None
    part_number: str | None = None
    model_number: str | None = None
    compatible_bikes: str | None = None
    quantity: int | None = None
    min_stock_alert: int | None = None
    rack_number: str | None = None
    purchase_price: Decimal | None = None
    selling_price: Decimal | None = None
    customer_discount: Decimal | None = None
    mechanic_discount: Decimal | None = None
    barcode: str | None = None
    qr_code: str | None = None


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
```
> **Why**:
> - Uses `Decimal` for currency values (`purchase_price`, `selling_price`) to eliminate floating-point penny rounding issues.
> - `PaginatedSpareParts`: Paginates large 10,000+ spare parts catalogs efficiently without overwhelming the client.

---

#### 2. File Created: `backend/app/repositories/base.py`
```python
from typing import Generic, TypeVar
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import Base

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
```
> **Why**:
> - Reusable generic CRUD foundation: Eliminates duplicate SQL queries across different domain tables.

---

#### 3. File Created: `backend/app/repositories/spare_part_repo.py`
```python
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.spare_part import SparePart
from app.repositories.base import BaseRepository


class SparePartRepository(BaseRepository[SparePart]):
    """Specialized repository for querying the spare parts catalog."""

    def __init__(self, db: AsyncSession):
        super().__init__(SparePart, db)

    async def get_by_barcode(self, barcode: str) -> SparePart | None:
        """Instant lookup by barcode scanner gun at the billing counter."""
        result = await self.db.execute(select(SparePart).where(SparePart.barcode == barcode))
        return result.scalar_one_or_none()

    async def get_by_part_number(self, part_number: str) -> SparePart | None:
        """Lookup by exact OEM part number."""
        result = await self.db.execute(select(SparePart).where(SparePart.part_number == part_number))
        return result.scalar_one_or_none()

    async def search_parts(
        self,
        query: str | None = None,
        brand: str | None = None,
        low_stock_only: bool = False,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[SparePart], int]:
        """
        Multi-field search across item name, part number, and bike model
        with optional brand filter and low-stock threshold alert.
        """
        stmt = select(SparePart)

        # 1. Full-text search across item name, part number, and compatible bikes
        if query:
            search_pattern = f"%{query}%"
            stmt = stmt.where(
                or_(
                    SparePart.item_name.ilike(search_pattern),
                    SparePart.part_number.ilike(search_pattern),
                    SparePart.compatible_bikes.ilike(search_pattern),
                )
            )

        # 2. Filter by brand
        if brand:
            stmt = stmt.where(SparePart.brand_name.ilike(brand))

        # 3. Filter low stock
        if low_stock_only:
            stmt = stmt.where(SparePart.quantity <= SparePart.min_stock_alert)

        # Count total matching rows (for pagination)
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one() or 0

        # Apply ordering and pagination
        stmt = stmt.order_by(SparePart.item_name.asc()).offset(skip).limit(limit)
        items_result = await self.db.execute(stmt)
        items = list(items_result.scalars().all())

        return items, total
```
> **Why**:
> - `ilike`: Case-insensitive search allowing counter cashiers to search by brand, part number, or bike model with ease.
> - `low_stock_only`: One-click filter for store managers to identify inventory that has fallen below reorder thresholds.

---

#### 4. File Created: `backend/app/services/inventory_service.py`
```python
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.spare_part import SparePart
from app.repositories.spare_part_repo import SparePartRepository
from app.schemas.spare_part import SparePartCreate, SparePartUpdate


class InventoryService:
    """
    Business Logic Layer for managing Spare Parts.
    Enforces business rules (duplicate checks, validation) before saving to PostgreSQL.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = SparePartRepository(db)

    async def create_part(self, part_data: SparePartCreate) -> SparePart:
        """Create a new spare part ensuring no duplicate part numbers or barcodes exist."""
        existing_part_no = await self.repo.get_by_part_number(part_data.part_number)
        if existing_part_no:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Spare part with Part Number '{part_data.part_number}' already exists.",
            )

        if part_data.barcode:
            existing_barcode = await self.repo.get_by_barcode(part_data.barcode)
            if existing_barcode:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Spare part with Barcode '{part_data.barcode}' already exists.",
                )

        new_part = SparePart(**part_data.model_dump())
        return await self.repo.create(new_part)

    async def get_part_by_id(self, part_id: int) -> SparePart:
        """Fetch part by ID or raise HTTP 404."""
        part = await self.repo.get_by_id(part_id)
        if not part:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Spare part with ID {part_id} not found.",
            )
        return part

    async def get_part_by_barcode(self, barcode: str) -> SparePart:
        """Instant lookup for counter barcode scanner guns."""
        part = await self.repo.get_by_barcode(barcode)
        if not part:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No spare part found with barcode '{barcode}'.",
            )
        return part

    async def search_catalog(
        self,
        query: str | None = None,
        brand: str | None = None,
        low_stock_only: bool = False,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[SparePart], int]:
        """Search parts with filters and pagination."""
        return await self.repo.search_parts(
            query=query,
            brand=brand,
            low_stock_only=low_stock_only,
            skip=skip,
            limit=limit,
        )

    async def update_part(self, part_id: int, update_data: SparePartUpdate) -> SparePart:
        """Update part details."""
        part = await self.get_part_by_id(part_id)

        if update_data.barcode and update_data.barcode != part.barcode:
            existing = await self.repo.get_by_barcode(update_data.barcode)
            if existing and existing.id != part_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Barcode '{update_data.barcode}' is already assigned to another part.",
                )

        for field, value in update_data.model_dump(exclude_unset=True).items():
            setattr(part, field, value)

        await self.db.commit()
        await self.db.refresh(part)
        return part

    async def delete_part(self, part_id: int) -> None:
        """Delete part from inventory."""
        part = await self.get_part_by_id(part_id)
        await self.repo.delete(part)
```
> **Why**:
> - Enforces business logic (duplicate barcode validation, 404 handling) in a centralized service rather than scattering it in route handlers.

---

#### 5. File Created: `backend/app/api/v1/endpoints/spare_parts.py`
```python
from typing import Annotated
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.spare_part import (
    SparePartCreate,
    SparePartUpdate,
    SparePartResponse,
    PaginatedSpareParts,
)
from app.services.inventory_service import InventoryService
from app.api.deps import get_current_user, require_role

router = APIRouter(prefix="/parts", tags=["Spare Parts Catalog"])


# 1. Create a New Spare Part (Admin & Store Manager only)
@router.post(
    "/",
    response_model=SparePartResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.STORE_MANAGER]))],
)
async def create_spare_part(
    part_in: SparePartCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Add a new spare part to inventory. Requires Admin or Store Manager role."""
    service = InventoryService(db)
    return await service.create_part(part_in)


# 2. Search & List Spare Parts (All Authenticated Staff)
@router.get("/", response_model=PaginatedSpareParts)
async def list_spare_parts(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    q: str | None = Query(None, description="Search term across name, part #, or bike model"),
    brand: str | None = Query(None, description="Filter by brand (e.g. Hero, Bajaj)"),
    low_stock_only: bool = Query(False, description="Filter only items below min stock threshold"),
    skip: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(50, ge=1, le=100, description="Page size limit"),
):
    """Search and browse spare parts with pagination and filters."""
    service = InventoryService(db)
    items, total = await service.search_catalog(
        query=q,
        brand=brand,
        low_stock_only=low_stock_only,
        skip=skip,
        limit=limit,
    )
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": items,
    }


# 3. Barcode Gun Scanner Lookup (Fast Point-of-Sale check)
@router.get("/barcode/{barcode}", response_model=SparePartResponse)
async def get_by_barcode(
    barcode: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Instant lookup when scanning a physical barcode at the billing counter."""
    service = InventoryService(db)
    return await service.get_part_by_barcode(barcode)


# 4. Get Part Details by ID
@router.get("/{part_id}", response_model=SparePartResponse)
async def get_spare_part(
    part_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get spare part details by unique ID."""
    service = InventoryService(db)
    return await service.get_part_by_id(part_id)


# 5. Update Spare Part (Admin & Store Manager only)
@router.put(
    "/{part_id}",
    response_model=SparePartResponse,
    dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.STORE_MANAGER]))],
)
async def update_spare_part(
    part_id: int,
    part_update: SparePartUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update spare part details, pricing, or rack location."""
    service = InventoryService(db)
    return await service.update_part(part_id, part_update)
```

---

#### 6. File Updated: `backend/app/api/v1/router.py`
```python
from fastapi import APIRouter
from app.api.v1.endpoints import auth, spare_parts

api_router = APIRouter()

# Register Authentication endpoints under /api/v1/auth
api_router.include_router(auth.router)

# Register Spare Parts endpoints under /api/v1/parts
api_router.include_router(spare_parts.router)
```

---

---

### Milestone 5: Atomic POS Billing Engine
- **Status**: `Completed` (2026-11-25)
- **Objective**: Build the core financial transaction engine: invoices, line items, payment tracking, immutable stock audit ledger, and atomic checkout transactions with row-level locking (`SELECT ... FOR UPDATE`).

#### 1. File Created: `backend/app/models/sale.py`
```python
import enum
from decimal import Decimal
from sqlalchemy import String, Integer, Numeric, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class PaymentMethod(str, enum.Enum):
    """Payment channels supported at the counter."""
    CASH = "CASH"
    CARD = "CARD"
    UPI = "UPI"
    CREDIT = "CREDIT"


class Sale(Base, TimestampMixin):
    """Customer sales invoice record."""
    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)

    customer_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    customer_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Staff member who handled this checkout
    cashier_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Financial Breakdown
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)  # GST
    grand_total: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    payment_method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod), default=PaymentMethod.CASH, nullable=False
    )

    # Relationships
    items: Mapped[list["SaleItem"]] = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")


class SaleItem(Base):
    """Individual line item sold within an invoice."""
    __tablename__ = "sale_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id"), nullable=False)
    spare_part_id: Mapped[int] = mapped_column(ForeignKey("spare_parts.id"), nullable=False)

    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    discount_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    total_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    # Relationship back to parent invoice
    sale: Mapped["Sale"] = relationship("Sale", back_populates="items")
```
> **Why**:
> - `cascade="all, delete-orphan"`: Deleting an invoice automatically cleans up its child line items.
> - `unit_price` stored on `SaleItem`: Preserves the historical price paid at the time of purchase even if the catalog price changes later.

---

#### 2. File Created: `backend/app/models/stock_movement.py`
```python
import enum
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, ForeignKey, Enum, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class StockMovementType(str, enum.Enum):
    SALE_OUT = "SALE_OUT"          # Sold at counter
    PURCHASE_IN = "PURCHASE_IN"    # Received from supplier
    RETURN_IN = "RETURN_IN"        # Customer return
    ADJUSTMENT = "ADJUSTMENT"      # Manual count adjustment / damage


class StockMovement(Base):
    """Immutable audit trail for every inventory change."""
    __tablename__ = "stock_movements"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    spare_part_id: Mapped[int] = mapped_column(ForeignKey("spare_parts.id"), nullable=False)

    movement_type: Mapped[StockMovementType] = mapped_column(Enum(StockMovementType), nullable=False)
    quantity_change: Mapped[int] = mapped_column(Integer, nullable=False)  # -2 for sale, +10 for purchase
    balance_after: Mapped[int] = mapped_column(Integer, nullable=False)    # New stock level after change

    reference_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # e.g., "SALE"
    reference_id: Mapped[int | None] = mapped_column(Integer, nullable=True)        # Invoice ID

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
```
> **Why**:
> - Provides an unalterable audit ledger of inventory. Every change (sales, returns, supplier orders) is recorded with `balance_after`, enabling shop owners to trace any stock discrepancy back to the exact timestamp and transaction.

---

#### 3. File Updated: `backend/app/models/__init__.py`
Registered `Sale`, `SaleItem`, `PaymentMethod`, `StockMovement`, and `StockMovementType`:
```python
from app.models.base import TimestampMixin
from app.models.user import User, UserRole
from app.models.spare_part import SparePart
from app.models.sale import Sale, SaleItem, PaymentMethod
from app.models.stock_movement import StockMovement, StockMovementType

__all__ = [
    "TimestampMixin",
    "User",
    "UserRole",
    "SparePart",
    "Sale",
    "SaleItem",
    "PaymentMethod",
    "StockMovement",
    "StockMovementType",
]
```

---

#### 4. Migration Generated & Applied: `f8446218d474_create_sales_and_stock_movements_tables.py`
```powershell
docker compose exec backend alembic revision --autogenerate -m "create sales and stock_movements tables"
docker compose exec backend alembic upgrade head
```
> Creates `sales`, `sale_items`, and `stock_movements` tables and foreign keys in PostgreSQL.

---

#### 5. File Created: `backend/app/schemas/billing.py`
```python
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict
from app.models.sale import PaymentMethod


# 1. Single Item in Customer's Shopping Cart
class CartItemInput(BaseModel):
    spare_part_id: int
    quantity: int
    discount_percent: Decimal = Decimal("0.00")  # Optional item-level discount


# 2. Checkout Payload (Sent from POS Counter)
class CheckoutRequest(BaseModel):
    customer_name: str | None = None
    customer_phone: str | None = None
    payment_method: PaymentMethod = PaymentMethod.CASH
    items: list[CartItemInput]


# 3. Line Item in the Invoice Response
class SaleItemResponse(BaseModel):
    id: int
    spare_part_id: int
    quantity: int
    unit_price: Decimal
    discount_percent: Decimal
    total_price: Decimal

    model_config = ConfigDict(from_attributes=True)


# 4. Complete Invoice Receipt Response (For Display & Printing)
class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    customer_name: str | None
    customer_phone: str | None
    cashier_id: int
    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal  # GST
    grand_total: Decimal
    payment_method: PaymentMethod
    created_at: datetime
    items: list[SaleItemResponse]

    model_config = ConfigDict(from_attributes=True)
```
> **Why**:
> - Separates the incoming counter cart input (`CheckoutRequest`) from the final rendered invoice receipt (`InvoiceResponse`).
> - Uses `from_attributes=True` to smoothly serialize async SQLAlchemy models with nested `SaleItem` relationships.

---

#### 6. File Created: `backend/app/services/billing_service.py`
```python
import random
from datetime import datetime, timezone
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.spare_part import SparePart
from app.models.sale import Sale, SaleItem
from app.models.stock_movement import StockMovement, StockMovementType
from app.schemas.billing import CheckoutRequest


class BillingService:
    """
    Core POS Checkout Engine:
    Handles atomic billing transactions, row-level locking, stock decrements,
    and audit ledger logging.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    def _generate_invoice_number(self) -> str:
        """Generates a unique invoice identifier like INV-20261125-142500-842."""
        now_str = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        rand_suffix = random.randint(100, 999)
        return f"INV-{now_str}-{rand_suffix}"

    async def process_checkout(self, checkout_data: CheckoutRequest, cashier_id: int) -> Sale:
        """
        Executes an atomic checkout:
        1. Locks matching rows in spare_parts with SELECT ... FOR UPDATE.
        2. Validates available stock for all items.
        3. Decrements stock and logs immutable StockMovement ledger entries.
        4. Calculates subtotal, discounts, 18% GST tax, and grand total.
        5. Commits the entire transaction or rolls back completely if anything fails.
        """
        if not checkout_data.items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Checkout cart cannot be empty.",
            )

        invoice_number = self._generate_invoice_number()
        sale_items: list[SaleItem] = []

        total_subtotal = Decimal("0.00")
        total_discount = Decimal("0.00")

        # Process each cart item under row-level database locks
        for item in checkout_data.items:
            if item.quantity <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Item quantity must be greater than 0.",
                )

            # ROW-LEVEL LOCK: with_for_update() locks this specific row in PostgreSQL!
            # If another counter cashier tries to sell this same part right now,
            # PostgreSQL makes them wait until this transaction completes.
            stmt = select(SparePart).where(SparePart.id == item.spare_part_id).with_for_update()
            result = await self.db.execute(stmt)
            part = result.scalar_one_or_none()

            if not part:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Spare part ID {item.spare_part_id} does not exist.",
                )

            # Strict stock availability check
            if part.quantity < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Insufficient stock for '{part.item_name}' (Part #{part.part_number}). "
                        f"Requested: {item.quantity}, Available: {part.quantity}."
                    ),
                )

            # Decrement physical stock on hand
            part.quantity -= item.quantity

            # Calculate line pricing & discounts
            line_subtotal = part.selling_price * item.quantity
            line_discount = line_subtotal * (item.discount_percent / Decimal("100.00"))
            line_total = line_subtotal - line_discount

            total_subtotal += line_subtotal
            total_discount += line_discount

            # Create line item
            sale_item = SaleItem(
                spare_part_id=part.id,
                quantity=item.quantity,
                unit_price=part.selling_price,
                discount_percent=item.discount_percent,
                total_price=line_total,
            )
            sale_items.append(sale_item)

            # Record immutable audit ledger entry
            movement = StockMovement(
                spare_part_id=part.id,
                movement_type=StockMovementType.SALE_OUT,
                quantity_change=-item.quantity,
                balance_after=part.quantity,
                reference_type="SALE",
            )
            self.db.add(movement)

        # Calculate 18% GST Tax on taxable amount
        taxable_amount = total_subtotal - total_discount
        tax_amount = round(taxable_amount * Decimal("0.18"), 2)
        grand_total = taxable_amount + tax_amount

        # Create master Sale record
        sale = Sale(
            invoice_number=invoice_number,
            customer_name=checkout_data.customer_name,
            customer_phone=checkout_data.customer_phone,
            cashier_id=cashier_id,
            subtotal=total_subtotal,
            discount_amount=total_discount,
            tax_amount=tax_amount,
            grand_total=grand_total,
            payment_method=checkout_data.payment_method,
            items=sale_items,
        )

        self.db.add(sale)

        # COMMIT EVERYTHING ATOMICALLY!
        # If any part failed above, PostgreSQL commits nothing.
        await self.db.commit()
        await self.db.refresh(sale)

        # Return with line items loaded
        return await self.get_invoice_by_id(sale.id)

    async def get_invoice_by_id(self, invoice_id: int) -> Sale:
        """Fetch an invoice and eagerly load all its line items."""
        stmt = (
            select(Sale)
            .options(selectinload(Sale.items))  # Eagerly loads items in async
            .where(Sale.id == invoice_id)
        )
        result = await self.db.execute(stmt)
        sale = result.scalar_one_or_none()

        if not sale:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Invoice #{invoice_id} not found.",
            )
        return sale
```
> **Why**:
> - `with_for_update()`: Locks the spare parts table rows at PostgreSQL database level. Prevents inventory negative balance / overselling race conditions when multiple cashiers check out simultaneously.
> - `selectinload(Sale.items)`: Eagerly fetches line items in a non-blocking asynchronous manner to avoid `MissingGreenlet` errors in SQLAlchemy 2.0 Async.

---

#### 7. File Created: `backend/app/api/v1/endpoints/billing.py`
```python
from typing import Annotated
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.schemas.billing import CheckoutRequest, InvoiceResponse
from app.services.billing_service import BillingService
from app.api.deps import get_current_user

router = APIRouter(prefix="/billing", tags=["POS Counter Billing"])


# 1. POS Checkout Endpoint
@router.post("/checkout", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def checkout(
    checkout_data: CheckoutRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Process counter checkout:
    - Atomically decrements stock using row-level locking.
    - Records immutable stock audit ledger entries.
    - Computes 18% GST tax and discounts.
    - Generates invoice receipt.
    """
    service = BillingService(db)
    return await service.process_checkout(checkout_data, cashier_id=current_user.id)


# 2. View Invoice Receipt by ID
@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Fetch complete invoice details with all line items for receipt printing."""
    service = BillingService(db)
    return await service.get_invoice_by_id(invoice_id)
```

---

#### 8. File Updated: `backend/app/api/v1/router.py`
```python
from fastapi import APIRouter
from app.api.v1.endpoints import auth, spare_parts, billing

api_router = APIRouter()

# Register Authentication endpoints under /api/v1/auth
api_router.include_router(auth.router)

# Register Spare Parts endpoints under /api/v1/parts
api_router.include_router(spare_parts.router)

# Register Billing & Checkout endpoints under /api/v1/billing
api_router.include_router(billing.router)
```

---

### Milestone 6: Excel Bulk Imports & Business Reporting
- **Status**: `Completed` (2026-11-25)
- **Objective**: Provide shop owners with Excel spreadsheet bulk imports (`.xlsx`) for instant catalog onboarding, and generate business analytics (daily counter sales, revenue totals, top-selling parts, and low-stock alerts).

#### 1. File Created: `backend/app/schemas/imports.py`
```python
from pydantic import BaseModel


class RowErrorDetail(BaseModel):
    """Details of any invalid or duplicate row in the uploaded Excel sheet."""
    row_number: int
    part_number: str | None = None
    reason: str


class ImportSummaryResponse(BaseModel):
    """Summary of the bulk catalog import operation."""
    filename: str
    total_rows_processed: int
    imported_count: int
    skipped_count: int
    errors: list[RowErrorDetail] = []
```
> **Why**: Returns comprehensive feedback to the user on Excel uploads—processing valid rows and providing line-number error logs for corrupt/duplicate rows.

---

#### 2. File Created: `backend/app/schemas/reports.py`
```python
from datetime import date
from decimal import Decimal
from pydantic import BaseModel


class PaymentBreakdown(BaseModel):
    """Total collected per payment channel (CASH, UPI, CARD, CREDIT)."""
    payment_method: str
    count: int
    total_amount: Decimal


class DailySalesSummary(BaseModel):
    """Daily revenue, tax, and settlement metrics for the shop owner."""
    report_date: date
    total_invoices: int
    total_subtotal: Decimal
    total_discount: Decimal
    total_tax: Decimal  # GST
    grand_total: Decimal
    payments_breakdown: list[PaymentBreakdown] = []


class TopSellingPart(BaseModel):
    """High-velocity parts ranked by units sold and revenue."""
    spare_part_id: int
    item_name: str
    part_number: str
    brand_name: str
    units_sold: int
    total_revenue: Decimal


class LowStockItem(BaseModel):
    """Urgent re-order alert for parts below minimum threshold."""
    id: int
    item_name: str
    brand_name: str
    part_number: str
    rack_number: str | None
    quantity: int
    min_stock_alert: int
```

---

#### 3. File Created: `backend/app/services/import_service.py`
```python
import io
from decimal import Decimal
import openpyxl
from fastapi import UploadFile, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.spare_part import SparePart
from app.models.stock_movement import StockMovement, StockMovementType
from app.schemas.imports import ImportSummaryResponse, RowErrorDetail


class ImportService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def import_parts_from_excel(self, file: UploadFile) -> ImportSummaryResponse:
        if not file.filename or not file.filename.endswith((".xlsx", ".xlsm")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file format. Please upload an Excel file ending with .xlsx.",
            )

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

        headers: dict[str, int] = {}
        header_row = [cell.value for cell in sheet[1]]
        for idx, col_name in enumerate(header_row):
            if col_name:
                normalized = str(col_name).strip().lower().replace(" ", "_")
                headers[normalized] = idx

        if "brand" in headers and "brand_name" not in headers:
            headers["brand_name"] = headers["brand"]

        required_headers = ["item_name", "brand_name", "part_number", "purchase_price", "selling_price"]
        missing = [h for h in required_headers if h not in headers]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required columns in Excel sheet: {', '.join(missing)}.",
            )

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

        for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            if not any(row):
                continue
            total_rows += 1

            def get_val(key: str, default=None):
                col_i = headers.get(key)
                if col_i is not None and col_i < len(row):
                    val = row[col_i]
                    return val if val is not None else default
                return default

            item_name = str(get_val("item_name", "")).strip()
            brand_name = str(get_val("brand_name", "")).strip()
            part_number = str(get_val("part_number", "")).strip()
            barcode = str(get_val("barcode", "")).strip() or None

            if not item_name or not brand_name or not part_number:
                errors.append(RowErrorDetail(
                    row_number=row_idx,
                    part_number=part_number or None,
                    reason="item_name, brand_name, and part_number cannot be empty.",
                ))
                skipped_count += 1
                continue

            if part_number in existing_part_numbers or part_number in batch_part_numbers:
                errors.append(RowErrorDetail(
                    row_number=row_idx,
                    part_number=part_number,
                    reason=f"Part number '{part_number}' already exists in database or spreadsheet.",
                ))
                skipped_count += 1
                continue

            if barcode and (barcode in existing_barcodes or barcode in batch_barcodes):
                errors.append(RowErrorDetail(
                    row_number=row_idx,
                    part_number=part_number,
                    reason=f"Barcode '{barcode}' already registered in database or spreadsheet.",
                ))
                skipped_count += 1
                continue

            try:
                purchase_price = Decimal(str(get_val("purchase_price", 0)))
                selling_price = Decimal(str(get_val("selling_price", 0)))
                quantity = int(get_val("quantity", 0) or 0)
                min_stock_alert = int(get_val("min_stock_alert", 5) or 5)
                cust_disc = Decimal(str(get_val("customer_discount", 0) or 0))
                mech_disc = Decimal(str(get_val("mechanic_discount", 0) or 0))
            except Exception as e:
                errors.append(RowErrorDetail(
                    row_number=row_idx,
                    part_number=part_number,
                    reason=f"Invalid numeric format: {str(e)}",
                ))
                skipped_count += 1
                continue

            new_part = SparePart(
                item_name=item_name,
                brand_name=brand_name,
                part_number=part_number,
                model_number=str(get_val("model_number", "")).strip() or None,
                compatible_bikes=str(get_val("compatible_bikes", "")).strip() or None,
                quantity=quantity,
                min_stock_alert=min_stock_alert,
                rack_number=str(get_val("rack_number", "")).strip() or None,
                purchase_price=purchase_price,
                selling_price=selling_price,
                customer_discount=cust_disc,
                mechanic_discount=mech_disc,
                barcode=barcode,
            )

            self.db.add(new_part)
            await self.db.flush()

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

        await self.db.commit()

        return ImportSummaryResponse(
            filename=file.filename or "uploaded.xlsx",
            total_rows_processed=total_rows,
            imported_count=imported_count,
            skipped_count=skipped_count,
            errors=errors,
        )
```

---

#### 4. File Created: `backend/app/api/v1/endpoints/imports.py`
```python
from typing import Annotated
from fastapi import APIRouter, Depends, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import UserRole
from app.schemas.imports import ImportSummaryResponse
from app.services.import_service import ImportService
from app.api.deps import require_role

router = APIRouter(prefix="/imports", tags=["Excel Bulk Imports"])


@router.post(
    "/parts-excel",
    response_model=ImportSummaryResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.STORE_MANAGER]))],
)
async def import_parts_from_excel(
    file: Annotated[UploadFile, File(description="Excel workbook (.xlsx) containing spare parts")],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = ImportService(db)
    return await service.import_parts_from_excel(file)
```

---

#### 5. File Created: `backend/app/services/report_service.py`
```python
from datetime import date, datetime, time, timezone
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sale import Sale, SaleItem
from app.models.spare_part import SparePart
from app.schemas.reports import (
    DailySalesSummary,
    PaymentBreakdown,
    TopSellingPart,
    LowStockItem,
)


class ReportService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_daily_sales_summary(self, target_date: date) -> DailySalesSummary:
        start_datetime = datetime.combine(target_date, time.min).replace(tzinfo=timezone.utc)
        end_datetime = datetime.combine(target_date, time.max).replace(tzinfo=timezone.utc)

        summary_stmt = select(
            func.count(Sale.id).label("total_invoices"),
            func.coalesce(func.sum(Sale.subtotal), Decimal("0.00")).label("total_subtotal"),
            func.coalesce(func.sum(Sale.discount_amount), Decimal("0.00")).label("total_discount"),
            func.coalesce(func.sum(Sale.tax_amount), Decimal("0.00")).label("total_tax"),
            func.coalesce(func.sum(Sale.grand_total), Decimal("0.00")).label("grand_total"),
        ).where(Sale.created_at >= start_datetime, Sale.created_at <= end_datetime)

        summary_res = await self.db.execute(summary_stmt)
        row = summary_res.one()

        payment_stmt = (
            select(
                Sale.payment_method,
                func.count(Sale.id).label("count"),
                func.coalesce(func.sum(Sale.grand_total), Decimal("0.00")).label("total_amount"),
            )
            .where(Sale.created_at >= start_datetime, Sale.created_at <= end_datetime)
            .group_by(Sale.payment_method)
        )

        payment_res = await self.db.execute(payment_stmt)
        breakdowns = [
            PaymentBreakdown(
                payment_method=r.payment_method.value if hasattr(r.payment_method, "value") else str(r.payment_method),
                count=r.count,
                total_amount=r.total_amount,
            )
            for r in payment_res.all()
        ]

        return DailySalesSummary(
            report_date=target_date,
            total_invoices=row.total_invoices or 0,
            total_subtotal=row.total_subtotal,
            total_discount=row.total_discount,
            total_tax=row.total_tax,
            grand_total=row.grand_total,
            payments_breakdown=breakdowns,
        )

    async def get_top_selling_parts(self, limit: int = 10) -> list[TopSellingPart]:
        stmt = (
            select(
                SparePart.id.label("spare_part_id"),
                SparePart.item_name,
                SparePart.part_number,
                SparePart.brand_name,
                func.sum(SaleItem.quantity).label("units_sold"),
                func.coalesce(func.sum(SaleItem.total_price), Decimal("0.00")).label("total_revenue"),
            )
            .join(SaleItem, SaleItem.spare_part_id == SparePart.id)
            .group_by(SparePart.id)
            .order_by(func.sum(SaleItem.quantity).desc())
            .limit(limit)
        )

        result = await self.db.execute(stmt)
        return [
            TopSellingPart(
                spare_part_id=r.spare_part_id,
                item_name=r.item_name,
                part_number=r.part_number,
                brand_name=r.brand_name,
                units_sold=r.units_sold,
                total_revenue=r.total_revenue,
            )
            for r in result.all()
        ]

    async def get_low_stock_report(self) -> list[LowStockItem]:
        stmt = (
            select(SparePart)
            .where(SparePart.quantity <= SparePart.min_stock_alert)
            .order_by(SparePart.quantity.asc())
        )
        result = await self.db.execute(stmt)
        parts = result.scalars().all()

        return [
            LowStockItem(
                id=p.id,
                item_name=p.item_name,
                brand_name=p.brand_name,
                part_number=p.part_number,
                rack_number=p.rack_number,
                quantity=p.quantity,
                min_stock_alert=p.min_stock_alert,
            )
            for p in parts
        ]
```

---

#### 6. File Created: `backend/app/api/v1/endpoints/reports.py`
```python
from datetime import date
from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import UserRole
from app.schemas.reports import DailySalesSummary, TopSellingPart, LowStockItem
from app.services.report_service import ReportService
from app.api.deps import require_role

router = APIRouter(prefix="/reports", tags=["Business Reports & Analytics"])


@router.get(
    "/daily-sales",
    response_model=DailySalesSummary,
    dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.STORE_MANAGER]))],
)
async def get_daily_sales(
    db: Annotated[AsyncSession, Depends(get_db)],
    target_date: date = Query(default_factory=date.today, description="Date for sales settlement (YYYY-MM-DD)"),
):
    service = ReportService(db)
    return await service.get_daily_sales_summary(target_date)


@router.get(
    "/top-selling",
    response_model=list[TopSellingPart],
    dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.STORE_MANAGER, UserRole.COUNTER_STAFF]))],
)
async def get_top_selling_parts(
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(default=10, ge=1, le=50, description="Number of top items to return"),
):
    service = ReportService(db)
    return await service.get_top_selling_parts(limit=limit)


@router.get(
    "/low-stock",
    response_model=list[LowStockItem],
    dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.STORE_MANAGER, UserRole.COUNTER_STAFF]))],
)
async def get_low_stock_report(
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = ReportService(db)
    return await service.get_low_stock_report()
```

---

#### 7. File Updated: `backend/app/api/v1/router.py`
```python
from fastapi import APIRouter
from app.api.v1.endpoints import auth, spare_parts, billing, imports, reports

api_router = APIRouter()

# Register Authentication endpoints under /api/v1/auth
api_router.include_router(auth.router)

# Register Spare Parts endpoints under /api/v1/parts
api_router.include_router(spare_parts.router)

# Register Billing & Checkout endpoints under /api/v1/billing
api_router.include_router(billing.router)

# Register Excel Bulk Import endpoints under /api/v1/imports
api_router.include_router(imports.router)

# Register Business Analytics Reports endpoints under /api/v1/reports
api_router.include_router(reports.router)
```

---

### Milestone 7: Docker Containerization & Next.js Integration
- **Status**: `In Progress`
- **Objective**: Connect the Next.js frontend to the live FastAPI backend container running in Docker Compose, configure API reverse proxying, and verify full end-to-end functionality.
