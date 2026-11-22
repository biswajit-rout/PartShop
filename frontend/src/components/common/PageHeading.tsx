import React, { ReactNode } from "react";

interface PageHeadingProps {
  title: string;
  subtitle: string;
  badge?: string;
  action?: ReactNode;
}

export default function PageHeading({
  title,
  subtitle,
  badge,
  action,
}: PageHeadingProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {title}
          </h1>
          {badge && (
            <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-[0_0_12px_rgba(56,189,248,0.25)]">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-xl">
          {subtitle}
        </p>
      </div>
      {action && <div className="flex items-center gap-2.5 shrink-0">{action}</div>}
    </div>
  );
}
