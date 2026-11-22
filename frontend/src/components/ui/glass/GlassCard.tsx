import React, { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  glow?: "none" | "sky" | "emerald" | "amber" | "purple";
}

export default function GlassCard({
  children,
  className,
  glow = "none",
  ...props
}: GlassCardProps) {
  const glowStyles = {
    none: "",
    sky: "hover:shadow-[0_20px_45px_-12px_rgba(56,189,248,0.2)] hover:border-sky-500/30",
    emerald: "hover:shadow-[0_20px_45px_-12px_rgba(34,197,94,0.2)] hover:border-emerald-500/30",
    amber: "hover:shadow-[0_20px_45px_-12px_rgba(245,158,11,0.2)] hover:border-amber-500/30",
    purple: "hover:shadow-[0_20px_45px_-12px_rgba(168,85,247,0.2)] hover:border-purple-500/30",
  };

  return (
    <div
      className={cn(
        "glass-card rounded-2xl p-5 relative overflow-hidden",
        glowStyles[glow],
        className
      )}
      {...props}
    >
      {/* Specular light highlight along top-left edge */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      {children}
    </div>
  );
}
