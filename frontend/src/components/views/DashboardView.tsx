"use client";

import React, { useState, useEffect } from "react";
import { NavigationSection, SparePart } from "@/types";
import { salesTrend, brandDistribution } from "@/data/mock-data";
import { formatRupees, formatDate } from "@/utils/formatters";
import { reportsApi, DailySalesSummary, TopSellingPart, WeeklyTrendPoint } from "@/api";
import PageHeading from "@/components/common/PageHeading";
import GlassKPICard from "@/components/ui/glass/GlassKPICard";
import GlassBadge from "@/components/ui/glass/GlassBadge";
import GlassCard from "@/components/ui/glass/GlassCard";
import GlassButton from "@/components/ui/glass/GlassButton";
import {
  IndianRupee,
  Package,
  AlertTriangle,
  Receipt,
  TrendingUp,
  Barcode,
  ArrowUpRight,
  Boxes,
  Percent,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DashboardViewProps {
  products: SparePart[];
  onNavigate: (section: NavigationSection) => void;
}

export default function DashboardView({
  products,
  onNavigate,
}: DashboardViewProps) {
  const [currentDateStr, setCurrentDateStr] = useState("Live POS Session");
  const [dailySales, setDailySales] = useState<DailySalesSummary | null>(null);
  const [topParts, setTopParts] = useState<TopSellingPart[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrendPoint[]>([]);

  // Real inventory computations from live products
  const lowStockCount = products.filter(
    (p) => p.status === "Low Stock" || p.status === "Out of Stock"
  ).length;

  const totalInventoryValuation = products.reduce(
    (acc, p) => acc + ((p.purchasePrice || p.sellingPrice || 0) * (p.quantity || 0)),
    0
  );

  const totalInventoryUnits = products.reduce((acc, p) => acc + (p.quantity || 0), 0);

  useEffect(() => {
    setCurrentDateStr(formatDate(new Date()));

    // Load real metrics from FastAPI
    async function loadAnalytics() {
      try {
        const sales = await reportsApi.getDailySales();
        setDailySales(sales);
      } catch (err) {
        console.warn("FastAPI reports unreachable yet:", err);
      }

      try {
        const top = await reportsApi.getTopSelling(4);
        if (top && top.length > 0) {
          setTopParts(top);
        }
      } catch (err) {
        console.warn("FastAPI top selling items unreachable:", err);
      }

      try {
        const trend = await reportsApi.getWeeklyTrend();
        if (trend && trend.length > 0) {
          setWeeklyTrend(trend);
        }
      } catch (err) {
        console.warn("FastAPI weekly trend unreachable:", err);
      }
    }

    loadAnalytics();
  }, [products]);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Counter Dashboard"
        subtitle={currentDateStr}
        badge="REAL-TIME POS"
        action={
          <GlassButton
            variant="primary"
            icon={<Barcode size={16} />}
            onClick={() => onNavigate("Billing")}
          >
            + New Counter Bill (F2)
          </GlassButton>
        }
      />

      {/* Glass KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        <GlassKPICard
          title="Today's Sales"
          value={dailySales ? formatRupees(Number(dailySales.grand_total)) : "₹0"}
          subtitle={dailySales ? `${dailySales.total_invoices} bills generated today` : "No bills settled yet"}
          trend={{ value: "+ Live", isPositive: true }}
          icon={<IndianRupee className="w-5 h-5" />}
          glowColor="sky"
        />
        <GlassKPICard
          title="Total Inventory Value"
          value={formatRupees(totalInventoryValuation)}
          subtitle={`${totalInventoryUnits.toLocaleString()} units · ${products.length} cataloged SKUs`}
          trend={{ value: "Stock On Shelf", isPositive: true }}
          icon={<Boxes className="w-5 h-5" />}
          glowColor="emerald"
        />
        <GlassKPICard
          title="Low Stock Items"
          value={`${lowStockCount} Parts`}
          subtitle="At or below reorder buffer"
          trend={{ value: lowStockCount > 0 ? "Action Required" : "Safe", isPositive: lowStockCount === 0 }}
          icon={<AlertTriangle className="w-5 h-5" />}
          glowColor="amber"
        />
        <GlassKPICard
          title="GST Collected (18%)"
          value={dailySales ? formatRupees(Number(dailySales.total_tax)) : "₹0"}
          subtitle="Tax liability tracked today"
          trend={{ value: "GST Compliant", isPositive: true }}
          icon={<Receipt className="w-5 h-5" />}
          glowColor="purple"
        />
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,0.85fr)]">
        {/* Sales & Purchases Trend Area Chart */}
        <GlassCard className="flex flex-col justify-between">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-sky-400" />
                <h2 className="text-base font-bold text-white tracking-wide">
                  Weekly Sales vs Purchase Trend
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Financial cash flow: Counter Revenue vs Wholesale Parts Inflow
              </p>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
                Counter Sales
              </span>
              <span className="flex items-center gap-1.5 text-purple-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc]" />
                Purchases
              </span>
            </div>
          </div>

          <div className="h-[270px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={weeklyTrend.length > 0 ? weeklyTrend : salesTrend}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="purchGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c084fc" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#c084fc" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                />
                <XAxis
                  dataKey="day"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  dy={8}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  tickFormatter={(val) => `₹${val / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    backdropFilter: "blur(12px)",
                    borderColor: "rgba(255, 255, 255, 0.15)",
                    borderRadius: "16px",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                    fontSize: "12px",
                    fontFamily: "monospace",
                  }}
                  formatter={(value: any) => [
                    formatRupees(Number(value) || 0),
                    "",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#salesGrad)"
                  name="Sales"
                />
                <Area
                  type="monotone"
                  dataKey="purchase"
                  stroke="#c084fc"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#purchGrad)"
                  name="Purchases"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Brand Distribution Donut Chart */}
        <GlassCard className="flex flex-col justify-between">
          <div className="border-b border-white/10 pb-4 mb-2">
            <h2 className="text-base font-bold text-white tracking-wide">
              Brand Market Share
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Top brands by catalog volume
            </p>
          </div>

          <div className="h-[200px] w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={brandDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {brandDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="rgba(15, 23, 42, 0.6)"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    backdropFilter: "blur(12px)",
                    borderColor: "rgba(255, 255, 255, 0.15)",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontFamily: "monospace",
                  }}
                  formatter={(val) => [`${val}%`, "Share"]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center pointer-events-none">
              <span className="text-xl font-bold font-mono text-white block">
                7 Brands
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                OEM Stock
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 pt-2 border-t border-white/10">
            {brandDistribution.slice(0, 4).map((brand) => (
              <div key={brand.name} className="flex items-center">
                <span
                  className="w-2.5 h-2.5 rounded-full mr-2 shrink-0 shadow-[0_0_8px_currentColor]"
                  style={{ backgroundColor: brand.color, color: brand.color }}
                />
                <span className="truncate">{brand.name}</span>
                <span className="ml-auto font-bold text-white">{brand.value}%</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Bottom Section: Low Stock Table & Top Selling Items */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.85fr)]">
        {/* Low Stock Alerts */}
        <div className="glass-panel rounded-3xl p-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle size={17} className="text-amber-400" />
                Critical Inventory & Restock Alerts
              </h2>
              <p className="text-xs text-slate-400">
                Parts requiring purchase orders to avoid counter stockouts
              </p>
            </div>
            <button
              onClick={() => onNavigate("Inventory")}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
            >
              All Inventory <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="text-slate-400 font-mono uppercase border-b border-white/10 text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Part Details</th>
                  <th className="py-2.5 px-3">Brand</th>
                  <th className="py-2.5 px-3">Rack</th>
                  <th className="py-2.5 px-3">Stock</th>
                  <th className="py-2.5 px-3">Price</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {products
                  .filter((p) => p.status !== "In Stock")
                  .slice(0, 5)
                  .map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-white/[0.04] transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="font-sans font-semibold text-white">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {item.partNumber}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-300">
                        {item.brand}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-sky-300 font-bold border border-white/10">
                          {item.rackNumber}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-200">
                        {item.quantity} pcs
                      </td>
                      <td className="py-3 px-3 font-bold text-white">
                        {formatRupees(item.sellingPrice)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <GlassButton
                          size="sm"
                          variant="secondary"
                          onClick={() => onNavigate("Billing")}
                          className="text-[11px] h-7 px-2.5"
                        >
                          Restock
                        </GlassButton>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Selling Fast Movers */}
        <div className="glass-panel rounded-3xl p-5">
          <div className="border-b border-white/10 pb-4 mb-4">
            <h2 className="text-base font-bold text-white">
              Top Fast-Moving Spares
            </h2>
            <p className="text-xs text-slate-400">
              Highest turnover counter items from live billing
            </p>
          </div>

          <div className="space-y-3">
            {topParts.length > 0 ? (
              topParts.map((prod, idx) => (
                <div
                  key={prod.spare_part_id}
                  className="glass-card rounded-xl p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-400/25 flex items-center justify-center font-mono font-bold text-sky-400 text-xs">
                      0{idx + 1}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">
                        {prod.item_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {prod.brand_name} · {prod.part_number}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-emerald-400 font-mono">
                      {prod.units_sold} sold
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {formatRupees(Number(prod.total_revenue))}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-400 font-mono">
                No parts sold yet today. Check out items at the counter to populate velocity!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
