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
        return { icon: Globe, color: 'text-cyan-400 border-cyan-800/40 bg-cyan-950/20' };
      case 'NETWORK':
        return { icon: Wifi, color: 'text-indigo-400 border-indigo-800/40 bg-indigo-950/20' };
      case 'VELOCITY':
        return { icon: Zap, color: 'text-rose-400 border-rose-800/40 bg-rose-950/20' };
      case 'BEHAVIORAL':
        return { icon: UserCheck, color: 'text-amber-400 border-amber-800/40 bg-amber-950/20' };
      case 'FINANCIAL':
        return { icon: DollarSign, color: 'text-emerald-400 border-emerald-800/40 bg-emerald-950/20' };
      default:
        return { icon: AlertCircle, color: 'text-slate-400 border-slate-700 bg-slate-900' };
    }
  };

  const meta = getCategoryMeta();
  const Icon = meta.icon;

  return (
    <div className={`p-4 rounded-xl border transition-all ${
      isPositive 
        ? 'bg-[#0a141d]/70 border-emerald-900/40 hover:border-emerald-700/60' 
        : 'bg-[#101322]/80 border-slate-800 hover:border-slate-700'
    }`}>
      
      {/* Header: Category, Severity, Impact */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${meta.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100">{signal.name}</h4>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              {signal.category}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Fact vs Prediction Distinction */}
          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-mono ${
            signal.isModelPrediction
              ? 'bg-purple-950/40 text-purple-300 border-purple-800/50'
              : 'bg-cyan-950/40 text-cyan-300 border-cyan-800/50'
          }`}>
            {signal.isModelPrediction ? (
              <>
                <Brain className="w-3 h-3 text-purple-400" />
                <span>Model Inference</span>
              </>
            ) : (
              <>
                <FileCheck className="w-3 h-3 text-cyan-400" />
                <span>Observed Telemetry</span>
              </>
            )}
          </span>

          {/* Score Impact Badge */}
          <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
            isPositive
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
              : 'bg-rose-950/80 text-rose-300 border-rose-700/60'
          }`}>
            {isPositive ? `${signal.scoreContribution} pts` : `+${signal.scoreContribution} pts`}
          </span>
        </div>
      </div>

      {/* Observed Fact Box */}
      <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80 mb-2.5">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
          {isPositive ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <AlertCircle className="w-3 h-3 text-amber-400" />}
          <span>Observed Evidence Fact</span>
        </div>
        <p className="text-xs text-slate-200 font-mono leading-relaxed">
          {signal.observedFact}
        </p>
      </div>

      {/* Risk Reasoning */}
      <div className="text-xs text-slate-400 leading-normal pl-1">
        <strong className="text-slate-300">Heuristic Rationale: </strong>
        {signal.inferenceReason}
      </div>

    </div>
  );
};
