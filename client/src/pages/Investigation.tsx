import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  User, 
  Cpu, 
  RefreshCw
} from 'lucide-react';
import { EvidenceCard } from '../components/EvidenceCard.js';
import { CounterfactualBox } from '../components/CounterfactualBox.js';
import { RiskBadge } from '../components/RiskBadge.js';
import type { TransactionData, RiskAssessment, MLPredictionResult, AuditRecord } from '../types/index.js';
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

  const [orderLogs, setOrderLogs] = useState<AuditRecord[]>([]);
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
      const [details, logs] = await Promise.all([
        api.getTransactionDetails(orderId),
        api.getAuditLogs(orderId).catch(() => []),
      ]);
      setData(details);
      setOrderLogs(logs);
    } catch (err: any) {
      setError(err.message || 'Failed to load transaction investigation.');
    } finally {
      setLoading(false);
    }
  };

  const handleOverride = async (action: 'ALLOW' | 'BLOCK') => {
    setIsSubmitting(true);
    try {
      await api.overrideTransaction(orderId, action, overrideNotes || `Merchant manual decision override: set to ${action}`);
      setActionMsg(`Transaction status successfully updated to ${action === 'ALLOW' ? 'PENDING' : 'BLOCKED'}. Logged in Audit Trail.`);
      setOverrideNotes('');
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
      <div className="flex flex-col items-center justify-center p-20 text-slate-400">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-mono">Analyzing risk evidence and telemetry vectors for {orderId}...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-[#0a0f1d] border border-[#1e293b] rounded-xl max-w-lg mx-auto">
        <AlertTriangle className="w-8 h-8 text-[#f87171] mx-auto mb-2" />
        <h3 className="text-sm font-bold text-white">Investigation Record Not Found</h3>
        <p className="text-xs text-slate-400 mt-1">{error || 'Transaction ID does not exist in the database.'}</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-1.5 rounded-lg bg-[#10172a] hover:bg-[#172036] text-xs text-slate-200 border border-[#1e293b] transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const { transaction: tx, assessment, mlPrediction } = data;

  return (
    <div className="space-y-6">
      
      {/* Navigation & Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg bg-[#0a0f1d] hover:bg-[#10172a] border border-[#1e293b] text-slate-400 hover:text-white transition-colors"
            title="Back to Dashboard Grid"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold font-mono text-slate-100 tracking-tight">
                Investigation: {tx.orderId}
              </h1>
              <RiskBadge tier={assessment.tier} score={assessment.overallScore} size="md" />
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Evaluated {new Date(assessment.assessedAt).toLocaleString()} • Engine {assessment.policyVersion}
            </p>
          </div>
        </div>

        <button
          onClick={loadOrderDetails}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a0f1d] hover:bg-[#10172a] text-slate-300 border border-[#1e293b] text-xs font-mono transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Refresh Investigation</span>
        </button>
      </div>

      {actionMsg && (
        <div className="p-3 rounded-lg bg-[#0a0f1d] border border-cyan-800/80 text-xs text-cyan-200 font-mono flex items-center justify-between">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION A: TRANSACTION OVERVIEW                         */}
      {/* ======================================================== */}
      <div className="rounded-xl bg-[#0a0f1d] border border-[#1e293b] p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1e293b]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
              Section A
            </span>
            <span className="text-slate-400">/</span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Transaction Overview & Gateway State
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Recorded {new Date(tx.createdAt).toLocaleTimeString()}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          
          {/* Order ID */}
          <div className="p-3 rounded-lg bg-[#060911] border border-[#1e293b]">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">Order Ref</span>
            <span className="text-xs font-bold font-mono text-slate-100">{tx.orderId}</span>
          </div>

          {/* Amount & Currency */}
          <div className="p-3 rounded-lg bg-[#060911] border border-[#1e293b]">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">Order Amount</span>
            <span className="text-xs font-bold font-mono text-slate-100">
              ${tx.amount.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">{tx.currency}</span>
            </span>
          </div>

          {/* Risk Score */}
          <div className="p-3 rounded-lg bg-[#060911] border border-[#1e293b]">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">Risk Score</span>
            <span className="text-xs font-bold font-mono text-cyan-400">
              {assessment.overallScore} <span className="text-[10px] text-slate-400 font-normal">/ 100</span>
            </span>
          </div>

          {/* Risk Category */}
          <div className="p-3 rounded-lg bg-[#060911] border border-[#1e293b]">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">Risk Category</span>
            <RiskBadge tier={assessment.tier} size="sm" />
          </div>

          {/* Investigation Status */}
          <div className="p-3 rounded-lg bg-[#060911] border border-[#1e293b]">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">Investigation Status</span>
            <span className="text-[11px] font-medium text-slate-200">
              {tx.paymentStatus === 'BLOCKED' ? 'Halted by Policy' : tx.paymentStatus === 'CAPTURED' ? 'Capture Cleared' : 'Requires Review'}
            </span>
          </div>

          {/* PayPal Gateway Status */}
          <div className="p-3 rounded-lg bg-[#060911] border border-[#1e293b]">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">PayPal Status</span>
            <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border ${
              tx.paymentStatus === 'CAPTURED'
                ? 'bg-[#06281e] text-[#34d399] border-[#065f46]'
                : tx.paymentStatus === 'BLOCKED'
                ? 'bg-[#2d0b12] text-[#f87171] border-[#7f1d1d]'
                : 'bg-[#2e1c07] text-[#fbbf24] border-[#78350f]'
            }`}>
              {tx.paymentStatus}
            </span>
          </div>

        </div>

        {/* Customer Identity Subline */}
        <div className="mt-3.5 pt-3 border-t border-[#1e293b] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-slate-300">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <strong>Customer:</strong> {tx.customer.name}
            </span>
            <span className="text-slate-500">•</span>
            <span className="font-mono text-[11px] text-slate-300">
              {tx.customer.email}
            </span>
            {tx.customer.phone && (
              <>
                <span className="text-slate-500">•</span>
                <span className="font-mono text-[11px] text-slate-400">{tx.customer.phone}</span>
              </>
            )}
          </div>

          {tx.paypalOrderId && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
              <span>PayPal Ref:</span>
              <span className="text-cyan-400 font-bold">{tx.paypalOrderId}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Section B (Evidence) & Section C (AI Recommendation) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ======================================================== */}
        {/* SECTION B: EVIDENCE ANALYSIS                             */}
        {/* ======================================================== */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#0a0f1d] border border-[#1e293b]">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#1e293b]">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                  Section B
                </span>
                <span className="text-slate-400">/</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Evidence Analysis & Telemetry Signals
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {assessment.signals.length} Signals Observed
              </span>
            </div>

            {/* Observed Telemetry Table (Hardware, Network, Geo) */}
            <div className="mb-4 p-3 rounded-lg bg-[#060911] border border-[#1e293b] space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-[#1e293b]/60">
                <span className="text-slate-400">Connection IP / Geolocation:</span>
                <span className="text-slate-200 font-semibold">{tx.telemetry.ipAddress} ({tx.telemetry.ipCountry})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1e293b]/60">
                <span className="text-slate-400">Proxy / Commercial VPN:</span>
                <span className={tx.telemetry.isProxyOrVpn ? 'text-[#f87171] font-bold' : 'text-[#34d399]'}>
                  {tx.telemetry.isProxyOrVpn ? 'YES (Masked IP Detected)' : 'NO (Direct Residential)'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1e293b]/60">
                <span className="text-slate-400">Billing vs Shipping Match:</span>
                <span className={tx.telemetry.shippingAddressMatchesBilling ? 'text-[#34d399]' : 'text-[#fbbf24]'}>
                  {tx.telemetry.billingCountry} → {tx.telemetry.shippingCountry} ({tx.telemetry.shippingAddressMatchesBilling ? 'Aligned' : 'Mismatch'})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1e293b]/60">
                <span className="text-slate-400">Account History / Declines:</span>
                <span className="text-slate-200">
                  {tx.telemetry.accountAgeDays !== undefined ? `${tx.telemetry.accountAgeDays}d active` : 'Unverified'} · {tx.telemetry.failedAttemptsInLastHour || 0} recent declines
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Email Domain Type:</span>
                <span className={tx.telemetry.isDisposableEmail ? 'text-[#f87171] font-bold' : 'text-slate-200'}>
                  {tx.telemetry.emailDomain} ({tx.telemetry.isDisposableEmail ? 'Disposable Inbox' : 'Permanent Domain'})
                </span>
              </div>
            </div>

            {/* Individual Evidence Signal Cards */}
            <div className="space-y-3">
              {assessment.signals.map((sig) => (
                <EvidenceCard key={sig.id} signal={sig} />
              ))}
            </div>

            {/* Missing Information & Uncertainty Indicator */}
            <div className="mt-4 p-3 rounded-lg bg-[#060911] border border-[#1e293b]">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Telemetry Completeness & Uncertainty</span>
                </span>
                <span className="font-mono text-cyan-400 font-bold">
                  {Math.round(assessment.confidence * 100)}% Confidence
                </span>
              </div>
              <div className="w-full bg-[#10172a] rounded-full h-1.5 mb-2.5">
                <div
                  className="bg-cyan-500 h-1.5 rounded-full"
                  style={{ width: `${assessment.confidence * 100}%` }}
                ></div>
              </div>

              {assessment.missingInformation.length > 0 ? (
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#fbbf24] block mb-1">
                    Unobserved Data Fields:
                  </span>
                  <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-0.5">
                    {assessment.missingInformation.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-[11px] text-[#34d399] flex items-center gap-1 font-mono">
                  <CheckCircle className="w-3.5 h-3.5" /> All baseline telemetry vectors present.
                </p>
              )}
            </div>

          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION C: AI RECOMMENDATION & COUNTERFACTUALS           */}
        {/* ======================================================== */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#0a0f1d] border border-[#1e293b] space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#1e293b]">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                  Section C
                </span>
                <span className="text-slate-400">/</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  AI Recommendation & Counterfactuals
                </h3>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">
                Action: {assessment.recommendation.action}
              </span>
            </div>

            {/* Primary Recommendation Banner */}
            <div className={`p-4 rounded-xl border ${
              assessment.tier === 'BLOCK'
                ? 'bg-[#2d0b12]/30 border-[#7f1d1d]'
                : assessment.tier === 'REVIEW'
                ? 'bg-[#2e1c07]/30 border-[#78350f]'
                : 'bg-[#06281e]/30 border-[#065f46]'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-400">
                      Recommendation Action:
                    </span>
                    <span className="text-xs font-bold font-mono text-slate-100">
                      [{assessment.recommendation.action}]
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-100 mt-1">
                    {assessment.recommendation.summary}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {assessment.recommendation.merchantGuidance}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold font-mono text-slate-100">
                    {assessment.overallScore}
                    <span className="text-xs text-slate-400 font-normal">/100</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    Score
                  </div>
                </div>
              </div>
            </div>

            {/* Evidence-Grounded AI Narrative */}
            {mlPrediction && (
              <div className="p-4 rounded-xl bg-[#060911] border border-[#1e293b] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-800 text-[10px] font-mono">
                      Grounded AI
                    </span>
                    <span>Evidence Synthesis Narrative</span>
                  </span>
                  <span className="text-[11px] font-mono text-purple-300">
                    ML Probability: {(mlPrediction.fraudProbability * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {mlPrediction.groundedExplanation}
                </p>

                {/* Factor weights */}
                <div className="pt-2 border-t border-[#1e293b] flex flex-wrap gap-1.5">
                  {mlPrediction.topFeatureWeights.map((f, i) => (
                    <span
                      key={i}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        f.impact === 'INCREASE_RISK'
                          ? 'bg-[#2d0b12] text-[#f87171] border-[#7f1d1d]'
                          : 'bg-[#06281e] text-[#34d399] border-[#065f46]'
                      }`}
                    >
                      {f.feature}: {f.weight > 0 ? `+${f.weight}` : f.weight}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* "What Would Change This Decision?" */}
            <CounterfactualBox
              counterfactuals={assessment.counterfactuals}
              currentScore={assessment.overallScore}
            />

          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* SECTION D: DECISION AND AUDIT HISTORY                    */}
      {/* ======================================================== */}
      <div className="rounded-xl bg-[#0a0f1d] border border-[#1e293b] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1e293b]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
              Section D
            </span>
            <span className="text-slate-400">/</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Decision & Immutable Audit History
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Engine Recommendation:</span>
            <strong className="text-cyan-400">{assessment.recommendation.action}</strong>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Verified Outcome:</span>
            <strong className={tx.paymentStatus === 'CAPTURED' ? 'text-[#34d399]' : 'text-[#f87171]'}>
              {tx.paymentStatus}
            </strong>
          </div>
        </div>

        {/* Chronological Audit Log for this Order */}
        <div className="space-y-2">
          {orderLogs.length > 0 ? (
            orderLogs.map((log) => (
              <div 
                key={log.id} 
                className="p-3 rounded-lg bg-[#060911] border border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    log.action === 'PAYMENT_CAPTURED'
                      ? 'bg-[#06281e] text-[#34d399] border-[#065f46]'
                      : log.action === 'PAYMENT_BLOCKED'
                      ? 'bg-[#2d0b12] text-[#f87171] border-[#7f1d1d]'
                      : log.action === 'MERCHANT_OVERRIDE'
                      ? 'bg-purple-950/60 text-purple-300 border-purple-800'
                      : 'bg-cyan-950/60 text-cyan-300 border-cyan-800'
                  }`}>
                    {log.action}
                  </span>
                  <span className="text-slate-300">
                    Actor: <strong className="text-slate-100">{log.actor}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                  <span>Policy: {log.policyVersion}</span>
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-3 text-center text-xs text-slate-500 font-mono">
              Initial assessment recorded in SQLite database.
            </div>
          )}
        </div>

        {/* Merchant Decision Override Controls */}
        <div className="pt-3 border-t border-[#1e293b] flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            placeholder="Optional verification reason (e.g. 'Verified delivery destination with buyer via SMS')..."
            value={overrideNotes}
            onChange={(e) => setOverrideNotes(e.target.value)}
            className="w-full sm:flex-1 px-3 py-1.5 rounded-lg bg-[#060911] border border-[#1e293b] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleOverride('ALLOW')}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#06281e] hover:bg-[#06281e]/80 text-[#34d399] border border-[#065f46] text-xs font-semibold transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Force Allow</span>
            </button>

            <button
              onClick={() => handleOverride('BLOCK')}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#2d0b12] hover:bg-[#2d0b12]/80 text-[#f87171] border border-[#7f1d1d] text-xs font-semibold transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Force Block</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
