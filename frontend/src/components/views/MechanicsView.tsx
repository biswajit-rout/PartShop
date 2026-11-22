import React from "react";
import { initialMechanics } from "@/data/mock-data";
import { formatRupees } from "@/utils/formatters";
import PageHeading from "@/components/common/PageHeading";
import GlassButton from "@/components/ui/glass/GlassButton";
import { Wrench, Plus, Phone, FileCheck } from "lucide-react";

export default function MechanicsView() {
  const totalPending = initialMechanics.reduce(
    (sum, m) => sum + m.pendingCommission,
    0
  );

  return (
    <div className="space-y-6">
      <PageHeading
        title="Mechanic Partners & Commissions"
        subtitle={`Total Outstanding Commission Payout: ${formatRupees(totalPending)}`}
        badge="INCENTIVE LEDGER"
        action={
          <GlassButton
            variant="primary"
            size="sm"
            icon={<Plus size={15} />}
            onClick={() => alert("Add Mechanic Partner Modal")}
          >
            + Add Mechanic
          </GlassButton>
        }
      />

      <div className="glass-panel rounded-3xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans min-w-[700px]">
            <thead className="bg-white/[0.03] text-slate-400 font-mono uppercase border-b border-white/10 text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Garage / Workshop</th>
                <th className="py-3.5 px-4">Mechanic Name</th>
                <th className="py-3.5 px-4">Contact Mobile</th>
                <th className="py-3.5 px-4">Commission Rate</th>
                <th className="py-3.5 px-4">Pending Payout</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {initialMechanics.map((mech) => (
                <tr
                  key={mech.id}
                  className="hover:bg-white/[0.04] transition-colors"
                >
                  <td className="py-4 px-4 font-sans">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-400/25 flex items-center justify-center text-purple-400 shrink-0">
                        <Wrench size={16} />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">
                          {mech.garageName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: #{mech.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-sans text-slate-300 font-medium">
                    {mech.name}
                  </td>
                  <td className="py-4 px-4 text-sky-400 flex items-center gap-1.5 pt-6">
                    <Phone size={12} className="text-slate-500" />
                    {mech.mobile}
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/15 text-sky-300 border border-sky-400/25">
                      {mech.commissionPercentage}% Commission
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-bold text-amber-400 text-sm">
                      {formatRupees(mech.pendingCommission)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <GlassButton
                        size="sm"
                        variant="secondary"
                        icon={<FileCheck size={12} />}
                        onClick={() =>
                          alert(`Settling commission payout for ${mech.garageName}`)
                        }
                      >
                        Settle Ledger
                      </GlassButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
