"use client";

import React, { useState } from "react";
import { formatRupees } from "@/utils/formatters";
import { reportsApi, DailySalesSummary, LowStockItem } from "@/api";
import PageHeading from "@/components/common/PageHeading";
import GlassCard from "@/components/ui/glass/GlassCard";
import GlassButton from "@/components/ui/glass/GlassButton";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  FileText,
  BarChart3,
  CheckCircle,
  X,
  Sparkles,
} from "lucide-react";

export default function ReportsView() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dailySalesData, setDailySalesData] = useState<DailySalesSummary | null>(null);
  const [lowStockData, setLowStockData] = useState<LowStockItem[] | null>(null);

  const handleGenerateReport = async (reportType: "daily_sales" | "low_stock") => {
    setIsLoading(true);
    setSelectedReport(reportType);

    try {
      if (reportType === "daily_sales") {
        const data = await reportsApi.getDailySales();
        setDailySalesData(data);
      } else if (reportType === "low_stock") {
        const data = await reportsApi.getLowStock();
        setLowStockData(data);
      }
    } catch (err: any) {
      alert(`Failed to load report: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeading
        title="Business Intelligence & Reports"
        subtitle="Live financial ledgers, settlement summaries, and stock health audits from PostgreSQL"
        badge="EXPORT ENGINE"
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {/* Report 1: Daily Sales Settlement */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/25 flex items-center justify-center text-sky-400">
                <BarChart3 size={20} />
              </div>
              <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
                Financial Ledger
              </span>
            </div>

            <h3 className="text-sm font-bold text-white mb-1.5">
              Daily Counter Sales Reconciliation
            </h3>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              Consolidated sales revenue, 18% GST collected, customer discounts, and settlement totals across cash, UPI, cards, and credit.
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <Calendar size={12} /> Today (Live)
            </span>
            <div className="flex gap-1.5">
              <GlassButton
                variant="primary"
                size="sm"
                className="h-7 px-3 text-[11px]"
                icon={isLoading && selectedReport === "daily_sales" ? <Sparkles size={12} className="animate-spin" /> : <FileText size={12} />}
                onClick={() => handleGenerateReport("daily_sales")}
              >
                View Live Settlement
              </GlassButton>
            </div>
          </div>
        </GlassCard>

        {/* Report 2: Low Stock Audit */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/25 flex items-center justify-center text-amber-400">
                <BarChart3 size={20} />
              </div>
              <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
                Inventory Audit
              </span>
            </div>

            <h3 className="text-sm font-bold text-white mb-1.5">
              Urgent Low-Stock Alert List
            </h3>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              Real-time audit of all motorcycle spare parts whose inventory has dropped to or below their safe re-order threshold.
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <Calendar size={12} /> Real-Time
            </span>
            <div className="flex gap-1.5">
              <GlassButton
                variant="primary"
                size="sm"
                className="h-7 px-3 text-[11px]"
                icon={isLoading && selectedReport === "low_stock" ? <Sparkles size={12} className="animate-spin" /> : <FileText size={12} />}
                onClick={() => handleGenerateReport("low_stock")}
              >
                View Low-Stock Parts
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Live Daily Sales Report Modal */}
      {selectedReport === "daily_sales" && dailySalesData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <GlassCard className="w-full max-w-lg p-6 border-white/20 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 size={18} className="text-sky-400" />
                Sales Settlement: {dailySalesData.report_date}
              </h3>
              <button
                onClick={() => { setSelectedReport(null); setDailySalesData(null); }}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">Total Invoices Issued:</span>
                <span className="font-mono font-bold text-white">{dailySalesData.total_invoices}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">Gross Subtotal:</span>
                <span className="font-mono font-bold text-white">{formatRupees(Number(dailySalesData.total_subtotal))}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">Discounts Applied:</span>
                <span className="font-mono font-bold text-rose-300">-{formatRupees(Number(dailySalesData.total_discount))}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">GST Collected (18%):</span>
                <span className="font-mono font-bold text-sky-400">+{formatRupees(Number(dailySalesData.total_tax))}</span>
              </div>
              <div className="flex justify-between py-2 border-t border-dashed border-white/20 text-sm">
                <span className="font-bold text-white">Grand Total Settled:</span>
                <span className="font-mono font-extrabold text-emerald-400">{formatRupees(Number(dailySalesData.grand_total))}</span>
              </div>

              {dailySalesData.payments_breakdown.length > 0 && (
                <div className="pt-2">
                  <span className="font-bold text-slate-300 block mb-2 font-mono text-[11px] uppercase">
                    Payment Method Settlements:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {dailySalesData.payments_breakdown.map((pm) => (
                      <div key={pm.payment_method} className="p-2 rounded-xl bg-white/5 border border-white/10">
                        <div className="font-bold text-white">{pm.payment_method} ({pm.count})</div>
                        <div className="font-mono text-sky-300">{formatRupees(Number(pm.total_amount))}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Live Low Stock Report Modal */}
      {selectedReport === "low_stock" && lowStockData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <GlassCard className="w-full max-w-2xl p-6 border-white/20 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10 shrink-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 size={18} className="text-amber-400" />
                Urgent Low-Stock Audit ({lowStockData.length} Items)
              </h3>
              <button
                onClick={() => { setSelectedReport(null); setLowStockData(null); }}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {lowStockData.length > 0 ? (
                <table className="w-full text-left text-xs font-sans">
                  <thead className="text-slate-400 font-mono uppercase text-[11px] border-b border-white/10">
                    <tr>
                      <th className="py-2">Item Name</th>
                      <th className="py-2">Brand</th>
                      <th className="py-2">Part #</th>
                      <th className="py-2">Rack</th>
                      <th className="py-2 text-right">Available Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {lowStockData.map((part) => (
                      <tr key={part.id} className="hover:bg-white/[0.04]">
                        <td className="py-2.5 font-sans font-semibold text-white">{part.item_name}</td>
                        <td className="py-2.5 font-sans text-slate-300">{part.brand_name}</td>
                        <td className="py-2.5 text-sky-300">{part.part_number}</td>
                        <td className="py-2.5 text-slate-400">{part.rack_number || "Unassigned"}</td>
                        <td className="py-2.5 text-right font-bold text-rose-300">
                          {part.quantity} / {part.min_stock_alert} min
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-xs text-slate-400 font-mono">
                  All spare parts are currently above safe minimum threshold levels!
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
