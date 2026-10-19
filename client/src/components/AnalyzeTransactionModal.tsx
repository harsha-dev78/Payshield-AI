import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  Sparkles, 
  ArrowRight, 
  RefreshCw, 
  Sliders
} from 'lucide-react';
import type { TransactionData, RiskAssessment } from '../types/index.js';
import { api } from '../services/api.js';

interface AnalyzeTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionAnalyzed: (orderId: string) => void;
}

interface DemoScenario {
  id: string;
  name: string;
  description: string;
  expectedTier: 'ALLOW' | 'REVIEW' | 'BLOCK';
  data: Partial<TransactionData>;
}

const PRESET_SCENARIOS: DemoScenario[] = [
  {
    id: 'safe-domestic',
    name: 'Safe Domestic Purchase',
    description: 'Residential IP, matched billing/shipping, 180-day account, 0 recent declines.',
    expectedTier: 'ALLOW',
    data: {
      amount: 49.99,
      customer: { name: 'Sarah Johnson', email: 'sarah.johnson@gmail.com', phone: '+1-555-019-4821' },
      telemetry: {
        ipAddress: '198.51.100.42',
        ipCountry: 'US',
        isProxyOrVpn: false,
        deviceFingerprint: 'dfp_mac_safari_99a',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        billingCountry: 'US',
        shippingCountry: 'US',
        shippingAddressMatchesBilling: true,
        emailDomain: 'gmail.com',
        isDisposableEmail: false,
        accountAgeDays: 180,
        ordersInLast24Hours: 1,
        failedAttemptsInLastHour: 0,
      },
    },
  },
  {
    id: 'cross-border-vpn',
    name: 'Needs Review: Overseas VPN & Mismatched Address',
    description: 'Commercial VPN detected with alternate cross-border delivery destination.',
    expectedTier: 'REVIEW',
    data: {
      amount: 149.99,
      customer: { name: 'Michael Chen', email: 'm.chen@outlook.com', phone: '+1-555-014-9922' },
      telemetry: {
        ipAddress: '203.0.113.19',
        ipCountry: 'US',
        isProxyOrVpn: true,
        deviceFingerprint: 'dfp_win11_edge_3bc',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        billingCountry: 'US',
        shippingCountry: 'CA',
        shippingAddressMatchesBilling: false,
        emailDomain: 'outlook.com',
        isDisposableEmail: false,
        accountAgeDays: 21,
        ordersInLast24Hours: 2,
        failedAttemptsInLastHour: 0,
      },
    },
  },
  {
    id: 'velocity-attack',
    name: 'High Risk: Automated Card-Testing Velocity',
    description: 'Datacenter Tor exit node with 4 rapid payment declines in past hour.',
    expectedTier: 'BLOCK',
    data: {
      amount: 299.00,
      customer: { name: 'Unknown Customer', email: 'user123@tempmail.com', phone: '' },
      telemetry: {
        ipAddress: '185.220.101.5',
        ipCountry: 'NL',
        isProxyOrVpn: true,
        deviceFingerprint: 'dfp_headless_linux_77a',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64; HeadlessChrome)',
        billingCountry: 'DE',
        shippingCountry: 'US',
        shippingAddressMatchesBilling: false,
        emailDomain: 'tempmail.com',
        isDisposableEmail: true,
        accountAgeDays: 0,
        ordersInLast24Hours: 6,
        failedAttemptsInLastHour: 4,
      },
    },
  },
  {
    id: 'disposable-new-account',
    name: 'High Risk: Ephemeral Email & First-Day High Ticket',
    description: 'Disposable inbox domain with $650 purchase on a 0-day account.',
    expectedTier: 'BLOCK',
    data: {
      amount: 650.00,
      customer: { name: 'Alexei Ivanov', email: 'buyer991@trashmail.com', phone: '' },
      telemetry: {
        ipAddress: '198.51.100.88',
        ipCountry: 'US',
        isProxyOrVpn: false,
        deviceFingerprint: 'dfp_chrome_win_88x',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        billingCountry: 'US',
        shippingCountry: 'US',
        shippingAddressMatchesBilling: true,
        emailDomain: 'trashmail.com',
        isDisposableEmail: true,
        accountAgeDays: 0,
        ordersInLast24Hours: 1,
        failedAttemptsInLastHour: 0,
      },
    },
  },
];

export const AnalyzeTransactionModal: React.FC<AnalyzeTransactionModalProps> = ({
  isOpen,
  onClose,
  onTransactionAnalyzed,
}) => {
  const [activeTab, setActiveTab] = useState<'SCENARIOS' | 'CUSTOM'>('SCENARIOS');
  
  // Custom Form State
  const [orderId, setOrderId] = useState(`PS-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [amount, setAmount] = useState('89.50');
  const [customerName, setCustomerName] = useState('Jane Doe');
  const [customerEmail, setCustomerEmail] = useState('jane.doe@gmail.com');
  const [customerPhone, setCustomerPhone] = useState('+1-555-018-9922');
  const [ipAddress, setIpAddress] = useState('198.51.100.25');
  const [ipCountry, setIpCountry] = useState('US');
  const [shippingCountry, setShippingCountry] = useState('US');
  const [billingCountry, setBillingCountry] = useState('US');
  const [shippingMatchesBilling, setShippingMatchesBilling] = useState(true);
  const [isProxyOrVpn, setIsProxyOrVpn] = useState(false);
  const [accountAgeDays, setAccountAgeDays] = useState('120');
  const [failedAttempts, setFailedAttempts] = useState('0');

  // Evaluation Status & Result
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<RiskAssessment | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectScenario = (scenario: DemoScenario) => {
    const newId = `PS-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setOrderId(newId);
    setAmount((scenario.data.amount || 89.5).toString());
    setCustomerName(scenario.data.customer?.name || '');
    setCustomerEmail(scenario.data.customer?.email || '');
    setCustomerPhone(scenario.data.customer?.phone || '');
    setIpAddress(scenario.data.telemetry?.ipAddress || '198.51.100.1');
    setIpCountry(scenario.data.telemetry?.ipCountry || 'US');
    setShippingCountry(scenario.data.telemetry?.shippingCountry || 'US');
    setBillingCountry(scenario.data.telemetry?.billingCountry || 'US');
    setShippingMatchesBilling(scenario.data.telemetry?.shippingAddressMatchesBilling ?? true);
    setIsProxyOrVpn(scenario.data.telemetry?.isProxyOrVpn ?? false);
    setAccountAgeDays((scenario.data.telemetry?.accountAgeDays ?? 120).toString());
    setFailedAttempts((scenario.data.telemetry?.failedAttemptsInLastHour ?? 0).toString());
    setEvaluationResult(null);
    setValidationError(null);
  };

  const handleRunEvaluation = async () => {
    setValidationError(null);

    // Validation
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setValidationError('Please enter a valid transaction amount greater than $0.');
      return;
    }

    if (!customerEmail || !customerEmail.includes('@')) {
      setValidationError('Please enter a valid customer email address.');
      return;
    }

    if (!customerName.trim()) {
      setValidationError('Please enter the customer name.');
      return;
    }

    const domain = customerEmail.split('@')[1]?.toLowerCase() || '';
    const isDisposable = ['tempmail.com', 'trashmail.com', 'throwawaymail.com', 'mailinator.com', 'yopmail.com'].includes(domain);

    const payload: TransactionData = {
      orderId: orderId.trim() || `PS-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      amount: parsedAmount,
      currency: 'USD',
      customer: {
        name: customerName.trim(),
        email: customerEmail.trim(),
        phone: customerPhone.trim() || undefined,
      },
      items: [
        {
          id: 'item-demo-1',
          name: 'Security Protected Merchandise',
          price: parsedAmount,
          quantity: 1,
          category: 'Retail',
        },
      ],
      telemetry: {
        ipAddress: ipAddress.trim() || '198.51.100.1',
        ipCountry: ipCountry.trim().toUpperCase() || 'US',
        isProxyOrVpn,
        deviceFingerprint: `dfp_${Math.random().toString(36).substring(2, 9)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        billingCountry: billingCountry.trim().toUpperCase() || 'US',
        shippingCountry: shippingCountry.trim().toUpperCase() || 'US',
        shippingAddressMatchesBilling: shippingMatchesBilling,
        emailDomain: domain,
        isDisposableEmail: isDisposable,
        accountAgeDays: parseInt(accountAgeDays, 10) || 0,
        ordersInLast24Hours: 1,
        failedAttemptsInLastHour: parseInt(failedAttempts, 10) || 0,
      },
      createdAt: new Date().toISOString(),
    };

    setIsEvaluating(true);
    try {
      const response = await api.evaluateTransaction(payload);
      setEvaluationResult(response.assessment);
    } catch (err: any) {
      setValidationError(err.message || 'Failed to evaluate transaction risk.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleOpenInvestigation = () => {
    if (evaluationResult) {
      onTransactionAnalyzed(evaluationResult.transactionId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div 
        className="w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#f8fafc]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Transaction Risk Analyzer
              </h2>
              <p className="text-[11px] text-slate-500">
                Test real-time explainable risk evaluation on live telemetry
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 px-6 pt-2 gap-4">
          <button
            onClick={() => setActiveTab('SCENARIOS')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'SCENARIOS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Demonstration Scenarios
          </button>
          <button
            onClick={() => setActiveTab('CUSTOM')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'CUSTOM'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Custom Parameters
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{validationError}</span>
            </div>
          )}

          {activeTab === 'SCENARIOS' ? (
            <div className="space-y-4">
              <span className="text-xs font-semibold text-slate-700 block">
                Select a benchmark scenario to simulate:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESET_SCENARIOS.map((sc) => (
                  <div
                    key={sc.id}
                    onClick={() => handleSelectScenario(sc)}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {sc.name}
                        </span>
                        <span className={`text-[10px] px-2 py-0.2 rounded-full font-semibold ${
                          sc.expectedTier === 'BLOCK'
                            ? 'bg-rose-50 text-rose-700'
                            : sc.expectedTier === 'REVIEW'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {sc.expectedTier}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {sc.description}
                      </p>
                    </div>
                    <span className="text-[10px] text-blue-600 font-semibold mt-2.5 inline-flex items-center gap-1">
                      <span>Load Scenario</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Configuration Form Preview */}
          <div className="p-4 rounded-xl bg-[#f8fafc] border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                <span>Transaction Parameters</span>
              </div>
              <button
                type="button"
                onClick={() => setOrderId(`PS-2026-${Math.floor(1000 + Math.random() * 9000)}`)}
                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>New ID</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Order ID</label>
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Amount ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">IP Country Code</label>
                <input
                  type="text"
                  maxLength={2}
                  value={ipCountry}
                  onChange={(e) => setIpCountry(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono bg-white uppercase focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Shipping Country</label>
                <input
                  type="text"
                  maxLength={2}
                  value={shippingCountry}
                  onChange={(e) => setShippingCountry(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono bg-white uppercase focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Account Age (Days)</label>
                <input
                  type="number"
                  value={accountAgeDays}
                  onChange={(e) => setAccountAgeDays(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Failed Attempts (1h)</label>
                <input
                  type="number"
                  value={failedAttempts}
                  onChange={(e) => setFailedAttempts(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col justify-end gap-1 pb-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={isProxyOrVpn}
                    onChange={(e) => setIsProxyOrVpn(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Proxy / VPN Detected</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={shippingMatchesBilling}
                    onChange={(e) => setShippingMatchesBilling(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Shipping = Billing Address</span>
                </label>
              </div>
            </div>
          </div>

          {/* Live Evaluation Result Preview */}
          {evaluationResult && (
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-xs animate-fade-in-up">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Analysis Verdict:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    evaluationResult.tier === 'BLOCK'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : evaluationResult.tier === 'REVIEW'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {evaluationResult.tier === 'BLOCK' ? 'High Risk' : evaluationResult.tier === 'REVIEW' ? 'Needs Review' : 'Safe'}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-slate-700">
                  Score: {evaluationResult.overallScore}/100
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {evaluationResult.recommendation.merchantGuidance}
              </p>

              {/* Triggered Signals */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Signals Influencing Decision ({evaluationResult.signals.length}):
                </span>
                {evaluationResult.signals.map((sig) => (
                  <div key={sig.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-2 text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800">{sig.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({sig.category})</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        <strong className="text-slate-700">Observed:</strong> {sig.observedFact}
                      </p>
                    </div>
                    <span className={`font-mono text-xs font-bold shrink-0 ${sig.scoreContribution > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {sig.scoreContribution > 0 ? `+${sig.scoreContribution}` : sig.scoreContribution} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-[#f8fafc] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5">
            {evaluationResult ? (
              <button
                onClick={handleOpenInvestigation}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span>Open Full Forensic Investigation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleRunEvaluation}
                disabled={isEvaluating}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isEvaluating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isEvaluating ? 'Evaluating Telemetry...' : 'Run Risk Analysis'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
