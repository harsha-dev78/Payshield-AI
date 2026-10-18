import React from 'react';
import { HelpCircle, CheckCircle, ArrowDownRight, ShieldCheck } from 'lucide-react';
import type { CounterfactualSuggestion } from '../types/index.js';

interface CounterfactualBoxProps {
  counterfactuals: CounterfactualSuggestion[];
  currentScore: number;
}

export const CounterfactualBox: React.FC<CounterfactualBoxProps> = ({ counterfactuals, currentScore }) => {
  return (
    <div className="p-4 rounded-xl bg-[#0a0f1d] border border-[#1e293b] space-y-3">
      
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#0a192f] border border-cyan-800/60 text-cyan-400">
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
              <span>What Would Change This Decision?</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
                Uncertainty Resolution
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Specific additional verification evidence that would objectively resolve anomaly risk.
            </p>
          </div>
        </div>
      </div>

      {/* Counterfactual Items */}
      <div className="space-y-2">
        {counterfactuals.map((item, idx) => {
          const estimatedNewScore = Math.max(0, currentScore + item.potentialScoreImpact);

          return (
            <div
              key={idx}
              className="p-3 rounded-lg bg-[#060911] border border-[#1e293b] hover:border-cyan-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
            >
              <div className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-medium text-slate-200">
                    {item.condition}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {item.rationale}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <span className="flex items-center text-xs font-mono font-bold text-[#34d399] bg-[#06281e] border border-[#065f46] px-2 py-0.5 rounded">
                  <ArrowDownRight className="w-3 h-3 mr-0.5" />
                  {item.potentialScoreImpact} pts
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  (Est: ~{estimatedNewScore})
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ethical Guardrail Notice */}
      <div className="pt-2 border-t border-[#1e293b]/70 flex items-center gap-2 text-[11px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span>
          <strong>Fair Payment Guardrail:</strong> Anomaly detection measures statistical uncertainty, not malicious intent. These actions represent objective verification steps.
        </span>
      </div>

    </div>
  );
};
