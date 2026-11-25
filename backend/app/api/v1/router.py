from fastapi import APIRouter
from app.api.v1.endpoints import auth, spare_parts, billing

api_router = APIRouter()

# Register Authentication endpoints under /api/v1/auth
api_router.include_router(auth.router)

# Register Spare Parts endpoints under /api/v1/parts
api_router.include_router(spare_parts.router)

# Register Billing & Checkout endpoints under /api/v1/billing
api_router.include_router(billing.router)
