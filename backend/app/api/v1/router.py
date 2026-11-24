from fastapi import APIRouter
from app.api.v1.endpoints import auth, spare_parts

api_router = APIRouter()

# Register Authentication endpoints under /api/v1/auth
api_router.include_router(auth.router)

# Register Spare Parts endpoints under /api/v1/spare-parts
api_router.include_router(spare_parts.router)
