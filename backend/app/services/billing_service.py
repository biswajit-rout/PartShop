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
from app.models.mechanic import Mechanic, MechanicBrandCommission
from app.schemas.billing import CheckoutRequest


class BillingService:
    """
    Core POS Checkout Engine:
    Handles atomic billing transactions, row-level locking, stock decrements,
    mechanic brand commission computations, and audit ledger logging.
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
        3. Looks up mechanic and their brand-specific commission percentage matrix.
        4. Decrements stock and logs immutable StockMovement ledger entries.
        5. Computes line discounts, 18% GST tax, and grand total.
        6. Commits transaction atomically.
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

        # 1. Resolve Mechanic & Brand Commission Matrix (if mechanic assigned)
        mechanic = None
        brand_commission_map: dict[str, Decimal] = {}
        if checkout_data.mechanic_id:
            mech_stmt = (
                select(Mechanic)
                .options(selectinload(Mechanic.brand_commissions).selectinload(MechanicBrandCommission.brand))
                .where(Mechanic.id == checkout_data.mechanic_id)
            )
            mech_res = await self.db.execute(mech_stmt)
            mechanic = mech_res.scalar_one_or_none()
            if not mechanic:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Mechanic ID {checkout_data.mechanic_id} not found."
                )
            for bc in mechanic.brand_commissions:
                if bc.brand:
                    brand_commission_map[bc.brand.name.lower().strip()] = bc.commission_percentage

        # 2. Process each cart item under row-level database locks
        for item in checkout_data.items:
            if item.quantity <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Item quantity must be greater than 0.",
                )

            # ROW-LEVEL LOCK: with_for_update() locks this specific row in PostgreSQL
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

            # Calculate mechanic commission for this specific item & brand
            comm_pct = Decimal("0.00")
            comm_amt = Decimal("0.00")
            if mechanic:
                part_brand = (part.brand_name or "").lower().strip()
                if part_brand in brand_commission_map:
                    comm_pct = brand_commission_map[part_brand]
                else:
                    comm_pct = mechanic.default_commission_percentage
                comm_amt = round((line_total * comm_pct) / Decimal("100.00"), 2)

            # Create line item
            sale_item = SaleItem(
                spare_part_id=part.id,
                mechanic_id=mechanic.id if mechanic else None,
                commission_percentage=comm_pct,
                commission_amount=comm_amt,
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

        # Create and persist the Sale invoice header
        sale = Sale(
            invoice_number=invoice_number,
            customer_name=checkout_data.customer_name,
            customer_phone=checkout_data.customer_phone,
            cashier_id=cashier_id,
            mechanic_id=mechanic.id if mechanic else None,
            subtotal=total_subtotal,
            discount_amount=total_discount,
            tax_amount=tax_amount,
            grand_total=grand_total,
            payment_method=checkout_data.payment_method,
            items=sale_items,
        )

        self.db.add(sale)
        await self.db.commit()
        await self.db.refresh(sale)

        # Reload with items for response serialization
        stmt_reload = (
            select(Sale)
            .options(selectinload(Sale.items))
            .where(Sale.id == sale.id)
        )
        res_reload = await self.db.execute(stmt_reload)
        return res_reload.scalar_one()

    async def get_invoice_by_id(self, invoice_id: int) -> Sale:
        """Fetch invoice with line items by ID."""
        stmt = (
            select(Sale)
            .options(selectinload(Sale.items))
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
