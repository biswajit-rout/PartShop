"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { SparePart, NavigationSection } from "@/types";
import { formatRupees } from "@/utils/formatters";
import { matchSearchTokens, matchScannedCode } from "@/utils/search";
import { scannerApi, partsApi } from "@/api";
import { useScannerSession } from "@/context/ScannerContext";
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
  Smartphone,
  QrCode,
  Wifi,
  WifiOff,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  PlusCircle,
  TrendingUp,
} from "lucide-react";

interface SearchViewProps {
  products: SparePart[];
  onNavigate?: (section: NavigationSection) => void;
  onRefreshCatalog?: () => void;
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

export default function SearchView({ products, onNavigate, onRefreshCatalog }: SearchViewProps) {
  const [query, setQuery] = useState("");
  const [copiedPartNumber, setCopiedPartNumber] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Consume Global Persistent Wireless Mobile Scanner Session
  const {
    setIsModalOpen,
    scannerMode,
    setScannerMode,
    scannedBatch,
    clearScannedBatch,
    lastScanEvent,
  } = useScannerSession();

  // Fast Goods Inward / Restock Modal State
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockingPart, setRestockingPart] = useState<SparePart | null>(null);
  const [restockQty, setRestockQty] = useState("10");
  const [restockPrice, setRestockPrice] = useState("");
  const [restockRack, setRestockRack] = useState("");
  const [isSubmittingRestock, setIsSubmittingRestock] = useState(false);
  const [restockSuccessMsg, setRestockSuccessMsg] = useState<string | null>(null);
  const [restockError, setRestockError] = useState<string | null>(null);

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

  // Handle incoming mobile scans in real time (persists continuously even when modal is closed)
  useEffect(() => {
    if (!lastScanEvent) return;

    if (lastScanEvent.matchedPart) {
      setQuery(lastScanEvent.matchedPart.partNumber || lastScanEvent.matchedPart.name);
      if (scannerMode === "RESTOCK") {
        setRestockingPart(lastScanEvent.matchedPart);
        setRestockQty("10");
        setRestockPrice(
          lastScanEvent.matchedPart.purchasePrice
            ? String(lastScanEvent.matchedPart.purchasePrice)
            : ""
        );
        setRestockRack(lastScanEvent.matchedPart.rackNumber || "");
        setShowRestockModal(true);
      }
    } else {
      setQuery(lastScanEvent.barcode);
    }
  }, [lastScanEvent, scannerMode]);

  const handleOpenScanner = (mode: "SEARCH" | "RESTOCK" = "SEARCH") => {
    setScannerMode(mode);
    setIsModalOpen(true);
  };

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

  // Submit Fast Goods Inward / Restock
  const handleConfirmRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockingPart) return;

    const qty = parseInt(restockQty, 10);
    if (isNaN(qty) || qty <= 0) {
      setRestockError("Quantity to add must be greater than zero.");
      return;
    }

    setIsSubmittingRestock(true);
    setRestockError(null);

    try {
      const price = restockPrice ? parseFloat(restockPrice) : undefined;
      await partsApi.restock(restockingPart.id, {
        quantity_to_add: qty,
        purchase_price: !isNaN(price as number) ? price : undefined,
        rack_number: restockRack.trim() || undefined,
      });

      setRestockSuccessMsg(`Successfully added ${qty} units to ${restockingPart.name}!`);
      setTimeout(() => {
        setRestockSuccessMsg(null);
        setShowRestockModal(false);
        setRestockingPart(null);
      }, 1500);

      if (onRefreshCatalog) {
        onRefreshCatalog();
      }
    } catch (err: any) {
      setRestockError(err.message || "Failed to update stock.");
    } finally {
      setIsSubmittingRestock(false);
    }
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

        {/* Hero Dedicated Search Input Box & Mobile Scanner Buttons */}
        <div className="w-full max-w-3xl mt-6 relative">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
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

            {/* Mobile Scanner Trigger Button */}
            <GlassButton
              variant="primary"
              size="lg"
              icon={<Smartphone size={18} className="text-sky-300" />}
              onClick={() => handleOpenScanner("SEARCH")}
              className="h-14 px-5 rounded-2xl shrink-0 font-bold shadow-lg shadow-sky-500/20"
            >
              Scan with Phone
            </GlassButton>
          </div>

          {/* Quick Search Preset Chips & Restock Shortcut */}
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

            {/* Direct Restock Scan Trigger */}
            <button
              onClick={() => handleOpenScanner("RESTOCK")}
              className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1.5 ml-2 cursor-pointer transition-all"
            >
              <Package size={13} />
              <span>Inward Restock Scan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scanned Batch Tray (Continuous Mode History) */}
      {scannedBatch.length > 0 && (
        <div className="p-4 rounded-2xl glass-panel border border-sky-500/30 bg-sky-950/20 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white font-bold">Continuous Scan Batch Tray</span>
              <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                {scannedBatch.length} Items
              </span>
            </div>
            <div className="flex items-center gap-2">
              {onNavigate && (
                <GlassButton
                  size="sm"
                  variant="primary"
                  icon={<Receipt size={13} />}
                  onClick={() => onNavigate("Billing")}
                >
                  Add Batch to Bill (POS)
                </GlassButton>
              )}
              <button
                onClick={clearScannedBatch}
                className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer text-xs"
              >
                Clear Batch
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
            {scannedBatch.map((part) => (
              <div
                key={part.id}
                onClick={() => setQuery(part.partNumber || part.name)}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-sky-400/50 hover:bg-white/10 transition-all cursor-pointer shrink-0 min-w-[200px]"
              >
                <div className="text-xs font-bold text-white truncate">{part.name}</div>
                <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
                  <span className="text-sky-300">{formatRupees(part.sellingPrice)}</span>
                  <span className="text-slate-400">Rack: {part.rackNumber || "Unset"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                              <span
                                className={`text-xs font-bold font-mono ${
                                  isOutOfStock ? "text-rose-400" : isLowStock ? "text-amber-400" : "text-emerald-300"
                                }`}
                              >
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

                    {/* Bottom Price & Actions */}
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

                      {/* Quick Restock & Bill Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setRestockingPart(item);
                            setRestockQty("10");
                            setRestockPrice(item.purchasePrice ? String(item.purchasePrice) : "");
                            setRestockRack(item.rackNumber || "");
                            setShowRestockModal(true);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold border border-emerald-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Restock Incoming Units"
                        >
                          <PlusCircle size={13} />
                          <span>Restock</span>
                        </button>

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
              <h3 className="text-lg font-bold text-white mb-2">No matching spare parts found</h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
                We couldn&apos;t find any item matching &ldquo;
                <span className="text-sky-300 font-semibold">{query}</span>&rdquo;. Try searching by broad terms like
                &ldquo;brake&rdquo;, &ldquo;filter&rdquo;, &ldquo;pulsar&rdquo;, or part code.
              </p>
              <div className="flex items-center justify-center gap-3">
                <GlassButton variant="secondary" size="sm" onClick={handleClear}>
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
                <Smartphone size={16} />
              </div>
              <h4 className="text-sm font-bold text-white">Mobile Barcode Scanner</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Click &ldquo;Scan with Phone&rdquo; to connect your phone camera as a wireless scanner. Scan any box on the
              rack to see price and details immediately.
            </p>
          </GlassCard>

          <GlassCard className="p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <TrendingUp size={16} />
              </div>
              <h4 className="text-sm font-bold text-white">Fast Goods Inward</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Receive shipments faster. Scan existing items to bring up stock confirmation, verify quantity, and update
              inventory with audit logs.
            </p>
          </GlassCard>

          <GlassCard className="p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Store size={16} />
              </div>
              <h4 className="text-sm font-bold text-white">Wholesale Supplier Info</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every card shows distributor name, wholesale discount %, stock on hand, and rack shelf locator.
            </p>
          </GlassCard>
        </div>
      )}

      {/* Fast Goods Inward / Restock Confirmation Dialog */}
      {showRestockModal && restockingPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel w-full max-w-lg p-6 rounded-3xl border border-emerald-500/30 bg-slate-900/95 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowRestockModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Dialog Header */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Package className="text-emerald-400" size={20} />
                <h3 className="text-lg font-bold text-white">Incoming Stock Entry (Goods Inward)</h3>
              </div>
              <p className="text-xs text-slate-400">
                Confirm incoming units received to instantly update stock and log audit movements.
              </p>
            </div>

            {/* Part Summary Pill */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="text-sm font-bold text-white leading-snug">{restockingPart.name}</div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[10px]">OEM PART NO:</span>
                  <span className="font-semibold text-sky-300">{restockingPart.partNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">CURRENT STOCK:</span>
                  <span className="font-bold text-emerald-400">{restockingPart.quantity} Units on Shelf</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">SUPPLIER:</span>
                  <span className="truncate block">
                    {restockingPart.supplierName || "OEM Direct"}
                    {restockingPart.supplierDiscount ? ` (${restockingPart.supplierDiscount}% Disc)` : ""}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">SELLING PRICE (MRP):</span>
                  <span className="font-bold text-white">{formatRupees(restockingPart.sellingPrice)}</span>
                </div>
              </div>
            </div>

            {/* Restock Input Form */}
            <form onSubmit={handleConfirmRestock} className="space-y-3.5">
              {restockError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{restockError}</span>
                </div>
              )}

              {restockSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>{restockSuccessMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Quantity to Add */}
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Inward Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    required
                    className="glass-input h-10 w-full px-3 rounded-xl text-sm font-mono text-emerald-300 font-bold"
                  />
                </div>

                {/* Purchase Cost */}
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Purchase Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={restockPrice}
                    onChange={(e) => setRestockPrice(e.target.value)}
                    placeholder="Cost price"
                    className="glass-input h-10 w-full px-3 rounded-xl text-sm font-mono text-white"
                  />
                </div>

                {/* Rack Locator */}
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Rack / Bin Locator
                  </label>
                  <input
                    type="text"
                    value={restockRack}
                    onChange={(e) => setRestockRack(e.target.value)}
                    placeholder="e.g. B-04"
                    className="glass-input h-10 w-full px-3 rounded-xl text-sm font-mono text-white"
                  />
                </div>
              </div>

              {/* Calculated Resulting Balance */}
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Resulting Stock Balance:</span>
                <span className="text-emerald-400 font-bold">
                  {restockingPart.quantity + (parseInt(restockQty, 10) || 0)} Units
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <GlassButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowRestockModal(false)}
                >
                  Cancel
                </GlassButton>

                <GlassButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmittingRestock}
                  icon={<CheckCircle2 size={14} />}
                >
                  {isSubmittingRestock ? "Adding Stock..." : "Confirm & Add Stock"}
                </GlassButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
