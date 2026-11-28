import { apiClient } from "../client";

export type ExpenseCategory =
  | "RENT"
  | "ELECTRICITY"
  | "TEA_REFRESHMENT"
  | "SALARY_WAGES"
  | "MAINTENANCE"
  | "TRANSPORT"
  | "STATIONERY"
  | "OTHER";

export interface Expense {
  id: number;
  title: string;
  category: ExpenseCategory;
  amount: number | string;
  payment_mode: string;
  expense_date: string;
  notes?: string | null;
  created_by_user_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCreate {
  title: string;
  category: ExpenseCategory;
  amount: number;
  payment_mode?: string;
  expense_date?: string;
  notes?: string;
}

export interface CategoryExpenseBreakdown {
  category: string;
  total_amount: number | string;
  count: number;
}

export interface DailyExpenseSummary {
  report_date: string;
  total_expense: number | string;
  expense_count: number;
  category_breakdown: CategoryExpenseBreakdown[];
  total_sales: number | string;
  estimated_profit: number | string;
}

export const expensesApi = {
  /**
   * List recorded operational expenses with optional date range or category filters.
   */
  async getAll(params?: {
    start_date?: string;
    end_date?: string;
    category?: ExpenseCategory;
  }): Promise<Expense[]> {
    return apiClient<Expense[]>("/expenses", { params });
  },

  /**
   * Daily expenditure aggregation, category breakdown, and net profit.
   */
  async getDailySummary(targetDate?: string): Promise<DailyExpenseSummary> {
    return apiClient<DailyExpenseSummary>("/expenses/daily-summary", {
      params: targetDate ? { target_date: targetDate } : undefined,
    });
  },

  /**
   * Record a new shop expenditure.
   */
  async create(data: ExpenseCreate): Promise<Expense> {
    return apiClient<Expense>("/expenses", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete an expense entry (Store Manager / Admin).
   */
  async delete(id: number): Promise<void> {
    return apiClient<void>(`/expenses/${id}`, {
      method: "DELETE",
    });
  },
};
