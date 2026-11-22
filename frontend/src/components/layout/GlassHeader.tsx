import React from "react";
import { Search, Bell, Menu, Barcode, HelpCircle, Sparkles } from "lucide-react";
import GlassButton from "@/components/ui/glass/GlassButton";

interface GlassHeaderProps {
  onOpenMobileMenu: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onQuickBillClick: () => void;
}

export default function GlassHeader({
  onOpenMobileMenu,
  searchQuery,
  onSearchChange,
  onQuickBillClick,
}: GlassHeaderProps) {
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

        {/* Global Instant Part/Barcode Search */}
        <div className="relative flex-1 max-w-md hidden sm:block">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            size={16}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search parts, brand, model, rack or scan barcode..."
            className="glass-input h-10 w-full pl-10 pr-20 rounded-xl text-xs sm:text-sm font-sans"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
            <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-white/10 text-slate-400 border border-white/10">
              Ctrl+K
            </kbd>
          </div>
        </div>

        {/* Right Action Icons & Status */}
        <div className="flex items-center gap-3 ml-auto">
          {/* Live POS Status */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
            <span>POS Online · GST 18%</span>
          </div>

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

          {/* Help button */}
          <button
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Help & Documentation"
          >
            <HelpCircle size={18} />
          </button>

          {/* Notifications */}
          <button
            className="relative p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-white/10 hidden sm:block" />

          {/* Store Pill */}
          <div className="flex items-center gap-2 pl-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-[0_0_12px_rgba(56,189,248,0.3)]">
              <Sparkles size={14} />
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold text-white leading-tight">
                Main Terminal
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Store ID: #882
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
