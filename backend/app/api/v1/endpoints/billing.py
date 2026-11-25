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
