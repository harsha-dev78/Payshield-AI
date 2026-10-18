import React from 'react';
import { 
  Globe, 
  Wifi, 
  Zap, 
  UserCheck, 
  DollarSign, 
  AlertCircle,
  CheckCircle2,
  FileCheck,
  Brain
} from 'lucide-react';
import type { RiskSignal } from '../types/index.js';

interface EvidenceCardProps {
  signal: RiskSignal;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({ signal }) => {
  const isPositive = signal.scoreContribution < 0;

  const getCategoryMeta = () => {
    switch (signal.category) {
      case 'GEOGRAPHY':
        return { icon: Globe, color: 'text-cyan-400 border-cyan-800/50 bg-[#0a192f]' };
      case 'NETWORK':
        return { icon: Wifi, color: 'text-indigo-400 border-indigo-800/50 bg-[#121633]' };
      case 'VELOCITY':
        return { icon: Zap, color: 'text-rose-400 border-rose-800/50 bg-[#2d0b12]' };
      case 'BEHAVIORAL':
        return { icon: UserCheck, color: 'text-amber-400 border-amber-800/50 bg-[#2e1c07]' };
      case 'FINANCIAL':
        return { icon: DollarSign, color: 'text-emerald-400 border-emerald-800/50 bg-[#06281e]' };
      default:
        return { icon: AlertCircle, color: 'text-slate-400 border-slate-700 bg-[#0a0f1d]' };
    }
  };

  const meta = getCategoryMeta();
  const Icon = meta.icon;

  return (
    <div className={`p-4 rounded-xl border transition-all ${
      isPositive 
        ? 'bg-[#06281e]/40 border-[#065f46]/60 hover:border-[#065f46]' 
        : 'bg-[#0a0f1d] border-[#1e293b] hover:border-[#334155]'
    }`}>
      
      {/* Header: Category, Severity, Impact */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg border ${meta.color}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-100">{signal.name}</h4>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              {signal.category} Vector
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Fact vs Prediction Explicit Badge */}
          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-mono ${
            signal.isModelPrediction
              ? 'bg-purple-950/60 text-purple-300 border-purple-800/60'
              : 'bg-cyan-950/60 text-cyan-300 border-cyan-800/60'
          }`}>
            {signal.isModelPrediction ? (
              <>
                <Brain className="w-3 h-3 text-purple-400" />
                <span>Model Inference</span>
              </>
            ) : (
              <>
                <FileCheck className="w-3 h-3 text-cyan-400" />
                <span>Observed Fact</span>
              </>
            )}
          </span>

          {/* Score Impact Badge */}
          <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
            isPositive
              ? 'bg-[#06281e] text-[#34d399] border-[#065f46]'
              : 'bg-[#2d0b12] text-[#f87171] border-[#7f1d1d]'
          }`}>
            {isPositive ? `${signal.scoreContribution} pts` : `+${signal.scoreContribution} pts`}
          </span>
        </div>
      </div>

      {/* Observed Fact Box */}
      <div className="p-2.5 rounded-lg bg-[#060911] border border-[#1e293b] mb-2.5">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
          {isPositive ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          ) : (
            <AlertCircle className="w-3 h-3 text-amber-400" />
          )}
          <span>Actual Telemetry Field / Event</span>
        </div>
        <p className="text-xs text-slate-200 font-mono leading-relaxed">
          {signal.observedFact}
        </p>
      </div>

      {/* Heuristic Rationale */}
      <div className="text-xs text-slate-400 leading-normal pl-0.5">
        <strong className="text-slate-300">Why this matters: </strong>
        {signal.inferenceReason}
      </div>

    </div>
  );
};
