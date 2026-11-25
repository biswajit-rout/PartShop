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
  created_at: string;
  items: InvoiceItemResponse[];
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
   * Fetch invoice details for receipt printing.
   */
  async getInvoiceById(invoiceId: number): Promise<InvoiceResponse> {
    return apiClient<InvoiceResponse>(`/billing/invoices/${invoiceId}`);
  },
};
