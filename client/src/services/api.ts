import type { TransactionData, RiskAssessment, AuditRecord, SystemStatus, MLPredictionResult } from '../types/index.js';


const API_BASE = '/api';

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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notes }),
    });
    if (!res.ok) throw new Error('Failed to apply merchant override');
    return res.json();
  },

  async createPayPalOrder(transaction: TransactionData): Promise<{
    paypalOrderId: string;
    localOrderId: string;
    assessment: RiskAssessment;
    status: string;
  }> {
    const res = await fetch(`${API_BASE}/paypal/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction }),
    });

    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || data.error || 'Failed to create PayPal order');
      (err as any).assessment = data.assessment;
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
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || err.error || 'Capture failed');
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

  async getPayPalStatus() {
    const res = await fetch(`${API_BASE}/paypal/status`);
    if (!res.ok) throw new Error('Failed to fetch PayPal status');
    return res.json();
  },
};
