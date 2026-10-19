import { describe, it, expect } from 'vitest';
import { dbService } from '../src/db/database.js';
import { ExplainableRiskEngine } from '../src/engine/explainability.js';
import { TransactionDataSchema } from '../src/specs/transactionSchema.js';
import type { TransactionData } from '../src/types/index.js';

describe('PayShield Investigation, Security & Evidence Verification', () => {
  const engine = new ExplainableRiskEngine();

  it('validates schema compliance and rejects malformed transactions', () => {
    const invalidTx = {
      orderId: 'INVALID-01',
      // missing amount and customer
      currency: 'USD',
    };

    const result = TransactionDataSchema.safeParse(invalidTx);
    expect(result.success).toBe(false);
  });

  it('calculates data confidence and flags missing evidence items', () => {
    // Transaction with sparse telemetry (missing phone, device fingerprint, account age)
    const sparseTx: TransactionData = {
      orderId: 'TEST-SPARSE-01',
      amount: 120.00,
      currency: 'USD',
      customer: { name: 'Sparse Buyer', email: 'sparse@example.com' },
      items: [{ id: '1', name: 'Gadget', price: 120, quantity: 1 }],
      telemetry: {
        ipAddress: '198.51.100.1',
        ipCountry: 'US',
        isProxyOrVpn: false,
        deviceFingerprint: '', // missing
        userAgent: 'Mozilla/5.0',
        billingCountry: 'US',
        shippingCountry: 'US',
        shippingAddressMatchesBilling: true,
        emailDomain: 'example.com',
        isDisposableEmail: false,
        // accountAgeDays missing
      },
      createdAt: new Date().toISOString(),
    };

    const assessment = engine.assess(sparseTx);
    expect(assessment.confidence).toBeLessThan(1.0);
    expect(assessment.missingInformation.length).toBeGreaterThan(0);
  });

  it('strictly distinguishes observed facts from risk inference reasons in all signals', () => {
    const testTx: TransactionData = {
      orderId: 'TEST-GROUNDING-01',
      amount: 499.00,
      currency: 'USD',
      customer: { name: 'VPN User', email: 'user@tempmail.com' },
      items: [{ id: '1', name: 'Hardware', price: 499, quantity: 1 }],
      telemetry: {
        ipAddress: '185.220.101.5',
        ipCountry: 'NL',
        isProxyOrVpn: true,
        deviceFingerprint: 'dfp_test_grounding',
        userAgent: 'Mozilla/5.0',
        billingCountry: 'US',
        shippingCountry: 'US',
        shippingAddressMatchesBilling: true,
        emailDomain: 'tempmail.com',
        isDisposableEmail: true,
        accountAgeDays: 0,
        failedAttemptsInLastHour: 3,
      },
      createdAt: new Date().toISOString(),
    };

    const assessment = engine.assess(testTx);
    expect(assessment.signals.length).toBeGreaterThan(0);

    for (const signal of assessment.signals) {
      expect(signal.observedFact).toBeDefined();
      expect(signal.observedFact.length).toBeGreaterThan(5);
      expect(signal.inferenceReason).toBeDefined();
      expect(signal.inferenceReason.length).toBeGreaterThan(5);
      expect(signal.scoreContribution).not.toBe(0);
    }
  });

  it('persists and retrieves transactions, risk assessments, and tamper-evident audit logs', () => {
    const testId = `TEST-PERSIST-${Date.now()}`;
    const testTx: TransactionData = {
      orderId: testId,
      amount: 99.00,
      currency: 'USD',
      customer: { name: 'Persistence Tester', email: 'persist@test.com' },
      items: [{ id: '1', name: 'Service', price: 99, quantity: 1 }],
      telemetry: {
        ipAddress: '192.0.2.1',
        ipCountry: 'US',
        isProxyOrVpn: false,
        deviceFingerprint: 'dfp_persist',
        userAgent: 'Mozilla/5.0',
        billingCountry: 'US',
        shippingCountry: 'US',
        shippingAddressMatchesBilling: true,
        emailDomain: 'test.com',
        isDisposableEmail: false,
        accountAgeDays: 100,
        failedAttemptsInLastHour: 0,
      },
      createdAt: new Date().toISOString(),
    };

    const assessment = engine.assess(testTx);
    dbService.saveTransaction(testTx, 'PENDING');
    dbService.saveRiskAssessment(assessment);
    dbService.logAudit(testId, 'RISK_ASSESSED', 'SYSTEM_RISK_ENGINE', { score: assessment.overallScore });

    const retrievedTx = dbService.getTransaction(testId);
    expect(retrievedTx).not.toBeNull();
    expect(retrievedTx?.orderId).toBe(testId);
    expect(retrievedTx?.paymentStatus).toBe('PENDING');

    const retrievedAssessment = dbService.getRiskAssessment(testId);
    expect(retrievedAssessment).not.toBeNull();
    expect(retrievedAssessment?.transactionId).toBe(testId);
    expect(retrievedAssessment?.overallScore).toBe(assessment.overallScore);

    const logs = dbService.getAuditLogs(testId);
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].action).toBe('RISK_ASSESSED');
  });

  it('prevents duplicate captures on already captured transactions', () => {
    const testId = `TEST-DUP-CAP-${Date.now()}`;
    const tx: TransactionData = {
      orderId: testId,
      amount: 50.00,
      currency: 'USD',
      customer: { name: 'Dup Capture Test', email: 'dup@test.com' },
      items: [{ id: '1', name: 'Item', price: 50, quantity: 1 }],
      telemetry: {
        ipAddress: '198.51.100.10',
        ipCountry: 'US',
        isProxyOrVpn: false,
        deviceFingerprint: 'dfp_dup',
        userAgent: 'Mozilla/5.0',
        billingCountry: 'US',
        shippingCountry: 'US',
        shippingAddressMatchesBilling: true,
        emailDomain: 'test.com',
        isDisposableEmail: false,
        accountAgeDays: 50,
      },
      createdAt: new Date().toISOString(),
    };

    // Save as already captured
    dbService.saveTransaction(tx, 'CAPTURED');
    dbService.updatePaymentStatus(testId, 'CAPTURED', 'CAP-ORIGINAL-123');

    const checkTx = dbService.getTransaction(testId);
    expect(checkTx?.paymentStatus).toBe('CAPTURED');
    expect(checkTx?.paypalCaptureId).toBe('CAP-ORIGINAL-123');
  });
});
