import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight, 
  Lock,
  RefreshCw
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
  const [step, setStep] = useState<'IDLE' | 'EVALUATING' | 'GATE_BLOCKED' | 'PAYPAL_READY' | 'CAPTURED'>('IDLE');
  const [assessmentResult, setAssessmentResult] = useState<RiskAssessment | null>(null);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getPayloadForScenario = (): TransactionData => {
    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

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

    const tx = getPayloadForScenario();
    setCurrentOrderId(tx.orderId);

    try {
      const res = await api.createPayPalOrder(tx);
      setAssessmentResult(res.assessment);
      setPaypalOrderId(res.paypalOrderId);
      setStep('PAYPAL_READY');
    } catch (err: any) {
      if (err.assessment) {
        setAssessmentResult(err.assessment);
        setStep('GATE_BLOCKED');
      } else {
        setErrorMsg(err.message || 'PayPal order creation failed.');
        setStep('IDLE');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCapture = async () => {
    if (!paypalOrderId || !currentOrderId) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      await api.capturePayPalOrder(paypalOrderId, currentOrderId);
      setStep('CAPTURED');
      onOrderCompleted(currentOrderId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment capture failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setStep('IDLE');
    setAssessmentResult(null);
    setPaypalOrderId(null);
    setCurrentOrderId(null);
    setErrorMsg(null);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              Sandbox Store
            </h1>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              PayPal Sandbox Demo
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Test how PayShield intercepts risky orders before PayPal captures the payment.
          </p>
        </div>

        {step !== 'IDLE' && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a0f1d] hover:bg-[#10172a] text-slate-300 border border-[#1e293b] text-xs transition-colors self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-[#2d0b12] border border-[#7f1d1d] text-xs text-[#f87171]">
          <strong>Error: </strong> {errorMsg}
        </div>
      )}

      {/* Scenario Selector */}
      <div className="p-4 rounded-xl bg-[#0a0f1d] border border-[#1e293b] space-y-2.5">
        <span className="text-xs font-semibold text-slate-300 block">
          Choose a test customer scenario:
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            onClick={() => { setSelectedScenario('SAFE'); handleReset(); }}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedScenario === 'SAFE'
                ? 'bg-[#06281e] border-[#065f46] text-[#34d399]'
                : 'bg-[#060911] border-[#1e293b] text-slate-300 hover:border-[#334155]'
            }`}
          >
            <div className="font-semibold text-xs">Normal Customer (Safe)</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Legitimate IP, matching addresses</div>
          </button>

          <button
            onClick={() => { setSelectedScenario('REVIEW'); handleReset(); }}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedScenario === 'REVIEW'
                ? 'bg-[#2e1c07] border-[#78350f] text-[#fbbf24]'
                : 'bg-[#060911] border-[#1e293b] text-slate-300 hover:border-[#334155]'
            }`}
          >
            <div className="font-semibold text-xs">Uncertain Buyer (Review)</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Commercial VPN, address mismatch</div>
          </button>

          <button
            onClick={() => { setSelectedScenario('ATTACK'); handleReset(); }}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedScenario === 'ATTACK'
                ? 'bg-[#2d0b12] border-[#7f1d1d] text-[#f87171]'
                : 'bg-[#060911] border-[#1e293b] text-slate-300 hover:border-[#334155]'
            }`}
          >
            <div className="font-semibold text-xs">Suspicious Actor (Attack)</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Tor exit node, velocity attempts</div>
          </button>
        </div>
      </div>

      {/* Main Checkout Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left: Product & Buyer Preview */}
        <div className="md:col-span-2 space-y-4">
          
          {/* Select Product */}
          <div className="p-4 rounded-xl bg-[#0a0f1d] border border-[#1e293b] space-y-3">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              1. Select Item
            </span>

            <div className="space-y-2">
              {PRODUCTS.map((prod) => {
                const isSelected = selectedProduct.id === prod.id;
                return (
                  <div
                    key={prod.id}
                    onClick={() => { setSelectedProduct(prod); handleReset(); }}
                    className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-[#10172a] border-cyan-800/80 text-white'
                        : 'bg-[#060911] border-[#1e293b] text-slate-300 hover:border-[#334155]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{prod.name}</div>
                      <div className="text-[11px] text-slate-400">{prod.description}</div>
                    </div>
                    <div className="text-xs font-bold font-mono text-cyan-400 shrink-0 ml-3">
                      ${prod.price.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer Details Preview */}
          <div className="p-4 rounded-xl bg-[#0a0f1d] border border-[#1e293b] space-y-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              2. Simulated Customer Information
            </span>

            <div className="p-3 rounded-lg bg-[#060911] border border-[#1e293b] text-xs font-mono space-y-1 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Buyer Name:</span>
                <span>{selectedScenario === 'SAFE' ? 'Sarah Connor' : selectedScenario === 'REVIEW' ? 'Liam Neeson' : 'Anonymous Actor'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span>{selectedScenario === 'SAFE' ? 'sarah.connor@gmail.com' : selectedScenario === 'REVIEW' ? 'liam.neeson@outlook.com' : 'test_attacker@tempmail.com'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Simulated Location:</span>
                <span>{selectedScenario === 'SAFE' ? 'United States (Residential)' : selectedScenario === 'REVIEW' ? 'United States (VPN)' : 'Netherlands (Tor Node)'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right: Order Summary & Action */}
        <div className="md:col-span-1 space-y-4">
          <div className="p-5 rounded-xl bg-[#0a0f1d] border border-[#1e293b] space-y-4">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Order Summary
            </span>

            <div className="space-y-2 text-xs border-b border-[#1e293b] pb-3">
              <div className="flex justify-between text-slate-300">
                <span>{selectedProduct.name}</span>
                <span className="font-mono">${selectedProduct.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Shipping</span>
                <span>Free</span>
              </div>
            </div>

            <div className="flex justify-between text-sm font-bold text-slate-100">
              <span>Total</span>
              <span className="font-mono text-cyan-400">${selectedProduct.price.toFixed(2)} USD</span>
            </div>

            {/* Gateway Actions */}
            {step === 'IDLE' && (
              <button
                onClick={handleStartCheckout}
                disabled={isProcessing}
                className="w-full py-2.5 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Pay with PayPal (Sandbox)</span>
              </button>
            )}

            {step === 'EVALUATING' && (
              <div className="p-3 rounded-lg bg-[#060911] border border-[#1e293b] text-center space-y-2">
                <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="text-xs text-slate-300 font-medium">Pre-Capture Risk Analysis</div>
                <div className="text-[11px] text-slate-400">Checking telemetry before PayPal authorization...</div>
              </div>
            )}

            {step === 'PAYPAL_READY' && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-[#06281e] border border-[#065f46] text-[#34d399] text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Security Check Passed</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Low risk score ({assessmentResult?.overallScore || 15}/100). Ready to capture.
                  </div>
                </div>

                <button
                  onClick={handleCapture}
                  disabled={isProcessing}
                  className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isProcessing ? 'Capturing...' : 'Authorize & Capture Payment'}</span>
                </button>
              </div>
            )}

            {step === 'GATE_BLOCKED' && (
              <div className="p-3.5 rounded-lg bg-[#2d0b12] border border-[#7f1d1d] text-[#f87171] text-xs space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Payment Held Pre-Capture</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  High-risk signals detected ({assessmentResult?.overallScore || 85}/100). The transaction was stopped before PayPal authorization.
                </p>
                {currentOrderId && (
                  <button
                    onClick={() => onOrderCompleted(currentOrderId)}
                    className="w-full mt-1 py-1.5 px-3 rounded bg-[#10172a] hover:bg-[#1e293b] text-xs text-cyan-400 font-semibold border border-cyan-800 flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>View Investigation</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {step === 'CAPTURED' && (
              <div className="p-3.5 rounded-lg bg-[#06281e] border border-[#065f46] text-[#34d399] text-xs space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Payment Captured!</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Transaction verified and captured in PayPal Sandbox.
                </p>
                {currentOrderId && (
                  <button
                    onClick={() => onOrderCompleted(currentOrderId)}
                    className="w-full mt-1 py-1.5 px-3 rounded bg-[#10172a] hover:bg-[#1e293b] text-xs text-cyan-400 font-semibold border border-cyan-800 flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>View Investigation</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            <div className="text-[10px] text-slate-500 text-center font-mono pt-1">
              PayPal Sandbox REST API v2 • Safe Test Mode
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
