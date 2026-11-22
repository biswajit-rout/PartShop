import React, { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface GlassKPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  glowColor?: "sky" | "emerald" | "amber" | "purple";
  className?: string;
}

export default function GlassKPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  glowColor = "sky",
  className,
}: GlassKPICardProps) {
  const glowOrbs = {
    sky: "from-sky-500/20 via-blue-500/10 to-transparent",
    emerald: "from-emerald-500/20 via-teal-500/10 to-transparent",
    amber: "from-amber-500/20 via-orange-500/10 to-transparent",
    purple: "from-purple-500/20 via-pink-500/10 to-transparent",
  };

  const iconContainers = {
    sky: "bg-sky-500/15 border-sky-400/20 text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]",
    emerald: "bg-emerald-500/15 border-emerald-400/20 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.2)]",
    amber: "bg-amber-500/15 border-amber-400/20 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]",
    purple: "bg-purple-500/15 border-purple-400/20 text-purple-400 shadow-[0_0_15px_rgba(192,132,252,0.2)]",
  };

  return (
    <div
      className={cn(
        "glass-card group rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between",
        className
      )}
    >
      {/* Specular Edge */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      {/* Ambient hover light orb */}
      <div
        className={cn(
          "absolute -right-6 -top-6 w-32 h-32 rounded-full bg-gradient-to-br blur-2xl opacity-60 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 pointer-events-none",
          glowOrbs[glowColor]
        )}
      />

      <div className="flex items-center justify-between mb-4 relative z-10">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div
          className={cn(
            "p-2.5 rounded-xl border backdrop-blur-md transition-transform duration-300 group-hover:scale-105",
            iconContainers[glowColor]
          )}
        >
          {icon}
        </div>
      </div>

      <div className="relative z-10">
        <div className="text-3xl font-extrabold tracking-tight text-white mb-1.5 font-mono">
          {value}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {trend && (
            <span
              className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1",
                trend.isPositive
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                  : "bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]"
              )}
            >
              {trend.value}
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-slate-400 truncate">{subtitle}</span>
          )}
        </div>
      </div>
    </div>
  );
}
