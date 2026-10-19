import React from 'react';
import { HelpCircle, CheckCircle, ArrowDownRight, ShieldCheck } from 'lucide-react';
import type { CounterfactualSuggestion } from '../types/index.js';

interface CounterfactualBoxProps {
  counterfactuals: CounterfactualSuggestion[];
  currentScore: number;
}

export const CounterfactualBox: React.FC<CounterfactualBoxProps> = ({ counterfactuals, currentScore }) => {
  return (
    <div className="p-4.5 rounded-2xl bg-white border border-[#e5edf8] space-y-3.5 shadow-xs">
      
      {/* Title */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <span>What Would Change This Decision?</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                Actionable Remediation
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
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
              className="p-3 rounded-xl bg-[#f8fafc] border border-slate-200/80 hover:border-blue-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
            >
              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    {item.condition}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {item.rationale}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <span className="flex items-center text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                  {item.potentialScoreImpact} pts
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  (Est: ~{estimatedNewScore})
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ethical Guardrail Notice */}
      <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
        <span>
          <strong className="text-slate-700">Fair Payment Guarantee:</strong> Anomaly detection measures statistical uncertainty, never demographic bias.
        </span>
      </div>

    </div>
  );
};
