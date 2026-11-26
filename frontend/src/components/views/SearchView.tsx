"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { SparePart, NavigationSection } from "@/types";
import { formatRupees } from "@/utils/formatters";
import { matchSearchTokens } from "@/utils/search";
import GlassCard from "@/components/ui/glass/GlassCard";
import GlassButton from "@/components/ui/glass/GlassButton";
import GlassBadge from "@/components/ui/glass/GlassBadge";
import {
  Search,
  X,
  Bike,
  Package,
  Store,
  MapPin,
  Barcode,
  Copy,
  Check,
  Receipt,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Tag,
  Hash,
} from "lucide-react";

interface SearchViewProps {
  products: SparePart[];
  onNavigate?: (section: NavigationSection) => void;
}

const POPULAR_SEARCH_PRESETS = [
  "Bajaj Pulsar Air filter",
  "Activa Brake Pad",
  "Splendor Clutch Plate",
  "Chain Sprocket",
  "Bosch Spark Plug",
  "Front Fork Oil Seal",
  "Disc Brake Shoe",
];

export default function SearchView({ products, onNavigate }: SearchViewProps) {
  const [query, setQuery] = useState("");
  const [copiedPartNumber, setCopiedPartNumber] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus search input on view mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Filter products using tokenized automotive domain search engine
  const searchResults = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];

    return products.filter((item) => {
      const searchTarget = `${item.name} ${item.brand} ${item.partNumber} ${item.modelNumber} ${item.compatibleBikes} ${item.rackNumber} ${item.barcode} ${item.supplierName || ""}`;
      return matchSearchTokens(searchTarget, trimmed);
    });
  }, [products, query]);

  const handleCopyPartNumber = (partNumber: string) => {
    navigator.clipboard.writeText(partNumber);
    setCopiedPartNumber(partNumber);
    setTimeout(() => setCopiedPartNumber(null), 2000);
  };

  const handleSelectPreset = (preset: string) => {
    setQuery(preset);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  const isQueryActive = query.trim().length > 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4">
      {/* Search Header & Hero Search Box */}
      <div className="flex flex-col items-center justify-center text-center pt-2 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-mono font-medium mb-3">
          <Sparkles size={13} className="text-sky-400" />
          <span>Quick Spares Finder · Multi-Attribute & Automotive Stems</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
          Find Any Motorcycle Spare Part
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
          Instantly search across part names, OEM codes, bike models, suppliers, and rack locators.
        </p>

        {/* Hero Dedicated Search Input Box */}
        <div className="w-full max-w-3xl mt-6 relative">
          <div className="relative flex items-center">
            <Search
              size={22}
              className="absolute left-4.5 text-sky-400 pointer-events-none transition-transform group-focus-within:scale-110"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search part name, bike model, OEM number (e.g. Bajaj Pulsar Air filter, Activa brake)..."
              className="glass-input h-14 w-full pl-13 pr-24 rounded-2xl text-sm sm:text-base text-white placeholder-slate-400 font-sans shadow-[0_4px_25px_rgba(0,0,0,0.3)] focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20 transition-all"
            />
            {query && (
              <button
                onClick={handleClear}
                className="absolute right-3.5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Quick Search Preset Chips */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar justify-center flex-wrap">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1">
              Popular:
            </span>
            {POPULAR_SEARCH_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => handleSelectPreset(preset)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  query === preset
                    ? "bg-sky-500/20 text-sky-300 border-sky-400/40 shadow-sm"
                    : "bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10 hover:border-white/20"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Content Area */}
      {isQueryActive ? (
        <div className="space-y-4">
          {/* Results Summary Bar */}
          <div className="flex items-center justify-between px-2 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span>Showing results for</span>
              <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-sans font-semibold border border-sky-500/30">
                &ldquo;{query}&rdquo;
              </span>
              <span>— {searchResults.length} {searchResults.length === 1 ? "part found" : "parts found"}</span>
            </div>
            {searchResults.length > 0 && (
              <button
                onClick={handleClear}
                className="text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <X size={13} />
                <span>Clear search</span>
              </button>
            )}
          </div>

          {/* Matching Spare Parts Cards Grid */}
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {searchResults.map((item) => {
                const isOutOfStock = item.quantity <= 0;
                const isLowStock = item.quantity > 0 && item.quantity <= 5;

                return (
                  <GlassCard
                    key={item.id}
                    className="flex flex-col justify-between p-5 rounded-2xl hover:border-sky-400/40 hover:shadow-[0_8px_30px_rgba(56,189,248,0.15)] transition-all duration-200 group"
                  >
                    <div>
                      {/* Top Header: Brand & Stock Badge */}
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-sky-500/15 text-sky-400 border border-sky-500/30">
                            {item.brand}
                          </span>
                          {item.barcode && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10 flex items-center gap-1">
                              <Barcode size={11} />
                              {item.barcode}
                            </span>
                          )}
                        </div>

                        {/* Stock Status Badge */}
                        <GlassBadge
                          status={
                            isOutOfStock
                              ? "Out of Stock"
                              : isLowStock
                              ? "Low Stock"
                              : "In Stock"
                          }
                          className="shrink-0 text-[10px]"
                        />
                      </div>

                      {/* Item Name */}
                      <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-2 leading-snug mb-3">
                        {item.name}
                      </h3>

                      {/* Part Number with Quick Copy */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5 mb-4 text-xs font-mono">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Hash size={13} className="text-slate-500" />
                          <span>Part No:</span>
                          <span className="text-slate-200 font-semibold">{item.partNumber}</span>
                        </span>
                        <button
                          onClick={() => handleCopyPartNumber(item.partNumber)}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          title="Copy Part Number"
                        >
                          {copiedPartNumber === item.partNumber ? (
                            <Check size={13} className="text-emerald-400" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      </div>

                      {/* Key Attribute Breakdown Details */}
                      <div className="space-y-2.5 text-xs text-slate-300">
                        {/* Supported Model / Compatibility */}
                        <div className="flex items-start gap-2.5">
                          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0 mt-0.5">
                            <Bike size={13} />
                          </div>
                          <div className="flex-1">
                            <span className="text-[10px] uppercase font-mono text-slate-400 block tracking-wider">
                              Supported Models
                            </span>
                            <span className="font-medium text-slate-200 leading-relaxed">
                              {item.compatibleBikes || item.modelNumber || "Universal Motorcycle Fit"}
                            </span>
                          </div>
                        </div>

                        {/* Supplier Details */}
                        <div className="flex items-start gap-2.5">
                          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 mt-0.5">
                            <Store size={13} />
                          </div>
                          <div className="flex-1">
                            <span className="text-[10px] uppercase font-mono text-slate-400 block tracking-wider">
                              Supplier Details
                            </span>
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <span className="font-medium text-slate-200">
                                {item.supplierName || "Direct Distributor / OEM"}
                              </span>
                              {item.supplierDiscount !== undefined && item.supplierDiscount !== null && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  {item.supplierDiscount}% Disc
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Stock Quantity & Rack Locator */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {/* Quantity */}
                          <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                              <Package size={13} />
                            </div>
                            <div>
                              <span className="text-[9px] uppercase font-mono text-slate-400 block tracking-wider">
                                Quantity
                              </span>
                              <span className={`text-xs font-bold font-mono ${
                                isOutOfStock ? "text-rose-400" : isLowStock ? "text-amber-400" : "text-emerald-300"
                              }`}>
                                {item.quantity} Units
                              </span>
                            </div>
                          </div>

                          {/* Rack No */}
                          <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                              <MapPin size={13} />
                            </div>
                            <div>
                              <span className="text-[9px] uppercase font-mono text-slate-400 block tracking-wider">
                                Rack No
                              </span>
                              <span className="text-xs font-bold font-mono text-purple-300">
                                {item.rackNumber || "Bin A-01"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Price & Quick POS Action */}
                    <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-slate-400 block tracking-wider">
                          Selling Price (MRP)
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-black text-white font-mono tracking-tight">
                            {formatRupees(item.sellingPrice)}
                          </span>
                          {item.purchasePrice > 0 && (
                            <span className="text-[10px] font-mono text-slate-500">
                              Cost: {formatRupees(item.purchasePrice)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Bill Button */}
                      {onNavigate && (
                        <GlassButton
                          size="sm"
                          variant="primary"
                          icon={<Receipt size={13} />}
                          onClick={() => onNavigate("Billing")}
                          className="shrink-0 text-xs px-3"
                        >
                          Bill Item
                        </GlassButton>
                      )}
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          ) : (
            /* No Results Found State */
            <GlassCard className="p-12 text-center rounded-3xl border-dashed border-white/10 my-6">
              <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-slate-400">
                <Search size={28} className="text-slate-500" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                No matching spare parts found
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
                We couldn&apos;t find any item matching &ldquo;<span className="text-sky-300 font-semibold">{query}</span>&rdquo;.
                Try searching by broad terms like &ldquo;brake&rdquo;, &ldquo;filter&rdquo;, &ldquo;pulsar&rdquo;, or part code.
              </p>
              <div className="flex items-center justify-center gap-3">
                <GlassButton
                  variant="secondary"
                  size="sm"
                  onClick={handleClear}
                >
                  Clear Search
                </GlassButton>
                {onNavigate && (
                  <GlassButton
                    variant="primary"
                    size="sm"
                    icon={<Layers size={14} />}
                    onClick={() => onNavigate("Inventory")}
                  >
                    Browse Full Inventory
                  </GlassButton>
                )}
              </div>
            </GlassCard>
          )}
        </div>
      ) : (
        /* Empty Idle State: Initial Guidance */
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard className="p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Search size={16} />
              </div>
              <h4 className="text-sm font-bold text-white">Multi-Token Stems</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Search by part type and model at once, e.g. <span className="text-sky-300 font-mono">Bajaj Pulsar Air filter</span> or <span className="text-sky-300 font-mono">Activa brake pad</span>.
            </p>
          </GlassCard>

          <GlassCard className="p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Store size={16} />
              </div>
              <h4 className="text-sm font-bold text-white">Supplier & Discount</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every card shows distributor name, wholesale discount %, stock on hand, and rack shelf locator.
            </p>
          </GlassCard>

          <GlassCard className="p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Receipt size={16} />
              </div>
              <h4 className="text-sm font-bold text-white">Instant Counter POS</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Click &ldquo;Bill Item&rdquo; directly on any search card to launch counter checkout with GST calculation.
            </p>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
