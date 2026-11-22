import React, { useState, useEffect } from "react";
import { NavigationSection, SparePart } from "@/types";
import {
  salesTrend,
  brandDistribution,
} from "@/data/mock-data";
import { formatRupees, formatDate } from "@/utils/formatters";
import PageHeading from "@/components/common/PageHeading";
import GlassKPICard from "@/components/ui/glass/GlassKPICard";
import GlassBadge from "@/components/ui/glass/GlassBadge";
import GlassCard from "@/components/ui/glass/GlassCard";
import GlassButton from "@/components/ui/glass/GlassButton";
import {
  IndianRupee,
  Package,
  AlertTriangle,
  Wrench,
  TrendingUp,
  Barcode,
  ArrowUpRight,
  Boxes,
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
  const lowStockCount = products.filter(
    (p) => p.status === "Low Stock" || p.status === "Out of Stock"
  ).length;

  const [currentDateStr, setCurrentDateStr] = useState("Live POS Session");

  useEffect(() => {
    setCurrentDateStr(formatDate(new Date()));
  }, []);

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
          value="₹46,280"
          subtitle="18 bills generated today"
          trend={{ value: "+14.2%", isPositive: true }}
          icon={<IndianRupee className="w-5 h-5" />}
          glowColor="sky"
        />
        <GlassKPICard
          title="Total Inventory Value"
          value="₹18,45,200"
          subtitle="2,480 total spare parts"
          trend={{ value: "+3.8%", isPositive: true }}
          icon={<Boxes className="w-5 h-5" />}
          glowColor="emerald"
        />
        <GlassKPICard
          title="Low Stock Items"
          value={`${lowStockCount} Parts`}
          subtitle="Below safe reorder buffer"
          trend={{ value: "Urgent", isPositive: false }}
          icon={<AlertTriangle className="w-5 h-5" />}
          glowColor="amber"
        />
        <GlassKPICard
          title="Mechanic Commission"
          value="₹3,420"
          subtitle="Accrued commission today"
          trend={{ value: "3 Garages", isPositive: true }}
          icon={<Wrench className="w-5 h-5" />}
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
                Revenue vs inventory restocking expenditures
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-sky-400">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
                Sales
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
                Purchases
              </span>
            </div>
          </div>

          <div className="h-[270px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={salesTrend}
                margin={{ left: -10, right: 10, top: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="liquidSalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="liquidPurchGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(255,255,255,0.06)"
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12, fontFamily: "monospace" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "monospace" }}
                  tickFormatter={(val) => `₹${val / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    backdropFilter: "blur(12px)",
                    borderColor: "rgba(255, 255, 255, 0.15)",
                    borderRadius: "14px",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                    color: "#ffffff",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [formatRupees(Number(value)), ""]}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  name="Sales"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  fill="url(#liquidSalesGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="purchase"
                  name="Purchase"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#liquidPurchGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Brand Distribution Glass Pie Chart */}
        <GlassCard className="flex flex-col justify-between">
          <div className="border-b border-white/10 pb-3 mb-2">
            <h2 className="text-base font-bold text-white tracking-wide">
              Sales by Brand
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Market share in current month
            </p>
          </div>

          <div className="h-[185px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={brandDistribution}
                  dataKey="value"
                  innerRadius={52}
                  outerRadius={76}
                  paddingAngle={4}
                  stroke="none"
                >
                  {brandDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    backdropFilter: "blur(12px)",
                    borderColor: "rgba(255, 255, 255, 0.15)",
                    borderRadius: "12px",
                    color: "#ffffff",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [`${value}% Share`, "Brand"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
            {brandDistribution.map((brand) => (
              <div
                key={brand.name}
                className="flex items-center text-xs text-slate-300 font-mono px-2 py-1 rounded-lg bg-white/5"
              >
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
                Parts requiring purchase orders to avoid stockout
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
                  .map((item) => (
                    <tr
                      key={item.partNumber}
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
              Highest turnover counter items this month
            </p>
          </div>

          <div className="space-y-3">
            {[
              { name: "Brake Shoe - Activa", brand: "Honda", sold: 86, tag: "#1 Fast Mover" },
              { name: "Engine Oil Activ 4T 1L", brand: "Castrol", sold: 74, tag: "High Margin" },
              { name: "Clutch Cable Assembly", brand: "TVS", sold: 58, tag: "Commuter" },
              { name: "Heavy Duty Chain Sprocket", brand: "Rollon", sold: 42, tag: "Premium" },
            ].map((prod, idx) => (
              <div
                key={prod.name}
                className="glass-card rounded-xl p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-400/25 flex items-center justify-center font-mono font-bold text-sky-400 text-xs">
                    0{idx + 1}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">
                      {prod.name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {prod.brand} · {prod.tag}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-white font-mono">
                    {prod.sold}
                  </div>
                  <div className="text-[10px] text-slate-400">units sold</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
