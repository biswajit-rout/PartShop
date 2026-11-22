import React from "react";
import PageHeading from "@/components/common/PageHeading";
import GlassCard from "@/components/ui/glass/GlassCard";
import GlassButton from "@/components/ui/glass/GlassButton";
import {
  Store,
  UsersRound,
  ReceiptText,
  Printer,
  ChevronRight,
  ShieldCheck,
  Database,
  Sliders,
} from "lucide-react";

export default function SettingsView() {
  const settingsSections = [
    {
      title: "Shop & GST Profile",
      description: "Business legal trade name, address, GSTIN (29ABCDE1234F1Z5), phone numbers.",
      icon: Store,
      badge: "Configured",
    },
    {
      title: "Users, Roles & RBAC",
      description: "Manage admin, cashier, and stock manager access keys, JWT session timeout.",
      icon: UsersRound,
      badge: "3 Active Users",
    },
    {
      title: "Thermal & Invoice Printer",
      description: "Configure 80mm/58mm thermal receipt printers, ESC/POS cuts, and A4 PDF layouts.",
      icon: Printer,
      badge: "80mm Thermal Ready",
    },
    {
      title: "GST Tax Slabs & Rules",
      description: "Default automotive 18% GST slab, HSN code mapping for bike parts, tax inclusion rules.",
      icon: ReceiptText,
      badge: "Auto 18%",
    },
    {
      title: "Database & Cloud Backup",
      description: "PostgreSQL connection health, daily automated JSON dumps, and S3 sync storage.",
      icon: Database,
      badge: "Postgres 16 Connected",
    },
    {
      title: "Barcode Scanner Preferences",
      description: "Automatic line-feed on scan, Honeywell/Zebra scanner symbology support.",
      icon: Sliders,
      badge: "Active (USB/BT)",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeading
        title="System Settings"
        subtitle="Manage shop configuration, POS thermal printers, roles, and database connections"
        badge="ENTERPRISE CONFIG"
      />

      <div className="grid gap-4 max-w-4xl">
        {settingsSections.map((item) => {
          const Icon = item.icon;
          return (
            <GlassCard
              key={item.title}
              className="p-4 sm:p-5 flex items-center justify-between group cursor-pointer"
              onClick={() => alert(`Opening ${item.title} settings panel`)}
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-400/25 flex items-center justify-center text-sky-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Icon size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">
                      {item.title}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
                    {item.description}
                  </p>
                </div>
              </div>

              <ChevronRight
                size={18}
                className="text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0 ml-3"
              />
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
