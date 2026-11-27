import random
from datetime import date, datetime, timezone
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.spare_part import SparePart
from app.models.sale import Sale, SaleItem, SaleStatus
from app.models.stock_movement import StockMovement, StockMovementType
from app.models.mechanic import Mechanic, MechanicBrandCommission
from app.schemas.billing import CheckoutRequest, InvoiceUpdateRequest, InvoiceCancelRequest


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

    async def list_invoices(
        self,
        skip: int = 0,
        limit: int = 50,
        search: str | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        status: SaleStatus | None = None,
    ) -> list[Sale]:
        """Fetch paginated sales invoices with date range, search, and status filters."""
        stmt = (
            select(Sale)
            .options(
                selectinload(Sale.items).selectinload(SaleItem.spare_part),
                selectinload(Sale.mechanic),
            )
            .order_by(Sale.created_at.desc())
        )
        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            stmt = stmt.where(
                (Sale.invoice_number.ilike(term))
                | (Sale.customer_name.ilike(term))
                | (Sale.customer_phone.ilike(term))
            )
        if start_date:
            stmt = stmt.where(func.date(Sale.created_at) >= start_date)
        if end_date:
            stmt = stmt.where(func.date(Sale.created_at) <= end_date)
        if status:
            stmt = stmt.where(Sale.status == status)

        stmt = stmt.offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update_invoice(
        self,
        invoice_id: int,
        update_data: InvoiceUpdateRequest,
    ) -> Sale:
        """
        Update customer details, payment method, mechanic, or line items on an existing invoice:
        - If items are modified or removed:
          1. Locks affected spare_parts rows under SELECT ... FOR UPDATE.
          2. Calculates net quantity change (delta) for each part.
          3. Decrements stock & logs SALE_OUT if quantity increased.
          4. Returns stock & logs RETURN_IN if quantity decreased or item removed.
          5. Rebuilds line items and recalculates subtotal, discounts, 18% GST, grand total, and commissions.
        """
        stmt = (
            select(Sale)
            .options(
                selectinload(Sale.items).selectinload(SaleItem.spare_part),
                selectinload(Sale.mechanic),
            )
            .where(Sale.id == invoice_id)
            .with_for_update()
        )
        result = await self.db.execute(stmt)
        sale = result.scalar_one_or_none()
        if not sale:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Invoice #{invoice_id} not found.",
            )

        if sale.status == SaleStatus.VOIDED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot modify invoice #{sale.invoice_number} because it has been cancelled/voided.",
            )

        # 1. Update basic header metadata
        if update_data.customer_name is not None:
            sale.customer_name = update_data.customer_name.strip() or None
        if update_data.customer_phone is not None:
            sale.customer_phone = update_data.customer_phone.strip() or None
        if update_data.payment_method is not None:
            sale.payment_method = update_data.payment_method
        if update_data.mechanic_id is not None:
            sale.mechanic_id = update_data.mechanic_id if update_data.mechanic_id > 0 else None

        # 2. Update line items and recalculate financials & stock movements
        if update_data.items is not None:
            if len(update_data.items) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="An invoice must contain at least one item. To cancel the entire invoice, use the Return & Void option instead.",
                )

            # Consolidate duplicate requested parts in the payload
            new_items_dict: dict[int, CartItemInput] = {}
            for it in update_data.items:
                if it.quantity <= 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Item quantity must be greater than zero.",
                    )
                if it.spare_part_id in new_items_dict:
                    prev = new_items_dict[it.spare_part_id]
                    new_items_dict[it.spare_part_id] = CartItemInput(
                        spare_part_id=it.spare_part_id,
                        quantity=prev.quantity + it.quantity,
                        discount_percent=it.discount_percent or prev.discount_percent,
                    )
                else:
                    new_items_dict[it.spare_part_id] = it

            # Map existing line items on the invoice
            current_item_map: dict[int, SaleItem] = {
                item.spare_part_id: item for item in sale.items
            }

            all_part_ids = set(current_item_map.keys()) | set(new_items_dict.keys())

            # Row-level lock all affected parts
            part_stmt = (
                select(SparePart)
                .where(SparePart.id.in_(all_part_ids))
                .with_for_update()
            )
            part_res = await self.db.execute(part_stmt)
            parts_by_id = {p.id: p for p in part_res.scalars().all()}

            # Verify all requested new parts exist
            for pid in new_items_dict.keys():
                if pid not in parts_by_id:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Spare part ID {pid} does not exist.",
                    )

            # Calculate and execute physical stock adjustments
            for pid in all_part_ids:
                part = parts_by_id[pid]
                old_qty = current_item_map[pid].quantity if pid in current_item_map else 0
                new_qty = new_items_dict[pid].quantity if pid in new_items_dict else 0
                delta = new_qty - old_qty

                if delta > 0:
                    # Additional stock required
                    if part.quantity < delta:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=(
                                f"Insufficient stock for '{part.item_name}' (Part #{part.part_number}). "
                                f"Additional required: {delta}, Available in stock: {part.quantity}."
                            ),
                        )
                    part.quantity -= delta
                    self.db.add(
                        StockMovement(
                            spare_part_id=part.id,
                            movement_type=StockMovementType.SALE_OUT,
                            quantity_change=-delta,
                            balance_after=part.quantity,
                            reference_type="SALE_EDIT",
                            reference_id=sale.id,
                        )
                    )
                elif delta < 0:
                    # Items returned to inventory
                    restock_qty = abs(delta)
                    part.quantity += restock_qty
                    self.db.add(
                        StockMovement(
                            spare_part_id=part.id,
                            movement_type=StockMovementType.RETURN_IN,
                            quantity_change=restock_qty,
                            balance_after=part.quantity,
                            reference_type="SALE_EDIT",
                            reference_id=sale.id,
                        )
                    )

            # Resolve mechanic commission matrix (if assigned)
            mechanic = None
            brand_commission_map: dict[str, Decimal] = {}
            if sale.mechanic_id:
                mech_stmt = (
                    select(Mechanic)
                    .options(selectinload(Mechanic.brand_commissions).selectinload(MechanicBrandCommission.brand))
                    .where(Mechanic.id == sale.mechanic_id)
                )
                mech_res = await self.db.execute(mech_stmt)
                mechanic = mech_res.scalar_one_or_none()
                if mechanic:
                    for bc in mechanic.brand_commissions:
                        if bc.brand:
                            brand_commission_map[bc.brand.name.lower().strip()] = bc.commission_percentage

            # Rebuild line items and recalculate totals
            total_subtotal = Decimal("0.00")
            total_discount = Decimal("0.00")
            new_sale_items: list[SaleItem] = []

            for pid, item_input in new_items_dict.items():
                part = parts_by_id[pid]
                line_subtotal = part.selling_price * item_input.quantity
                line_discount = round(line_subtotal * (item_input.discount_percent / Decimal("100.00")), 2)
                line_total = line_subtotal - line_discount
                total_subtotal += line_subtotal
                total_discount += line_discount

                comm_pct = Decimal("0.00")
                comm_amt = Decimal("0.00")
                if mechanic:
                    part_brand = (part.brand_name or "").lower().strip()
                    if part_brand in brand_commission_map:
                        comm_pct = brand_commission_map[part_brand]
                    else:
                        comm_pct = mechanic.default_commission_percentage
                    comm_amt = round((line_total * comm_pct) / Decimal("100.00"), 2)

                new_sale_items.append(
                    SaleItem(
                        spare_part_id=part.id,
                        mechanic_id=mechanic.id if mechanic else None,
                        commission_percentage=comm_pct,
                        commission_amount=comm_amt,
                        quantity=item_input.quantity,
                        unit_price=part.selling_price,
                        discount_percent=item_input.discount_percent,
                        total_price=line_total,
                    )
                )

            # Recompute 18% GST and Grand Total
            taxable_amount = total_subtotal - total_discount
            tax_amount = round(taxable_amount * Decimal("0.18"), 2)
            grand_total = taxable_amount + tax_amount

            # Assign new items collection to sale (cascade handles delete-orphan & insertion)
            sale.items = new_sale_items
            sale.subtotal = total_subtotal
            sale.discount_amount = total_discount
            sale.tax_amount = tax_amount
            sale.grand_total = grand_total

        await self.db.commit()

        # Expire local session cache to reload freshly committed items and relationships
        self.db.expire_all()
        reload_stmt = (
            select(Sale)
            .options(
                selectinload(Sale.items).selectinload(SaleItem.spare_part),
                selectinload(Sale.mechanic),
            )
            .where(Sale.id == invoice_id)
        )
        reload_res = await self.db.execute(reload_stmt)
        return reload_res.scalar_one()

    async def cancel_invoice(
        self,
        invoice_id: int,
        cancel_data: InvoiceCancelRequest,
    ) -> Sale:
        """
        Void/cancel an invoice when customer returns items:
        1. Checks invoice is not already voided.
        2. Restores inventory quantity under row locks for all line items.
        3. Records immutable RETURN_IN audit ledger entries.
        4. Marks sale as VOIDED with cancellation reason and timestamp.
        """
        stmt = (
            select(Sale)
            .options(
                selectinload(Sale.items).selectinload(SaleItem.spare_part),
                selectinload(Sale.mechanic),
            )
            .where(Sale.id == invoice_id)
            .with_for_update()
        )
        result = await self.db.execute(stmt)
        sale = result.scalar_one_or_none()
        if not sale:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Invoice #{invoice_id} not found.",
            )

        if sale.status == SaleStatus.VOIDED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invoice #{sale.invoice_number} is already cancelled/voided.",
            )

        # Restore physical stock for every sold item and log audit trail
        for item in sale.items:
            part_stmt = select(SparePart).where(SparePart.id == item.spare_part_id).with_for_update()
            part_res = await self.db.execute(part_stmt)
            part = part_res.scalar_one_or_none()
            if part:
                part.quantity += item.quantity
                movement = StockMovement(
                    spare_part_id=part.id,
                    movement_type=StockMovementType.RETURN_IN,
                    quantity_change=item.quantity,
                    balance_after=part.quantity,
                    reference_type="SALE_VOID",
                    reference_id=sale.id,
                )
                self.db.add(movement)

        # Update sale header status
        sale.status = SaleStatus.VOIDED
        sale.cancellation_reason = (
            cancel_data.reason.strip()
            if cancel_data.reason and cancel_data.reason.strip()
            else "Customer returned items / Invoice voided"
        )
        sale.cancelled_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(sale)
        return sale
