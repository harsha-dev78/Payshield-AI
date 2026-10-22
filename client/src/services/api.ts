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

export const api = {
  async getHealth(): Promise<SystemStatus> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Failed to fetch system health');
    return res.json();
  },

  async getTransactions(): Promise<TransactionData[]> {
    const res = await fetch(`${API_BASE}/orders`);
    if (!res.ok) throw new Error('Failed to fetch transactions');
    const data = await res.json();
    return data.transactions;
  },

  async getTransactionDetails(orderId: string): Promise<{
    transaction: TransactionData;
    assessment: RiskAssessment;
    mlPrediction?: MLPredictionResult;
  }> {
    const res = await fetch(`${API_BASE}/orders/${orderId}`);
    if (!res.ok) throw new Error(`Failed to fetch details for ${orderId}`);
    return res.json();
  },


  async evaluateTransaction(tx: TransactionData): Promise<{ orderId: string; assessment: RiskAssessment; status: string }> {
    const res = await fetch(`${API_BASE}/orders/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(tx),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Evaluation failed');
    }
    return res.json();
  },

  async overrideTransaction(orderId: string, action: 'ALLOW' | 'BLOCK', notes?: string) {
    const res = await fetch(`${API_BASE}/orders/${orderId}/override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ action, notes }),
    });
    if (!res.ok) throw new Error('Failed to apply merchant override');
    return res.json();
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
    mode: 'PAYPAL_SANDBOX' | 'MOCK_SIMULATOR';
    links?: { href: string; rel: string; method: string }[];
  }> {
    const res = await fetch(`${API_BASE}/paypal/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction, returnUrl, cancelUrl }),
    });

    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || data.error || 'Failed to create PayPal order');
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
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || data.error || 'Capture failed');
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
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || err.error || 'Failed to cancel order');
    }
    return res.json();
  },

  async getAuditLogs(orderId?: string): Promise<AuditRecord[]> {
    const url = orderId ? `${API_BASE}/audit?orderId=${encodeURIComponent(orderId)}` : `${API_BASE}/audit`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch audit records');
    const data = await res.json();
    return data.logs;
  },

  async getPayPalStatus(): Promise<{
    mode: 'MOCK_SIMULATOR' | 'PAYPAL_SANDBOX';
    apiBase: string;
    clientIdConfigured: boolean;
    clientSecretConfigured: boolean;
    environment: string;
    riskEngineActive: boolean;
    policyVersion: string;
  }> {
    const res = await fetch(`${API_BASE}/paypal/status`);
    if (!res.ok) throw new Error('Failed to fetch PayPal status');
    return res.json();
  },
};
