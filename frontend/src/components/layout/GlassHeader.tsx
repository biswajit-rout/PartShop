import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Search,
  Bell,
  Menu,
  Barcode,
  HelpCircle,
  Sparkles,
  Smartphone,
  LogOut,
  User,
  Boxes,
  ShieldCheck,
  ChevronRight,
  Package,
} from "lucide-react";
import GlassButton from "@/components/ui/glass/GlassButton";
import { UserProfile } from "@/api";
import { SparePart } from "@/types";
import { formatRupees } from "@/utils/formatters";
import { matchSearchTokens } from "@/utils/search";

interface GlassHeaderProps {
  onOpenMobileMenu: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onQuickBillClick: () => void;
  connectedScannersCount?: number;
  onOpenScannerModal?: () => void;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
  products?: SparePart[];
  onSelectProduct?: (part: SparePart) => void;
}

export default function GlassHeader({
  onOpenMobileMenu,
  searchQuery,
  onSearchChange,
  onQuickBillClick,
  connectedScannersCount = 0,
  onOpenScannerModal,
  currentUser,
  onLogout,
  products = [],
  onSelectProduct,
}: GlassHeaderProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter products using tokenized search
  const matchedParts = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || !products || products.length === 0) return [];
    return products
      .filter((p) => {
        const target = `${p.name} ${p.brand} ${p.partNumber} ${p.modelNumber} ${p.compatibleBikes} ${p.rackNumber} ${p.barcode} ${p.supplierName || ""}`;
        return matchSearchTokens(target, trimmed);
      })
      .slice(0, 8);
  }, [products, searchQuery]);

  return (
    <header className="sticky top-3 z-30 mx-4 sm:mx-6 lg:mx-8 mb-4">
      <div className="glass-panel rounded-2xl h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Mobile menu button */}
        <button
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 lg:hidden cursor-pointer"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>

        {/* Global Instant Part/Barcode Search with Live Autocomplete Dropdown */}
        <div ref={searchContainerRef} className="relative flex-1 max-w-md hidden sm:block">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            size={16}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setIsSearchFocused(true);
            }}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Search parts, brand, model, rack or scan barcode..."
            className="glass-input h-10 w-full pl-10 pr-20 rounded-xl text-xs sm:text-sm font-sans"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
            <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-white/10 text-slate-400 border border-white/10">
              Ctrl+K
            </kbd>
          </div>

          {/* Autocomplete Dropdown Results */}
          {isSearchFocused && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl bg-slate-900/98 border border-sky-500/30 backdrop-blur-2xl shadow-2xl overflow-hidden divide-y divide-white/5 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
              {matchedParts.length > 0 ? (
                <>
                  <div className="px-3 py-1.5 bg-sky-500/10 text-[10px] font-mono text-sky-300 font-semibold flex items-center justify-between">
                    <span>Matching Spare Parts ({matchedParts.length})</span>
                    <span>Click to view details</span>
                  </div>
                  {matchedParts.map((part) => (
                    <div
                      key={part.id}
                      onClick={() => {
                        if (onSelectProduct) {
                          onSelectProduct(part);
                        }
                        setIsSearchFocused(false);
                      }}
                      className="p-3 hover:bg-sky-500/15 cursor-pointer flex items-center justify-between transition-colors group"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs truncate group-hover:text-sky-300 transition-colors">
                            {part.name}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 text-[10px] font-bold border border-sky-500/30 uppercase shrink-0">
                            {part.brand}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                          <span>PN: {part.partNumber}</span>
                          <span>·</span>
                          <span className="truncate">{part.compatibleBikes || part.modelNumber}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-sky-300 text-xs">
                          {formatRupees(part.sellingPrice)}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          Qty: <span className={part.quantity > 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>{part.quantity}</span>
                          {part.rackNumber && ` · Rack: ${part.rackNumber}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 font-mono">
                  No parts matching &quot;{searchQuery}&quot; found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Action Icons & Status */}
        <div className="flex items-center gap-3 ml-auto">
          {/* Live POS Status */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
            <span>POS Online · GST 18%</span>
          </div>

          {/* Wireless Mobile Scanner Header Indicator */}
          {onOpenScannerModal && (
            <button
              onClick={onOpenScannerModal}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-mono transition-all cursor-pointer ${
                connectedScannersCount > 0
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
              }`}
              title="Wireless Mobile Scanner Pairing & Status"
            >
              <Smartphone
                size={14}
                className={connectedScannersCount > 0 ? "text-emerald-400" : "text-slate-400"}
              />
              {connectedScannersCount > 0 ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold text-white">
                    {connectedScannersCount} Phone{connectedScannersCount > 1 ? "s" : ""}
                  </span>
                  <span className="text-emerald-400 font-semibold hidden sm:inline">Online</span>
                </span>
              ) : (
                <span className="hidden sm:inline">Connect Phone</span>
              )}
            </button>
          )}

          {/* Quick Bill Action */}
          <GlassButton
            size="sm"
            variant="primary"
            icon={<Barcode size={14} />}
            onClick={onQuickBillClick}
            className="hidden sm:inline-flex"
          >
            Quick Bill (F2)
          </GlassButton>

          {/* Divider */}
          <div className="h-6 w-px bg-white/10 hidden sm:block" />

          {/* Logged in User Pill & Logout Button */}
          <div className="flex items-center gap-2 pl-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-[0_0_12px_rgba(56,189,248,0.3)]">
              {currentUser?.full_name ? currentUser.full_name.substring(0, 2).toUpperCase() : "CS"}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold text-white leading-tight truncate max-w-[120px]">
                {currentUser?.full_name || currentUser?.username || "Cashier"}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {currentUser?.role || "Staff"}
              </div>
            </div>

            {/* Logout Action */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-2 ml-1 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Log Out of POS Terminal"
                aria-label="Logout"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
