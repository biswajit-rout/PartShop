import React from "react";
import { NavigationSection } from "@/types";
import {
  LayoutDashboard,
  Search,
  Package,
  ReceiptText,
  Store,
  Wrench,
  BadgeIndianRupee,
  Settings,
  Boxes,
  X,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/utils/cn";

interface GlassSidebarProps {
  currentSection: NavigationSection;
  onSelectSection: (section: NavigationSection) => void;
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS: { label: NavigationSection; icon: typeof LayoutDashboard; badge?: string }[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Search", icon: Search, badge: "Fast" },
  { label: "Inventory", icon: Package, badge: "1.2k" },
  { label: "Billing", icon: ReceiptText, badge: "POS" },
  { label: "Suppliers", icon: Store },
  { label: "Mechanics", icon: Wrench },
  { label: "Reports", icon: BadgeIndianRupee },
  { label: "Settings", icon: Settings },
];

export default function GlassSidebar({
  currentSection,
  onSelectSection,
  isOpen,
  onClose,
}: GlassSidebarProps) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col transition-all duration-300 ease-in-out lg:translate-x-0",
          "glass-panel border-r border-white/10 m-3 my-3 rounded-3xl h-[calc(100vh-24px)]",
          isOpen ? "translate-x-0" : "-translate-x-[calc(100%+24px)] lg:translate-x-0"
        )}
      >
        {/* Top Brand Block */}
        <div className="flex h-20 items-center px-5 border-b border-white/10 relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-400 to-blue-600 text-white shadow-[0_0_20px_rgba(56,189,248,0.4)] border border-white/20">
            <Boxes className="w-5 h-5" strokeWidth={2.2} />
          </div>
          <div className="ml-3">
            <div className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
              PartShop
              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded-md bg-sky-500/20 text-sky-400 font-mono border border-sky-500/30">
                PRO
              </span>
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Motorcycle Spares
            </div>
          </div>
          <button
            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 lg:hidden cursor-pointer"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
            Navigation Menu
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = currentSection === item.label;

            return (
              <button
                key={item.label}
                onClick={() => {
                  onSelectSection(item.label);
                  onClose();
                }}
                className={cn(
                  "group relative flex h-11 w-full items-center rounded-xl px-3.5 text-xs font-semibold transition-all duration-200 cursor-pointer",
                  active
                    ? "bg-gradient-to-r from-sky-500/20 via-blue-600/15 to-transparent text-white border border-sky-400/30 shadow-[0_4px_20px_rgba(56,189,248,0.15)]"
                    : "text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent"
                )}
              >
                {/* Active indicator bar */}
                {active && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-sky-400 to-blue-500 shadow-[0_0_10px_#38bdf8]" />
                )}

                <Icon
                  size={18}
                  className={cn(
                    "transition-colors",
                    active
                      ? "text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]"
                      : "text-slate-400 group-hover:text-slate-200"
                  )}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <span className="ml-3 font-medium tracking-wide">{item.label}</span>

                {item.badge && (
                  <span
                    className={cn(
                      "ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full border",
                      item.badge === "POS"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse"
                        : "bg-white/10 text-slate-400 border-white/10"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User / Counter Operator Badge */}
        <div className="p-3 border-t border-white/10">
          <div className="glass-card rounded-2xl p-3 flex items-center gap-3">
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-xs font-bold text-white shadow-[0_0_12px_rgba(56,189,248,0.3)]">
                AS
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-white flex items-center gap-1">
                Arun Sharma
                <ShieldCheck size={12} className="text-sky-400 shrink-0" />
              </div>
              <div className="truncate text-[10px] text-slate-400 font-mono">
                Counter Admin (POS-1)
              </div>
            </div>
            <ChevronRight className="text-slate-400 shrink-0" size={14} />
          </div>
        </div>
      </aside>
    </>
  );
}
