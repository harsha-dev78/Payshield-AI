import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Layers, 
  Sparkles,
  RefreshCw,
  DollarSign
} from 'lucide-react';
import { SecurityScoreDonut } from '../components/SecurityScoreDonut.js';
import { BionisMetricCard } from '../components/BionisMetricCard.js';
import { SecurityCharts } from '../components/SecurityCharts.js';
import { SecurityInsightCards } from '../components/SecurityInsightCards.js';
import { TransactionGrid } from '../components/TransactionGrid.js';
import type { TransactionData } from '../types/index.js';
import { api } from '../services/api.js';

interface DashboardProps {
  transactions: TransactionData[];
  onSelectTransaction: (orderId: string) => void;
  onRefresh: () => Promise<void>;
  loading?: boolean;
}

type TimelineOption = '24h' | '7d' | 'all';

export const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  onSelectTransaction,
  onRefresh,
  loading = false,
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationMsg, setSimulationMsg] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineOption>('7d');

  // Time-based greeting inspired by Bionis
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning, Merchant';
    if (hour < 18) return 'Good Afternoon, Merchant';
    return 'Good Evening, Merchant';
  }, []);

  // Filter transactions based on timeline window
  const filteredByTimeline = useMemo(() => {
    if (timeline === 'all') return transactions;
    const now = Date.now();
    const cutoff = timeline === '24h' ? now - 24 * 3600 * 1000 : now - 7 * 24 * 3600 * 1000;
    return transactions.filter((t) => {
      const time = t.createdAt ? new Date(t.createdAt).getTime() : now;
      return time >= cutoff;
    });
  }, [transactions, timeline]);

  // Aggregate metrics
  const activeTxList = filteredByTimeline.length > 0 ? filteredByTimeline : transactions;
  const totalAnalyzed = activeTxList.length;
  const reviewTransactions = activeTxList.filter((t) => t.riskTier === 'REVIEW');
  const blockedTransactions = activeTxList.filter((t) => t.riskTier === 'BLOCK');
  const capturedTransactions = activeTxList.filter((t) => t.paymentStatus === 'CAPTURED');

  // Total volume processed in Sandbox
  const totalCapturedVolume = capturedTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);

  // Compute Overall Security Health Score (0 - 100)
  const healthScore = useMemo(() => {
    if (activeTxList.length === 0) return 96;
    const avgRiskScore = activeTxList.reduce((acc, t) => acc + (t.riskScore || 20), 0) / activeTxList.length;
    // Invert risk score: lower risk = higher health score
    const score = Math.round(100 - avgRiskScore);
    return Math.max(15, Math.min(99, score));
  }, [activeTxList]);

  // Health summary text
  const healthStatus = useMemo(() => {
    if (healthScore >= 80) return { condition: 'Protected / Low Anomaly Rate', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
    if (healthScore >= 50) return { condition: 'Elevated Risk / Review Active', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
    return { condition: 'Critical Anomaly Rate', badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
  }, [healthScore]);

  // Simulate an incoming order for live testing
  const handleSimulateTransaction = async () => {
    setIsSimulating(true);
    setSimulationMsg(null);
    try {
      const mockId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      const isAttack = Math.random() > 0.5;

      const newTx: TransactionData = {
        orderId: mockId,
        amount: isAttack ? 580.00 : 75.00,
        currency: 'USD',
        customer: {
          name: isAttack ? 'Suspicious Buyer' : 'Jane Miller',
          email: isAttack ? 'bot_actor@tempmail.com' : 'jane.miller@gmail.com',
          phone: isAttack ? undefined : '+1-555-019-2234',
        },
        items: [
          { id: 'item-sim', name: isAttack ? 'Gaming Laptop' : 'Wireless Headset', price: isAttack ? 580.00 : 75.00, quantity: 1 }
        ],
        telemetry: {
          ipAddress: isAttack ? '185.220.101.99' : '198.51.100.22',
          ipCountry: isAttack ? 'RU' : 'US',
          isProxyOrVpn: isAttack,
          deviceFingerprint: `dfp_${Math.random().toString(36).substring(2, 8)}`,
          userAgent: 'Mozilla/5.0',
          billingCountry: 'US',
          shippingCountry: 'US',
          shippingAddressMatchesBilling: !isAttack,
          emailDomain: isAttack ? 'tempmail.com' : 'gmail.com',
          isDisposableEmail: isAttack,
          accountAgeDays: isAttack ? 0 : 95,
          ordersInLast24Hours: isAttack ? 6 : 1,
          failedAttemptsInLastHour: isAttack ? 3 : 0,
        },
        createdAt: new Date().toISOString(),
      };

      const result = await api.evaluateTransaction(newTx);
      await onRefresh();
      setSimulationMsg(`Evaluated ${mockId}: Categorized as ${result.assessment.tier === 'BLOCK' ? 'High Risk' : result.assessment.tier === 'REVIEW' ? 'Needs Review' : 'Low Risk'}.`);
      onSelectTransaction(mockId);
    } catch (err: any) {
      setSimulationMsg(`Simulation failed: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const periodLabel = timeline === '24h' ? 'Last 24 Hours' : timeline === '7d' ? 'Last 7 Days' : 'All Time';

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      
      {/* 1. Header & Timeline Controls (Bionis Topbar pattern) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            {greeting}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time pre-capture security intelligence for PayPal online payments.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          
          {/* Timeline Selector Pill Group */}
          <div className="flex items-center rounded-xl bg-[#0a0f1d] border border-[#1e293b] p-1 text-xs">
            <button
              onClick={() => setTimeline('24h')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                timeline === '24h'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              24h
            </button>
            <button
              onClick={() => setTimeline('7d')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                timeline === '7d'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              7d
            </button>
            <button
              onClick={() => setTimeline('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                timeline === 'all'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => onRefresh()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0a0f1d] hover:bg-[#10172a] text-slate-300 border border-[#1e293b] text-xs font-medium transition-colors"
            title="Refresh transactions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Simulate Order Button */}
          <button
            onClick={handleSimulateTransaction}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 text-xs font-semibold transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isSimulating ? 'Analyzing...' : 'Simulate Order'}</span>
          </button>

        </div>
      </div>

      {simulationMsg && (
        <div className="p-3 rounded-xl bg-[#10172a] border border-cyan-800/60 text-xs text-cyan-200 flex items-center justify-between shadow-sm">
          <span>{simulationMsg}</span>
          <button onClick={() => setSimulationMsg(null)} className="text-slate-400 hover:text-white ml-2">✕</button>
        </div>
      )}

      {/* 2. Hero: Overall Security Health (Bionis Overall Wellness pattern) */}
      <section className="flex flex-col md:flex-row items-center justify-between gap-6 rounded-2xl border border-[#1e293b] bg-[linear-gradient(180deg,rgba(59,130,246,0.06)_0%,#0a0f1d_40%)] p-6 shadow-sm">
        
        <div className="flex flex-col justify-between gap-3 max-w-xl">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-100">Overall Security Health</h2>
            <span className="text-xs font-mono text-slate-400">({periodLabel})</span>
          </div>

          <div className="flex flex-col gap-2.5">
            <span className={`inline-flex w-fit rounded-xl border px-3 py-1 text-xs font-medium font-mono ${healthStatus.badgeClass}`}>
              ● {healthStatus.condition}
            </span>
            <p className="text-sm leading-relaxed text-slate-400">
              Your store is protected by PayShield&apos;s real-time pre-capture firewall.{' '}
              <span className="font-semibold text-slate-200">
                {blockedTransactions.length} high-risk fraudulent checkouts
              </span>{' '}
              were intercepted prior to PayPal settlement, eliminating chargeback fees and payment fraud.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center shrink-0">
          <SecurityScoreDonut score={healthScore} size={135} />
        </div>

      </section>

      {/* 3. Key Metrics (4 Bionis-styled cards) */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Key Security Metrics</h2>
          <span className="text-xs font-mono text-slate-400">{periodLabel} snapshot</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          <BionisMetricCard
            label="Transactions Evaluated"
            value={totalAnalyzed}
            subValue="Real-time pre-capture"
            trendText="↑ 100% inspected"
            trendDirection="up"
            icon={Layers}
            iconBg="#3b82f6"
            badgeText="Pre-Capture"
          />
          <BionisMetricCard
            label="Needs Review"
            value={reviewTransactions.length}
            subValue="Held for inspection"
            trendText={reviewTransactions.length > 0 ? "Flagged anomalies" : "All clean"}
            trendDirection={reviewTransactions.length > 0 ? "neutral" : "up"}
            icon={AlertTriangle}
            iconBg="#f59e0b"
            badgeText="Action Req."
          />
          <BionisMetricCard
            label="High Risk Blocked"
            value={blockedTransactions.length}
            subValue="Zero false capture"
            trendText={blockedTransactions.length > 0 ? `${blockedTransactions.length} Intercepted` : "0 Intercepted"}
            trendDirection="down"
            icon={ShieldAlert}
            iconBg="#ef4444"
            badgeText="Auto-Held"
          />
          <BionisMetricCard
            label="Sandbox Captured"
            value={`$${totalCapturedVolume.toFixed(2)}`}
            subValue={`${capturedTransactions.length} safe settlements`}
            trendText="PayPal Verified"
            trendDirection="up"
            icon={DollarSign}
            iconBg="#10b981"
            badgeText="Completed"
          />
        </div>
      </section>

      {/* 4. Visual Analytics Breakdown (2-Column Grid: Trend & Anomaly Breakdown) */}
      <SecurityCharts
        transactions={activeTxList}
        periodLabel={periodLabel}
      />

      {/* 5. 3 Intelligence Cards (AI Predictions, Gateway Vitals, Recommended Actions) */}
      <SecurityInsightCards
        transactions={activeTxList}
        onSelectTransaction={onSelectTransaction}
        onSimulateOrder={handleSimulateTransaction}
        isSimulating={isSimulating}
      />

      {/* 6. Transaction Stream Table (AG Grid Community) */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Recent Transactions & Audit Stream</h2>
          <span className="text-xs font-mono text-slate-400">AG Grid Community Edition</span>
        </div>
        <TransactionGrid
          transactions={transactions}
          onSelectTransaction={onSelectTransaction}
          loading={loading}
        />
      </section>

    </div>
  );
};
