import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface BionisMetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trendText?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  iconBg: string; // e.g. '#3b82f6', '#f59e0b', '#ef4444', '#10b981'
  badgeText?: string;
}

export const BionisMetricCard: React.FC<BionisMetricCardProps> = ({
  label,
  value,
  subValue,
  trendText,
  trendDirection = 'neutral',
  icon: Icon,
  iconBg,
  badgeText,
}) => {
  return (
    <article className="flex min-h-[140px] min-w-0 flex-col justify-between rounded-2xl border border-[#1e293b] bg-[#0a0f1d] p-4.5 hover:border-slate-700/80 transition-all shadow-sm">
      {/* Top row: Icon badge + Label + optional badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
            style={{ backgroundColor: iconBg }}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <p className="truncate text-xs font-medium tracking-tight text-slate-300">
            {label}
          </p>
        </div>
        {badgeText && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 font-mono border border-slate-700/50">
            {badgeText}
          </span>
        )}
      </div>

      {/* Middle row: Big Metric Value */}
      <div className="my-2">
        <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-100 tracking-tight">
          {value}
        </div>
      </div>

      {/* Bottom row: Trend / Sub-value */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="truncate text-[11px] text-slate-400 font-mono">
          {subValue}
        </span>
        {trendText && (
          <span
            className={`text-[10px] font-medium font-mono flex items-center gap-0.5 shrink-0 ${
              trendDirection === 'up'
                ? 'text-emerald-400'
                : trendDirection === 'down'
                ? 'text-rose-400'
                : 'text-slate-400'
            }`}
          >
            {trendText}
          </span>
        )}
      </div>
    </article>
  );
};
