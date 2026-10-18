import { describe, it, expect } from 'vitest';
import { ExplainableRiskEngine } from '../src/engine/explainability.js';
import { TransactionData } from '../src/types/index.js';

describe('PayShield Explainable Risk Engine', () => {
  const engine = new ExplainableRiskEngine();

  it('should classify safe domestic orders with positive history into ALLOW tier', () => {
    const safeTx: TransactionData = {
      orderId: 'TEST-SAFE-01',
      amount: 45.00,
      currency: 'USD',
      customer: { name: 'Alice Smith', email: 'alice@example.com' },
      items: [{ id: '1', name: 'Book', price: 45, quantity: 1 }],
      telemetry: {
        ipAddress: '198.51.100.1',
        ipCountry: 'US',
        isProxyOrVpn: false,
        deviceFingerprint: 'dfp_test_1',
        userAgent: 'Mozilla/5.0',
        billingCountry: 'US',
        shippingCountry: 'US',
        shippingAddressMatchesBilling: true,
        emailDomain: 'example.com',
        isDisposableEmail: false,
        accountAgeDays: 120,
        failedAttemptsInLastHour: 0,
      },
      createdAt: new Date().toISOString(),
    };

    const assessment = engine.assess(safeTx);
    expect(assessment.tier).toBe('ALLOW');
    expect(assessment.overallScore).toBeLessThan(30);
    expect(assessment.recommendation.action).toBe('PROCEED');
  });

  it('should flag automated velocity spikes and cross-border proxies into BLOCK tier', () => {
    const attackTx: TransactionData = {
      orderId: 'TEST-ATTACK-01',
      amount: 600.00,
      currency: 'USD',
      customer: { name: 'Bot Tester', email: 'anon@tempmail.com' },
      items: [{ id: '99', name: 'Gift Card', price: 600, quantity: 1 }],
      telemetry: {
        ipAddress: '185.220.101.5',
        ipCountry: 'NL',
        isProxyOrVpn: true,
        deviceFingerprint: 'dfp_bot_99',
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
    expect(assessment.overallScore).toBeGreaterThan(65);
    expect(assessment.recommendation.action).toBe('HOLD_CHECKOUT');
    expect(assessment.signals.some((s) => s.id === 'HIGH_VELOCITY_FAILURES')).toBe(true);
    expect(assessment.counterfactuals.length).toBeGreaterThan(0);
  });

  it('should provide actionable counterfactuals to resolve uncertainty', () => {
    const reviewTx: TransactionData = {
      orderId: 'TEST-REVIEW-01',
      amount: 150.00,
      currency: 'USD',
      customer: { name: 'John Doe', email: 'john@gmail.com' },
      items: [{ id: '2', name: 'Shoes', price: 150, quantity: 1 }],
      telemetry: {
        ipAddress: '203.0.113.1',
        ipCountry: 'US',
        isProxyOrVpn: true, // VPN triggered
        deviceFingerprint: 'dfp_phone_1',
        userAgent: 'Safari',
        billingCountry: 'US',
        shippingCountry: 'US',
        shippingAddressMatchesBilling: false, // mismatch
        emailDomain: 'gmail.com',
        isDisposableEmail: false,
        accountAgeDays: 10,
        failedAttemptsInLastHour: 0,
      },
      createdAt: new Date().toISOString(),
    };

    const assessment = engine.assess(reviewTx);
    expect(assessment.counterfactuals.some((c) => c.condition.includes('residential IP'))).toBe(true);
  });
});
