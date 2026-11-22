import React, { InputHTMLAttributes, ReactNode, forwardRef } from "react";
import { cn } from "@/utils/cn";

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  rightElement?: ReactNode;
  label?: string;
  error?: string;
  containerClassName?: string;
}

const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ icon, rightElement, label, error, className, containerClassName, ...props }, ref) => {
    return (
      <div className={cn("w-full flex flex-col gap-1.5", containerClassName)}>
        {label && (
          <label className="text-xs font-semibold text-slate-300 tracking-wide">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "glass-input w-full h-10 rounded-xl text-xs sm:text-sm placeholder:text-slate-500 font-sans transition-all",
              icon ? "pl-10" : "pl-3.5",
              rightElement ? "pr-12" : "pr-3.5",
              error && "border-rose-500/60 focus:border-rose-500 focus:shadow-[0_0_0_3px_rgba(244,63,94,0.2)]",
              className
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-2.5 flex items-center">
              {rightElement}
            </div>
          )}
        </div>
        {error && <span className="text-[11px] text-rose-400">{error}</span>}
      </div>
    );
  }
);

GlassInput.displayName = "GlassInput";

export default GlassInput;
