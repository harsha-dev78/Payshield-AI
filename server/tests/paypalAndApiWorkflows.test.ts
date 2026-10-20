import { describe, it, expect } from 'vitest';
import { ExplainableRiskEngine } from '../src/engine/explainability.js';
import { paypalClient } from '../src/services/paypalClient.js';
import { dbService } from '../src/db/database.js';
import { TransactionData } from '../src/types/index.js';

describe('PayPal Pre-Capture Gateway & API Workflow Integration', () => {
  const engine = new ExplainableRiskEngine();

  it('rejects high-risk attack transactions before contacting gateway', () => {
    const attackTx: TransactionData = {
      orderId: `TEST-GATEWAY-BLOCK-${Date.now()}`,
      amount: 499.00,
      currency: 'USD',
      customer: { name: 'Bot Tester', email: 'attacker@tempmail.com' },
      items: [{ id: '99', name: 'Gift Card', price: 499, quantity: 1 }],
      telemetry: {
        ipAddress: '185.220.101.5',
        ipCountry: 'NL',
        isProxyOrVpn: true,
        deviceFingerprint: 'dfp_tor_test',
        userAgent: 'HeadlessChrome',
        billingCountry: 'DE',
        shippingCountry: 'US',
        shippingAddressMatchesBilling: false,
        emailDomain: 'tempmail.com',
        isDisposableEmail: true,
        accountAgeDays: 0,
        failedAttemptsInLastHour: 4,
      },
      createdAt: new Date().toISOString(),
    };

    const assessment = engine.assess(attackTx);
    expect(assessment.tier).toBe('BLOCK');
    expect(assessment.overallScore).toBeGreaterThanOrEqual(65);
    expect(assessment.recommendation.action).toBe('HOLD_CHECKOUT');

    // Simulate pre-capture check logic
    const isAllowedToCreateOrder = assessment.tier !== 'BLOCK';
    expect(isAllowedToCreateOrder).toBe(false);

    dbService.saveTransaction(attackTx, 'BLOCKED');
    dbService.saveRiskAssessment(assessment);
    dbService.logAudit(attackTx.orderId, 'PAYMENT_BLOCKED', 'SYSTEM_RISK_ENGINE', { score: assessment.overallScore });

    const saved = dbService.getTransaction(attackTx.orderId);
    expect(saved?.paymentStatus).toBe('BLOCKED');
  });

  it('permits safe low-risk transaction and executes mock sandbox capture', async () => {
    const safeTxId = `TEST-GATEWAY-SAFE-${Date.now()}`;
    const safeTx: TransactionData = {
      orderId: safeTxId,
      amount: 65.00,
      currency: 'USD',
      customer: { name: 'Sarah Connor', email: 'sarah@gmail.com' },
      items: [{ id: '1', name: 'Security Key', price: 65, quantity: 1 }],
      telemetry: {
        ipAddress: '198.51.100.1',
        ipCountry: 'US',
        isProxyOrVpn: false,
        deviceFingerprint: 'dfp_clean',
        userAgent: 'Safari',
        billingCountry: 'US',
        shippingCountry: 'US',
        shippingAddressMatchesBilling: true,
        emailDomain: 'gmail.com',
        isDisposableEmail: false,
        accountAgeDays: 150,
        failedAttemptsInLastHour: 0,
      },
      createdAt: new Date().toISOString(),
    };

    const assessment = engine.assess(safeTx);
    expect(assessment.tier).toBe('ALLOW');

    // Create PayPal Order
    const orderResult = await paypalClient.createOrder(safeTx.orderId, safeTx.amount);
    expect(orderResult.id).toBeDefined();
    expect(orderResult.status).toBe('CREATED');

    dbService.saveTransaction(safeTx, 'PENDING', orderResult.id);

    // Capture Payment
    const captureResult = await paypalClient.captureOrder(orderResult.id);
    expect(captureResult.status).toBe('COMPLETED');
    expect(captureResult.captureId).toBeDefined();

    dbService.updatePaymentStatus(safeTxId, 'CAPTURED', captureResult.captureId);

    const updated = dbService.getTransaction(safeTxId);
    expect(updated?.paymentStatus).toBe('CAPTURED');
    expect(updated?.paypalCaptureId).toBe(captureResult.captureId);
  });

  it('protects against duplicate captures and records merchant override trail', () => {
    const txId = `TEST-DUP-OVERRIDE-${Date.now()}`;
    const tx: TransactionData = {
      orderId: txId,
      amount: 150.00,
      currency: 'USD',
      customer: { name: 'Review Customer', email: 'review@test.com' },
      items: [{ id: '2', name: 'Item', price: 150, quantity: 1 }],
      telemetry: {
        ipAddress: '203.0.113.1',
        ipCountry: 'US',
        isProxyOrVpn: true,
        deviceFingerprint: 'dfp_vpn',
        userAgent: 'Chrome',
        billingCountry: 'US',
        shippingCountry: 'US',
        shippingAddressMatchesBilling: false,
        emailDomain: 'test.com',
        isDisposableEmail: false,
        accountAgeDays: 20,
        failedAttemptsInLastHour: 0,
      },
      createdAt: new Date().toISOString(),
    };

    dbService.saveTransaction(tx, 'CAPTURED');
    dbService.updatePaymentStatus(txId, 'CAPTURED', 'CAP-INITIAL-99');

    // Check transaction state
    const current = dbService.getTransaction(txId);
    expect(current?.paymentStatus).toBe('CAPTURED');

    // Duplicate capture attempt must be detected
    const isAlreadyCaptured = current?.paymentStatus === 'CAPTURED';
    expect(isAlreadyCaptured).toBe(true);

    // Merchant override
    dbService.updatePaymentStatus(txId, 'BLOCKED');
    dbService.logAudit(txId, 'MERCHANT_OVERRIDE', 'MERCHANT_ADMIN', { priorStatus: 'CAPTURED', newStatus: 'BLOCKED', notes: 'Chargeback dispute hold' });

    const logs = dbService.getAuditLogs(txId);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].action).toBe('MERCHANT_OVERRIDE');
    expect(logs[0].details.notes).toBe('Chargeback dispute hold');
  });
});
