import React, { useState } from 'react';
import { 
  ShoppingBag, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight, 
  CreditCard,
  Lock,
  RefreshCw
} from 'lucide-react';
import type { TransactionData, RiskAssessment } from '../types/index.js';
import { api } from '../services/api.js';

interface SandboxCheckoutProps {
  onOrderCompleted: (orderId: string) => void;
}

export const SandboxCheckout: React.FC<SandboxCheckoutProps> = ({ onOrderCompleted }) => {
  // Test Scenario Personas for Hackathon Demonstration
  const [selectedPersona, setSelectedPersona] = useState<'SAFE' | 'REVIEW' | 'ATTACK'>('SAFE');
  const [cartAmount, setCartAmount] = useState(89.50);
  const [cartItemName, setCartItemName] = useState('Hardware Security Key YubiPass Pro');

  // Flow State
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'IDLE' | 'EVALUATING' | 'GATE_BLOCKED' | 'PAYPAL_READY' | 'CAPTURED'>('IDLE');
  const [assessmentResult, setAssessmentResult] = useState<RiskAssessment | null>(null);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [captureDetails, setCaptureDetails] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Generate transaction payload based on selected scenario
  const getPayloadForPersona = (): TransactionData => {
    const orderId = `ORD-SANDBOX-${Math.floor(1000 + Math.random() * 9000)}`;

    if (selectedPersona === 'SAFE') {
      return {
        orderId,
        amount: cartAmount,
        currency: 'USD',
        customer: {
          name: 'Sarah Connor',
          email: 'sarah.connor@gmail.com',
          phone: '+1-555-019-3321',
        },
        items: [{ id: 'item-demo', name: cartItemName, price: cartAmount, quantity: 1 }],
        telemetry: {
          ipAddress: '198.51.100.44',
          ipCountry: 'US',
          isProxyOrVpn: false,
          deviceFingerprint: 'dfp_mac_safari_clean',
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
    } else if (selectedPersona === 'REVIEW') {
      return {
        orderId,
        amount: cartAmount,
        currency: 'USD',
        customer: {
          name: 'Liam Neeson',
          email: 'liam.neeson@outlook.com',
          phone: '+1-555-014-8899',
        },
        items: [{ id: 'item-demo', name: cartItemName, price: cartAmount, quantity: 1 }],
        telemetry: {
          ipAddress: '203.0.113.88',
          ipCountry: 'US',
          isProxyOrVpn: true, // Commercial VPN
          deviceFingerprint: 'dfp_win11_edge_vpn',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          billingCountry: 'US',
          shippingCountry: 'US',
          shippingAddressMatchesBilling: false, // Alternate address
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
        amount: cartAmount,
        currency: 'USD',
        customer: {
          name: 'Bot Tester',
          email: 'fraudster99@tempmail.com',
        },
        items: [{ id: 'item-demo', name: cartItemName, price: cartAmount, quantity: 1 }],
        telemetry: {
          ipAddress: '185.220.101.9',
          ipCountry: 'NL', // Foreign IP
          isProxyOrVpn: true, // Datacenter Tor/Proxy
          deviceFingerprint: 'dfp_bot_headless_99',
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64; HeadlessChrome)',
          billingCountry: 'DE',
          shippingCountry: 'US', // Cross-border
          shippingAddressMatchesBilling: false,
          emailDomain: 'tempmail.com',
          isDisposableEmail: true,
          accountAgeDays: 0,
          ordersInLast24Hours: 8,
          failedAttemptsInLastHour: 4, // Velocity brute force
        },
        createdAt: new Date().toISOString(),
      };
    }
  };

  const handleStartCheckout = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    setStep('EVALUATING');

    const tx = getPayloadForPersona();
    setCurrentOrderId(tx.orderId);

    try {
      // Server-side order creation + pre-risk gate
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

  const handleSimulateBuyerApprovalAndCapture = async () => {
    if (!paypalOrderId || !currentOrderId) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const captureRes = await api.capturePayPalOrder(paypalOrderId, currentOrderId);
      setCaptureDetails(captureRes);
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
    setCaptureDetails(null);
    setErrorMsg(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="p-5 rounded-xl bg-[#0b101e] border border-cyan-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              PayShield CyberStore — PayPal Sandbox Demonstration
            </h1>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold">
              Live Gateway Simulator
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulate realistic shopper checkout personas to observe server-side pre-capture risk interception and PayPal Sandbox completion.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono self-start md:self-auto transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Demo Store</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/60 text-xs text-rose-200 font-mono">
          <strong>Error: </strong> {errorMsg}
        </div>
      )}

      {/* Main Grid: Storefront + Persona Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Persona Scenario Selector & Cart (1 Col) */}
        <div className="space-y-5 lg:col-span-1">
          
          {/* Persona Selector */}
          <div className="p-4 rounded-xl bg-[#0b0f1d] border border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-cyan-400" />
              <span>1. Choose Shopper Persona</span>
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => { setSelectedPersona('SAFE'); setCartAmount(89.50); setCartItemName('Hardware Security Key YubiPass Pro'); }}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  selectedPersona === 'SAFE'
                    ? 'bg-emerald-950/40 border-emerald-500/50 shadow-sm shadow-emerald-950/50'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-300">
                  <span>Persona A: Domestic Verified Buyer</span>
                  <span className="font-mono text-[10px] bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                    Expected: ALLOW
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Established account, domestic US residential IP, matching shipping & billing. Clean capture expected.
                </p>
              </button>

              <button
                onClick={() => { setSelectedPersona('REVIEW'); setCartAmount(199.99); setCartItemName('Noise-Cancelling Headphones'); }}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  selectedPersona === 'REVIEW'
                    ? 'bg-amber-950/40 border-amber-500/50 shadow-sm shadow-amber-950/50'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-amber-300">
                  <span>Persona B: VPN Traveler</span>
                  <span className="font-mono text-[10px] bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800">
                    Expected: REVIEW
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Active commercial VPN and non-matching delivery address. Elevated score triggers manual review.
                </p>
              </button>

              <button
                onClick={() => { setSelectedPersona('ATTACK'); setCartAmount(649.00); setCartItemName('Ultra-Wide Monitor 34"'); }}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  selectedPersona === 'ATTACK'
                    ? 'bg-rose-950/40 border-rose-500/50 shadow-sm shadow-rose-950/50'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-rose-300">
                  <span>Persona C: Automated Testing Bot</span>
                  <span className="font-mono text-[10px] bg-rose-950 px-1.5 py-0.5 rounded border border-rose-800">
                    Expected: BLOCK
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Datacenter Tor proxy, 4 declines in last 60m, disposable email. Gateway will refuse order creation!
                </p>
              </button>
            </div>
          </div>

          {/* Cart Details */}
          <div className="p-4 rounded-xl bg-[#0b0f1d] border border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
              <span>2. Merchant Cart Summary</span>
            </h3>

            <div className="p-3 rounded-lg bg-black/40 border border-slate-800/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="truncate max-w-[180px]">{cartItemName}</span>
                <span className="font-mono font-bold">${cartAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Tax & Shipping (Sandbox)</span>
                <span className="font-mono">$0.00</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-slate-100">
                <span>Total Due</span>
                <span className="font-mono text-cyan-400">${cartAmount.toFixed(2)} USD</span>
              </div>
            </div>

            {step === 'IDLE' && (
              <button
                onClick={handleStartCheckout}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-950/40 transition-all border border-cyan-400/40"
              >
                <span>Evaluate & Initiate PayPal Order</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>

        {/* Right: Live Security Gateway & PayPal Interceptor Flow (2 Cols) */}
        <div className="space-y-5 lg:col-span-2">
          
          {step === 'IDLE' && (
            <div className="p-12 text-center bg-[#0b0f1d] border border-slate-800 rounded-xl space-y-3">
              <div className="w-12 h-12 rounded-full bg-cyan-950/60 border border-cyan-700/50 text-cyan-400 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-100">PayShield Gateway Ready</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Click <strong>"Evaluate & Initiate PayPal Order"</strong> to dispatch the order payload to the backend. PayShield will assess telemetry signals before contacting PayPal Sandbox.
              </p>
            </div>
          )}

          {step === 'EVALUATING' && (
            <div className="p-12 text-center bg-[#0b0f1d] border border-slate-800 rounded-xl space-y-3">
              <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <h3 className="text-sm font-bold text-slate-100">Running Pre-Capture Risk Gate...</h3>
              <p className="text-xs text-slate-400 font-mono">
                Evaluating IP origin, velocity counters, and proxy masking rules...
              </p>
            </div>
          )}

          {/* STATE: GATEWAY BLOCKED HIGH-RISK ORDER */}
          {step === 'GATE_BLOCKED' && assessmentResult && (
            <div className="p-6 rounded-xl bg-rose-950/20 border border-rose-800/80 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-950 text-rose-400 border border-rose-700">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-rose-300">
                    Order Intercepted & Blocked by PayShield Policy
                  </h3>
                  <p className="text-xs text-rose-200/80">
                    Risk Score: {assessmentResult.overallScore}/100 • Severe Anomaly Threshold Exceeded
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-black/50 border border-rose-900/50 space-y-2 text-xs">
                <p className="text-rose-200 font-mono">
                  <strong>Security Policy Action:</strong> PayPal order creation was halted. Zero charges were initiated against buyer credentials.
                </p>
                <div className="pt-2 border-t border-rose-900/40 text-[11px] text-slate-300 space-y-1">
                  <strong>Critical Findings:</strong>
                  <ul className="list-disc list-inside space-y-0.5 text-rose-300 font-mono">
                    {assessmentResult.signals.map((s) => (
                      <li key={s.id}>{s.name} ({s.scoreContribution > 0 ? `+${s.scoreContribution}` : s.scoreContribution} pts)</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400 font-mono">
                  Recorded in SQLite Audit Trail: {currentOrderId}
                </span>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-mono transition-colors"
                >
                  Test Another Persona
                </button>
              </div>
            </div>
          )}

          {/* STATE: PAYPAL READY (ORDER PERMITTED) */}
          {step === 'PAYPAL_READY' && assessmentResult && (
            <div className="p-6 rounded-xl bg-[#0b1220] border border-cyan-800/60 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-700">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Pre-Capture Risk Assessment: {assessmentResult.tier} ({assessmentResult.overallScore}/100)
                    </h3>
                    <p className="text-xs text-slate-300">
                      PayPal Sandbox Order ID created: <strong className="font-mono text-cyan-300">{paypalOrderId}</strong>
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 shrink-0">
                  Permitted to Capture
                </span>
              </div>

              {/* PayPal Smart Button Simulator */}
              <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-3 text-center">
                <div className="flex items-center justify-center gap-2 text-xs text-slate-300 mb-1">
                  <span className="font-semibold text-slate-100">Official PayPal Sandbox Approval</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                    v2 Orders API
                  </span>
                </div>

                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Buyer approves order <span className="font-mono text-slate-200">{paypalOrderId}</span> in Sandbox popup.
                </p>

                {/* Simulated PayPal Smart Button */}
                <button
                  onClick={handleSimulateBuyerApprovalAndCapture}
                  disabled={isProcessing}
                  className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-[#ffc439] hover:bg-[#f4bb34] text-[#003087] font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  <span className="font-black italic">PayPal</span>
                  <span>{isProcessing ? 'Capturing on Server...' : 'Authorize Sandbox Payment'}</span>
                </button>

                <p className="text-[10px] text-slate-500 font-mono">
                  Server executes: POST /v2/checkout/orders/{paypalOrderId}/capture
                </p>
              </div>

            </div>
          )}

          {/* STATE: PAYMENT CAPTURED */}
          {step === 'CAPTURED' && captureDetails && (
            <div className="p-6 rounded-xl bg-emerald-950/20 border border-emerald-800/80 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-700">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-300">
                    Payment Verified & Safely Captured!
                  </h3>
                  <p className="text-xs text-emerald-200/80">
                    PayPal Capture ID: <strong className="font-mono">{captureDetails.captureId}</strong>
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-black/50 border border-emerald-900/50 space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-emerald-900/40">
                  <span className="text-slate-400">Order Reference</span>
                  <span className="text-slate-100">{captureDetails.orderId}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-emerald-900/40">
                  <span className="text-slate-400">PayPal Order ID</span>
                  <span className="text-slate-100">{captureDetails.paypalOrderId}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Audit Status</span>
                  <span className="text-emerald-400 font-bold">COMPLETED & PERSISTED</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => onOrderCompleted(currentOrderId!)}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 text-xs font-semibold transition-colors"
                >
                  View Full Investigation Report →
                </button>

                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-mono transition-colors"
                >
                  Run Another Test
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
