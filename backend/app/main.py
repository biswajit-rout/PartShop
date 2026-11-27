from fastapi import FastAPI, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import get_db
from app.api.v1.router import api_router


# 1. Initialize the FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for PartShop Motorcycle Spare Parts Management & POS",
)

# 2. Add CORS Middleware
# Why: Browsers block a frontend (http://localhost:3000) from calling
# an API on a different port (http://localhost:8001) unless CORS is allowed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX or None,
    allow_credentials=True,
    allow_methods=["*"],  # Allows GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],  # Allows Authorization headers, JSON content types
)

# Mount API v1 router
app.include_router(api_router, prefix="/api/v1")

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
# @app.get("/health")
# async def health_check():
#     """Used by Docker and monitoring services to verify server health."""
#     return {
#         "status": "healthy",
#         "service": settings.PROJECT_NAME,
#         "version": settings.VERSION
#     }

@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Health check endpoint that verifies server and PostgreSQL connectivity."""
    db_status = "connected"
    try:
        # Executes a lightweight ping to PostgreSQL
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"disconnected: {str(e)}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "environment": settings.ENVIRONMENT,
        "version": settings.VERSION,
    }
