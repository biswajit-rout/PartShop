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
            stmt = select(SparePart).where(SparePart.id ==
                                           item.spare_part_id).with_for_update()
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
            line_discount = line_subtotal * \
                (item.discount_percent / Decimal("100.00"))
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
