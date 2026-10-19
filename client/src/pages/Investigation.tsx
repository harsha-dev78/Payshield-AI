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
  User,
  Clock,
  Sparkles,
  FileText,
  History
} from 'lucide-react';
import { CounterfactualBox } from '../components/CounterfactualBox.js';
import { RiskBadge } from '../components/RiskBadge.js';
import { InvestigationReportModal } from '../components/InvestigationReportModal.js';
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
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

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
      setActionMsg(`Transaction decision updated to ${action === 'ALLOW' ? 'Approved (Safe)' : 'Blocked'}. Record appended to audit ledger.`);
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
      <div className="flex flex-col items-center justify-center p-20 text-slate-500 animate-fade-in-up">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-medium text-slate-600">Analyzing transaction {orderId} telemetry...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-white border border-[#e5edf8] rounded-2xl max-w-lg mx-auto shadow-xs animate-fade-in-up">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-900">Transaction Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">{error || 'This order does not exist in the database.'}</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const { transaction: tx, assessment, mlPrediction } = data;

  const getSignalPlainEnglish = (sig: any) => {
    return {
      title: sig.name || sig.observedFact || 'Detected Anomaly',
      meaning: sig.inferenceReason || 'This telemetry signal deviates from standard customer purchase patterns.',
    };
  };

  const getRecommendationContent = () => {
    if (assessment.tier === 'BLOCK') {
      return {
        actionLabel: 'Hold Checkout',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        headline: 'Do not capture payment without manual verification.',
        summary: 'Multiple high-risk indicators were detected on this order, including masked network routing and rapid attempt velocity. Capturing this payment presents severe chargeback risk.',
        nextStep: 'Contact the buyer to verify authorization or hold fulfillment. If you cannot confirm buyer identity, keep this transaction blocked.',
      };
    }
    if (assessment.tier === 'REVIEW') {
      return {
        actionLabel: 'Review Manually',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        headline: 'Verify buyer details before shipping.',
        summary: 'Moderate anomalies were observed, such as a country discrepancy or a newly created account. The risk requires a quick merchant review.',
        nextStep: 'Confirm the shipping address with the customer via email or phone. If the information checks out, approve the payment below.',
      };
    }
    return {
      actionLabel: 'Proceed',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      headline: 'Safe to capture and fulfill.',
      summary: 'This transaction passed all pre-capture checks. The buyer network, billing location, and device fingerprints align with standard legitimate customer behavior.',
      nextStep: 'No action required. You can safely proceed with order fulfillment.',
    };
  };

  const rec = getRecommendationContent();

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in-up pb-12">
      
      {/* Back button & top bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Generate Report</span>
          </button>

          <button
            onClick={loadOrderDetails}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-medium transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Details</span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs font-medium text-blue-900 flex items-center justify-between shadow-xs">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-blue-500 hover:text-blue-800 ml-2">✕</button>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION A: ORDER SUMMARY                                */}
      {/* ======================================================== */}
      <div className="rounded-2xl bg-white border border-[#e5edf8] p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Order Summary
          </span>
          <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{new Date(tx.createdAt).toLocaleString()}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-xs text-slate-400 block mb-1">Order ID</span>
            <span className="text-sm font-bold text-slate-900">{tx.orderId}</span>
          </div>

          <div>
            <span className="text-xs text-slate-400 block mb-1">Amount</span>
            <span className="text-sm font-bold text-slate-900">
              ${tx.amount.toFixed(2)} <span className="text-xs font-normal text-slate-400">{tx.currency}</span>
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-400 block mb-1">Risk Level</span>
            <RiskBadge tier={assessment.tier} score={assessment.overallScore} size="sm" />
          </div>

          <div>
            <span className="text-xs text-slate-400 block mb-1">Payment Status</span>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              tx.paymentStatus === 'CAPTURED'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : tx.paymentStatus === 'BLOCKED'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {tx.paymentStatus === 'CAPTURED' ? 'Paid' : tx.paymentStatus === 'BLOCKED' ? 'Blocked' : 'Review'}
            </span>
          </div>
        </div>

        {/* Customer Details */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <User className="w-3.5 h-3.5" />
            </div>
            <span>Customer: <strong className="text-slate-900">{tx.customer.name}</strong> ({tx.customer.email})</span>
          </div>
          {tx.paypalOrderId && (
            <div className="text-slate-500 font-mono text-xs">
              PayPal Order ID: <span className="text-blue-600 font-semibold">{tx.paypalOrderId}</span>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION B: WHY WAS THIS FLAGGED?                        */}
      {/* ======================================================== */}
      <div className="rounded-2xl bg-white border border-[#e5edf8] p-6 space-y-4 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Why was this flagged?
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Detected telemetry signals evaluated in real time before PayPal capture.
          </p>
        </div>

        <div className="space-y-2.5">
          {assessment.signals.length > 0 ? (
            assessment.signals.map((sig) => {
              const info = getSignalPlainEnglish(sig);
              const isBad = sig.severity === 'CRITICAL' || sig.severity === 'HIGH';

              return (
                <div 
                  key={sig.id} 
                  className="p-4 rounded-xl bg-[#f8fafc] border border-slate-200 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {info.title}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                        isBad 
                          ? 'bg-rose-50 text-rose-700 border-rose-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {sig.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      {info.meaning}
                    </p>
                  </div>

                  <span className="text-xs font-mono font-bold text-rose-600 shrink-0 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">
                    +{sig.scoreContribution} pts
                  </span>
                </div>
              );
            })
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>No suspicious signals detected. This transaction matches normal consumer baseline.</span>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION C: AI RECOMMENDATION                            */}
      {/* ======================================================== */}
      <div className="rounded-2xl bg-white border border-[#e5edf8] p-6 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">AI Recommendation</h2>
          </div>
          <span className={`px-3 py-0.5 rounded-full text-xs font-semibold border ${rec.badgeClass}`}>
            {rec.actionLabel}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#f8fafc] border border-slate-200 space-y-1.5">
          <h3 className="text-xs font-bold text-slate-900">
            {rec.headline}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {rec.summary}
          </p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION D: WHAT SHOULD I DO NEXT?                       */}
      {/* ======================================================== */}
      <div className="rounded-2xl bg-white border border-[#e5edf8] p-6 space-y-4 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900">
          What should I do next?
        </h2>

        <p className="text-xs text-slate-600 leading-relaxed">
          {rec.nextStep}
        </p>

        {/* Merchant Decision Buttons */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              placeholder="Optional merchant note (e.g. 'Verified with customer by phone')..."
              value={overrideNotes}
              onChange={(e) => setOverrideNotes(e.target.value)}
              className="w-full sm:flex-1 px-3.5 py-2 rounded-xl bg-[#f8fafc] border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => handleOverride('ALLOW')}
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Approve Order</span>
              </button>

              <button
                onClick={() => handleOverride('BLOCK')}
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Block Order</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* ======================================================== */}
      {/* SECTION E: INVESTIGATION HISTORY & AUDIT TRAIL          */}
      {/* ======================================================== */}
      <div className="rounded-2xl bg-white border border-[#e5edf8] p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Investigation History & Audit Trail</h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {orderLogs.length} audit {orderLogs.length === 1 ? 'event' : 'events'} recorded
          </span>
        </div>

        <div className="space-y-2">
          {orderLogs.length > 0 ? (
            orderLogs.map((log) => (
              <div 
                key={log.id} 
                className="p-3.5 rounded-xl bg-[#f8fafc] border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="font-bold text-slate-900">{log.action}</span>
                  <span className="text-slate-400">by {log.actor}</span>
                  {log.details?.overrideAction && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      log.details.overrideAction === 'ALLOW' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {log.details.overrideAction}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  {log.details?.merchantNotes && (
                    <span className="font-sans italic text-slate-600 truncate max-w-xs">
                      "{log.details.merchantNotes}"
                    </span>
                  )}
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
              Initial assessment recorded in tamper-evident ledger.
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* PROGRESSIVE DISCLOSURE: VIEW TECHNICAL DETAILS           */}
      {/* ======================================================== */}
      <div className="rounded-2xl bg-white border border-[#e5edf8] overflow-hidden shadow-xs">
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="w-full p-5 flex items-center justify-between text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-600" />
            <span>View Technical Details & Machine Learning Audit (Advanced)</span>
          </div>
          {showTechnicalDetails ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showTechnicalDetails && (
          <div className="p-6 border-t border-slate-100 space-y-6 bg-[#f8fafc]">
            
            {/* Raw Telemetry */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Raw Network & Device Telemetry</h4>
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 text-xs font-mono text-slate-700 shadow-xs">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">IP Address:</span>
                  <span className="font-semibold">{tx.telemetry.ipAddress} ({tx.telemetry.ipCountry})</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Proxy / VPN:</span>
                  <span className={tx.telemetry.isProxyOrVpn ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                    {tx.telemetry.isProxyOrVpn ? 'Yes (Anonymized)' : 'No (Direct Residential)'}
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
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Machine Learning Probability Model</h4>
                  <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                    Model Score: {(mlPrediction.fraudProbability * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-xs">
                  <p className="text-xs text-slate-700 leading-relaxed font-sans">
                    {mlPrediction.groundedExplanation}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {mlPrediction.topFeatureWeights.map((f, i) => (
                      <span
                        key={i}
                        className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${
                          f.impact === 'INCREASE_RISK'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
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
              <CounterfactualBox
                counterfactuals={assessment.counterfactuals}
                currentScore={assessment.overallScore}
              />
            </div>

            {/* Order Audit Log */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Immutable Event Trail for This Order</h4>
              <div className="space-y-1.5">
                {orderLogs.length > 0 ? (
                  orderLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs font-mono shadow-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600 font-semibold">{log.action}</span>
                        <span className="text-slate-400">by {log.actor}</span>
                      </div>
                      <span className="text-slate-400 text-[11px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 font-mono p-3 bg-white rounded-xl border border-slate-200">
                    Initial risk evaluation recorded.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Formal Investigation Report Modal */}
      <InvestigationReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        transaction={tx}
        assessment={assessment}
        auditLogs={orderLogs}
        mlPrediction={mlPrediction}
      />

    </div>
  );
};
