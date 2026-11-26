const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1";

export interface RowErrorDetail {
  row_number: number;
  part_number?: string | null;
  reason: string;
}

export interface ImportSummaryResponse {
  filename: string;
  supplier_id?: number | null;
  supplier_name?: string | null;
  total_rows_processed: number;
  imported_count: number;
  skipped_count: number;
  errors: RowErrorDetail[];
}

export const importsApi = {
  /**
   * Upload Excel (.xlsx) file for catalog bulk import with optional supplier and brand mapping.
   */
  async uploadCatalogExcel(
    file: File,
    supplierId?: number | string,
    brandName?: string,
    defaultSupplierDiscount?: number
  ): Promise<ImportSummaryResponse> {
    const formData = new FormData();
    formData.append("file", file);
    if (supplierId && supplierId !== "None" && supplierId !== "All") {
      formData.append("supplier_id", String(supplierId));
    }
    if (brandName && brandName.trim()) {
      formData.append("brand_name", brandName.trim());
    }
    if (defaultSupplierDiscount !== undefined && defaultSupplierDiscount !== null && !isNaN(defaultSupplierDiscount)) {
      formData.append("default_supplier_discount", String(defaultSupplierDiscount));
    }

    const token =
      typeof window !== "undefined" ? localStorage.getItem("partshop_token") : null;

    const res = await fetch(`${API_BASE_URL}/imports/parts-excel`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Upload failed: ${res.statusText}`);
    }

    return res.json();
  },
};
