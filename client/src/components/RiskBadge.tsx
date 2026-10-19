import React from 'react';
import type { RiskTier } from '../types/index.js';

interface RiskBadgeProps {
  tier?: RiskTier | 'UNASSESSED' | string;
  score?: number | null;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'pill' | 'detailed';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ 
  tier, 
  score, 
  size = 'md',
  variant = 'pill'
}) => {
  const normalizedTier = (tier || '').toUpperCase();
  const sizeClass = size === 'sm' ? 'text-[10px] px-2 py-0.5' : size === 'lg' ? 'text-sm px-3.5 py-1' : 'text-xs px-2.5 py-0.5';

  const getStyle = () => {
    switch (normalizedTier) {
      case 'ALLOW':
      case 'LOW':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Low',
          fullLabel: 'Low Risk',
        };
      case 'REVIEW':
      case 'MEDIUM':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          label: 'Medium',
          fullLabel: 'Needs Review',
        };
      case 'BLOCK':
      case 'HIGH':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          label: 'High',
          fullLabel: 'High Risk',
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-600 border-slate-200',
          dot: 'bg-slate-400',
          label: 'Unassessed',
          fullLabel: 'Unassessed',
        };
    }
  };

  const style = getStyle();

  if (variant === 'pill') {
    return (
      <span className={`inline-flex items-center justify-center font-medium rounded-full border ${sizeClass} ${style.bg}`}>
        <span>{style.label}</span>
        {score !== undefined && score !== null && (
          <span className="font-mono text-[10px] ml-1 opacity-80">
            ({score})
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${style.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      <span>{style.fullLabel}</span>
      {score !== undefined && score !== null && (
        <span className="font-mono text-[11px] font-bold ml-1 px-1.5 py-0.5 rounded bg-white/80 border border-slate-200">
          {score}/100
        </span>
      )}
    </span>
  );
};
