from datetime import date
from decimal import Decimal
from pydantic import BaseModel


class PaymentBreakdown(BaseModel):
    """Total collected per payment channel (CASH, UPI, CARD, CREDIT)."""
    payment_method: str
    count: int
    total_amount: Decimal


class DailySalesSummary(BaseModel):
    """Daily revenue, tax, and settlement metrics for the shop owner."""
    report_date: date
    total_invoices: int
    total_subtotal: Decimal
    total_discount: Decimal
    total_tax: Decimal  # GST
    grand_total: Decimal
    payments_breakdown: list[PaymentBreakdown] = []


class TopSellingPart(BaseModel):
    """High-velocity parts ranked by units sold and revenue."""
    spare_part_id: int
    item_name: str
    part_number: str
    brand_name: str
    units_sold: int
    total_revenue: Decimal


class LowStockItem(BaseModel):
    """Urgent re-order alert for parts below minimum threshold."""
    id: int
    item_name: str
    brand_name: str
    part_number: str
    rack_number: str | None
    quantity: int
    min_stock_alert: int


class WeeklyTrendPoint(BaseModel):
    """Daily revenue and wholesale purchase expenditure data point for trend charts."""
    day: str          # e.g. "Mon", "Tue", "Wed"
    date: date        # e.g. 2026-11-26
    sales: Decimal    # Counter retail sales
    purchase: Decimal # Wholesale goods inward purchases
