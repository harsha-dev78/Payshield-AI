import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from '../config.js';
import { TransactionData, RiskAssessment, AuditRecord } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(CONFIG.DATABASE_PATH);

// Pragmas for performance and data safety
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize tables from schema.sql
const schemaPath = path.resolve(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);


export const dbService = {
  // Save or update transaction
  saveTransaction(tx: TransactionData, paymentStatus = 'PENDING', paypalOrderId?: string): void {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO transactions (
        order_id, amount, currency, customer_name, customer_email, 
        customer_phone, items_json, telemetry_json, payment_status,
        paypal_order_id, created_at, updated_at
      ) VALUES (
        @orderId, @amount, @currency, @name, @email,
        @phone, @items, @telemetry, @status,
        @paypalId, @createdAt, @updatedAt
      )
      ON CONFLICT(order_id) DO UPDATE SET
        payment_status = excluded.payment_status,
        paypal_order_id = COALESCE(excluded.paypal_order_id, transactions.paypal_order_id),
        updated_at = excluded.updated_at
    `);

    stmt.run({
      orderId: tx.orderId,
      amount: tx.amount,
      currency: tx.currency,
      name: tx.customer.name,
      email: tx.customer.email,
      phone: tx.customer.phone || null,
      items: JSON.stringify(tx.items),
      telemetry: JSON.stringify(tx.telemetry),
      status: paymentStatus,
      paypalId: paypalOrderId || null,
      createdAt: tx.createdAt || now,
      updatedAt: now,
    });
  },

  getTransaction(orderId: string): (TransactionData & { paymentStatus: string; paypalOrderId?: string; paypalCaptureId?: string }) | null {
    const row = db.prepare('SELECT * FROM transactions WHERE order_id = ?').get(orderId) as any;
    if (!row) return null;

    return {
      orderId: row.order_id,
      amount: row.amount,
      currency: row.currency,
      customer: {
        name: row.customer_name,
        email: row.customer_email,
        phone: row.customer_phone || undefined,
      },
      items: JSON.parse(row.items_json),
      telemetry: JSON.parse(row.telemetry_json),
      createdAt: row.created_at,
      paymentStatus: row.payment_status,
      paypalOrderId: row.paypal_order_id || undefined,
      paypalCaptureId: row.paypal_capture_id || undefined,
    };
  },

  listTransactions(limit = 50, offset = 0) {
    const rows = db.prepare(`
      SELECT t.*, r.overall_score, r.tier, r.confidence
      FROM transactions t
      LEFT JOIN risk_assessments r ON t.order_id = r.order_id
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as any[];

    return rows.map((r) => {
      let telemetry = {};
      try {
        if (r.telemetry_json) {
          telemetry = typeof r.telemetry_json === 'string' ? JSON.parse(r.telemetry_json) : r.telemetry_json;
        }
      } catch {
        telemetry = {};
      }

      return {
        orderId: r.order_id,
        amount: r.amount,
        currency: r.currency,
        customerName: r.customer_name,
        customerEmail: r.customer_email,
        customer: {
          name: r.customer_name || 'Anonymous',
          email: r.customer_email || '',
          phone: r.customer_phone || undefined,
        },
        telemetry,
        paymentStatus: r.payment_status,
        createdAt: r.created_at,
        riskScore: r.overall_score !== null ? r.overall_score : null,
        riskTier: r.tier || 'UNASSESSED',
        confidence: r.confidence !== null ? r.confidence : null,
        paypalOrderId: r.paypal_order_id,
      };
    });
  },

  updatePaymentStatus(orderId: string, status: string, paypalCaptureId?: string): void {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE transactions 
      SET payment_status = ?, paypal_capture_id = COALESCE(?, paypal_capture_id), updated_at = ?
      WHERE order_id = ?
    `);
    stmt.run(status, paypalCaptureId || null, now, orderId);
  },

  saveRiskAssessment(assessment: RiskAssessment): void {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO risk_assessments (
        id, order_id, overall_score, tier, confidence,
        signals_json, factors_json, missing_info_json,
        counterfactuals_json, recommendation_json,
        policy_version, assessed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      `ra_${assessment.transactionId}`,
      assessment.transactionId,
      assessment.overallScore,
      assessment.tier,
      assessment.confidence,
      JSON.stringify(assessment.signals),
      JSON.stringify(assessment.factors),
      JSON.stringify(assessment.missingInformation),
      JSON.stringify(assessment.counterfactuals),
      JSON.stringify(assessment.recommendation),
      assessment.policyVersion,
      assessment.assessedAt
    );
  },

  getRiskAssessment(orderId: string): RiskAssessment | null {
    const row = db.prepare('SELECT * FROM risk_assessments WHERE order_id = ?').get(orderId) as any;
    if (!row) return null;

    return {
      transactionId: row.order_id,
      overallScore: row.overall_score,
      tier: row.tier,
      confidence: row.confidence,
      signals: JSON.parse(row.signals_json),
      factors: JSON.parse(row.factors_json),
      missingInformation: JSON.parse(row.missing_info_json),
      counterfactuals: JSON.parse(row.counterfactuals_json),
      recommendation: JSON.parse(row.recommendation_json),
      policyVersion: row.policy_version,
      assessedAt: row.assessed_at,
    };
  },

  logAudit(
    orderId: string,
    action: AuditRecord['action'],
    actor: AuditRecord['actor'],
    details: Record<string, unknown>,
    policyVersion = CONFIG.RISK.POLICY_VERSION
  ): void {
    const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, order_id, action, actor, details_json, policy_version, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, orderId, action, actor, JSON.stringify(details), policyVersion, now);
  },

  getAuditLogs(orderId?: string): AuditRecord[] {
    const query = orderId
      ? 'SELECT * FROM audit_logs WHERE order_id = ? ORDER BY created_at DESC'
      : 'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100';

    const rows = (orderId ? db.prepare(query).all(orderId) : db.prepare(query).all()) as any[];

    return rows.map((r) => ({
      id: r.id,
      transactionId: r.order_id,
      timestamp: r.created_at,
      action: r.action,
      actor: r.actor,
      details: JSON.parse(r.details_json),
      policyVersion: r.policy_version,
    }));
  },
};

export default db;
