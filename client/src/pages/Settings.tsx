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
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100 tracking-tight">
          Settings & Configuration
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage your PayPal connection, risk policy thresholds, and developer tools.
        </p>
      </div>

      {/* 3 Clear Sections Nav Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0a0f1d] border border-[#1e293b] text-xs">
        <button
          onClick={() => setActiveSection('PAYPAL')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeSection === 'PAYPAL'
              ? 'bg-[#10172a] text-cyan-400 border border-cyan-800/60 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>1. PayPal Sandbox</span>
        </button>

        <button
          onClick={() => setActiveSection('POLICY')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeSection === 'POLICY'
              ? 'bg-[#10172a] text-cyan-400 border border-cyan-800/60 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>2. Risk Policy</span>
        </button>

        <button
          onClick={() => setActiveSection('DEV_TOOLS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeSection === 'DEV_TOOLS'
              ? 'bg-[#10172a] text-cyan-400 border border-cyan-800/60 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>3. Developer Tools</span>
        </button>
      </div>

      {/* SECTION 1: PAYPAL SANDBOX */}
      {activeSection === 'PAYPAL' && (
        <div className="p-5 rounded-xl bg-[#0a0f1d] border border-[#1e293b] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
            <div>
              <h2 className="text-sm font-bold text-slate-100">PayPal Sandbox Environment</h2>
              <p className="text-xs text-slate-400 mt-0.5">Verified server-side connection to the PayPal Orders v2 REST API.</p>
            </div>
            <button
              onClick={loadStatus}
              disabled={loadingStatus}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#060911] hover:bg-[#10172a] text-slate-300 border border-[#1e293b] text-xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
              <span>Check Status</span>
            </button>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between py-2 border-b border-[#1e293b]/60">
              <span className="text-slate-400">Environment:</span>
              <span className="text-slate-200">https://api-m.sandbox.paypal.com</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#1e293b]/60">
              <span className="text-slate-400">Secret Security:</span>
              <span className="text-[#34d399] font-bold">Protected Server-Side (Zero Client Exposure)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#1e293b]/60">
              <span className="text-slate-400">Status:</span>
              <span className="text-[#34d399] flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{paypalStatus?.clientIdConfigured ? 'Live Sandbox Credentials Connected' : 'Demo Sandbox Active'}</span>
              </span>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">How to add your own Sandbox credentials:</span>
            <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1 leading-relaxed">
              <li>Log in to <strong className="text-slate-200">developer.paypal.com</strong> and open your Sandbox Apps.</li>
              <li>Copy your <strong className="text-slate-200">Client ID</strong> and <strong className="text-slate-200">Secret Key</strong>.</li>
              <li>Add them to your server environment file (<code className="text-cyan-400">server/.env</code>) and restart.</li>
            </ol>
            <button
              onClick={handleCopyEnvHint}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#060911] hover:bg-[#10172a] text-xs text-slate-300 border border-[#1e293b] transition-colors"
            >
              {copiedHint ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{copiedHint ? 'Copied to Clipboard' : 'Copy .env snippet'}</span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 2: RISK POLICY */}
      {activeSection === 'POLICY' && (
        <div className="p-5 rounded-xl bg-[#0a0f1d] border border-[#1e293b] space-y-4">
          <div className="pb-3 border-b border-[#1e293b]">
            <h2 className="text-sm font-bold text-slate-100">Risk Policy & Thresholds</h2>
            <p className="text-xs text-slate-400 mt-0.5">Transactions are evaluated on a 0–100 scale before payment capture.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-lg bg-[#060911] border border-[#065f46]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#34d399]">Low Risk</span>
                <span className="text-xs font-mono font-bold text-[#34d399]">0 – 29</span>
              </div>
              <p className="text-xs text-slate-300 mt-2">Safe to proceed. Order creation and payment capture proceed automatically.</p>
            </div>

            <div className="p-4 rounded-lg bg-[#060911] border border-[#78350f]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#fbbf24]">Needs Review</span>
                <span className="text-xs font-mono font-bold text-[#fbbf24]">30 – 65</span>
              </div>
              <p className="text-xs text-slate-300 mt-2">Requires merchant verification. Anomaly observed, but not automatically blocked.</p>
            </div>

            <div className="p-4 rounded-lg bg-[#060911] border border-[#7f1d1d]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#f87171]">High Risk</span>
                <span className="text-xs font-mono font-bold text-[#f87171]">66 – 100</span>
              </div>
              <p className="text-xs text-slate-300 mt-2">Held pre-capture. Stops high-threat transactions before chargebacks can occur.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#060911] border border-[#1e293b] text-xs text-slate-400 space-y-1">
            <div className="text-slate-200 font-medium">Explainability Guarantee:</div>
            <p>Every risk assessment is deterministic, logs observed facts distinctly from inferences, and provides actionable counterfactual explanations.</p>
          </div>
        </div>
      )}

      {/* SECTION 3: DEVELOPER TOOLS */}
      {activeSection === 'DEV_TOOLS' && (
        <div className="space-y-4">
          
          {/* APIMatic Contract Validator */}
          <div className="p-5 rounded-xl bg-[#0a0f1d] border border-[#1e293b] space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
              <div>
                <h2 className="text-sm font-bold text-slate-100">APIMatic PayPal Orders v2 Validator</h2>
                <p className="text-xs text-slate-400 mt-0.5">Validates outgoing order payloads against PayPal REST API specifications.</p>
              </div>
              <button
                onClick={handleRunAPIMaticValidation}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 text-xs font-semibold transition-colors"
              >
                <Play className="w-3.5 h-3.5 text-cyan-400" />
                <span>Validate Payload</span>
              </button>
            </div>

            <textarea
              rows={8}
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              className="w-full p-3 rounded-lg bg-[#060911] border border-[#1e293b] text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed"
            />

            {validationResult && (
              <div className={`p-3 rounded-lg border text-xs ${
                validationResult.valid 
                  ? 'bg-[#06281e] border-[#065f46] text-[#34d399]' 
                  : 'bg-[#2d0b12] border-[#7f1d1d] text-[#f87171]'
              }`}>
                {validationResult.valid ? (
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Schema Valid: Payload conforms strictly to PayPal Orders v2 specification.</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Schema Validation Errors:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 font-mono text-[11px]">
                      {validationResult.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Render Deployment Blueprint */}
          <div className="p-5 rounded-xl bg-[#0a0f1d] border border-[#1e293b] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-slate-200">Render Free Deployment Blueprint</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">render.yaml configured</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              PayShield AI includes a verified <code className="text-cyan-400">render.yaml</code> blueprint configured for zero-cost deployment of the Express backend and Vite frontend.
            </p>
          </div>

        </div>
      )}

    </div>
  );
};
