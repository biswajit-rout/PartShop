"use client";

import React, { useState, useEffect } from "react";
import { formatRupees, formatDate } from "@/utils/formatters";
import {
  expensesApi,
  Expense,
  ExpenseCategory,
  DailyExpenseSummary,
} from "@/api";
import PageHeading from "@/components/common/PageHeading";
import GlassButton from "@/components/ui/glass/GlassButton";
import GlassInput from "@/components/ui/glass/GlassInput";
import GlassCard from "@/components/ui/glass/GlassCard";
import GlassKPICard from "@/components/ui/glass/GlassKPICard";
import GlassBadge from "@/components/ui/glass/GlassBadge";
import {
  Wallet,
  Plus,
  Trash2,
  Calendar,
  IndianRupee,
  TrendingUp,
  Receipt,
  Coffee,
  Zap,
  Building,
  UserCheck,
  Wrench,
  Truck,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
} from "lucide-react";

const CATEGORY_META: Record<
  ExpenseCategory,
  { label: string; icon: typeof Wallet; color: string; bg: string }
> = {
  RENT: { label: "Shop Rent", icon: Building, color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30" },
  ELECTRICITY: { label: "Electricity", icon: Zap, color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30" },
  TEA_REFRESHMENT: { label: "Tea & Refreshments", icon: Coffee, color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/30" },
  SALARY_WAGES: { label: "Salary / Wages", icon: UserCheck, color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/30" },
  MAINTENANCE: { label: "Maintenance", icon: Wrench, color: "text-rose-400", bg: "bg-rose-500/15 border-rose-500/30" },
  TRANSPORT: { label: "Transport / Courier", icon: Truck, color: "text-cyan-400", bg: "bg-cyan-500/15 border-cyan-500/30" },
  STATIONERY: { label: "Stationery / Tools", icon: FileSpreadsheet, color: "text-indigo-400", bg: "bg-indigo-500/15 border-indigo-500/30" },
  OTHER: { label: "Miscellaneous", icon: Receipt, color: "text-slate-400", bg: "bg-slate-500/15 border-slate-500/30" },
};

export default function ExpensesView() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dailySummary, setDailySummary] = useState<DailyExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [filterDate, setFilterDate] = useState<string>(() => new Date().toISOString().split("T")[0]);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("TEA_REFRESHMENT");
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Load expenses and daily summary
  const loadData = async () => {
    setLoading(true);
    try {
      const [list, summary] = await Promise.all([
        expensesApi.getAll({
          start_date: filterDate || undefined,
          end_date: filterDate || undefined,
          category: selectedCategory !== "ALL" ? (selectedCategory as ExpenseCategory) : undefined,
        }),
        expensesApi.getDailySummary(filterDate || undefined),
      ]);
      setExpenses(list);
      setDailySummary(summary);
    } catch (err: any) {
      console.warn("Could not load expenses data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterDate, selectedCategory]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!title.trim()) {
      setModalError("Please enter an expense title or reason.");
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setModalError("Please enter a valid amount greater than ₹0.");
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      await expensesApi.create({
        title: title.trim(),
        category,
        amount: parsedAmount,
        payment_mode: paymentMode,
        expense_date: expenseDate,
        notes: notes.trim() || undefined,
      });

      setShowAddModal(false);
      setTitle("");
      setAmount("");
      setNotes("");
      setCategory("TEA_REFRESHMENT");
      setActionSuccess("Expense recorded successfully!");
      setTimeout(() => setActionSuccess(null), 3000);
      await loadData();
    } catch (err: any) {
      setModalError(err.message || "Failed to record expense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm("Are you sure you want to remove this expense entry?")) return;
    try {
      await expensesApi.delete(id);
      setActionSuccess("Expense removed.");
      setTimeout(() => setActionSuccess(null), 2500);
      await loadData();
    } catch (err: any) {
      alert(`Could not delete: ${err.message}`);
    }
  };

  // Top spending category
  const topCategory = dailySummary?.category_breakdown?.[0]?.category as ExpenseCategory | undefined;
  const topCategoryMeta = topCategory ? CATEGORY_META[topCategory] : null;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Expenditure & Profit Calculator"
        subtitle={`Track daily shop overheads, staff tea, maintenance & net profit · ${formatDate(new Date(filterDate || new Date()))}`}
        badge="DAILY LEDGER"
        action={
          <GlassButton
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => {
              setModalError(null);
              setShowAddModal(true);
            }}
          >
            + Record Expense
          </GlassButton>
        }
      />

      {/* Action Success Toast */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        <GlassKPICard
          title="Daily Expenditure"
          value={formatRupees(dailySummary ? Number(dailySummary.total_expense) : 0)}
          subtitle={`${dailySummary?.expense_count || 0} expenses recorded today`}
          trend={{ value: "Operating Cost", isPositive: false }}
          icon={<Wallet className="w-5 h-5" />}
          glowColor="amber"
        />

        <GlassKPICard
          title="Today's Counter Sales"
          value={formatRupees(dailySummary ? Number(dailySummary.total_sales) : 0)}
          subtitle="Gross counter revenue"
          trend={{ value: "Counter Cash Flow", isPositive: true }}
          icon={<IndianRupee className="w-5 h-5" />}
          glowColor="sky"
        />

        <GlassKPICard
          title="Net Profit (Sales - Expenses)"
          value={formatRupees(dailySummary ? Number(dailySummary.estimated_profit) : 0)}
          subtitle="Net margin after daily overheads"
          trend={{
            value: Number(dailySummary?.estimated_profit || 0) >= 0 ? "+ Positive" : "Deficit",
            isPositive: Number(dailySummary?.estimated_profit || 0) >= 0,
          }}
          icon={<TrendingUp className="w-5 h-5" />}
          glowColor={Number(dailySummary?.estimated_profit || 0) >= 0 ? "emerald" : "amber"}
        />

        <GlassKPICard
          title="Top Expense Category"
          value={topCategoryMeta?.label || "None"}
          subtitle={
            dailySummary?.category_breakdown?.[0]
              ? formatRupees(Number(dailySummary.category_breakdown[0].total_amount))
              : "No expenses today"
          }
          trend={{ value: "Highest Outflow", isPositive: false }}
          icon={<Receipt className="w-5 h-5" />}
          glowColor="purple"
        />
      </div>

      {/* Filter and Date Bar */}
      <GlassCard className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Calendar size={16} className="text-sky-400" />
          <span className="text-xs font-bold text-white font-mono">Date:</span>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="glass-input h-9 px-3 rounded-xl text-xs font-mono text-sky-300 font-bold focus:border-sky-400"
          />
          <button
            type="button"
            onClick={() => setFilterDate(new Date().toISOString().split("T")[0])}
            className="text-[11px] font-mono px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setFilterDate("")}
            className="text-[11px] font-mono px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 cursor-pointer"
          >
            All Dates
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer shrink-0 font-medium ${
              selectedCategory === "ALL"
                ? "bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold"
                : "bg-white/5 hover:bg-white/10 text-slate-400 border-white/10"
            }`}
          >
            All ({expenses.length})
          </button>
          {(Object.keys(CATEGORY_META) as ExpenseCategory[]).map((cat) => {
            const meta = CATEGORY_META[cat];
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer shrink-0 font-medium flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? "bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold"
                    : "bg-white/5 hover:bg-white/10 text-slate-400 border-white/10"
                }`}
              >
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* Expenses Ledger Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-sky-400" />
            <h3 className="text-sm font-bold text-white">Expenditure Records</h3>
            <span className="text-xs font-mono text-slate-400">({expenses.length} entries)</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Title / Purpose</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Payment Mode</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-mono">
                    Loading expenditures...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Wallet size={32} className="mx-auto mb-2 text-slate-600 opacity-60" />
                    <p className="font-semibold text-white">No expenses recorded for this period</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Click &quot;+ Record Expense&quot; above to log shop rent, tea, wages, or maintenance.
                    </p>
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => {
                  const meta = CATEGORY_META[exp.category] || CATEGORY_META.OTHER;
                  const Icon = meta.icon;
                  return (
                    <tr key={exp.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white flex items-center gap-2">
                          <Icon size={14} className={meta.color} />
                          <span>{exp.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border font-semibold ${meta.bg} ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-rose-400 text-sm">
                        {formatRupees(Number(exp.amount))}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 border border-white/10 text-slate-300 font-semibold">
                          {exp.payment_mode}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        {exp.expense_date}
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-[200px] truncate">
                        {exp.notes || "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete expense entry"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* MODAL: Record New Expense */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-sky-500/30 bg-slate-900/95 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Wallet className="text-sky-400" size={20} />
              <h3 className="text-lg font-bold text-white">Record Shop Expenditure</h3>
            </div>
            <p className="text-xs text-slate-400">
              Enter daily expenses like refreshments, electricity, shop rent, or maintenance.
            </p>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateExpense} className="space-y-4 pt-1">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Expense Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="glass-input h-10 w-full px-3 rounded-xl text-xs font-sans text-white bg-slate-900 cursor-pointer"
                >
                  {(Object.keys(CATEGORY_META) as ExpenseCategory[]).map((cat) => (
                    <option key={cat} value={cat} className="bg-slate-900 text-white">
                      {CATEGORY_META[cat].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Purpose / Title</label>
                <GlassInput
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Evening tea for mechanics, Shop rent, Cleaning"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Amount (₹)</label>
                  <GlassInput
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 150"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="glass-input h-10 w-full px-3 rounded-xl text-xs font-sans text-white bg-slate-900 cursor-pointer"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="CARD">Card / POS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Expense Date</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="glass-input h-10 w-full px-3 rounded-xl text-xs font-mono text-sky-300 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Notes / Voucher # (Optional)</label>
                <GlassInput
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Bill #124, Paid by cash counter"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-xs font-mono text-slate-400 hover:text-white px-3 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <GlassButton type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Expense"}
                </GlassButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
