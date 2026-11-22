import React from "react";
import { StockStatus } from "@/types";
import { cn } from "@/utils/cn";

interface GlassBadgeProps {
  status: StockStatus | string;
  className?: string;
}

export default function GlassBadge({ status, className }: GlassBadgeProps) {
  let badgeStyle = "bg-white/10 text-slate-300 border-white/20";

  if (status === "In Stock") {
    badgeStyle = "glass-badge-in-stock";
  } else if (status === "Low Stock") {
    badgeStyle = "glass-badge-low-stock";
  } else if (status === "Out of Stock") {
    badgeStyle = "glass-badge-out-of-stock";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md transition-colors",
        badgeStyle,
        className
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          status === "In Stock" && "bg-emerald-400 animate-pulse",
          status === "Low Stock" && "bg-amber-400 animate-pulse",
          status === "Out of Stock" && "bg-rose-400"
        )}
      />
      {status}
    </span>
  );
}
