import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle, 
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Cpu,
  User
} from 'lucide-react';
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
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

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
      await api.overrideTransaction(orderId, action, overrideNotes || `Merchant decision: ${action === 'ALLOW' ? 'Approved' : 'Blocked'}`);
      setActionMsg(`Transaction decision updated to ${action === 'ALLOW' ? 'Approved (Safe)' : 'Blocked'}. Action saved in Activity log.`);
      setOverrideNotes('');
      await loadOrderDetails();
      await onRefreshList();
    } catch (err: any) {
      setActionMsg(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-400">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-mono">Analyzing transaction {orderId}...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-[#0a0f1d] border border-[#1e293b] rounded-xl max-w-lg mx-auto">
        <AlertTriangle className="w-8 h-8 text-[#f87171] mx-auto mb-2" />
        <h3 className="text-sm font-bold text-white">Transaction Not Found</h3>
        <p className="text-xs text-slate-400 mt-1">{error || 'This order does not exist in the database.'}</p>
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

  // Signal plain English helper
  const getSignalPlainEnglish = (sig: any) => {
    return {
      title: sig.name || sig.observedFact || 'Detected Anomaly',
      meaning: sig.inferenceReason || 'This telemetry signal deviates from standard customer purchase patterns.',
    };
  };

  // Recommendation details
  const getRecommendationContent = () => {
    if (assessment.tier === 'BLOCK') {
      return {
        actionLabel: 'Hold Checkout',
        badgeClass: 'bg-[#2d0b12] text-[#f87171] border-[#7f1d1d]',
        headline: 'Do not capture payment without verification.',
        summary: 'Multiple high-risk indicators were detected on this order, including masked network routing and rapid attempt velocity. Capturing this payment presents a strong risk of an unauthorized transaction or chargeback.',
        nextStep: 'Contact the buyer to verify authorization or hold fulfillment. If you cannot confirm buyer identity, keep this transaction blocked.',
      };
    }
    if (assessment.tier === 'REVIEW') {
      return {
        actionLabel: 'Review Manually',
        badgeClass: 'bg-[#2e1c07] text-[#fbbf24] border-[#78350f]',
        headline: 'Verify buyer details before shipping.',
        summary: 'Moderate anomalies were observed, such as a country discrepancy or a newly created account. The risk is not severe enough to immediately reject, but requires a quick merchant review.',
        nextStep: 'Confirm the shipping address with the customer via email or phone. If the information checks out, approve the payment below.',
      };
    }
    return {
      actionLabel: 'Proceed',
      badgeClass: 'bg-[#06281e] text-[#34d399] border-[#065f46]',
      headline: 'Safe to capture and fulfill.',
      summary: 'This transaction passed all pre-capture checks. The buyer network, billing location, and device fingerprints align with standard legitimate customer behavior.',
      nextStep: 'No action required. You can safely proceed with order fulfillment.',
    };
  };

  const rec = getRecommendationContent();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Back button & top bar */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <button
          onClick={loadOrderDetails}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a0f1d] hover:bg-[#10172a] text-slate-300 border border-[#1e293b] text-xs transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {actionMsg && (
        <div className="p-3.5 rounded-xl bg-[#0a0f1d] border border-cyan-800 text-xs text-cyan-200 flex items-center justify-between">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION A: ORDER SUMMARY                                */}
      {/* ======================================================== */}
      <div className="rounded-xl bg-[#0a0f1d] border border-[#1e293b] p-5">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1e293b]">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Order Summary
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {new Date(tx.createdAt).toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-[11px] text-slate-400 block mb-0.5">Order ID</span>
            <span className="text-sm font-bold font-mono text-slate-100">{tx.orderId}</span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block mb-0.5">Amount</span>
            <span className="text-sm font-bold font-mono text-slate-100">
              ${tx.amount.toFixed(2)} <span className="text-xs font-normal text-slate-400">{tx.currency}</span>
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block mb-0.5">Risk Level</span>
            <RiskBadge tier={assessment.tier} score={assessment.overallScore} size="sm" />
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block mb-0.5">Payment Status</span>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${
              tx.paymentStatus === 'CAPTURED'
                ? 'bg-[#06281e] text-[#34d399] border-[#065f46]'
                : tx.paymentStatus === 'BLOCKED'
                ? 'bg-[#2d0b12] text-[#f87171] border-[#7f1d1d]'
                : 'bg-[#2e1c07] text-[#fbbf24] border-[#78350f]'
            }`}>
              {tx.paymentStatus === 'CAPTURED' ? 'Paid' : tx.paymentStatus === 'BLOCKED' ? 'Blocked' : 'Pending'}
            </span>
          </div>
        </div>

        {/* Customer sub-row */}
        <div className="mt-4 pt-3 border-t border-[#1e293b] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Customer: <strong className="text-slate-100">{tx.customer.name}</strong> ({tx.customer.email})</span>
          </div>
          {tx.paypalOrderId && (
            <div className="text-slate-400 font-mono text-[11px]">
              PayPal Ref: <span className="text-cyan-400 font-semibold">{tx.paypalOrderId}</span>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION B: WHY WAS THIS FLAGGED?                        */}
      {/* ======================================================== */}
      <div className="rounded-xl bg-[#0a0f1d] border border-[#1e293b] p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-100">
          Why was this flagged?
        </h2>
        <p className="text-xs text-slate-400">
          Detected signals based on real telemetry evaluated before payment capture.
        </p>

        <div className="space-y-2.5 pt-1">
          {assessment.signals.length > 0 ? (
            assessment.signals.map((sig) => {
              const info = getSignalPlainEnglish(sig);
              return (
                <div 
                  key={sig.id} 
                  className="p-3.5 rounded-lg bg-[#060911] border border-[#1e293b] flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200">
                        {info.title}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium ${
                        sig.severity === 'CRITICAL' || sig.severity === 'HIGH'
                          ? 'bg-[#2d0b12] text-[#f87171] border border-[#7f1d1d]'
                          : 'bg-[#2e1c07] text-[#fbbf24] border border-[#78350f]'
                      }`}>
                        {sig.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {info.meaning}
                    </p>
                  </div>

                  <span className="text-xs font-mono font-bold text-slate-400 shrink-0">
                    +{sig.scoreContribution} pts
                  </span>
                </div>
              );
            })
          ) : (
            <div className="p-4 rounded-lg bg-[#06281e]/30 border border-[#065f46] text-xs text-[#34d399] flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>No suspicious signals detected. This transaction matches normal buyer behavior.</span>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION C: AI RECOMMENDATION                            */}
      {/* ======================================================== */}
      <div className="rounded-xl bg-[#0a0f1d] border border-[#1e293b] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-100">AI Recommendation</h2>
          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${rec.badgeClass}`}>
            {rec.actionLabel}
          </span>
        </div>

        <div className="p-4 rounded-lg bg-[#060911] border border-[#1e293b] space-y-2">
          <h3 className="text-xs font-bold text-slate-200">
            {rec.headline}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {rec.summary}
          </p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION D: WHAT SHOULD I DO NEXT?                       */}
      {/* ======================================================== */}
      <div className="rounded-xl bg-[#0a0f1d] border border-[#1e293b] p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-100">
          What should I do next?
        </h2>

        <p className="text-xs text-slate-300 leading-relaxed">
          {rec.nextStep}
        </p>

        {/* Merchant Decision Buttons */}
        <div className="pt-2 border-t border-[#1e293b] space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <input
              type="text"
              placeholder="Optional note for your team (e.g. 'Verified with customer by phone')..."
              value={overrideNotes}
              onChange={(e) => setOverrideNotes(e.target.value)}
              className="w-full sm:flex-1 px-3 py-1.5 rounded-lg bg-[#060911] border border-[#1e293b] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleOverride('ALLOW')}
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#06281e] hover:bg-[#06281e]/80 text-[#34d399] border border-[#065f46] text-xs font-semibold transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Approve Order</span>
              </button>

              <button
                onClick={() => handleOverride('BLOCK')}
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#2d0b12] hover:bg-[#2d0b12]/80 text-[#f87171] border border-[#7f1d1d] text-xs font-semibold transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Block Order</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PROGRESSIVE DISCLOSURE: VIEW TECHNICAL DETAILS           */}
      {/* ======================================================== */}
      <div className="rounded-xl bg-[#0a0f1d] border border-[#1e293b] overflow-hidden">
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="w-full p-4 flex items-center justify-between text-xs font-medium text-slate-300 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>View Technical Details (Advanced)</span>
          </div>
          {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showTechnicalDetails && (
          <div className="p-5 border-t border-[#1e293b] space-y-5 bg-[#070b16]">
            
            {/* Raw Telemetry */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Raw Network & Device Telemetry</h4>
              <div className="p-3 rounded-lg bg-[#060911] border border-[#1e293b] space-y-1.5 text-xs font-mono text-slate-300">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">IP Address:</span>
                  <span>{tx.telemetry.ipAddress} ({tx.telemetry.ipCountry})</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Proxy / VPN:</span>
                  <span className={tx.telemetry.isProxyOrVpn ? 'text-[#f87171]' : 'text-[#34d399]'}>
                    {tx.telemetry.isProxyOrVpn ? 'Yes (Anonymized)' : 'No (Direct)'}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Device Fingerprint:</span>
                  <span>{tx.telemetry.deviceFingerprint}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Billing → Shipping:</span>
                  <span>{tx.telemetry.billingCountry} → {tx.telemetry.shippingCountry}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Account History:</span>
                  <span>{tx.telemetry.accountAgeDays !== undefined ? `${tx.telemetry.accountAgeDays} days active` : 'New account'} · {tx.telemetry.failedAttemptsInLastHour || 0} recent declines</span>
                </div>
              </div>
            </div>

            {/* Machine Learning Model Comparison */}
            {mlPrediction && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Machine Learning Probability Model</h4>
                  <span className="text-xs font-mono text-purple-300">
                    Model Score: {(mlPrediction.fraudProbability * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#060911] border border-[#1e293b] space-y-2">
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {mlPrediction.groundedExplanation}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
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
              </div>
            )}

            {/* What Would Change This Decision? (Counterfactuals) */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">What Would Change This Decision?</h4>
              <CounterfactualBox
                counterfactuals={assessment.counterfactuals}
                currentScore={assessment.overallScore}
              />
            </div>

            {/* Order Audit Log */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Immutable Event Trail for This Order</h4>
              <div className="space-y-1.5">
                {orderLogs.length > 0 ? (
                  orderLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="p-2.5 rounded-lg bg-[#060911] border border-[#1e293b] flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-400 font-semibold">{log.action}</span>
                        <span className="text-slate-400">by {log.actor}</span>
                      </div>
                      <span className="text-slate-500 text-[11px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 font-mono">
                    Initial risk evaluation recorded.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
};

