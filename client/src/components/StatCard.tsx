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
          border: 'border-[#1e293b] hover:border-[#7f1d1d]/80',
          iconBg: 'bg-[#2d0b12] border-[#7f1d1d] text-[#f87171]',
        };
      case 'amber':
        return {
          border: 'border-[#1e293b] hover:border-[#78350f]/80',
          iconBg: 'bg-[#2e1c07] border-[#78350f] text-[#fbbf24]',
        };
      case 'emerald':
        return {
          border: 'border-[#1e293b] hover:border-[#065f46]/80',
          iconBg: 'bg-[#06281e] border-[#065f46] text-[#34d399]',
        };
      default:
        return {
          border: 'border-[#1e293b] hover:border-cyan-800/80',
          iconBg: 'bg-[#0a192f] border-cyan-800/60 text-cyan-400',
        };
    }
  };

  const style = getVariantStyles();

  return (
    <div className={`p-4 rounded-xl bg-[#0a0f1d] border ${style.border} transition-all shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{label}</p>
          <h3 className="text-2xl font-bold font-mono text-slate-100 mt-1 tracking-tight">{value}</h3>
          {subValue && (
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              {subValue}
            </p>
          )}
        </div>
        <div className={`p-2.5 rounded-lg border ${style.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
