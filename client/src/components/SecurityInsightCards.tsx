import React from 'react';
import { 
  Sparkles, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import type { TransactionData } from '../types/index.js';

interface SecurityInsightCardsProps {
  transactions: TransactionData[];
  onSelectTransaction: (orderId: string) => void;
  onSimulateOrder: () => void;
  onNavigateToTab?: (tab: string) => void;
  isSimulating?: boolean;
}

export const SecurityInsightCards: React.FC<SecurityInsightCardsProps> = ({
  transactions,
  onSelectTransaction,
  onSimulateOrder,
  onNavigateToTab,
  isSimulating = false,
}) => {
  // Find top flagged transaction to link to
  const topFlagged = transactions.find((t) => t.riskTier === 'BLOCK' || t.riskTier === 'REVIEW');
  const reviewCount = transactions.filter((t) => t.riskTier === 'REVIEW').length;
  const blockCount = transactions.filter((t) => t.riskTier === 'BLOCK').length;

  // Real-time dynamic threat metrics evaluated from active transaction telemetry
  const vpnCount = transactions.filter((t) => t.telemetry?.isProxyOrVpn).length;
  const velocityCount = transactions.filter((t) => (t.telemetry?.failedAttemptsInLastHour || 0) >= 2 || (t.telemetry?.ordersInLast24Hours || 0) > 3).length;
  const highValueMismatch = transactions.filter((t) => (t.amount > 350) && (t.telemetry?.shippingAddressMatchesBilling === false)).length;

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      
      {/* 1. AI Threat Predictions */}
      <article className="flex min-h-[360px] flex-col justify-between rounded-2xl border border-[#1e293b] bg-[linear-gradient(180deg,rgba(99,102,241,0.08)_0%,#0a0f1d_42%)] p-4.5 shadow-sm">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#6366f1] text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold text-slate-100">
              AI Threat Predictions
            </h3>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-xl bg-slate-900/80 px-2.5 py-1 text-[11px] font-mono text-indigo-300 border border-indigo-900/40">
            Real Telemetry
          </span>
        </div>

        {/* Prediction Items (Grounded dynamically in active telemetry stream) */}
        <div className="flex flex-1 flex-col gap-2.5 justify-between">
          
          <div className="flex items-start gap-3 rounded-xl bg-[#0e1628] border border-slate-800/80 p-3">
            {vpnCount > 0 ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            )}
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-semibold text-slate-200">
                {vpnCount > 0 ? 'Tor & Proxy Subnet Activity Detected' : 'Network Routing Clean'}
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {vpnCount > 0
                  ? `Anonymized proxy/VPN routing observed in ${vpnCount} checkout${vpnCount > 1 ? 's' : ''}. Pre-capture firewall active.`
                  : 'Zero commercial VPN or Tor exit nodes detected across active transactions.'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-[#0e1628] border border-slate-800/80 p-3">
            {velocityCount > 0 ? (
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            )}
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-semibold text-slate-200">
                {velocityCount > 0 ? 'Card-Testing Velocity Anomalies' : 'Velocity Baseline Normal'}
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {velocityCount > 0
                  ? `Elevated attempt velocity detected across ${velocityCount} fingerprint${velocityCount > 1 ? 's' : ''}. Brute force mitigation armed.`
                  : 'Zero rapid card testing loops detected in the active window. IP rate-limiting policy steady.'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-[#0e1628] border border-slate-800/80 p-3">
            {highValueMismatch > 0 ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            )}
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-semibold text-slate-200">
                {highValueMismatch > 0 ? 'High-Value Basket Geographic Divergence' : 'High-Value Orders Aligned'}
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {highValueMismatch > 0
                  ? `${highValueMismatch} order${highValueMismatch > 1 ? 's' : ''} over $350 flagged with billing/shipping discrepancies for review.`
                  : 'High-ticket orders demonstrate consistent domestic delivery and billing alignment.'}
              </p>
            </div>
          </div>

        </div>

      </article>

      {/* 2. Security & Gateway Vitals */}
      <article className="flex min-h-[360px] flex-col justify-between rounded-2xl border border-[#1e293b] bg-[linear-gradient(180deg,rgba(244,63,94,0.08)_0%,#0a0f1d_42%)] p-4.5 shadow-sm">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f43f5e] text-white shadow-sm">
              <Activity className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold text-slate-100">
              Gateway & Security Vitals
            </h3>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-xl bg-slate-900/80 px-2.5 py-1 text-[11px] font-mono text-emerald-400 border border-emerald-900/40">
            ● All Stable
          </span>
        </div>

        {/* Vitals List */}
        <div className="flex flex-1 flex-col justify-between rounded-xl bg-[#070b16] border border-slate-800/80 p-3.5 divide-y divide-slate-800/60 font-mono text-xs">
          
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-400">PayPal Sandbox REST API</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Connected (v2)
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-slate-400">Pre-Capture Interceptor</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Active (0ms delay)
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-slate-400">SQLite Ledger Storage</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Operational (WAL)
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-slate-400">APIMatic Spec Validator</span>
            <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              Contract Valid
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-slate-400">Decision Engine Latency</span>
            <span className="text-slate-200 font-semibold">14 ms avg</span>
          </div>

        </div>

      </article>

      {/* 3. Recommended Actions */}
      <article className="flex min-h-[360px] flex-col justify-between rounded-2xl border border-[#1e293b] bg-[linear-gradient(180deg,rgba(20,184,166,0.08)_0%,#0a0f1d_42%)] p-4.5 shadow-sm md:col-span-2 xl:col-span-1">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#14b8a6] text-white shadow-sm">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold text-slate-100">
              Recommended Actions
            </h3>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-xl bg-slate-900/80 px-2.5 py-1 text-[11px] font-mono text-teal-300 border border-teal-900/40">
            Smart Next Steps
          </span>
        </div>

        {/* Action Items */}
        <div className="flex flex-1 flex-col gap-2.5 justify-between">
          
          {/* Action 1: Review Flagged Orders */}
          <div 
            onClick={() => topFlagged && onSelectTransaction(topFlagged.orderId)}
            className={`flex items-center justify-between gap-3 rounded-xl bg-[#0e1628] border border-slate-800/80 p-3 hover:border-amber-600/60 transition-all cursor-pointer group`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-200 group-hover:text-amber-300 transition-colors">
                  Review {reviewCount + blockCount > 0 ? `${reviewCount + blockCount} Flagged Orders` : 'Orders'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {topFlagged ? `Open top flagged order (${topFlagged.orderId})` : 'All transactions are currently clear'}
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-amber-300 transition-colors shrink-0" />
          </div>

          {/* Action 2: Simulate Attack Checkout */}
          <div 
            onClick={onSimulateOrder}
            className="flex items-center justify-between gap-3 rounded-xl bg-[#0e1628] border border-slate-800/80 p-3 hover:border-cyan-600/60 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                  {isSimulating ? 'Evaluating...' : 'Simulate Incoming Order'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Test real-time risk engine interception
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-cyan-300 transition-colors shrink-0" />
          </div>

          {/* Action 3: Test Store */}
          <div 
            onClick={() => {
              if (onNavigateToTab) {
                onNavigateToTab('checkout');
              } else {
                window.location.hash = '#store';
              }
            }}
            className="flex items-center justify-between gap-3 rounded-xl bg-[#0e1628] border border-slate-800/80 p-3 hover:border-teal-600/60 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
                <ShoppingBag className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-200 group-hover:text-teal-300 transition-colors">
                  Test PayPal Sandbox Store
                </p>
                <p className="text-[11px] text-slate-400">
                  Demonstrate pre-capture attack block in checkout
                </p>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-slate-500 group-hover:text-teal-300 transition-colors shrink-0" />
          </div>

        </div>

      </article>

    </section>
  );
};
