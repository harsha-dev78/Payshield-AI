import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  User, 
  Cpu, 
  Lock
} from 'lucide-react';
import { EvidenceCard } from '../components/EvidenceCard.js';
import { CounterfactualBox } from '../components/CounterfactualBox.js';
import { RiskBadge } from '../components/RiskBadge.js';
import type { TransactionData, RiskAssessment, MLPredictionResult } from '../types/index.js';
import { api } from '../services/api.js';

interface InvestigationProps {
  orderId: string;
  onBack: () => void;
  onRefreshList: () => Promise<void>;
}

export const Investigation: React.FC<InvestigationProps> = ({ orderId, onBack, onRefreshList }) => {
  const [data, setData] = useState<{
    transaction: TransactionData;
    assessment: RiskAssessment;
    mlPrediction?: MLPredictionResult;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overrideNotes, setOverrideNotes] = useState('');
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const loadOrderDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getTransactionDetails(orderId);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load transaction investigation.');
    } finally {
      setLoading(false);
    }
  };

  const handleOverride = async (action: 'ALLOW' | 'BLOCK') => {
    setIsSubmitting(true);
    try {
      await api.overrideTransaction(orderId, action, overrideNotes || `Merchant manual override: set to ${action}`);
      setActionMsg(`Transaction status successfully updated to ${action === 'ALLOW' ? 'PENDING' : 'BLOCKED'}. Logged in Audit Trail.`);
      await loadOrderDetails();
      await onRefreshList();
    } catch (err: any) {
      setActionMsg(`Override error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-400">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-mono">Analyzing risk evidence and telemetry vectors for {orderId}...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-[#0b0f1d] border border-slate-800 rounded-xl">
        <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
        <h3 className="text-base font-bold text-white">Investigation Not Available</h3>
        <p className="text-xs text-slate-400 mt-1">{error || 'Order record not found.'}</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const { transaction: tx, assessment } = data;

  return (
    <div className="space-y-6">
      
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Back to Triage Grid"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono text-white tracking-tight">
                Investigation: {tx.orderId}
              </h1>
              <RiskBadge tier={assessment.tier} score={assessment.overallScore} size="md" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Assessed at {new Date(assessment.assessedAt).toLocaleString()} • Engine {assessment.policyVersion}
            </p>
          </div>
        </div>

        {/* Payment Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-xs text-slate-400">Gateway Status:</span>
          <span className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border ${
            tx.paymentStatus === 'CAPTURED'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/50'
              : tx.paymentStatus === 'BLOCKED'
              ? 'bg-rose-950/60 text-rose-300 border-rose-600/50'
              : 'bg-amber-950/60 text-amber-300 border-amber-600/50'
          }`}>
            {tx.paymentStatus}
          </span>
          {tx.paypalOrderId && (
            <span className="text-[11px] font-mono text-slate-400 hidden md:inline">
              ({tx.paypalOrderId})
            </span>
          )}
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 rounded-lg bg-cyan-950/80 border border-cyan-800/80 text-xs text-cyan-200 font-mono flex items-center justify-between">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-cyan-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Grid: Left Column (Telemetry & Identity) | Right Column (Risk & Evidence) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Customer & Hardware Telemetry (1 Col) */}
        <div className="space-y-5 lg:col-span-1">
          
          {/* Order & Amount Card */}
          <div className="p-4 rounded-xl bg-[#0b0f1d] border border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Transaction Parameters</span>
            </h3>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Order Amount</span>
                <span className="text-slate-100 font-bold">${tx.amount.toFixed(2)} {tx.currency}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Created At</span>
                <span className="text-slate-300">{new Date(tx.createdAt).toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Cart Items</span>
                <span className="text-slate-300">{tx.items?.length || 0} item(s)</span>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="mt-3 pt-2 border-t border-slate-800/60 space-y-1.5">
              {tx.items?.map((item) => (
                <div key={item.id} className="flex justify-between text-[11px] text-slate-400">
                  <span className="text-slate-300 truncate max-w-[170px]">{item.name}</span>
                  <span className="font-mono">${item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Profile */}
          <div className="p-4 rounded-xl bg-[#0b0f1d] border border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>Customer Identification</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Declared Name</span>
                <span className="text-slate-100 font-medium">{tx.customer.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Email Address</span>
                <span className="text-slate-200 font-mono text-[11px] break-all">{tx.customer.email}</span>
              </div>
              {tx.customer.phone && (
                <div>
                  <span className="text-slate-400 block text-[11px]">Phone</span>
                  <span className="text-slate-200 font-mono text-[11px]">{tx.customer.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Observed Network & Hardware Telemetry */}
          <div className="p-4 rounded-xl bg-[#0b0f1d] border border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Observed Hardware & Telemetry</span>
            </h3>
            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">IP Geolocation</span>
                <span className="text-slate-200">{tx.telemetry.ipAddress} ({tx.telemetry.ipCountry})</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Proxy / VPN Detection</span>
                <span className={tx.telemetry.isProxyOrVpn ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                  {tx.telemetry.isProxyOrVpn ? 'YES (Masked)' : 'NO (Direct)'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Billing Country</span>
                <span className="text-slate-200">{tx.telemetry.billingCountry}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Shipping Country</span>
                <span className="text-slate-200">{tx.telemetry.shippingCountry}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Account History</span>
                <span className="text-slate-200">
                  {tx.telemetry.accountAgeDays !== undefined ? `${tx.telemetry.accountAgeDays} days` : 'Unverified'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Recent Payment Declines</span>
                <span className={(tx.telemetry.failedAttemptsInLastHour || 0) >= 3 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                  {tx.telemetry.failedAttemptsInLastHour || 0} in last 60m
                </span>
              </div>
            </div>
          </div>

          {/* Data Completeness & Missing Info Box */}
          <div className="p-4 rounded-xl bg-[#080d19] border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">Telemetry Confidence</span>
              <span className="text-xs font-mono text-cyan-400 font-bold">
                {Math.round(assessment.confidence * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 mb-3">
              <div
                className="bg-cyan-500 h-2 rounded-full"
                style={{ width: `${assessment.confidence * 100}%` }}
              ></div>
            </div>

            {assessment.missingInformation.length > 0 ? (
              <div>
                <p className="text-[11px] text-amber-400 font-medium mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Missing Data Points:
                </p>
                <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-0.5">
                  {assessment.missingInformation.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> All baseline telemetry vectors present.
              </p>
            )}
          </div>

        </div>

        {/* Right Column: Risk Attribution, Evidence Cards, Counterfactuals (2 Cols) */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Executive Recommendation Banner */}
          <div className={`p-5 rounded-xl border ${
            assessment.tier === 'BLOCK'
              ? 'bg-rose-950/20 border-rose-900/60'
              : assessment.tier === 'REVIEW'
              ? 'bg-amber-950/20 border-amber-900/60'
              : 'bg-emerald-950/20 border-emerald-900/60'
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase font-bold tracking-wider text-slate-400">
                    Engine Recommendation
                  </span>
                  <span className="text-xs font-bold text-slate-100 font-mono">
                    [{assessment.recommendation.action}]
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-100 mt-1">
                  {assessment.recommendation.summary}
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {assessment.recommendation.merchantGuidance}
                </p>
              </div>

              <div className="text-right shrink-0">
                <div className="text-3xl font-extrabold font-mono text-white">
                  {assessment.overallScore}
                  <span className="text-xs text-slate-400 font-normal">/100</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  Rule Score
                </div>
              </div>
            </div>
          </div>

          {/* Grounded AI Narrative & ML Comparative Analysis */}
          {data.mlPrediction && (
            <div className="p-5 rounded-xl bg-gradient-to-br from-[#0e1326] to-[#070b16] border border-purple-900/40 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-950/80 border border-purple-700/60 text-purple-300">
                    <span className="text-xs font-bold font-mono">AI</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Evidence-Grounded AI Narrative</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                        Zero-Hallucination
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Cross-model evaluation: Rule-Based Policy vs Statistical ML Classifier
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-right">
                  <div>
                    <span className="text-xs font-mono text-purple-300 font-bold block">
                      {(data.mlPrediction.fraudProbability * 100).toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">ML Probability</span>
                  </div>
                </div>
              </div>

              {/* Synthesized Grounded Narrative */}
              <div className="p-3.5 rounded-lg bg-black/40 border border-purple-900/30 text-xs text-slate-200 leading-relaxed font-sans">
                {data.mlPrediction.groundedExplanation}
              </div>

              {/* Feature Impact Weights */}
              <div className="pt-2 border-t border-purple-900/30">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
                  Top Statistical Feature Weights ({data.mlPrediction.modelType}):
                </span>
                <div className="flex flex-wrap gap-2">
                  {data.mlPrediction.topFeatureWeights.map((f, i) => (
                    <span
                      key={i}
                      className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                        f.impact === 'INCREASE_RISK'
                          ? 'bg-rose-950/40 text-rose-300 border-rose-800/40'
                          : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                      }`}
                    >
                      {f.feature}: {f.weight > 0 ? `+${f.weight}` : f.weight}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}


          {/* Factor Weight Breakdown */}
          <div className="p-4 rounded-xl bg-[#0b0f1d] border border-slate-800">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Factor Weight Impact Breakdown
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {assessment.factors.map((f, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-black/40 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-200">{f.category}</span>
                    <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{f.description}</p>
                  </div>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                    f.weightedImpact > 0 ? 'text-rose-400 bg-rose-950/60' : 'text-emerald-400 bg-emerald-950/60'
                  }`}>
                    {f.weightedImpact > 0 ? `+${f.weightedImpact}` : f.weightedImpact} pts
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Observed Evidence Signals */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Evidence Ledger ({assessment.signals.length} Signals Observed)
                </h3>
                <p className="text-xs text-slate-400">
                  Every finding grounded in verifiable telemetry facts with explicit heuristic attribution
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {assessment.signals.map((sig) => (
                <EvidenceCard key={sig.id} signal={sig} />
              ))}
            </div>
          </div>

          {/* "What Would Change This Decision?" Counterfactuals */}
          <CounterfactualBox
            counterfactuals={assessment.counterfactuals}
            currentScore={assessment.overallScore}
          />

          {/* Merchant Decision & Override Controls */}
          <div className="p-5 rounded-xl bg-[#070b14] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-100">Merchant Decision Override</h3>
                <p className="text-xs text-slate-400">
                  Override risk policy decisions manually. All actions are cryptographically logged in the SQLite audit trail.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                placeholder="Reason or verification note (e.g., 'Customer verified via phone call')..."
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                className="w-full sm:flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleOverride('ALLOW')}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 text-xs font-semibold transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Force Allow</span>
                </button>

                <button
                  onClick={() => handleOverride('BLOCK')}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700/60 text-xs font-semibold transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Force Block</span>
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
