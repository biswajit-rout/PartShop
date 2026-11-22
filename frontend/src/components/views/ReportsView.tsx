import React from "react";
import { initialReports } from "@/data/mock-data";
import PageHeading from "@/components/common/PageHeading";
import GlassCard from "@/components/ui/glass/GlassCard";
import GlassButton from "@/components/ui/glass/GlassButton";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  FileText,
  BarChart3,
} from "lucide-react";

export default function ReportsView() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="Business Intelligence & Reports"
        subtitle="Exportable PDF and Excel financial ledgers, stock movement, and tax summaries"
        badge="EXPORT ENGINE"
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {initialReports.map((report) => (
          <GlassCard
            key={report.id}
            className="p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/25 flex items-center justify-center text-sky-400">
                  <BarChart3 size={20} />
                </div>
                <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
                  {report.category}
                </span>
              </div>

              <h3 className="text-sm font-bold text-white mb-1.5">
                {report.title}
              </h3>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                {report.description}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <Calendar size={12} /> {report.period}
              </span>
              <div className="flex gap-1.5">
                <GlassButton
                  variant="secondary"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  icon={<FileSpreadsheet size={12} />}
                  onClick={() => alert(`Generating Excel report for ${report.title}`)}
                >
                  XLSX
                </GlassButton>
                <GlassButton
                  variant="secondary"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  icon={<FileText size={12} />}
                  onClick={() => alert(`Generating PDF report for ${report.title}`)}
                >
                  PDF
                </GlassButton>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
