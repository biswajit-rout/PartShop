import { SparePart, StockStatus } from "@/types";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1";

/**
 * Maps snake_case backend FastAPI models to camelCase Next.js frontend models.
 */
function mapBackendPartToFrontend(part: any): SparePart {
    let status: StockStatus = "In Stock";
    if (part.quantity <= 0) {
        status = "Out of Stock";
    } else if (part.quantity <= (part.min_stock_alert || 5)) {
        status = "Low Stock";
    }

    return {
        id: String(part.id),
        name: part.item_name,
        brand: part.brand_name,
        partNumber: part.part_number,
        modelNumber: part.model_number || "",
        compatibleBikes: part.compatible_bikes || "",
        quantity: part.quantity,
        rackNumber: part.rack_number || "Unassigned",
        purchasePrice: Number(part.purchase_price),
        sellingPrice: Number(part.selling_price),
        customerDiscount: Number(part.customer_discount || 0),
        mechanicDiscount: Number(part.mechanic_discount || 0),
        status,
        barcode: part.barcode || "",
    };
}

export const api = {
    /**
     * Fetch all spare parts from the live PostgreSQL catalog.
     */
    async getSpareParts(search?: string, brand?: string): Promise<SparePart[]> {
        const params = new URLSearchParams();
        if (search) params.append("q", search);
        if (brand && brand !== "All") params.append("brand", brand);
        params.append("limit", "100");

        const res = await fetch(`${API_BASE_URL}/parts/?${params.toString()}`, {
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch parts: ${res.statusText}`);
        }

        const data = await res.json();
        return (data.items || []).map(mapBackendPartToFrontend);
    },

    /**
     * Look up a part instantly by barcode scan.
     */
    async getPartByBarcode(barcode: string): Promise<SparePart | null> {
        const res = await fetch(`${API_BASE_URL}/parts/barcode/${barcode}`);
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("Barcode lookup failed");
        const data = await res.json();
        return mapBackendPartToFrontend(data);
    },

    /**
     * Execute an atomic POS checkout transaction.
     */
    async checkout(payload: {
        customer_name?: string;
        customer_phone?: string;
        payment_method: string;
        items: { spare_part_id: number; quantity: number; discount_percent?: number }[];
    }) {
        const res = await fetch(`${API_BASE_URL}/billing/checkout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: res.statusText }));
            throw new Error(err.detail || "Checkout transaction failed");
        }

        return await res.json();
    },

    /**
     * Upload an Excel workbook (.xlsx) to bulk import spare parts.
     */
    async uploadPartsExcel(file: File) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`${API_BASE_URL}/imports/parts-excel`, {
            method: "POST",
            body: formData,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: res.statusText }));
            throw new Error(err.detail || "Bulk import failed");
        }

        return await res.json();
    },

    /**
     * Fetch daily sales reconciliation totals.
     */
    async getDailySales(dateStr?: string) {
        const url = dateStr
            ? `${API_BASE_URL}/reports/daily-sales?target_date=${dateStr}`
            : `${API_BASE_URL}/reports/daily-sales`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch daily sales");
        return await res.json();
    },

    /**
     * Fetch low stock alert items.
     */
    async getLowStockItems() {
        const res = await fetch(`${API_BASE_URL}/reports/low-stock`);
        if (!res.ok) throw new Error("Failed to fetch low stock report");
        return await res.json();
    },
};