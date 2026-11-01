import type { TransactionData, RiskAssessment, AuditRecord, SystemStatus, MLPredictionResult } from '../types/index.js';

const API_BASE = (import.meta as any).env?.VITE_API_URL ? `${(import.meta as any).env.VITE_API_URL}/api` : '/api';

function getAuthHeaders(): Record<string, string> {
  try {
    const role = localStorage.getItem('payshield_auth_role') || 'GUEST_JUDGE';
    return {
      'x-actor-role': role,
      'x-actor-name': role === 'MERCHANT_ADMIN' ? 'Merchant Admin' : 'Demo Evaluator',
    };
  } catch {
    return {
      'x-actor-role': 'GUEST_JUDGE',
      'x-actor-name': 'Demo Evaluator',
    };
  }
}

async function parseResponseJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text || !text.trim()) {
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status} (${res.statusText || 'Empty Response'})`);
    }
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    if (!res.ok) {
      throw new Error(`Server Error (${res.status}): ${text.slice(0, 160)}`);
    }
    throw new Error(`Invalid JSON received (${res.status}): ${text.slice(0, 160)}`);
  }
}

export const api = {
  async getHealth(): Promise<SystemStatus> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Failed to fetch system health');
    return parseResponseJson(res);
  },

  async getTransactions(limit = 100): Promise<TransactionData[]> {
    const res = await fetch(`${API_BASE}/orders?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch transactions');
    const data = await parseResponseJson(res);
    return data.transactions || [];
  },

  async getTransactionDetails(orderId: string): Promise<{
    transaction: TransactionData;
    assessment: RiskAssessment;
    mlPrediction?: MLPredictionResult;
  }> {
    const res = await fetch(`${API_BASE}/orders/${orderId}`);
    if (!res.ok) throw new Error(`Failed to fetch details for ${orderId}`);
    return parseResponseJson(res);
  },

  async evaluateTransaction(tx: TransactionData): Promise<{ orderId: string; assessment: RiskAssessment; status: string }> {
    const res = await fetch(`${API_BASE}/orders/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(tx),
    });
    const data = await parseResponseJson(res);
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Evaluation failed');
    }
    return data;
  },

  async overrideTransaction(orderId: string, action: 'ALLOW' | 'BLOCK', notes?: string) {
    const res = await fetch(`${API_BASE}/orders/${orderId}/override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ action, notes }),
    });
    if (!res.ok) throw new Error('Failed to apply merchant override');
    return parseResponseJson(res);
  },

  async createPayPalOrder(
    transaction: TransactionData,
    returnUrl?: string,
    cancelUrl?: string
  ): Promise<{
    paypalOrderId: string;
    localOrderId: string;
    assessment: RiskAssessment;
    status: string;
    approveUrl?: string;
    mode: 'PAYPAL_SANDBOX' | 'UNCONFIGURED';
    links?: { href: string; rel: string; method: string }[];
  }> {
    const res = await fetch(`${API_BASE}/paypal/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction, returnUrl, cancelUrl }),
    });

    const data = await parseResponseJson(res);
    if (!res.ok) {
      const err = new Error(data.message || data.error || `Order creation failed with HTTP ${res.status}`);
      (err as any).assessment = data.assessment;
      (err as any).issue = data.issue;
      (err as any).status = res.status;
      (err as any).data = data;
      throw err;
    }
    return data;
  },

  async capturePayPalOrder(paypalOrderId: string, localOrderId: string) {
    const res = await fetch(`${API_BASE}/paypal/capture-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paypalOrderId, localOrderId }),
    });
    const data = await parseResponseJson(res);
    if (!res.ok) {
      const err = new Error(data.message || data.error || `Capture failed with HTTP ${res.status}`);
      (err as any).issue = data.issue;
      (err as any).status = res.status;
      throw err;
    }
    return data;
  },

  async cancelPayPalOrder(localOrderId: string, paypalOrderId?: string, reason?: string) {
    const res = await fetch(`${API_BASE}/paypal/cancel-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ localOrderId, paypalOrderId, reason }),
    });
    const data = await parseResponseJson(res);
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to cancel order');
    }
    return data;
  },

  async getAuditLogs(orderId?: string): Promise<AuditRecord[]> {
    const url = orderId ? `${API_BASE}/audit?orderId=${encodeURIComponent(orderId)}` : `${API_BASE}/audit`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch audit records');
    const data = await parseResponseJson(res);
    return data.logs || [];
  },

  async getPayPalStatus(): Promise<{
    status?: string;
    mode: 'PAYPAL_SANDBOX' | 'UNCONFIGURED' | 'MOCK_SIMULATOR';
    authenticated?: boolean;
    authLatencyMs?: number;
    authError?: string;
    apiBase: string;
    clientIdConfigured: boolean;
    clientSecretConfigured: boolean;
    clientIdKey?: string | null;
    clientSecretKey?: string | null;
    detectedPayPalKeys?: string[];
    reason?: string;
    environment: string;
    riskEngineActive: boolean;
    policyVersion: string;
  }> {
    const res = await fetch(`${API_BASE}/paypal/credentials-status?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });
    return parseResponseJson(res);
  },
};
