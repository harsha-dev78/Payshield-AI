import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight, 
  Lock,
  RefreshCw,
  ExternalLink,
  XCircle,
  Info
} from 'lucide-react';
import type { TransactionData, RiskAssessment } from '../types/index.js';
import { api } from '../services/api.js';

interface SandboxCheckoutProps {
  onOrderCompleted: (orderId: string) => void;
}

interface ProductItem {
  id: string;
  name: string;
  price: number;
  description: string;
}

const PRODUCTS: ProductItem[] = [
  {
    id: 'prod-101',
    name: 'Hardware Security Key (FIDO2)',
    price: 65.00,
    description: 'Hardware authentication key for enterprise multi-factor security.',
  },
  {
    id: 'prod-102',
    name: 'Encrypted NVMe SSD 1TB',
    price: 149.99,
    description: 'Hardware AES-256 encrypted portable solid-state drive.',
  },
  {
    id: 'prod-103',
    name: 'Micro Network Firewall',
    price: 499.00,
    description: 'Hardware edge gateway with packet inspection and intrusion defense.',
  },
];

export const SandboxCheckout: React.FC<SandboxCheckoutProps> = ({ onOrderCompleted }) => {
  const [selectedProduct, setSelectedProduct] = useState<ProductItem>(PRODUCTS[0]);
  const [selectedScenario, setSelectedScenario] = useState<'SAFE' | 'REVIEW' | 'ATTACK'>('SAFE');

  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'IDLE' | 'EVALUATING' | 'GATE_BLOCKED' | 'GATE_REVIEW' | 'PAYPAL_READY' | 'CAPTURING' | 'CAPTURED' | 'CANCELLED'>('IDLE');
  const [assessmentResult, setAssessmentResult] = useState<RiskAssessment | null>(null);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [captureId, setCaptureId] = useState<string | null>(null);
  const [approveUrl, setApproveUrl] = useState<string | null>(null);
  const [gatewayMode, setGatewayMode] = useState<'PAYPAL_SANDBOX' | 'MOCK_SIMULATOR'>('MOCK_SIMULATOR');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasOpenedApprovalWindow, setHasOpenedApprovalWindow] = useState(false);

  // Fetch gateway status (Sandbox vs Mock) on mount
  useEffect(() => {
    api.getPayPalStatus()
      .then((status) => {
        setGatewayMode(status.mode === 'PAYPAL_SANDBOX' ? 'PAYPAL_SANDBOX' : 'MOCK_SIMULATOR');
      })
      .catch(() => {
        setGatewayMode('MOCK_SIMULATOR');
      });
  }, []);

  const executeCapture = useCallback(async (orderIdToCapture: string, pOrderId: string) => {
    setIsProcessing(true);
    setStep('CAPTURING');
    setErrorMsg(null);

    try {
      const res = await api.capturePayPalOrder(pOrderId, orderIdToCapture);
      setCaptureId(res.captureId);
      setStep('CAPTURED');
      onOrderCompleted(orderIdToCapture);
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment capture failed.');
      setStep('PAYPAL_READY');
    } finally {
      setIsProcessing(false);
    }
  }, [onOrderCompleted]);

  // Handle URL redirect returns from PayPal Sandbox
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('paypal_action');
    const token = params.get('token');
    const localId = params.get('localOrderId') || params.get('orderId');

    if (action === 'approved' && (token || localId)) {
      const effectiveLocalId = localId || `PS-${new Date().getFullYear()}-RECOVERED`;
      const effectivePayPalId = token || effectiveLocalId;
      setCurrentOrderId(effectiveLocalId);
      setPaypalOrderId(effectivePayPalId);

      // Clean query params from address bar
      window.history.replaceState({}, document.title, window.location.pathname);

      // Execute capture
      executeCapture(effectiveLocalId, effectivePayPalId);
    } else if (action === 'cancelled' && localId) {
      setCurrentOrderId(localId);
      setStep('CANCELLED');
      window.history.replaceState({}, document.title, window.location.pathname);
      api.cancelPayPalOrder(localId).catch(() => {});
    }

    // Handle postMessage from popup approval window
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PAYPAL_APPROVED' && event.data.token && event.data.localOrderId) {
        executeCapture(event.data.localOrderId, event.data.token);
      } else if (event.data?.type === 'PAYPAL_CANCELLED' && event.data.localOrderId) {
        setStep('CANCELLED');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [executeCapture]);

  const getPayloadForScenario = (): TransactionData => {
    const orderId = `PS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    if (selectedScenario === 'SAFE') {
      return {
        orderId,
        amount: selectedProduct.price,
        currency: 'USD',
        customer: {
          name: 'Sarah Connor',
          email: 'sarah.connor@gmail.com',
          phone: '+1-555-019-3321',
        },
        items: [{ id: selectedProduct.id, name: selectedProduct.name, price: selectedProduct.price, quantity: 1 }],
        telemetry: {
          ipAddress: '198.51.100.44',
          ipCountry: 'US',
          isProxyOrVpn: false,
          deviceFingerprint: 'dfp_clean_safari',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          billingCountry: 'US',
          shippingCountry: 'US',
          shippingAddressMatchesBilling: true,
          emailDomain: 'gmail.com',
          isDisposableEmail: false,
          accountAgeDays: 160,
          ordersInLast24Hours: 1,
          failedAttemptsInLastHour: 0,
        },
        createdAt: new Date().toISOString(),
      };
    } else if (selectedScenario === 'REVIEW') {
      return {
        orderId,
        amount: selectedProduct.price,
        currency: 'USD',
        customer: {
          name: 'Liam Neeson',
          email: 'liam.neeson@outlook.com',
          phone: '+1-555-014-8899',
        },
        items: [{ id: selectedProduct.id, name: selectedProduct.name, price: selectedProduct.price, quantity: 1 }],
        telemetry: {
          ipAddress: '203.0.113.88',
          ipCountry: 'US',
          isProxyOrVpn: true,
          deviceFingerprint: 'dfp_win_vpn',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          billingCountry: 'US',
          shippingCountry: 'US',
          shippingAddressMatchesBilling: false,
          emailDomain: 'outlook.com',
          isDisposableEmail: false,
          accountAgeDays: 14,
          ordersInLast24Hours: 2,
          failedAttemptsInLastHour: 0,
        },
        createdAt: new Date().toISOString(),
      };
    } else {
      // ATTACK
      return {
        orderId,
        amount: selectedProduct.price,
        currency: 'USD',
        customer: {
          name: 'Anonymous Actor',
          email: 'test_attacker@tempmail.com',
        },
        items: [{ id: selectedProduct.id, name: selectedProduct.name, price: selectedProduct.price, quantity: 1 }],
        telemetry: {
          ipAddress: '185.220.101.9',
          ipCountry: 'NL',
          isProxyOrVpn: true,
          deviceFingerprint: 'dfp_tor_headless',
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64; HeadlessChrome)',
          billingCountry: 'DE',
          shippingCountry: 'US',
          shippingAddressMatchesBilling: false,
          emailDomain: 'tempmail.com',
          isDisposableEmail: true,
          accountAgeDays: 0,
          ordersInLast24Hours: 8,
          failedAttemptsInLastHour: 4,
        },
        createdAt: new Date().toISOString(),
      };
    }
  };

  const handleStartCheckout = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    setStep('EVALUATING');
    setHasOpenedApprovalWindow(false);

    const tx = getPayloadForScenario();
    setCurrentOrderId(tx.orderId);

    try {
      const res = await api.createPayPalOrder(tx);
      setAssessmentResult(res.assessment);
      setPaypalOrderId(res.paypalOrderId);
      setApproveUrl(res.approveUrl || null);
      if (res.mode) setGatewayMode(res.mode);
      setStep('PAYPAL_READY');
    } catch (err: any) {
      if (err.assessment) {
        setAssessmentResult(err.assessment);
        if (err.assessment.tier === 'BLOCK') {
          setStep('GATE_BLOCKED');
        } else if (err.assessment.tier === 'REVIEW') {
          setStep('GATE_REVIEW');
        } else {
          setStep('GATE_BLOCKED');
        }
      } else {
        setErrorMsg(err.message || 'PayPal order creation failed.');
        setStep('IDLE');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenPayPalApproval = () => {
    if (!approveUrl) return;
    setHasOpenedApprovalWindow(true);
    // Open PayPal Sandbox in a focused window
    window.open(approveUrl, 'PayPalSandboxApproval', 'width=620,height=720,menubar=no,toolbar=no');
  };

  const handleCapture = async () => {
    if (!paypalOrderId || !currentOrderId) return;
    executeCapture(currentOrderId, paypalOrderId);
  };

  const handleCancelPayment = async () => {
    if (!currentOrderId) return;
    setIsProcessing(true);
    try {
      await api.cancelPayPalOrder(currentOrderId, paypalOrderId || undefined, 'Cancelled by buyer from checkout UI');
      setStep('CANCELLED');
    } catch (err: any) {
      setErrorMsg(err.message || 'Cancellation failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setStep('IDLE');
    setAssessmentResult(null);
    setPaypalOrderId(null);
    setCurrentOrderId(null);
    setCaptureId(null);
    setApproveUrl(null);
    setErrorMsg(null);
    setHasOpenedApprovalWindow(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in-up pb-12">
      
      {/* Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Sandbox Store
            </h1>
            {gatewayMode === 'PAYPAL_SANDBOX' ? (
              <span className="text-[11px] font-semibold font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Genuine PayPal Sandbox</span>
              </span>
            ) : (
              <span className="text-[11px] font-semibold font-mono px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                <span>Mock Simulator Mode</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Test how PayShield intercepts risky orders in real time before PayPal captures the payment.
          </p>
        </div>

        {step !== 'IDLE' && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800 shadow-xs">
          <strong>Error: </strong> {errorMsg}
        </div>
      )}

      {/* Scenario Selector Card */}
      <div className="p-5 rounded-2xl bg-white border border-[#e5edf8] space-y-3 shadow-xs">
        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
          Choose a test customer scenario:
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => { setSelectedScenario('SAFE'); handleReset(); }}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              selectedScenario === 'SAFE'
                ? 'bg-emerald-50/70 border-emerald-400 text-emerald-950 ring-2 ring-emerald-400/20 shadow-xs'
                : 'bg-[#f8fafc] border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="font-bold text-xs flex items-center justify-between">
              <span>Normal Customer</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-semibold">Safe</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Legitimate residential US IP, matching addresses, established account history.
            </div>
          </button>

          <button
            onClick={() => { setSelectedScenario('REVIEW'); handleReset(); }}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              selectedScenario === 'REVIEW'
                ? 'bg-amber-50/70 border-amber-400 text-amber-950 ring-2 ring-amber-400/20 shadow-xs'
                : 'bg-[#f8fafc] border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="font-bold text-xs flex items-center justify-between">
              <span>Uncertain Buyer</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-semibold">Review</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Commercial VPN active, alternate shipping destination, young account tenure.
            </div>
          </button>

          <button
            onClick={() => { setSelectedScenario('ATTACK'); handleReset(); }}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              selectedScenario === 'ATTACK'
                ? 'bg-rose-50/70 border-rose-400 text-rose-950 ring-2 ring-rose-400/20 shadow-xs'
                : 'bg-[#f8fafc] border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="font-bold text-xs flex items-center justify-between">
              <span>Suspicious Actor</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800 font-semibold">High Risk</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Tor exit node in Netherlands, disposable burner email, 4 rapid failed velocity attempts.
            </div>
          </button>
        </div>
      </div>

      {/* Main Checkout Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Left: Product & Buyer Preview (2 Cols) */}
        <div className="md:col-span-2 space-y-4">
          
          {/* Select Product */}
          <div className="p-5 rounded-2xl bg-white border border-[#e5edf8] space-y-3 shadow-xs">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              1. Select Item
            </span>

            <div className="space-y-2.5">
              {PRODUCTS.map((prod) => {
                const isSelected = selectedProduct.id === prod.id;
                return (
                  <div
                    key={prod.id}
                    onClick={() => { setSelectedProduct(prod); handleReset(); }}
                    className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-blue-50/60 border-blue-400 ring-2 ring-blue-400/20 shadow-xs'
                        : 'bg-[#f8fafc] border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{prod.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{prod.description}</div>
                    </div>
                    <div className="text-sm font-bold font-mono text-blue-600 shrink-0 ml-3">
                      ${prod.price.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer Details Preview */}
          <div className="p-5 rounded-2xl bg-white border border-[#e5edf8] space-y-2 shadow-xs">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              2. Simulated Customer Telemetry
            </span>

            <div className="p-4 rounded-xl bg-[#f8fafc] border border-slate-200 text-xs font-mono space-y-2 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Buyer Name:</span>
                <span className="font-semibold text-slate-900">{selectedScenario === 'SAFE' ? 'Sarah Connor' : selectedScenario === 'REVIEW' ? 'Liam Neeson' : 'Anonymous Actor'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Email Address:</span>
                <span className="font-semibold">{selectedScenario === 'SAFE' ? 'sarah.connor@gmail.com' : selectedScenario === 'REVIEW' ? 'liam.neeson@outlook.com' : 'test_attacker@tempmail.com'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Network Origin:</span>
                <span className="font-semibold">{selectedScenario === 'SAFE' ? 'United States (Residential)' : selectedScenario === 'REVIEW' ? 'United States (Commercial VPN)' : 'Netherlands (Tor Exit Node)'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right: Order Summary & Action (1 Col) */}
        <div className="md:col-span-1 space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-[#e5edf8] space-y-4 shadow-xs">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              Order Summary
            </span>

            <div className="space-y-2.5 text-xs border-b border-slate-100 pb-3">
              <div className="flex justify-between text-slate-700">
                <span>{selectedProduct.name}</span>
                <span className="font-mono font-semibold">${selectedProduct.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Shipping</span>
                <span className="text-emerald-600 font-semibold">Free</span>
              </div>
            </div>

            <div className="flex justify-between text-sm font-bold text-slate-900">
              <span>Total</span>
              <span className="font-mono text-blue-600">${selectedProduct.price.toFixed(2)} USD</span>
            </div>

            {/* Gateway Action Steps */}
            {step === 'IDLE' && (
              <button
                onClick={handleStartCheckout}
                disabled={isProcessing}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs shadow-blue-500/20 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Pay with PayPal (Sandbox)</span>
              </button>
            )}

            {step === 'EVALUATING' && (
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-center space-y-2">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="text-xs text-blue-950 font-bold">Pre-Capture Risk Analysis</div>
                <div className="text-[11px] text-blue-700">Evaluating telemetry before PayPal authorization...</div>
              </div>
            )}

            {step === 'CAPTURING' && (
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center space-y-2">
                <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="text-xs text-emerald-950 font-bold">Capturing PayPal Payment</div>
                <div className="text-[11px] text-emerald-700">Verifying authorization and logging audit ledger...</div>
              </div>
            )}

            {step === 'PAYPAL_READY' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Security Check Passed</span>
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    Low risk score ({assessmentResult?.overallScore || 15}/100). Safe to authorize.
                  </div>
                  {paypalOrderId && (
                    <div className="text-[10px] font-mono text-emerald-800 pt-1 border-t border-emerald-200/60 mt-1">
                      PayPal Order: {paypalOrderId}
                    </div>
                  )}
                </div>

                {gatewayMode === 'PAYPAL_SANDBOX' && approveUrl ? (
                  <div className="space-y-2.5">
                    {/* Sandbox Approval Callout */}
                    <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200 text-[11px] text-blue-800 space-y-1 leading-relaxed">
                      <div className="font-bold flex items-center gap-1 text-blue-900">
                        <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Genuine PayPal Sandbox Approval</span>
                      </div>
                      <p className="text-slate-600 text-[10px]">
                        1. Click below to open PayPal Sandbox. Log in with your Sandbox Personal Buyer account.
                      </p>
                      <p className="text-slate-600 text-[10px]">
                        2. Click &quot;Complete Purchase&quot; on PayPal, then click &quot;Capture Payment&quot; below.
                      </p>
                    </div>

                    {/* Step A: Open Approval Window */}
                    <button
                      onClick={handleOpenPayPalApproval}
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs shadow-blue-500/20 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{hasOpenedApprovalWindow ? 'Reopen PayPal Approval Page' : '1. Open PayPal Sandbox Approval'}</span>
                    </button>

                    {/* Step B: Complete Capture */}
                    <button
                      onClick={handleCapture}
                      disabled={isProcessing}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>2. Verify & Capture Payment</span>
                    </button>

                    {/* Cancel Action */}
                    <button
                      onClick={handleCancelPayment}
                      disabled={isProcessing}
                      className="w-full py-1.5 px-3 rounded-lg text-slate-500 hover:text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      Cancel Transaction
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-[11px] text-indigo-700 font-medium bg-indigo-50 p-2 rounded-lg border border-indigo-200">
                      Mock Simulator Mode: Test zero-dependency offline checkout.
                    </div>
                    <button
                      onClick={handleCapture}
                      disabled={isProcessing}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isProcessing ? 'Capturing...' : 'Simulate Buyer Approval & Capture'}</span>
                    </button>

                    <button
                      onClick={handleCancelPayment}
                      disabled={isProcessing}
                      className="w-full py-1.5 px-3 rounded-lg text-slate-500 hover:text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      Simulate Buyer Cancellation
                    </button>
                  </div>
                )}
              </div>
            )}

            {step === 'GATE_BLOCKED' && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-3">
                <div className="font-bold flex items-center gap-1.5 text-rose-800">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Payment Blocked by PayShield AI</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white/90 border border-rose-200 text-[11px] text-rose-900 font-semibold leading-relaxed">
                  Payment blocked by PayShield AI. The transaction exceeded the configured risk threshold. No PayPal order or payment was created.
                </div>
                <div className="space-y-1 text-[11px] text-rose-800 pt-1 border-t border-rose-200/70">
                  <div><strong>Risk Score:</strong> {assessmentResult?.overallScore || 85}/100 (&gt;65 High Risk)</div>
                  <div><strong>Pre-Capture Action:</strong> REJECT_BEFORE_ORDER_CREATION</div>
                  <div><strong>PayPal Orders API:</strong> Not Contacted (Zero funds captured)</div>
                  <div><strong>Audit Record:</strong> Logged as <span className="font-mono bg-rose-100 text-rose-900 px-1 py-0.5 rounded text-[10px]">PAYMENT_BLOCKED</span></div>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-white hover:bg-rose-100 text-xs text-rose-700 font-bold border border-rose-300 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try Another Scenario</span>
                </button>
              </div>
            )}

            {step === 'GATE_REVIEW' && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-3">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Merchant Review Policy Enforced</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white/90 border border-amber-200 text-[11px] text-amber-900 font-semibold leading-relaxed">
                  Transaction flagged for manual merchant review. PayPal order creation is withheld until review policy approval.
                </div>
                <div className="space-y-1 text-[11px] text-amber-800 pt-1 border-t border-amber-200/70">
                  <div><strong>Risk Score:</strong> {assessmentResult?.overallScore || 48}/100 (30–65 Review Required)</div>
                  <div><strong>Triggered Factors:</strong> Commercial VPN active, shipping destination mismatch, young account tenure</div>
                  <div><strong>Pre-Capture Action:</strong> WITHHOLD_CHECKOUT</div>
                  <div><strong>Audit Record:</strong> Logged as <span className="font-mono bg-amber-100 text-amber-900 px-1 py-0.5 rounded text-[10px]">REVIEW_HELD</span></div>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-white hover:bg-amber-100 text-xs text-amber-700 font-bold border border-amber-300 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try Another Scenario</span>
                </button>
              </div>
            )}

            {step === 'CAPTURED' && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2.5">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Payment Verified & Captured!</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white/80 border border-emerald-200/60 font-mono text-[10px] space-y-1 text-slate-700">
                  {paypalOrderId && <div><strong>PayPal Order:</strong> {paypalOrderId}</div>}
                  {captureId && <div><strong>Capture ID:</strong> {captureId}</div>}
                  <div><strong>Gateway Mode:</strong> {gatewayMode === 'PAYPAL_SANDBOX' ? 'Genuine PayPal Sandbox' : 'Mock Simulator'}</div>
                  <div><strong>Payment Status:</strong> COMPLETED</div>
                </div>
                <p className="text-[11px] text-emerald-700 font-normal">
                  Transaction verified and captured in PayPal Sandbox.
                </p>
                {currentOrderId && (
                  <button
                    onClick={() => onOrderCompleted(currentOrderId)}
                    className="w-full mt-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs text-white font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
                  >
                    <span>View Investigation in Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {step === 'CANCELLED' && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs space-y-2.5">
                <div className="font-bold flex items-center gap-1.5 text-slate-700">
                  <XCircle className="w-4 h-4 text-slate-500" />
                  <span>Checkout Cancelled by Buyer</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                  No funds were captured. The transaction record has been updated to CANCELLED in the database and audit trail.
                </p>
                <button
                  onClick={handleReset}
                  className="w-full mt-1 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-xs text-slate-700 font-bold border border-slate-300 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try Another Scenario</span>
                </button>
              </div>
            )}

            <div className="text-[11px] text-slate-400 text-center font-mono pt-1">
              PayPal Orders v2 REST API • Safe Sandbox Mode
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
