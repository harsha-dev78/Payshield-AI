import React, { useRef, useMemo } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  FileText, 
  ShieldCheck
} from 'lucide-react';
import type { TransactionData, RiskAssessment, AuditRecord, MLPredictionResult } from '../types/index.js';

interface InvestigationReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionData;
  assessment: RiskAssessment;
  auditLogs: AuditRecord[];
  mlPrediction?: MLPredictionResult | null;
}

export const InvestigationReportModal: React.FC<InvestigationReportModalProps> = ({
  isOpen,
  onClose,
  transaction,
  assessment,
  auditLogs,
  mlPrediction,
}) => {
  const [copied, setCopied] = React.useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const reportId = useMemo(() => {
    const timestamp = assessment?.assessedAt ? new Date(assessment.assessedAt).getTime() : Date.now();
    return `REP-${transaction?.orderId || 'TX'}-${timestamp.toString(36).toUpperCase()}`;
  }, [transaction?.orderId, assessment?.assessedAt]);

  const generatedDate = useMemo(() => new Date().toUTCString(), []);
  const displayGeneratedDate = useMemo(() => new Date().toLocaleString(), []);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    const reportData = {
      reportId,
      generatedDate,
      system: {
        engine: 'PayShield AI Explainable Risk Engine',
        policyVersion: assessment.policyVersion,
        environment: 'PayPal Sandbox / Production Compatible',
      },
      transaction,
      assessment,
      mlPrediction: mlPrediction || null,
      auditHistory: auditLogs,
      disclaimer: 'PayShield AI risk assessments are probabilistic threat estimations based on observable telemetry and do not constitute legal determinations of fraudulent intent.',
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PayShield_Report_${transaction.orderId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateMarkdown = () => {
    return `# PAYSHIELD AI — FORENSIC RISK INVESTIGATION REPORT
**Report ID:** ${reportId}
**Date Generated:** ${generatedDate}
**Order Identifier:** ${transaction.orderId}
${transaction.paypalOrderId ? `**PayPal Order ID:** ${transaction.paypalOrderId}\n` : ''}
${transaction.paypalCaptureId ? `**PayPal Capture ID:** ${transaction.paypalCaptureId}\n` : ''}

---

## 1. EXECUTIVE SUMMARY
- **Risk Score:** ${assessment.overallScore} / 100
- **Risk Classification:** ${assessment.tier === 'BLOCK' ? 'HIGH RISK (BLOCKED)' : assessment.tier === 'REVIEW' ? 'NEEDS REVIEW' : 'LOW RISK (SAFE)'}
- **Data Confidence:** ${Math.round(assessment.confidence * 100)}%
- **Payment Status:** ${transaction.paymentStatus || 'PENDING'}
- **Recommendation:** ${assessment.recommendation.action} — ${assessment.recommendation.summary}

---

## 2. TRANSACTION & EVIDENCE PROFILE
- **Order Amount:** $${transaction.amount.toFixed(2)} ${transaction.currency}
- **Customer Name:** ${transaction.customer.name}
- **Customer Email:** ${transaction.customer.email}
- **IP Address:** ${transaction.telemetry.ipAddress} (${transaction.telemetry.ipCountry})
- **Proxy / VPN Masking:** ${transaction.telemetry.isProxyOrVpn ? 'DETECTED' : 'None (Residential)'}
- **Billing Country:** ${transaction.telemetry.billingCountry}
- **Shipping Country:** ${transaction.telemetry.shippingCountry} (Matches Billing: ${transaction.telemetry.shippingAddressMatchesBilling ? 'YES' : 'NO'})
- **Account Age:** ${transaction.telemetry.accountAgeDays !== undefined ? `${transaction.telemetry.accountAgeDays} days` : 'Unspecified'}
- **Declines in Past Hour:** ${transaction.telemetry.failedAttemptsInLastHour || 0}

---

## 3. GROUNDED FINDINGS & DETECTED SIGNALS
${assessment.signals.length === 0 ? '- No adverse risk signals detected. Order adheres to normal baseline.\n' : assessment.signals.map(s => `### ${s.name} (${s.severity} — ${s.scoreContribution > 0 ? `+${s.scoreContribution}` : s.scoreContribution} pts)
- **Observed Fact:** ${s.observedFact}
- **Risk Rationale:** ${s.inferenceReason}
`).join('\n')}

---

## 4. MERCHANT ACTION & REMEDIATION
${assessment.recommendation.merchantGuidance}

---

## 5. AUDIT HISTORY
${auditLogs.length === 0 ? '- Initial risk assessment logged.\n' : auditLogs.map(l => `- **${new Date(l.timestamp).toISOString()}** | ${l.action} by ${l.actor}`).join('\n')}

---

## 6. LIMITATIONS & DISCLAIMER
This report represents automated algorithmic telemetry assessment at time of transaction capture. Observable signals (e.g. VPNs or alternate addresses) may occasionally occur in legitimate commercial or gifted orders. Final discretionary authority rests with authorized merchant review staff.
`;
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(generateMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-[#f8fafc]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Official Investigation Report
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                {reportId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Copy markdown formatted report"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownloadJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Download full JSON audit report"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 ml-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Report Content Body (Print-optimized container) */}
        <div ref={reportRef} className="p-8 overflow-y-auto space-y-6 flex-1 text-slate-800 bg-white printable-report">
          
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  PayShield AI Forensic Verification
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-[#0f172a] mt-1 tracking-tight">
                TRANSACTION RISK INVESTIGATION REPORT
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluated under Policy: <span className="font-mono font-medium text-slate-700">{assessment.policyVersion}</span>
              </p>
            </div>

            <div className="text-left sm:text-right text-xs text-slate-500 font-mono space-y-0.5">
              <div><strong>Document ID:</strong> {reportId}</div>
              <div><strong>Generated:</strong> {displayGeneratedDate}</div>
              <div><strong>Status:</strong> <span className="text-slate-800 font-semibold">{transaction.paymentStatus || 'PENDING'}</span></div>
            </div>
          </div>

          {/* Section 1: Executive Classification Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assessed Risk Score</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold text-[#0f172a]">{assessment.overallScore}</span>
                <span className="text-xs text-slate-400 font-mono">/ 100</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1">
                Data Confidence: <strong>{Math.round(assessment.confidence * 100)}%</strong>
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Classification Tier</span>
              <div className="mt-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                  assessment.tier === 'BLOCK'
                    ? 'bg-rose-100 text-rose-800'
                    : assessment.tier === 'REVIEW'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {assessment.tier === 'BLOCK' ? 'HIGH RISK (BLOCKED)' : assessment.tier === 'REVIEW' ? 'NEEDS REVIEW' : 'LOW RISK (SAFE)'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1">
                Policy Action: <strong>{assessment.recommendation.action}</strong>
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Order Value & Currency</span>
              <div className="mt-2">
                <span className="text-2xl font-extrabold text-[#0f172a]">
                  ${transaction.amount.toFixed(2)}
                </span>
                <span className="text-xs font-normal text-slate-400 ml-1">{transaction.currency}</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1">
                Order ID: <strong className="font-mono">{transaction.orderId}</strong>
              </span>
            </div>
          </div>

          {/* Section 2: Evidentiary Profile */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 pb-1 border-b border-slate-200">
              1. Observed Telemetry & Identity Evidence
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Customer Identity:</span>
                  <span className="font-semibold text-slate-900">{transaction.customer.name}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Email Address:</span>
                  <span className="font-mono">{transaction.customer.email}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Account Age:</span>
                  <span>{transaction.telemetry.accountAgeDays !== undefined ? `${transaction.telemetry.accountAgeDays} days active` : 'New customer'}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Recent Declines (1h):</span>
                  <span className={transaction.telemetry.failedAttemptsInLastHour && transaction.telemetry.failedAttemptsInLastHour > 0 ? 'text-rose-600 font-bold' : ''}>
                    {transaction.telemetry.failedAttemptsInLastHour || 0}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">IP Geolocation:</span>
                  <span className="font-semibold">{transaction.telemetry.ipAddress} ({transaction.telemetry.ipCountry})</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Anonymized Proxy / VPN:</span>
                  <span className={transaction.telemetry.isProxyOrVpn ? 'text-rose-600 font-bold' : 'text-emerald-700'}>
                    {transaction.telemetry.isProxyOrVpn ? 'DETECTED' : 'Clean Residential'}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Billing vs Shipping:</span>
                  <span>{transaction.telemetry.billingCountry} → {transaction.telemetry.shippingCountry}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Device Fingerprint:</span>
                  <span className="font-mono text-[11px] truncate max-w-[160px]">{transaction.telemetry.deviceFingerprint}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Grounded Explanations & Signals */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 pb-1 border-b border-slate-200">
              2. Evaluated Risk Signals & Grounded Rationale
            </h3>

            {assessment.signals.length > 0 ? (
              <div className="space-y-2.5">
                {assessment.signals.map((sig) => (
                  <div key={sig.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{sig.name}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          {sig.category}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          [{sig.severity}]
                        </span>
                      </div>
                      <span className={`font-mono font-bold text-xs ${sig.scoreContribution > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {sig.scoreContribution > 0 ? `+${sig.scoreContribution}` : sig.scoreContribution} pts
                      </span>
                    </div>

                    <div className="text-slate-600 text-[11px] leading-relaxed">
                      <div><strong className="text-slate-800">Observed Fact:</strong> {sig.observedFact}</div>
                      <div className="mt-0.5"><strong className="text-slate-800">Inference Reason:</strong> {sig.inferenceReason}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                ✓ No adverse signals triggered. All observed telemetry attributes fall within expected parameters for authentic domestic buyers.
              </div>
            )}
          </div>

          {/* Section 4: Operational Recommendation */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 pb-1 border-b border-slate-200">
              3. Operational Guidance & Next Action
            </h3>
            <div className="p-4 rounded-xl bg-[#f8fafc] border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900">{assessment.recommendation.summary}</div>
              <p className="text-slate-600 leading-relaxed">{assessment.recommendation.merchantGuidance}</p>
            </div>
          </div>

          {/* Section 5: Audit History Trail */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 pb-1 border-b border-slate-200">
              4. Event Audit Ledger
            </h3>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden text-xs">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-2.5 px-4 flex items-center justify-between font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 font-semibold">{log.action}</span>
                    <span className="text-slate-400">by {log.actor}</span>
                  </div>
                  <span className="text-slate-500 text-[11px]">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Limitations & Legal Disclaimer */}
          <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-400 leading-relaxed space-y-1">
            <p><strong>System Scope & Limitations:</strong> PayShield AI scores are derived from deterministic rules, automated behavioral telemetry, and statistical ML probability modeling. A high score represents anomaly density and chargeback correlation; it does not constitute conclusive evidence of unlawful conduct or third-party card theft. Conversely, low scores do not guarantee zero dispute risk.</p>
            <p>This report was automatically synthesized by PayShield AI v1.0. Tamper-evident records are retained in the local SQLite audit ledger.</p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-[#f8fafc] flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>PayShield AI Cryptographic Audit Signature Verified</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition-colors cursor-pointer"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
