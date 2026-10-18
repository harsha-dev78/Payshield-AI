import React, { useState } from 'react';
import { 
  ShoppingBag, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight, 
  CreditCard,
  Lock,
  RefreshCw,
  Truck,
  Check
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
  category: string;
  description: string;
}

const DEMO_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-101',
    name: 'Hardware Security Key (FIDO2 / U2F)',
    price: 65.00,
    category: 'Hardware',
    description: 'Cryptographic security token for enterprise multi-factor authentication.',
  },
  {
    id: 'prod-102',
    name: 'Encrypted NVMe External SSD 1TB',
    price: 149.99,
    category: 'Storage',
    description: 'Hardware AES-256 encrypted portable solid-state drive.',
  },
  {
    id: 'prod-103',
    name: 'Managed Firewall Appliance (Micro)',
    price: 499.00,
    category: 'Networking',
    description: 'Edge security gateway with deep packet inspection and intrusion prevention.',
  },
];

export const SandboxCheckout: React.FC<SandboxCheckoutProps> = ({ onOrderCompleted }) => {
  // Test Scenario Personas for Hackathon Demonstration
  const [selectedPersona, setSelectedPersona] = useState<'SAFE' | 'REVIEW' | 'ATTACK'>('SAFE');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem>(DEMO_PRODUCTS[0]);

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
        amount: selectedProduct.price,
        currency: 'USD',
        customer: {
          name: 'Bot Tester',
          email: 'fraudster99@tempmail.com',
        },
        items: [{ id: selectedProduct.id, name: selectedProduct.name, price: selectedProduct.price, quantity: 1 }],
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
      <div className="p-4 sm:p-5 rounded-xl bg-[#0a0f1d] border border-[#1e293b] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">
              PayShield CyberStore — PayPal Sandbox Storefront Demo
            </h1>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-800/40 font-semibold tracking-wider">
              Live Checkout Interceptor
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Demonstrates real-time server-side pre-capture risk interception before PayPal orders are authorized and captured.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#060911] hover:bg-[#10172a] text-slate-300 border border-[#1e293b] text-xs font-mono self-start md:self-auto transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Demo Store</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-[#2d0b12] border border-[#7f1d1d] text-xs text-[#f87171] font-mono">
          <strong>Error: </strong> {errorMsg}
        </div>
      )}

      {/* Demo Scenario Control Strip */}
      <div className="p-4 rounded-xl bg-[#0a0f1d] border border-[#1e293b] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <span>Simulation Scenario:</span>
            <span className="text-[10px] font-mono text-cyan-400 font-normal">Choose buyer telemetry pattern</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => setSelectedPersona('SAFE')}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedPersona === 'SAFE'
                ? 'bg-[#06281e]/50 border-[#065f46] shadow-sm'
                : 'bg-[#060911] border-[#1e293b] hover:border-[#334155]'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-[#34d399]">
              <span>Persona A: Domestic Verified</span>
              <span className="font-mono text-[10px] bg-[#06281e] px-1.5 py-0.2 rounded border border-[#065f46]">
                ALLOW
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Established account (160d), US residential IP, matching shipping & billing. Clean capture expected.
            </p>
          </button>

          <button
            onClick={() => setSelectedPersona('REVIEW')}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedPersona === 'REVIEW'
                ? 'bg-[#2e1c07]/50 border-[#78350f] shadow-sm'
                : 'bg-[#060911] border-[#1e293b] hover:border-[#334155]'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-[#fbbf24]">
              <span>Persona B: VPN Traveler</span>
              <span className="font-mono text-[10px] bg-[#2e1c07] px-1.5 py-0.2 rounded border border-[#78350f]">
                REVIEW
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Active commercial VPN, alternate delivery address. Moderate anomaly triggers buyer review.
            </p>
          </button>

          <button
            onClick={() => setSelectedPersona('ATTACK')}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedPersona === 'ATTACK'
                ? 'bg-[#2d0b12]/50 border-[#7f1d1d] shadow-sm'
                : 'bg-[#060911] border-[#1e293b] hover:border-[#334155]'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-[#f87171]">
              <span>Persona C: Automated Testing Bot</span>
              <span className="font-mono text-[10px] bg-[#2d0b12] px-1.5 py-0.2 rounded border border-[#7f1d1d]">
                BLOCK
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Datacenter Tor proxy, 4 declines in last 60m, disposable email. Gateway arrests order pre-capture!
            </p>
          </button>
        </div>
      </div>

      {/* Main Grid: Storefront Catalog & Checkout Interceptor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Product Selection & Order Summary (1 Col) */}
        <div className="space-y-4 lg:col-span-1">
          
          {/* Product Catalog */}
          <div className="p-4 rounded-xl bg-[#0a0f1d] border border-[#1e293b] space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-cyan-400" />
              <span>Select Product to Purchase</span>
            </h3>

            <div className="space-y-2">
              {DEMO_PRODUCTS.map((prod) => {
                const isSelected = selectedProduct.id === prod.id;
                return (
                  <div
                    key={prod.id}
                    onClick={() => setSelectedProduct(prod)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#10172a] border-cyan-500/60 shadow-sm'
                        : 'bg-[#060911] border-[#1e293b] hover:border-[#334155]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200">{prod.name}</span>
                      <span className="text-xs font-mono font-bold text-slate-100">${prod.price.toFixed(2)}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{prod.description}</p>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#1e293b]/60 text-[10px] text-slate-500 font-mono">
                      <span>{prod.category}</span>
                      {isSelected && <span className="text-cyan-400 font-semibold flex items-center gap-0.5"><Check className="w-3 h-3" /> Selected</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cart Summary */}
          <div className="p-4 rounded-xl bg-[#0a0f1d] border border-[#1e293b] space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
              <span>Merchant Cart Summary</span>
            </h3>

            <div className="p-3 rounded-lg bg-[#060911] border border-[#1e293b] space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="truncate max-w-[180px]">{selectedProduct.name}</span>
                <span className="font-mono font-bold">${selectedProduct.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> Shipping & Handling</span>
                <span className="font-mono text-[#34d399]">FREE ($0.00)</span>
              </div>
              <div className="pt-2 border-t border-[#1e293b] flex justify-between font-bold text-slate-100">
                <span>Total Amount Due</span>
                <span className="font-mono text-cyan-400 text-sm">${selectedProduct.price.toFixed(2)} USD</span>
              </div>
            </div>

            {step === 'IDLE' && (
              <button
                onClick={handleStartCheckout}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/80 text-xs font-bold transition-all shadow-sm"
              >
                <span>Initiate Checkout Interception</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>

        {/* Right: Security Gateway & PayPal Interceptor State (2 Cols) */}
        <div className="space-y-4 lg:col-span-2">
          
          {step === 'IDLE' && (
            <div className="p-12 text-center bg-[#0a0f1d] border border-[#1e293b] rounded-xl space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#060911] border border-[#1e293b] text-cyan-400 flex items-center justify-center mx-auto">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">PayShield Gateway Ready</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Click <strong>"Initiate Checkout Interception"</strong>. The server will assess buyer telemetry signals before PayPal Sandbox order creation or capture.
              </p>
            </div>
          )}

          {step === 'EVALUATING' && (
            <div className="p-12 text-center bg-[#0a0f1d] border border-[#1e293b] rounded-xl space-y-3">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <h3 className="text-xs font-bold text-slate-100">Executing Pre-Capture Risk Policy...</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Extracting connection vectors, checking velocity counters, evaluating rules...
              </p>
            </div>
          )}

          {/* STATE: GATEWAY BLOCKED HIGH-RISK ORDER */}
          {step === 'GATE_BLOCKED' && assessmentResult && (
            <div className="p-5 rounded-xl bg-[#2d0b12]/30 border border-[#7f1d1d] space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#2d0b12] text-[#f87171] border border-[#7f1d1d]">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#f87171]">
                    Order Intercepted: Halted Pre-Capture by PayShield Policy
                  </h3>
                  <p className="text-xs text-slate-300">
                    Calculated Risk Score: <strong className="font-mono text-[#f87171]">{assessmentResult.overallScore}/100</strong> (BLOCK Tier)
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#060911] border border-[#1e293b] space-y-2 text-xs">
                <p className="text-slate-200">
                  <strong className="text-[#f87171]">Security Policy Enforced:</strong> PayPal order creation was halted. Zero charges were initiated against the buyer account.
                </p>
                <div className="pt-2 border-t border-[#1e293b] text-[11px] text-slate-400 space-y-1">
                  <strong>Triggered Findings:</strong>
                  <ul className="list-disc list-inside space-y-0.5 text-[#f87171] font-mono">
                    {assessmentResult.signals.map((s) => (
                      <li key={s.id}>{s.name} (+{s.scoreContribution} pts)</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400 font-mono">
                  Order ID: {currentOrderId}
                </span>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg bg-[#10172a] hover:bg-[#172036] text-slate-200 border border-[#1e293b] text-xs font-mono transition-colors"
                >
                  Test Another Persona
                </button>
              </div>
            </div>
          )}

          {/* STATE: PAYPAL READY (ORDER PERMITTED) */}
          {step === 'PAYPAL_READY' && assessmentResult && (
            <div className="p-5 rounded-xl bg-[#0a0f1d] border border-[#1e293b] space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#06281e] text-[#34d399] border border-[#065f46]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">
                      Pre-Capture Risk Assessment: {assessmentResult.tier} ({assessmentResult.overallScore}/100)
                    </h3>
                    <p className="text-xs text-slate-400">
                      PayPal Sandbox Order ID created: <strong className="font-mono text-cyan-400">{paypalOrderId}</strong>
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#06281e] text-[#34d399] border border-[#065f46] shrink-0">
                  Permitted
                </span>
              </div>

              {/* PayPal Smart Button Simulator */}
              <div className="p-4 rounded-xl bg-[#060911] border border-[#1e293b] space-y-3 text-center">
                <div className="flex items-center justify-center gap-2 text-xs text-slate-300">
                  <span className="font-semibold text-slate-200">Official PayPal Sandbox Approval</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#10172a] text-slate-400 border border-[#1e293b]">
                    v2 Orders API
                  </span>
                </div>

                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Buyer authorizes order <span className="font-mono text-slate-200">{paypalOrderId}</span> via PayPal Sandbox.
                </p>

                {/* Simulated PayPal Smart Button */}
                <button
                  onClick={handleSimulateBuyerApprovalAndCapture}
                  disabled={isProcessing}
                  className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-[#ffc439] hover:bg-[#f4bb34] text-[#003087] font-bold text-xs shadow transition-all cursor-pointer"
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
            <div className="p-5 rounded-xl bg-[#06281e]/30 border border-[#065f46] space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#06281e] text-[#34d399] border border-[#065f46]">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#34d399]">
                    Payment Verified & Captured in PayPal Sandbox
                  </h3>
                  <p className="text-xs text-slate-300">
                    PayPal Capture ID: <strong className="font-mono text-slate-100">{captureDetails.captureId}</strong>
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#060911] border border-[#1e293b] space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-[#1e293b]/60">
                  <span className="text-slate-400">Order Reference:</span>
                  <span className="text-slate-100">{captureDetails.orderId}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1e293b]/60">
                  <span className="text-slate-400">PayPal Order ID:</span>
                  <span className="text-slate-100">{captureDetails.paypalOrderId}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Audit Status:</span>
                  <span className="text-[#34d399] font-bold">COMPLETED & PERSISTED TO SQLITE</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => onOrderCompleted(currentOrderId!)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-xs font-semibold transition-colors"
                >
                  View Full Investigation Report →
                </button>

                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg bg-[#10172a] hover:bg-[#172036] text-slate-200 border border-[#1e293b] text-xs font-mono transition-colors"
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
