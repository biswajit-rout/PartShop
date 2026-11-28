import { apiClient } from "../client";
import { SparePart, StockStatus } from "@/types";

export interface BackendSparePart {
  id: number;
  item_name: string;
  brand_name: string;
  part_number: string;
  model_number?: string | null;
  compatible_bikes?: string | null;
  supplier_id?: number | null;
  supplier_name?: string | null;
  supplier_discount?: string | number;
  quantity: number;
  min_stock_alert: number;
  rack_number?: string | null;
  purchase_price: string | number;
  selling_price: string | number;
  customer_discount?: string | number;
  mechanic_discount?: string | number;
  barcode?: string | null;
  is_confirmed?: boolean;
}

export interface PaginatedPartsResponse {
  total: number;
  skip: number;
  limit: number;
  items: BackendSparePart[];
}

/**
 * Adapter: Transforms backend snake_case model to frontend camelCase model.
 */
export function mapBackendPartToFrontend(part: BackendSparePart): SparePart {
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
    supplierId: part.supplier_id || null,
    supplierName: part.supplier_name || null,
    supplierDiscount: Number(part.supplier_discount || 0),
    quantity: part.quantity,
    rackNumber: part.rack_number || "Unassigned",
    purchasePrice: Number(part.purchase_price),
    sellingPrice: Number(part.selling_price),
    customerDiscount: Number(part.customer_discount || 0),
    mechanicDiscount: Number(part.mechanic_discount || 0),
    status,
    barcode: part.barcode || "",
    isConfirmed: part.is_confirmed !== false,
  };
}

export const partsApi = {
  /**
   * Search and list spare parts with optional text, brand, supplier, and confirmation filters.
   */
  async getAll(
    search?: string,
    brand?: string,
    supplierId?: number | string,
    isConfirmed?: boolean
  ): Promise<SparePart[]> {
    const data = await apiClient<PaginatedPartsResponse>("/parts", {
      params: {
        q: search,
        brand: brand && brand !== "All" ? brand : undefined,
        supplier_id: supplierId && supplierId !== "All" ? supplierId : undefined,
        is_confirmed: isConfirmed !== undefined ? String(isConfirmed) : undefined,
        limit: 500,
      },
      cache: "no-store",
    });
    return (data.items || []).map(mapBackendPartToFrontend);
  },

  /**
   * Fast barcode gun scanner query (< 5ms).
   */
  async getByBarcode(barcode: string): Promise<SparePart | null> {
    try {
      const data = await apiClient<BackendSparePart>(`/parts/barcode/${encodeURIComponent(barcode)}`);
      return mapBackendPartToFrontend(data);
    } catch {
      return null;
    }
  },

  /**
   * Add a single new spare part to inventory.
   */
  async create(partData: Partial<BackendSparePart>): Promise<SparePart> {
    const data = await apiClient<BackendSparePart>("/parts", {
      method: "POST",
      body: JSON.stringify(partData),
    });
    return mapBackendPartToFrontend(data);
  },

  /**
   * Update an existing spare part's details, pricing, stock, or location.
   */
  async update(id: number | string, partData: Partial<BackendSparePart>): Promise<SparePart> {
    const data = await apiClient<BackendSparePart>(`/parts/${id}`, {
      method: "PUT",
      body: JSON.stringify(partData),
    });
    return mapBackendPartToFrontend(data);
  },

  /**
   * Delete a spare part from catalog.
   */
  async delete(id: number | string): Promise<void> {
    await apiClient<void>(`/parts/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * Fast Goods Inward / Restock an existing spare part.
   */
  async restock(
    id: number | string,
    payload: {
      quantity_to_add: number;
      purchase_price?: number;
      rack_number?: string;
    }
  ): Promise<SparePart> {
    const data = await apiClient<BackendSparePart>(`/parts/${id}/restock`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return mapBackendPartToFrontend(data);
  },

  /**
   * Bind or update a barcode for a spare part.
   */
  async assignBarcode(id: number | string, barcode: string): Promise<SparePart> {
    const data = await apiClient<BackendSparePart>(`/parts/${id}`, {
      method: "PUT",
      body: JSON.stringify({ barcode }),
    });
    return mapBackendPartToFrontend(data);
  },

  /**
   * Batch confirm unconfirmed or imported spare parts.
   */
  async confirmParts(partIds: (number | string)[]): Promise<{ confirmed_count: number; part_ids: number[] }> {
    const numericIds = partIds.map((id) => (typeof id === "string" ? parseInt(id, 10) : id));
    return await apiClient<{ confirmed_count: number; part_ids: number[] }>("/parts/confirm-batch", {
      method: "POST",
      body: JSON.stringify({ part_ids: numericIds }),
    });
  },

  /**
   * Confirm a single spare part, optionally updating rack number at the same time.
   */
  async confirmPart(id: number | string, rackNumber?: string): Promise<SparePart> {
    const data = await apiClient<BackendSparePart>(`/parts/${id}/confirm`, {
      method: "POST",
      body: JSON.stringify({ rack_number: rackNumber }),
    });
    return mapBackendPartToFrontend(data);
  },
};
