import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
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

  // Compute strictly real metrics from active application state
  const totalAnalyzed = transactions.length;
  const reviewTransactions = transactions.filter((t) => t.riskTier === 'REVIEW');
  const blockedTransactions = transactions.filter((t) => t.riskTier === 'BLOCK');
  const capturedTransactions = transactions.filter((t) => t.paymentStatus === 'CAPTURED');

  const blockedVolume = blockedTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
  const capturedVolume = capturedTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);

  const allowCount = transactions.filter((t) => t.riskTier === 'ALLOW').length;

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
      setSimulationMsg(`Simulated ${mockId}: Evaluated as ${result.assessment.tier} (Score: ${result.assessment.overallScore}/100).`);
      onSelectTransaction(mockId);
    } catch (err: any) {
      setSimulationMsg(`Simulation failed: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Top Banner: Overview & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-[#0a0f1d] border border-[#1e293b]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">
              Payment Security Intelligence Dashboard
            </h1>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-800/40 font-semibold tracking-wider">
              Sandbox Live
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time pre-capture telemetry analysis and server-side risk gatekeeping for PayPal checkouts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onRefresh()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10172a] hover:bg-[#172036] text-slate-300 border border-[#1e293b] text-xs font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleSimulateTransaction}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900/90 text-cyan-300 border border-cyan-700/60 text-xs font-semibold transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isSimulating ? 'Evaluating...' : 'Simulate Incoming Order'}</span>
          </button>
        </div>
      </div>

      {simulationMsg && (
        <div className="p-3 rounded-lg bg-[#10172a] border border-cyan-800/60 text-xs text-cyan-200 font-mono flex items-center justify-between">
          <span>{simulationMsg}</span>
          <button onClick={() => setSimulationMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Real Summary Cards (strictly real data from SQLite database) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label="Total Analyzed Orders"
          value={totalAnalyzed}
          subValue="Telemetry Processed"
          icon={Layers}
          variant="cyan"
        />
        <StatCard
          label="Transactions Requiring Review"
          value={reviewTransactions.length}
          subValue="Anomalies Flagged"
          icon={AlertTriangle}
          variant="amber"
        />
        <StatCard
          label="High-Risk Intercepted"
          value={blockedTransactions.length}
          subValue={`$${blockedVolume.toFixed(2)} Held Pre-Capture`}
          icon={ShieldAlert}
          variant="rose"
        />
        <StatCard
          label="Completed Sandbox Payments"
          value={capturedTransactions.length}
          subValue={`$${capturedVolume.toFixed(2)} Verified Captured`}
          icon={ShieldCheck}
          variant="emerald"
        />
      </div>

      {/* Risk Distribution Visual Bar */}
      <div className="p-3.5 rounded-xl bg-[#0a0f1d] border border-[#1e293b]">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-300 font-medium">Risk Score Portfolio Distribution</span>
          <span className="text-slate-400 font-mono text-[11px]">{totalAnalyzed} Evaluated Orders</span>
        </div>
        <div className="h-2 w-full rounded-full bg-[#060911] overflow-hidden flex border border-[#1e293b]/60">
          <div 
            style={{ width: `${(allowCount / (totalAnalyzed || 1)) * 100}%` }}
            className="bg-[#10b981] transition-all duration-300" 
            title={`Low Risk: ${allowCount}`}
          />
          <div 
            style={{ width: `${(reviewTransactions.length / (totalAnalyzed || 1)) * 100}%` }}
            className="bg-[#f59e0b] transition-all duration-300" 
            title={`Needs Review: ${reviewTransactions.length}`}
          />
          <div 
            style={{ width: `${(blockedTransactions.length / (totalAnalyzed || 1)) * 100}%` }}
            className="bg-[#ef4444] transition-all duration-300" 
            title={`High Risk Blocked: ${blockedTransactions.length}`}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
            <span>Low Risk (0–29): {allowCount}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
            <span>Needs Review (30–65): {reviewTransactions.length}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>
            <span>High Risk (&gt;65): {blockedTransactions.length}</span>
          </span>
        </div>
      </div>

      {/* Transaction Stream (AG Grid) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-bold text-slate-100">Transaction Triage Stream</h2>
            <p className="text-[11px] text-slate-400">Powered by AG Grid Community • Instant sort, filter, and detail drill-down</p>
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
