from datetime import date
from typing import Annotated
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.models.sale import SaleStatus
from app.schemas.billing import CheckoutRequest, InvoiceResponse, InvoiceUpdateRequest, InvoiceCancelRequest
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


# 2. List Past Invoices Endpoint
@router.get("/invoices", response_model=list[InvoiceResponse])
async def list_invoices(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    skip: int = 0,
    limit: int = 50,
    search: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    status: SaleStatus | None = None,
):
    """Fetch recent customer sales invoices with pagination, search, date range, and status filters."""
    service = BillingService(db)
    return await service.list_invoices(
        skip=skip,
        limit=limit,
        search=search,
        start_date=start_date,
        end_date=end_date,
        status=status,
    )


# 3. View Invoice Receipt by ID
@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Fetch complete invoice details with all line items for receipt printing."""
    service = BillingService(db)
    return await service.get_invoice_by_id(invoice_id)


# 4. Modify Invoice Details (Customer Name, Phone, Payment Method, or Line Items)
@router.put("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: int,
    update_data: InvoiceUpdateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Modify an existing invoice:
    - Update customer details or payment method.
    - Add, edit quantity/discount, or remove line items.
    - Automatically adjusts physical stock and logs SALE_OUT / RETURN_IN audit movements.
    - Recalculates subtotal, discounts, 18% GST tax, and grand total.
    """
    service = BillingService(db)
    return await service.update_invoice(invoice_id=invoice_id, update_data=update_data)


# 5. Void / Cancel Invoice and Return Parts to Stock
@router.post("/invoices/{invoice_id}/cancel", response_model=InvoiceResponse)
async def cancel_invoice(
    invoice_id: int,
    cancel_data: InvoiceCancelRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Void a previously generated invoice:
    - Atomically returns item quantities back into available inventory.
    - Records immutable RETURN_IN audit entries in stock_movements.
    - Sets invoice lifecycle status to VOIDED with cancellation audit reason.
    """
    service = BillingService(db)
    return await service.cancel_invoice(invoice_id=invoice_id, cancel_data=cancel_data)
