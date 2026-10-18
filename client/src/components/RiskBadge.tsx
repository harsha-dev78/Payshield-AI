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
          bg: 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300',
          dot: 'bg-emerald-400',
          icon: ShieldCheck,
          label: 'ALLOW (Low Risk)',
        };
      case 'REVIEW':
        return {
          bg: 'bg-amber-950/50 border-amber-500/40 text-amber-300',
          dot: 'bg-amber-400',
          icon: AlertTriangle,
          label: 'REVIEW (Moderate)',
        };
      case 'BLOCK':
        return {
          bg: 'bg-rose-950/50 border-rose-500/40 text-rose-300',
          dot: 'bg-rose-400',
          icon: ShieldAlert,
          label: 'BLOCK (Critical Risk)',
        };
      default:
        return {
          bg: 'bg-slate-800/60 border-slate-700 text-slate-400',
          dot: 'bg-slate-500',
          icon: HelpCircle,
          label: 'UNASSESSED',
        };
    }
  };

  const style = getStyles();
  const Icon = style.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-2',
    lg: 'text-sm px-3.5 py-1.5 gap-2.5 font-medium',
  };

  return (
    <span className={`inline-flex items-center rounded-md border ${style.bg} ${sizeClasses[size]}`}>
      <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />
      <span>{style.label}</span>
      {score !== undefined && score !== null && (
        <span className="font-mono font-semibold ml-1 px-1.5 py-0.2 bg-black/40 rounded border border-white/10">
          {score}/100
        </span>
      )}
    </span>
  );
};
