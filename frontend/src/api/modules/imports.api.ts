const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1";

export interface RowErrorDetail {
  row_number: number;
  part_number?: string | null;
  reason: string;
}

export interface ImportSummaryResponse {
  filename: string;
  total_rows_processed: number;
  imported_count: number;
  skipped_count: number;
  errors: RowErrorDetail[];
}

export const importsApi = {
  /**
   * Upload Excel (.xlsx) file for catalog bulk import.
   */
  async uploadCatalogExcel(file: File): Promise<ImportSummaryResponse> {
    const formData = new FormData();
    formData.append("file", file);

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
