import React from "react";
import { initialSuppliers } from "@/data/mock-data";
import PageHeading from "@/components/common/PageHeading";
import GlassCard from "@/components/ui/glass/GlassCard";
import GlassButton from "@/components/ui/glass/GlassButton";
import { Store, Phone, MapPin, Plus, FileSpreadsheet } from "lucide-react";

export default function SuppliersView() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="Supplier Directory"
        subtitle="Wholesalers, purchase invoice records, and GST compliance"
        badge="SUPPLY CHAIN"
        action={
          <GlassButton
            variant="primary"
            size="sm"
            icon={<Plus size={15} />}
            onClick={() => alert("Add Supplier Modal")}
          >
            + Add Supplier
          </GlassButton>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {initialSuppliers.map((supplier) => (
          <GlassCard key={supplier.id} className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-400/25 flex items-center justify-center text-sky-400 shrink-0">
                  <Store size={22} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">
                    {supplier.name}
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400">
                    GSTIN: {supplier.gstNumber}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300 font-sans border-t border-white/10 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Contact Person</span>
                  <span className="font-semibold text-white">
                    {supplier.contactName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Phone size={12} /> Mobile
                  </span>
                  <span className="font-mono text-sky-400">
                    {supplier.mobile}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Purchase Orders</span>
                  <span className="font-mono font-bold text-white">
                    {supplier.totalPurchases} Orders
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 pt-1 flex items-start gap-1">
                  <MapPin size={12} className="shrink-0 mt-0.5 text-slate-500" />
                  <span className="line-clamp-1">{supplier.address}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-white/10 flex gap-2">
              <GlassButton
                variant="secondary"
                size="sm"
                className="w-full text-xs font-semibold"
                icon={<FileSpreadsheet size={13} />}
                onClick={() => alert(`Viewing purchase ledger for ${supplier.name}`)}
              >
                Purchase Invoices
              </GlassButton>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
