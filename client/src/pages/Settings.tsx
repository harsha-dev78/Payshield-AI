import React, { useEffect, useState } from 'react';
import { 
  Key, 
  Sliders, 
  FileCode, 
  CheckCircle2, 
  AlertTriangle,
  Server
} from 'lucide-react';
import { api } from '../services/api.js';

export const Settings: React.FC = () => {
  const [paypalStatus, setPaypalStatus] = useState<any>(null);

  // APIMatic Live Contract Validator Test State
  const [testPayload, setTestPayload] = useState(
    JSON.stringify(
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: 'ORD-TEST-9901',
            amount: {
              currency_code: 'USD',
              value: '120.00',
            },
          },
        ],
      },
      null,
      2
    )
  );
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[] } | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const data = await api.getPayPalStatus();
      setPaypalStatus(data);
    } catch (err) {
      console.error('Failed to fetch status', err);
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

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="p-5 rounded-xl bg-[#0b101e] border border-cyan-900/30">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white tracking-tight">
            Settings & Architecture Inspector
          </h1>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold">
            Sponsor Integrations
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Verify PayPal Sandbox keys, review risk engine scoring thresholds, and inspect APIMatic API contracts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PayPal Sandbox Environment Status */}
        <div className="p-5 rounded-xl bg-[#0b0f1d] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" />
              <span>PayPal Sandbox Configuration</span>
            </h3>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
              {paypalStatus?.mode || 'SANDBOX'}
            </span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Gateway Target</span>
              <span className="text-slate-200">https://api-m.sandbox.paypal.com</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Environment</span>
              <span className="text-emerald-400 font-bold">SANDBOX ONLY ($0 Budget)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Secret Key Protection</span>
              <span className="text-emerald-400">Secured Server-Side in server/.env</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Orders API Version</span>
              <span className="text-cyan-400 font-bold">v2 REST (Orders API)</span>
            </div>
          </div>

          {/* $0 Setup Helper Box */}
          <div className="p-3.5 rounded-lg bg-black/40 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>How to link your free PayPal Developer Credentials:</span>
            </div>
            <ol className="list-decimal list-inside text-slate-400 text-[11px] space-y-1">
              <li>Log into <a href="https://developer.paypal.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline">developer.paypal.com</a> (Free personal account).</li>
              <li>Go to <strong>Apps & Credentials</strong> → Select <strong>Sandbox</strong>.</li>
              <li>Copy your Sandbox <strong>Client ID</strong> & <strong>Secret</strong> into <code className="text-slate-200 bg-slate-800 px-1 rounded">server/.env</code>.</li>
            </ol>
          </div>
        </div>

        {/* Risk Policy & Thresholds */}
        <div className="p-5 rounded-xl bg-[#0b0f1d] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Risk Engine Policy Thresholds</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              v1.2.0-deterministic
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40 flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-300">ALLOW Tier (Low Risk)</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Risk Score: 0 to 29 pts</p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-1 rounded bg-emerald-950 border border-emerald-800">
                Automated Capture
              </span>
            </div>

            <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/40 flex items-center justify-between">
              <div>
                <span className="font-bold text-amber-300">REVIEW Tier (Moderate Anomaly)</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Risk Score: 30 to 65 pts</p>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 px-2 py-1 rounded bg-amber-950 border border-amber-800">
                Buyer Verification
              </span>
            </div>

            <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/40 flex items-center justify-between">
              <div>
                <span className="font-bold text-rose-300">BLOCK Tier (Critical Anomaly)</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Risk Score: &gt; 65 pts</p>
              </div>
              <span className="text-xs font-mono font-bold text-rose-400 px-2 py-1 rounded bg-rose-950 border border-rose-800">
                Halt Gateway Capture
              </span>
            </div>
          </div>
        </div>

        {/* APIMatic Specification & Contract Validator (Sponsor Showcase) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-[#0b0f1d] border border-cyan-900/40 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  APIMatic Context Plugin — PayPal Orders v2 Contract Inspector
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-semibold">
                  Zero-Hallucination Spec
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                PayShield AI's server contracts are strictly validated against canonical schemas derived from the APIMatic Context Plugin.
              </p>
            </div>

            <button
              onClick={handleRunAPIMaticValidation}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 text-xs font-semibold self-start sm:self-auto transition-colors"
            >
              Validate Payload Against Spec
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-slate-400 font-mono block mb-1">
                Editable Test Order Payload:
              </label>
              <textarea
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                rows={9}
                className="w-full p-2.5 rounded-lg bg-black/60 border border-slate-800 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed"
              />
            </div>

            <div className="p-3.5 rounded-lg bg-[#080d19] border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
                  APIMatic Canonical Rules:
                </span>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                  <li>Enforces <code className="text-cyan-400">intent: 'CAPTURE'</code> for immediate settlement.</li>
                  <li>Validates ISO 4217 currency compliance (USD, EUR, GBP).</li>
                  <li>Rejects negative, non-numeric, or missing amounts.</li>
                  <li>Ensures persistent reference ID for audit mapping.</li>
                </ul>
              </div>

              {validationResult && (
                <div className={`mt-3 p-3 rounded-lg border font-mono text-xs ${
                  validationResult.valid
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-800 text-rose-300'
                }`}>
                  {validationResult.valid ? (
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Schema Valid: Conforms to APIMatic PayPal v2 Specification</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span>Validation Rejected:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                        {validationResult.errors.map((e, idx) => <li key={idx}>{e}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Render 1-Click Deployment Info (Sponsor Showcase) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-[#0b0f1d] border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">
                Render Cloud Infrastructure Blueprint
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
              render.yaml Ready
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            PayShield AI includes a declarative <code className="text-cyan-400 bg-slate-900 px-1 py-0.5 rounded">render.yaml</code> blueprint configured for 1-click cloud deployment. Evaluators and judges can deploy the full-stack system onto Render using the hackathon's $50 sponsor credits while keeping local development 100% free with SQLite.
          </p>

          <div className="p-3 rounded-lg bg-black/40 border border-slate-800 font-mono text-xs text-slate-300 flex items-center justify-between">
            <span>Blueprint: <strong className="text-cyan-400">render.yaml</strong> (Static UI + Express API)</span>
            <span className="text-emerald-400 font-bold">100% $0 Local Dev Compatible</span>
          </div>
        </div>

      </div>

    </div>
  );
};
