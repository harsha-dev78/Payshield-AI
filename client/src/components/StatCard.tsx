import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  variant?: 'cyan' | 'rose' | 'amber' | 'emerald';
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  icon: Icon,
  variant = 'cyan',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'rose':
        return {
          border: 'border-rose-900/40 hover:border-rose-800/60',
          iconBg: 'bg-rose-950/40 border-rose-800/40 text-rose-400',
          glow: 'from-rose-500/10 to-transparent',
        };
      case 'amber':
        return {
          border: 'border-amber-900/40 hover:border-amber-800/60',
          iconBg: 'bg-amber-950/40 border-amber-800/40 text-amber-400',
          glow: 'from-amber-500/10 to-transparent',
        };
      case 'emerald':
        return {
          border: 'border-emerald-900/40 hover:border-emerald-800/60',
          iconBg: 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400',
          glow: 'from-emerald-500/10 to-transparent',
        };
      default:
        return {
          border: 'border-cyan-900/40 hover:border-cyan-800/60',
          iconBg: 'bg-cyan-950/40 border-cyan-800/40 text-cyan-400',
          glow: 'from-cyan-500/10 to-transparent',
        };
    }
  };

  const style = getVariantStyles();

  return (
    <div className={`relative p-5 rounded-xl bg-[#0b0f1d] border ${style.border} transition-all overflow-hidden shadow-lg`}>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${style.glow} rounded-full blur-2xl pointer-events-none`}></div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 tracking-wider uppercase">{label}</p>
          <h3 className="text-2xl font-bold font-mono text-slate-100 mt-1">{value}</h3>
          {subValue && (
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
              {subValue}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl border ${style.iconBg} shadow-inner`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
