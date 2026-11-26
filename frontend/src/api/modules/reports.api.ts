import { apiClient } from "../client";

export interface PaymentBreakdown {
  payment_method: string;
  count: number;
  total_amount: string | number;
}

export interface DailySalesSummary {
  report_date: string;
  total_invoices: number;
  total_subtotal: string | number;
  total_discount: string | number;
  total_tax: string | number;
  grand_total: string | number;
  payments_breakdown: PaymentBreakdown[];
}

export interface TopSellingPart {
  spare_part_id: number;
  item_name: string;
  part_number: string;
  brand_name: string;
  units_sold: number;
  total_revenue: string | number;
}

export interface LowStockItem {
  id: number;
  item_name: string;
  brand_name: string;
  part_number: string;
  rack_number: string | null;
  quantity: number;
  min_stock_alert: number;
}

export interface WeeklyTrendPoint {
  day: string;
  date: string;
  sales: number;
  purchase: number;
}

export const reportsApi = {
  /**
   * Daily sales reconciliation report.
   */
  async getDailySales(dateStr?: string): Promise<DailySalesSummary> {
    return apiClient<DailySalesSummary>("/reports/daily-sales", {
      params: dateStr ? { target_date: dateStr } : undefined,
    });
  },

  /**
   * High-velocity parts ranked by units sold.
   */
  async getTopSelling(limit = 10): Promise<TopSellingPart[]> {
    return apiClient<TopSellingPart[]>("/reports/top-selling", {
      params: { limit },
    });
  },

  /**
   * Urgent low-stock alerts.
   */
  async getLowStock(): Promise<LowStockItem[]> {
    return apiClient<LowStockItem[]>("/reports/low-stock");
  },

  /**
   * 7-day rolling sales vs purchase trend for financial flow charts.
   */
  async getWeeklyTrend(): Promise<WeeklyTrendPoint[]> {
    return apiClient<WeeklyTrendPoint[]>("/reports/weekly-trend");
  },
};
