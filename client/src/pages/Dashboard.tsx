import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  DollarSign, 
  Sparkles,
  RefreshCw 
} from 'lucide-react';
import { StatCard } from '../components/StatCard.js';
import { TransactionGrid } from '../components/TransactionGrid.js';
import type { TransactionData } from '../types/index.js';
import { api } from '../services/api.js';

interface DashboardProps {
  transactions: TransactionData[];
  onSelectTransaction: (orderId: string) => void;
  onRefresh: () => Promise<void>;
  loading?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  onSelectTransaction,
  onRefresh,
  loading = false,
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationMsg, setSimulationMsg] = useState<string | null>(null);

  // Calculate High-level KPIs
  const totalVolume = transactions.reduce((acc, t) => acc + (t.amount || 0), 0);
  const blockedTransactions = transactions.filter((t) => t.riskTier === 'BLOCK');
  const blockedVolume = blockedTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
  const reviewCount = transactions.filter((t) => t.riskTier === 'REVIEW').length;
  const allowCount = transactions.filter((t) => t.riskTier === 'ALLOW').length;
  const safeRate = transactions.length > 0 ? Math.round((allowCount / transactions.length) * 100) : 100;

  // Simulate a live transaction on demand
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
          name: isAttack ? 'Suspicious Actor' : 'Jane Doe',
          email: isAttack ? 'attacker@tempmail.com' : 'jane.doe@gmail.com',
          phone: isAttack ? undefined : '+1-555-019-2234',
        },
        items: [
          { id: 'item-sim', name: isAttack ? 'High-End GPU' : 'Wireless Mouse', price: isAttack ? 580.00 : 75.00, quantity: 1 }
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
      setSimulationMsg(`Order ${mockId} evaluated: Score ${result.assessment.overallScore}/100 (${result.assessment.tier}).`);
      onSelectTransaction(mockId);
    } catch (err: any) {
      setSimulationMsg(`Simulation error: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Overview & Simulation Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-gradient-to-r from-[#0b1220] via-[#09101c] to-[#070b14] border border-cyan-900/30">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Evidence-Based Payment Security Center
            </h1>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold">
              Live Gateway Interceptor
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Analyzing telemetry patterns before PayPal Sandbox payment authorization. Zero card data stored.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onRefresh()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 text-xs font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleSimulateTransaction}
            disabled={isSimulating}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-950/50 transition-all border border-cyan-400/40"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
            <span>{isSimulating ? 'Evaluating...' : 'Simulate Incoming Order'}</span>
          </button>
        </div>
      </div>

      {simulationMsg && (
        <div className="p-3 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-xs text-cyan-200 font-mono flex items-center justify-between">
          <span>{simulationMsg}</span>
          <button onClick={() => setSimulationMsg(null)} className="text-cyan-400 hover:text-white">✕</button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Scanned Volume"
          value={`$${totalVolume.toFixed(2)}`}
          subValue={`${transactions.length} Total Sandbox Orders`}
          icon={DollarSign}
          variant="cyan"
        />
        <StatCard
          label="High Risk Intercepted"
          value={`$${blockedVolume.toFixed(2)}`}
          subValue={`${blockedTransactions.length} Orders Held Pre-Capture`}
          icon={ShieldAlert}
          variant="rose"
        />
        <StatCard
          label="Manual Review Queue"
          value={reviewCount}
          subValue="Anomalies Requiring Buyer Verification"
          icon={AlertTriangle}
          variant="amber"
        />
        <StatCard
          label="Safe Pass Rate"
          value={`${safeRate}%`}
          subValue={`${allowCount} Clean Immediate Captures`}
          icon={ShieldCheck}
          variant="emerald"
        />
      </div>

      {/* Risk Distribution Visual Bar */}
      <div className="p-4 rounded-xl bg-[#0b0f1d] border border-slate-800/80">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-300 font-medium">Risk Score Portfolio Distribution</span>
          <span className="text-slate-400 font-mono text-[11px]">{transactions.length} Orders Assessed</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-slate-900 overflow-hidden flex">
          <div 
            style={{ width: `${(allowCount / (transactions.length || 1)) * 100}%` }}
            className="bg-emerald-500 transition-all duration-500" 
            title={`Allow: ${allowCount}`}
          />
          <div 
            style={{ width: `${(reviewCount / (transactions.length || 1)) * 100}%` }}
            className="bg-amber-500 transition-all duration-500" 
            title={`Review: ${reviewCount}`}
          />
          <div 
            style={{ width: `${(blockedTransactions.length / (transactions.length || 1)) * 100}%` }}
            className="bg-rose-500 transition-all duration-500" 
            title={`Blocked: ${blockedTransactions.length}`}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Allow (&lt;30 pts): {allowCount}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Review (30-65 pts): {reviewCount}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Block (&gt;65 pts): {blockedTransactions.length}</span>
          </span>
        </div>
      </div>

      {/* AG Grid Transaction Feed */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-base font-bold text-slate-100">Live Transaction Triage Stream</h2>
            <p className="text-xs text-slate-400">Powered by AG Grid Community • Instant sort, filter, and drill-down</p>
          </div>
        </div>
        <TransactionGrid
          transactions={transactions}
          onSelectTransaction={onSelectTransaction}
          loading={loading}
        />
      </div>

    </div>
  );
};
