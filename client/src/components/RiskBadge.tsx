import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, HelpCircle } from 'lucide-react';
import type { RiskTier } from '../types/index.js';

interface RiskBadgeProps {
  tier?: RiskTier | 'UNASSESSED' | string;
  score?: number | null;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ tier, score, size = 'md' }) => {
  const getStyles = () => {
    switch (tier) {
      case 'ALLOW':
        return {
          bg: 'bg-[#06281e] border-[#065f46] text-[#34d399]',
          dot: 'bg-emerald-400',
          icon: ShieldCheck,
          label: 'Low Risk',
        };
      case 'REVIEW':
        return {
          bg: 'bg-[#2e1c07] border-[#78350f] text-[#fbbf24]',
          dot: 'bg-amber-400',
          icon: AlertTriangle,
          label: 'Needs Review',
        };
      case 'BLOCK':
        return {
          bg: 'bg-[#2d0b12] border-[#7f1d1d] text-[#f87171]',
          dot: 'bg-rose-400',
          icon: ShieldAlert,
          label: 'High Risk (Block)',
        };
      default:
        return {
          bg: 'bg-[#0a0f1d] border-[#1e293b] text-slate-400',
          dot: 'bg-slate-500',
          icon: HelpCircle,
          label: 'Unassessed',
        };
    }
  };

  const style = getStyles();
  const Icon = style.icon;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-xs px-3 py-1.5 gap-2 font-semibold',
  };

  return (
    <span className={`inline-flex items-center rounded-md border tracking-tight ${style.bg} ${sizeClasses[size]}`}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      <span>{style.label}</span>
      {score !== undefined && score !== null && (
        <span className="font-mono font-bold ml-0.5 px-1 py-0.2 bg-black/40 rounded border border-white/10 text-[10px]">
          {score}
        </span>
      )}
    </span>
  );
};
