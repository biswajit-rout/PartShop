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
