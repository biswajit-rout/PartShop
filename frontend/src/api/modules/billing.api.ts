import { apiClient } from "../client";

export interface CartItemPayload {
  spare_part_id: number;
  quantity: number;
  discount_percent?: number;
}

export interface CheckoutPayload {
  customer_name?: string;
  customer_phone?: string;
  payment_method: "CASH" | "CARD" | "UPI" | "CREDIT";
  mechanic_id?: number | null;
  items: CartItemPayload[];
}

export interface InvoiceItemResponse {
  id: number;
  spare_part_id: number;
  mechanic_id?: number | null;
  commission_percentage?: string | number;
  commission_amount?: string | number;
  quantity: number;
  unit_price: string;
  discount_percent: string;
  total_price: string;
}

export interface InvoiceResponse {
  id: number;
  invoice_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  cashier_id: number;
  mechanic_id?: number | null;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  grand_total: string;
  payment_method: string;
  status: "COMPLETED" | "VOIDED";
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  items: InvoiceItemResponse[];
}

export interface InvoiceUpdateRequest {
  customer_name?: string | null;
  customer_phone?: string | null;
  payment_method?: "CASH" | "CARD" | "UPI" | "CREDIT";
  mechanic_id?: number | null;
  items?: CartItemPayload[];
}

export interface InvoiceCancelPayload {
  reason?: string | null;
}

export const billingApi = {
  /**
   * Process counter checkout with atomic stock decrements and mechanic commission calculations.
   */
  async checkout(payload: CheckoutPayload): Promise<InvoiceResponse> {
    return apiClient<InvoiceResponse>("/billing/checkout", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Fetch recent generated invoices with optional search, date range, and status filters.
   */
  async getInvoices(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    start_date?: string;
    end_date?: string;
    status?: "COMPLETED" | "VOIDED";
  }): Promise<InvoiceResponse[]> {
    const q = new URLSearchParams();
    if (params?.skip) q.append("skip", params.skip.toString());
    if (params?.limit) q.append("limit", params.limit.toString());
    if (params?.search) q.append("search", params.search);
    if (params?.start_date) q.append("start_date", params.start_date);
    if (params?.end_date) q.append("end_date", params.end_date);
    if (params?.status) q.append("status", params.status);
    const queryString = q.toString() ? `?${q.toString()}` : "";
    return apiClient<InvoiceResponse[]>(`/billing/invoices${queryString}`);
  },

  /**
   * Fetch invoice details for receipt printing.
   */
  async getInvoiceById(invoiceId: number): Promise<InvoiceResponse> {
    return apiClient<InvoiceResponse>(`/billing/invoices/${invoiceId}`);
  },

  /**
   * Modify invoice header details (customer name, phone, payment method).
   */
  async updateInvoice(invoiceId: number, payload: InvoiceUpdateRequest): Promise<InvoiceResponse> {
    return apiClient<InvoiceResponse>(`/billing/invoices/${invoiceId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Void / cancel an invoice and return items back to inventory.
   */
  async cancelInvoice(invoiceId: number, reason?: string): Promise<InvoiceResponse> {
    return apiClient<InvoiceResponse>(`/billing/invoices/${invoiceId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },
};
