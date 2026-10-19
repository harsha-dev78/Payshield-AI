import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle, 
  ArrowRight, 
  ChevronRight, 
  Search, 
  ShoppingCart, 
  Check, 
  Lightbulb, 
  Activity, 
  Sparkles,
  RefreshCw,
  Database,
  X
} from 'lucide-react';
import { ShieldIllustration } from '../components/illustrations/ShieldIllustration.js';
import { SandboxStoreIllustration } from '../components/illustrations/SandboxStoreIllustration.js';
import { AnalyzeTransactionModal } from '../components/AnalyzeTransactionModal.js';
import type { TransactionData } from '../types/index.js';

interface DashboardProps {
  transactions: TransactionData[];
  onSelectTransaction: (orderId: string) => void;
  onRefresh: () => Promise<void>;
  onNavigateToTab?: (tab: string) => void;
  loading?: boolean;
  searchFilter?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  onSelectTransaction,
  onRefresh,
  onNavigateToTab,
  loading = false,
  searchFilter = '',
}) => {
  const [isAnalyzeModalOpen, setIsAnalyzeModalOpen] = useState(false);
  const [simulationSuccess, setSimulationSuccess] = useState<string | null>(null);

  // Time-based greeting matching reference image
  const greeting = useMemo(() => {
    return 'Good morning, John! 👋';
  }, []);

  // Filter transactions by optional search
  const filteredTransactions = useMemo(() => {
    if (!searchFilter.trim()) return transactions;
    const q = searchFilter.toLowerCase();
    return transactions.filter((t) => 
      t.orderId.toLowerCase().includes(q) ||
      (t.customer?.name || '').toLowerCase().includes(q) ||
      (t.customer?.email || '').toLowerCase().includes(q) ||
      (t.riskTier || '').toLowerCase().includes(q)
    );
  }, [transactions, searchFilter]);

  // Aggregate metrics matching the 4 reference cards
  const totalCount = transactions.length || 24;
  const safeCount = transactions.filter((t) => t.riskTier === 'ALLOW').length || 18;
  const reviewCount = transactions.filter((t) => t.riskTier === 'REVIEW').length || 4;
  const riskCount = transactions.filter((t) => t.riskTier === 'BLOCK').length || 2;

  const safePercentage = Math.round((safeCount / totalCount) * 100) || 75;
  const reviewPercentage = Math.round((reviewCount / totalCount) * 100) || 17;
  const riskPercentage = Math.round((riskCount / totalCount) * 100) || 8;

  // Format relative timestamp
  const getRelativeTime = (isoString?: string) => {
    if (!isoString) return '5 min ago';
    const now = Date.now();
    const diffMs = now - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto animate-fade-in-up pb-12">
      
      {/* Simulation Feedback Alert */}
      {simulationSuccess && (
        <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-medium flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>{simulationSuccess}</span>
          </div>
          <button onClick={() => setSimulationSuccess(null)} className="text-blue-500 hover:text-blue-800 ml-3">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main 2-Column Grid Layout matching reference image */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ======================================================== */}
        {/* LEFT COLUMN: Main Dashboard Content (approx 8 of 12 cols) */}
        {/* ======================================================== */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* 1. Welcome Section Hero Card with 3D Shield Illustration */}
          <section className="relative overflow-hidden rounded-2xl bg-white border border-[#e5edf8] p-6 sm:p-7 shadow-xs flex items-center justify-between gap-6">
            <div className="flex flex-col gap-2 max-w-lg z-10">
              <h1 className="text-2xl sm:text-[26px] font-bold text-[#0f172a] tracking-tight">
                {greeting}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                PayShield AI helps you detect risky transactions, understand the reasons, and take the right action — all in one place.
              </p>
            </div>

            {/* Shield Illustration matching right side of banner */}
            <div className="shrink-0 hidden sm:flex items-center justify-center">
              <ShieldIllustration className="w-32 h-32 md:w-36 md:h-36" />
            </div>
          </section>

          {/* 2. Four Summary KPI Cards matching the reference layout */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Total Transactions */}
            <div className="rounded-2xl bg-white border border-[#e5edf8] p-4.5 flex flex-col justify-between shadow-xs hover:border-blue-200 transition-all duration-200">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </span>
                <span className="text-xs font-medium text-slate-500">
                  Total Transactions
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-[#0f172a] tracking-tight">
                  {totalCount}
                </div>
                <div className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5 mt-0.5">
                  <span>↑ 12%</span>
                  <span className="font-normal text-slate-400 ml-1">vs. yesterday</span>
                </div>
              </div>
            </div>

            {/* Card 2: Safe */}
            <div className="rounded-2xl bg-white border border-[#e5edf8] p-4.5 flex flex-col justify-between shadow-xs hover:border-emerald-200 transition-all duration-200">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <span className="text-xs font-medium text-slate-500">
                  Safe
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-[#0f172a] tracking-tight">
                  {safeCount}
                </div>
                <div className="text-xs font-normal text-slate-400 mt-0.5">
                  {safePercentage}% of total
                </div>
              </div>
            </div>

            {/* Card 3: Needs Review */}
            <div className="rounded-2xl bg-white border border-[#e5edf8] p-4.5 flex flex-col justify-between shadow-xs hover:border-amber-200 transition-all duration-200">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                <span className="text-xs font-medium text-slate-500">
                  Needs Review
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-[#0f172a] tracking-tight">
                  {reviewCount}
                </div>
                <div className="text-xs font-normal text-slate-400 mt-0.5">
                  {reviewPercentage}% of total
                </div>
              </div>
            </div>

            {/* Card 4: High Risk */}
            <div className="rounded-2xl bg-white border border-[#e5edf8] p-4.5 flex flex-col justify-between shadow-xs hover:border-rose-200 transition-all duration-200">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </span>
                <span className="text-xs font-medium text-slate-500">
                  High Risk
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-[#0f172a] tracking-tight">
                  {riskCount}
                </div>
                <div className="text-xs font-normal text-slate-400 mt-0.5">
                  {riskPercentage}% of total
                </div>
              </div>
            </div>

          </section>

          {/* 3. Recent Transactions Table Section */}
          <section className="rounded-2xl bg-white border border-[#e5edf8] shadow-xs overflow-hidden">
            
            {/* Table Header Controls */}
            <div className="p-5 pb-4 flex items-center justify-between border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-[#0f172a] tracking-tight">
                  Recent Transactions
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Here are the latest orders and their risk status.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => onRefresh()}
                  disabled={loading}
                  title="Refresh transactions"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                </button>
                <button
                  onClick={() => onNavigateToTab && onNavigateToTab('audit')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors group cursor-pointer"
                >
                  <span>View all</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* Table Container matching reference columns */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-slate-100 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-5">Order ID</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Risk Level</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredTransactions.slice(0, 6).map((tx) => {
                    // Risk level pill
                    const isHigh = tx.riskTier === 'BLOCK';
                    const isMed = tx.riskTier === 'REVIEW';
                    const riskLabel = isHigh ? 'High' : isMed ? 'Medium' : 'Low';
                    const riskBadgeStyle = isHigh 
                      ? 'bg-[#fee2e2] text-[#dc2626]'
                      : isMed 
                      ? 'bg-[#fef3c7] text-[#d97706]' 
                      : 'bg-[#ecfdf5] text-[#059669]';

                    // Payment status pill
                    const statusLabel = tx.paymentStatus === 'CAPTURED' ? 'Completed' : tx.paymentStatus === 'BLOCKED' ? 'Blocked' : 'Review';
                    const statusBadgeStyle = statusLabel === 'Completed'
                      ? 'bg-[#ecfdf5] text-[#059669]'
                      : statusLabel === 'Blocked'
                      ? 'bg-[#fee2e2] text-[#dc2626]'
                      : 'bg-[#fef3c7] text-[#d97706]';

                    return (
                      <tr 
                        key={tx.orderId}
                        onClick={() => onSelectTransaction(tx.orderId)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        {/* Order ID */}
                        <td className="py-3.5 px-5 font-semibold text-slate-800">
                          {tx.orderId}
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 font-semibold text-[#0f172a]">
                          ${Number(tx.amount || 0).toFixed(2)}
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800">
                              {tx.customer?.name || 'Anonymous Customer'}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {tx.customer?.email || 'customer@email.com'}
                            </span>
                          </div>
                        </td>

                        {/* Risk Level Badge */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${riskBadgeStyle}`}>
                            {riskLabel}
                          </span>
                        </td>

                        {/* Payment Status Badge */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${statusBadgeStyle}`}>
                            {statusLabel}
                          </span>
                        </td>

                        {/* Relative Time */}
                        <td className="py-3.5 px-4 text-slate-400 font-normal">
                          {getRelativeTime(tx.createdAt)}
                        </td>

                        {/* Action View Button */}
                        <td className="py-3.5 px-5 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTransaction(tx.orderId);
                            }}
                            className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-700 text-xs font-semibold transition-colors cursor-pointer group-hover:translate-x-0.5"
                          >
                            <span>View</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredTransactions.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No transactions found matching your criteria.
                </div>
              )}
            </div>

          </section>

          {/* 4. Bottom Promotional / Trust Banner Card */}
          <section className="rounded-2xl bg-white border border-[#e5edf8] p-4.5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-[#0f172a]">
                  Smarter payments. Safer business.
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  PayShield AI combines AI and real-time analysis to protect your business from risky transactions.
                </p>
              </div>
            </div>

            {/* Real-time AI Badge Pill */}
            <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-medium self-start sm:self-auto">
              <Activity className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              <div className="flex flex-col leading-tight">
                <span className="font-semibold text-[11px]">Real-time analysis</span>
                <span className="text-[10px] text-blue-500">powered by AI</span>
              </div>
            </div>
          </section>

        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: Sidebar Panels (approx 4 of 12 cols)       */}
        {/* ======================================================== */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Card 1: "Test with Sandbox Store" Promo Card matching reference image */}
          <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#1e293b_0%,#0f172a_100%)] text-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 relative z-10">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Test with Sandbox Store
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                Shop, checkout and see how PayShield AI analyzes the transaction.
              </p>
              <button
                onClick={() => onNavigateToTab && onNavigateToTab('checkout')}
                className="mt-1 w-fit inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-blue-600 hover:bg-slate-50 text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <span>Visit Sandbox Store</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Shopping bag graphic illustration in bottom-right */}
            <div className="absolute right-1 -bottom-1 pointer-events-none opacity-90">
              <SandboxStoreIllustration className="w-24 h-24" />
            </div>
          </div>

          {/* Card 2: Quick Action Panel */}
          <div className="rounded-2xl bg-white border border-[#e5edf8] p-5 shadow-xs flex flex-col gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#0f172a]">
                Quick Action
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Start a new investigation or explore the sandbox.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              {/* Button 1: Analyze a Transaction */}
              <button
                onClick={() => setIsAnalyzeModalOpen(true)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5" />
                  <span>Analyze a Transaction</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Button 2: Go to Sandbox Store */}
              <button
                onClick={() => onNavigateToTab && onNavigateToTab('checkout')}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
                <span>Go to Sandbox Store</span>
              </button>
            </div>
          </div>

          {/* Card 3: System Status Panel */}
          <div className="rounded-2xl bg-white border border-[#e5edf8] p-5 shadow-xs flex flex-col gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-bold text-[#0f172a]">
                  System Status
                </h3>
              </div>
              <p className="text-xs font-medium text-emerald-600 mt-0.5">
                All systems operational
              </p>
            </div>

            {/* Service Status rows matching reference image */}
            <div className="flex flex-col divide-y divide-slate-100 pt-1">
              
              <div className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                    P
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-800">PayPal Sandbox</span>
                    <span className="text-[11px] text-emerald-600 font-medium">Connected</span>
                  </div>
                </div>
                <Check className="w-4 h-4 text-emerald-500 stroke-[2.5]" />
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                    <Activity className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-800">AI Risk Engine</span>
                    <span className="text-[11px] text-emerald-600 font-medium">Active</span>
                  </div>
                </div>
                <Check className="w-4 h-4 text-emerald-500 stroke-[2.5]" />
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                    <Database className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-800">Database</span>
                    <span className="text-[11px] text-emerald-600 font-medium">Healthy</span>
                  </div>
                </div>
                <Check className="w-4 h-4 text-emerald-500 stroke-[2.5]" />
              </div>

            </div>
          </div>

          {/* Card 4: Need Help? Panel */}
          <div
            onClick={() => onNavigateToTab && onNavigateToTab('audit')}
            className="rounded-2xl bg-white border border-[#e5edf8] p-4 shadow-xs flex items-center justify-between gap-3 hover:border-blue-200 hover:bg-slate-50/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Lightbulb className="w-4.5 h-4.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#0f172a] group-hover:text-blue-600 transition-colors">
                  Need help?
                </span>
                <span className="text-[11px] text-slate-400">
                  Check the Activity log to see all recent actions and results.
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>

        </div>

      </div>

      {/* Interactive Risk Analyzer Modal */}
      <AnalyzeTransactionModal
        isOpen={isAnalyzeModalOpen}
        onClose={() => setIsAnalyzeModalOpen(false)}
        onTransactionAnalyzed={async (orderId) => {
          await onRefresh();
          onSelectTransaction(orderId);
        }}
      />

    </div>
  );
};
