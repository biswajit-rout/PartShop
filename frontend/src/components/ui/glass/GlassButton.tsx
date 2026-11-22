import React, { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  className?: string;
}

export default function GlassButton({
  children,
  variant = "primary",
  size = "md",
  icon,
  className,
  ...props
}: GlassButtonProps) {
  const sizeClasses = {
    sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
    md: "h-10 px-4 text-xs font-semibold rounded-xl gap-2",
    lg: "h-11 px-5 text-sm font-semibold rounded-xl gap-2.5",
  };

  const variantClasses = {
    primary: "glass-button-primary text-white cursor-pointer",
    secondary: "glass-button-secondary cursor-pointer",
    danger:
      "bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 hover:border-rose-500/50 shadow-[0_4px_15px_rgba(244,63,94,0.2)] cursor-pointer",
    ghost:
      "text-slate-300 hover:text-white hover:bg-white/10 border border-transparent cursor-pointer",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-200 outline-none select-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
