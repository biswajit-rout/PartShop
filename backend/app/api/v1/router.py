from fastapi import APIRouter
from app.api.v1.endpoints import auth, spare_parts, billing, imports, reports, brands, mechanics

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

# Register Brands endpoints under /api/v1/brands
api_router.include_router(brands.router)

# Register Mechanics & Commission endpoints under /api/v1/mechanics
api_router.include_router(mechanics.router)
