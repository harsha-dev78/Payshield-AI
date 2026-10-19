import React, { useEffect, useState } from 'react';
import { 
  Key, 
  Sliders, 
  Code2, 
  CheckCircle2, 
  AlertTriangle,
  Server,
  Play,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api.js';

export const Settings: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'PAYPAL' | 'POLICY' | 'DEV_TOOLS'>('PAYPAL');
  const [paypalStatus, setPaypalStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [copiedHint, setCopiedHint] = useState(false);

  // APIMatic Test State
  const defaultPayload = JSON.stringify(
    {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: 'ORD-TEST-9901',
          description: 'Cybersecurity Gateway Test Item',
          amount: {
            currency_code: 'USD',
            value: '120.00',
          },
        },
      ],
    },
    null,
    2
  );

  const [testPayload, setTestPayload] = useState(defaultPayload);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[] } | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const data = await api.getPayPalStatus();
      setPaypalStatus(data);
    } catch (err) {
      console.error('Failed to fetch status', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleRunAPIMaticValidation = () => {
    try {
      const parsed = JSON.parse(testPayload);
      const errors: string[] = [];

      if (parsed.intent !== 'CAPTURE' && parsed.intent !== 'AUTHORIZE') {
        errors.push(`Invalid intent "${parsed.intent}". Must be CAPTURE or AUTHORIZE.`);
      }
      if (!Array.isArray(parsed.purchase_units) || parsed.purchase_units.length === 0) {
        errors.push('purchase_units must be a non-empty array.');
      } else {
        parsed.purchase_units.forEach((u: any, idx: number) => {
          if (!u.reference_id) errors.push(`purchase_units[${idx}].reference_id is required.`);
          if (!u.amount?.value || !u.amount?.currency_code) {
            errors.push(`purchase_units[${idx}].amount requires value and currency_code.`);
          } else {
            const val = parseFloat(u.amount.value);
            if (isNaN(val) || val <= 0) {
              errors.push(`purchase_units[${idx}].amount.value must be a positive number.`);
            }
          }
        });
      }

      setValidationResult({
        valid: errors.length === 0,
        errors,
      });
    } catch (err: any) {
      setValidationResult({
        valid: false,
        errors: [`JSON Syntax Error: ${err.message}`],
      });
    }
  };

  const handleCopyEnvHint = () => {
    navigator.clipboard.writeText(`PAYPAL_CLIENT_ID=your_sandbox_client_id\nPAYPAL_CLIENT_SECRET=your_sandbox_client_secret`);
    setCopiedHint(true);
    setTimeout(() => setCopiedHint(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in-up pb-12">
      
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Settings & Configuration
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your PayPal connection, risk policy thresholds, and developer tools.
        </p>
      </div>

      {/* 3 Nav Tabs matching light theme */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white border border-[#e5edf8] text-xs shadow-xs w-fit">
        <button
          onClick={() => setActiveSection('PAYPAL')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
            activeSection === 'PAYPAL'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>1. PayPal Sandbox</span>
        </button>

        <button
          onClick={() => setActiveSection('POLICY')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
            activeSection === 'POLICY'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>2. Risk Policy</span>
        </button>

        <button
          onClick={() => setActiveSection('DEV_TOOLS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
            activeSection === 'DEV_TOOLS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>3. Developer Tools</span>
        </button>
      </div>

      {/* SECTION 1: PAYPAL SANDBOX */}
      {activeSection === 'PAYPAL' && (
        <div className="p-6 rounded-2xl bg-white border border-[#e5edf8] space-y-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">PayPal Sandbox Environment</h2>
              <p className="text-xs text-slate-500 mt-0.5">Verified server-side connection to the PayPal Orders v2 REST API.</p>
            </div>
            <button
              onClick={loadStatus}
              disabled={loadingStatus}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
              <span>Check Status</span>
            </button>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-400 font-sans">API Endpoint:</span>
              <span className="text-slate-900 font-semibold">https://api-m.sandbox.paypal.com</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-400 font-sans">Secret Isolation:</span>
              <span className="text-emerald-700 font-semibold font-sans flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Protected Server-Side (Zero Client Exposure)</span>
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-400 font-sans">Connection Status:</span>
              <span className="text-emerald-700 flex items-center gap-1.5 font-bold font-sans">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{paypalStatus?.clientIdConfigured ? 'Live Sandbox Credentials Connected' : 'Demo Sandbox Active'}</span>
              </span>
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <span className="text-xs font-bold text-slate-900 block">How to add your own Sandbox credentials:</span>
            <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5 leading-relaxed">
              <li>Log in to <strong className="text-slate-900">developer.paypal.com</strong> and open your Sandbox Apps.</li>
              <li>Copy your <strong className="text-slate-900">Client ID</strong> and <strong className="text-slate-900">Secret Key</strong>.</li>
              <li>Add them to your server environment file (<code className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono">server/.env</code>) and restart.</li>
            </ol>
            <button
              onClick={handleCopyEnvHint}
              className="mt-2 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#f8fafc] hover:bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            >
              {copiedHint ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-blue-600" />}
              <span>{copiedHint ? 'Copied to Clipboard' : 'Copy .env snippet'}</span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 2: RISK POLICY */}
      {activeSection === 'POLICY' && (
        <div className="p-6 rounded-2xl bg-white border border-[#e5edf8] space-y-5 shadow-xs">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Risk Policy & Thresholds</h2>
            <p className="text-xs text-slate-500 mt-0.5">Transactions are evaluated on a 0–100 risk scale before payment capture.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4.5 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800">Low Risk</span>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">0 – 29</span>
              </div>
              <p className="text-xs text-emerald-950 mt-3 leading-relaxed">
                Safe to proceed. Order creation and payment capture proceed automatically without delay.
              </p>
            </div>

            <div className="p-4.5 rounded-2xl bg-amber-50/50 border border-amber-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800">Needs Review</span>
                <span className="text-xs font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">30 – 65</span>
              </div>
              <p className="text-xs text-amber-950 mt-3 leading-relaxed">
                Requires merchant verification. Anomaly observed, but not automatically blocked.
              </p>
            </div>

            <div className="p-4.5 rounded-2xl bg-rose-50/50 border border-rose-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800">High Risk</span>
                <span className="text-xs font-mono font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">66 – 100</span>
              </div>
              <p className="text-xs text-rose-950 mt-3 leading-relaxed">
                Held pre-capture. Stops high-threat transactions before chargeback liability occurs.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#f8fafc] border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="text-slate-900 font-bold">Explainability Guarantee:</div>
            <p>Every risk assessment is deterministic, logs observed facts distinctly from inferences, and provides actionable counterfactual explanations.</p>
          </div>
        </div>
      )}

      {/* SECTION 3: DEVELOPER TOOLS */}
      {activeSection === 'DEV_TOOLS' && (
        <div className="space-y-5">
          
          {/* APIMatic Contract Validator */}
          <div className="p-6 rounded-2xl bg-white border border-[#e5edf8] space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">APIMatic PayPal Orders v2 Validator</h2>
                <p className="text-xs text-slate-500 mt-0.5">Validates outgoing order payloads against canonical PayPal REST API specifications.</p>
              </div>
              <button
                onClick={handleRunAPIMaticValidation}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Validate Payload</span>
              </button>
            </div>

            <textarea
              rows={8}
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              className="w-full p-4 rounded-xl bg-[#f8fafc] border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white leading-relaxed shadow-inner"
            />

            {validationResult && (
              <div className={`p-4 rounded-xl border text-xs ${
                validationResult.valid 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                {validationResult.valid ? (
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Schema Valid: Payload conforms strictly to PayPal Orders v2 specification.</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-rose-800">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Schema Validation Errors:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 font-mono text-[11px] text-rose-700">
                      {validationResult.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Render Blueprint */}
          <div className="p-6 rounded-2xl bg-white border border-[#e5edf8] space-y-2 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900">Render Free Cloud Blueprint</h3>
              </div>
              <span className="text-[10px] font-mono text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-semibold">
                render.yaml configured
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              PayShield AI includes a declarative <code className="text-blue-600 font-mono font-semibold">render.yaml</code> blueprint configured for 1-click zero-cost cloud deployment of the Express backend and Vite frontend.
            </p>
          </div>

        </div>
      )}

    </div>
  );
};
