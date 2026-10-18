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

  // Compute strictly real metrics from active SQLite database
  const totalAnalyzed = transactions.length;
  const reviewTransactions = transactions.filter((t) => t.riskTier === 'REVIEW');
  const blockedTransactions = transactions.filter((t) => t.riskTier === 'BLOCK');
  const capturedTransactions = transactions.filter((t) => t.paymentStatus === 'CAPTURED');

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

  return (
    <div className="space-y-6">
      
      {/* Welcome Heading & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            Payment Security Overview
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time pre-capture risk monitoring for PayPal transactions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => onRefresh()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a0f1d] hover:bg-[#10172a] text-slate-300 border border-[#1e293b] text-xs font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleSimulateTransaction}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 text-xs font-semibold transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isSimulating ? 'Analyzing...' : 'Simulate Order'}</span>
          </button>
        </div>
      </div>

      {simulationMsg && (
        <div className="p-3 rounded-lg bg-[#10172a] border border-cyan-800/60 text-xs text-cyan-200 flex items-center justify-between">
          <span>{simulationMsg}</span>
          <button onClick={() => setSimulationMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* 4 Clean Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label="Transactions Analyzed"
          value={totalAnalyzed}
          subValue="Evaluated before capture"
          icon={Layers}
          variant="cyan"
        />
        <StatCard
          label="Needs Review"
          value={reviewTransactions.length}
          subValue="Anomalies flagged"
          icon={AlertTriangle}
          variant="amber"
        />
        <StatCard
          label="High Risk"
          value={blockedTransactions.length}
          subValue="Suspicious orders held"
          icon={ShieldAlert}
          variant="rose"
        />
        <StatCard
          label="Paid in Sandbox"
          value={capturedTransactions.length}
          subValue="Completed payments"
          icon={ShieldCheck}
          variant="emerald"
        />
      </div>

      {/* Transaction Table */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-semibold text-slate-200">Recent Transactions</h2>
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

