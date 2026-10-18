import React from 'react';
import { HelpCircle, CheckCircle, ArrowDownRight, ShieldAlert } from 'lucide-react';
import type { CounterfactualSuggestion } from '../types/index.js';

interface CounterfactualBoxProps {
  counterfactuals: CounterfactualSuggestion[];
  currentScore: number;
}

export const CounterfactualBox: React.FC<CounterfactualBoxProps> = ({ counterfactuals, currentScore }) => {
  return (
    <div className="p-5 rounded-xl bg-gradient-to-br from-[#0c1424] to-[#070c18] border border-cyan-900/40 shadow-lg">
      
      {/* Title */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-400">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>What Would Change This Decision?</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                Uncertainty Resolution
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Specific, actionable verification evidence that would objectively resolve anomaly risk.
            </p>
          </div>
        </div>
      </div>

      {/* Counterfactual Items */}
      <div className="space-y-3">
        {counterfactuals.map((item, idx) => {
          const estimatedNewScore = Math.max(0, currentScore + item.potentialScoreImpact);

          return (
            <div
              key={idx}
              className="p-3.5 rounded-lg bg-[#090e1c] border border-slate-800/90 hover:border-cyan-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
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
                <span className="flex items-center text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-1 rounded">
                  <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                  {item.potentialScoreImpact} pts
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  (New Score: ~{estimatedNewScore})
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ethical AI & False-Positive Guardrail Notice */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center gap-2 text-[11px] text-slate-400">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>
          <strong>Ethical AI Guardrail:</strong> High scores indicate statistical anomaly certainty, not criminal presumption. Always provide buyers a fair path to authenticate.
        </span>
      </div>

    </div>
  );
};
