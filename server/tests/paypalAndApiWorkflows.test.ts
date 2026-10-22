import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { ExplainableRiskEngine } from '../src/engine/explainability.js';
import { paypalClient } from '../src/services/paypalClient.js';
import { dbService } from '../src/db/database.js';
import { TransactionData } from '../src/types/index.js';
import { app } from '../src/server.js';

describe('PayShield AI - PayPal Sandbox & Risk Engine Integration Suite', () => {
  const engine = new ExplainableRiskEngine();
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // TEST 1: Normal customer creates PayPal Sandbox order
  it('TEST 1: Normal customer creates PayPal Sandbox order', async () => {
    const normalTx: TransactionData = {
      orderId: `TEST-1-NORMAL-${Date.now()}`,
      amount: 65.00,
      currency: 'USD',
      customer: {
        name: 'Sarah Connor',
        email: 'sarah.connor@gmail.com',
        phone: '+1-555-019-3321',
      },
      items: [{ id: 'prod-101', name: 'Hardware Security Key', price: 65.00, quantity: 1 }],
      telemetry: {
        ipAddress: '198.51.100.44',
        ipCountry: 'US',
        isProxyOrVpn: false,
        deviceFingerprint: 'dfp_clean_safari',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        billingCountry: 'US',
        shippingCountry: 'US',
        shippingAddressMatchesBilling: true,
        emailDomain: 'gmail.com',
        isDisposableEmail: false,
        accountAgeDays: 160,
        ordersInLast24Hours: 1,
        failedAttemptsInLastHour: 0,
      },
      createdAt: new Date().toISOString(),
    };

    const res = await fetch(`${baseUrl}/api/paypal/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction: normalTx }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.paypalOrderId).toBeDefined();
    expect(body.localOrderId).toBe(normalTx.orderId);
    expect(body.approveUrl).toBeDefined();
    expect(body.status).toBe('CREATED');
    expect(body.assessment.tier).toBe('ALLOW');
    expect(body.assessment.overallScore).toBeLessThanOrEqual(30);

    const savedTx = dbService.getTransaction(normalTx.orderId);
    expect(savedTx).toBeDefined();
    expect(savedTx?.paymentStatus).toBe('PENDING');
    expect(savedTx?.paypalOrderId).toBe(body.paypalOrderId);
  });

  // TEST 2: Uncertain buyer triggers review policy
  it('TEST 2: Uncertain buyer triggers review policy', async () => {
    const uncertainTx: TransactionData = {
      orderId: `TEST-2-REVIEW-${Date.now()}`,
      amount: 149.99,
      currency: 'USD',
      customer: {
        name: 'Liam Neeson',
        email: 'liam.neeson@outlook.com',
        phone: '+1-555-014-8899',
      },
      items: [{ id: 'prod-102', name: 'Encrypted NVMe SSD 1TB', price: 149.99, quantity: 1 }],
      telemetry: {
        ipAddress: '203.0.113.88',
        ipCountry: 'US',
        isProxyOrVpn: true,
        deviceFingerprint: 'dfp_win_vpn',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        billingCountry: 'US',
        shippingCountry: 'US',
        shippingAddressMatchesBilling: false,
        emailDomain: 'outlook.com',
        isDisposableEmail: false,
        accountAgeDays: 14,
        ordersInLast24Hours: 2,
        failedAttemptsInLastHour: 0,
      },
      createdAt: new Date().toISOString(),
    };

    const res = await fetch(`${baseUrl}/api/paypal/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction: uncertainTx }),
    });

    // Review policy withholds PayPal order creation
    expect(res.status).toBe(422);
    const body = await res.json();

    expect(body.error).toBe('Review Policy Required');
    expect(body.status).toBe('PENDING_RISK_REVIEW');
    expect(body.noOrderCreated).toBe(true);
    expect(body.assessment.tier).toBe('REVIEW');
    expect(body.assessment.overallScore).toBeGreaterThanOrEqual(30);
    expect(body.assessment.overallScore).toBeLessThan(65);

    const savedTx = dbService.getTransaction(uncertainTx.orderId);
    expect(savedTx).toBeDefined();
    expect(savedTx?.paymentStatus).toBe('PENDING_RISK_REVIEW');
    expect(savedTx?.paypalOrderId).toBeUndefined();

    const auditLogs = dbService.getAuditLogs(uncertainTx.orderId);
    expect(auditLogs.some((l) => l.action === 'REVIEW_HELD')).toBe(true);
  });

  // TEST 3: Suspicious actor is blocked before PayPal order creation
  it('TEST 3: Suspicious actor is blocked before PayPal order creation', async () => {
    const suspiciousTx: TransactionData = {
      orderId: `TEST-3-BLOCK-${Date.now()}`,
      amount: 499.00,
      currency: 'USD',
      customer: {
        name: 'Anonymous Actor',
        email: 'test_attacker@tempmail.com',
      },
      items: [{ id: 'prod-103', name: 'Micro Network Firewall', price: 499.00, quantity: 1 }],
      telemetry: {
        ipAddress: '185.220.101.9',
        ipCountry: 'NL',
        isProxyOrVpn: true,
        deviceFingerprint: 'dfp_tor_headless',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64; HeadlessChrome)',
        billingCountry: 'DE',
        shippingCountry: 'US',
        shippingAddressMatchesBilling: false,
        emailDomain: 'tempmail.com',
        isDisposableEmail: true,
        accountAgeDays: 0,
        ordersInLast24Hours: 8,
        failedAttemptsInLastHour: 4,
      },
      createdAt: new Date().toISOString(),
    };

    const res = await fetch(`${baseUrl}/api/paypal/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction: suspiciousTx }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();

    expect(body.error).toBe('Payment Blocked by Risk Policy');
    expect(body.message).toBe(
      'Payment blocked by PayShield AI. The transaction exceeded the configured risk threshold. No PayPal order or payment was created.'
    );
    expect(body.noOrderCreated).toBe(true);
    expect(body.assessment.tier).toBe('BLOCK');
    expect(body.assessment.overallScore).toBeGreaterThanOrEqual(65);

    const savedTx = dbService.getTransaction(suspiciousTx.orderId);
    expect(savedTx).toBeDefined();
    expect(savedTx?.paymentStatus).toBe('BLOCKED');
    expect(savedTx?.paypalOrderId).toBeUndefined();

    const auditLogs = dbService.getAuditLogs(suspiciousTx.orderId);
    expect(auditLogs.some((l) => l.action === 'PAYMENT_BLOCKED')).toBe(true);
  });

  // TEST 4: Risk engine correctly scores all three scenarios
  it('TEST 4: Risk engine correctly scores all three scenarios', () => {
    const safeTx: TransactionData = {
      orderId: 'SCORE-SAFE',
      amount: 50,
      currency: 'USD',
      customer: { name: 'Safe User', email: 'user@gmail.com' },
      items: [{ id: '1', name: 'Item', price: 50, quantity: 1 }],
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
        accountAgeDays: 200,
        failedAttemptsInLastHour: 0,
      },
      createdAt: new Date().toISOString(),
    };

    const reviewTx: TransactionData = {
      orderId: 'SCORE-REVIEW',
      amount: 150,
      currency: 'USD',
      customer: { name: 'Review User', email: 'user@outlook.com' },
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
        emailDomain: 'outlook.com',
        isDisposableEmail: false,
        accountAgeDays: 10,
        failedAttemptsInLastHour: 0,
      },
      createdAt: new Date().toISOString(),
    };

    const blockTx: TransactionData = {
      orderId: 'SCORE-BLOCK',
      amount: 900,
      currency: 'USD',
      customer: { name: 'Attack User', email: 'bad@tempmail.com' },
      items: [{ id: '3', name: 'Item', price: 900, quantity: 1 }],
      telemetry: {
        ipAddress: '185.220.101.5',
        ipCountry: 'NL',
        isProxyOrVpn: true,
        deviceFingerprint: 'dfp_tor',
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

    const safeAssessment = engine.assess(safeTx);
    const reviewAssessment = engine.assess(reviewTx);
    const blockAssessment = engine.assess(blockTx);

    expect(safeAssessment.tier).toBe('ALLOW');
    expect(safeAssessment.overallScore).toBeLessThanOrEqual(30);

    expect(reviewAssessment.tier).toBe('REVIEW');
    expect(reviewAssessment.overallScore).toBeGreaterThanOrEqual(30);
    expect(reviewAssessment.overallScore).toBeLessThan(65);

    expect(blockAssessment.tier).toBe('BLOCK');
    expect(blockAssessment.overallScore).toBeGreaterThanOrEqual(65);
  });

  // TEST 5: Blocked order cannot be captured
  it('TEST 5: Blocked order cannot be captured', async () => {
    const blockedOrderId = `TEST-5-BLOCKED-CAP-${Date.now()}`;
    const blockedTx: TransactionData = {
      orderId: blockedOrderId,
      amount: 999.00,
      currency: 'USD',
      customer: { name: 'Blocked Buyer', email: 'blocked@fraud.org' },
      items: [{ id: '1', name: 'High Value Asset', price: 999, quantity: 1 }],
      telemetry: {
        ipAddress: '185.220.101.9',
        ipCountry: 'NL',
        isProxyOrVpn: true,
        deviceFingerprint: 'dfp_tor',
        userAgent: 'HeadlessChrome',
        billingCountry: 'DE',
        shippingCountry: 'US',
        shippingAddressMatchesBilling: false,
        emailDomain: 'tempmail.com',
        isDisposableEmail: true,
      },
      createdAt: new Date().toISOString(),
    };

    // Save as BLOCKED
    dbService.saveTransaction(blockedTx, 'BLOCKED', undefined, 'PAYPAL_SANDBOX');

    // Attempt capture
    const res = await fetch(`${baseUrl}/api/paypal/capture-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paypalOrderId: 'PAYPAL-FAKE-12345',
        localOrderId: blockedOrderId,
      }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Payment Capture Refused');
    expect(body.message).toContain('BLOCKED');

    const check = dbService.getTransaction(blockedOrderId);
    expect(check?.paymentStatus).toBe('BLOCKED');
    expect(check?.paypalCaptureId).toBeUndefined();
  });

  // TEST 6: Capture without approval is rejected
  it('TEST 6: Capture without approval is rejected', async () => {
    const unapprovedOrderId = `TEST-6-UNAPPROVED-${Date.now()}`;
    const unapprovedTx: TransactionData = {
      orderId: unapprovedOrderId,
      amount: 75.00,
      currency: 'USD',
      customer: { name: 'Pending Approver', email: 'pending@example.com' },
      items: [{ id: '1', name: 'Software License', price: 75, quantity: 1 }],
      telemetry: {
        ipAddress: '198.51.100.22',
        ipCountry: 'US',
        isProxyOrVpn: false,
        deviceFingerprint: 'dfp_clean',
        userAgent: 'Chrome',
        billingCountry: 'US',
        shippingCountry: 'US',
        shippingAddressMatchesBilling: true,
        emailDomain: 'example.com',
        isDisposableEmail: false,
      },
      createdAt: new Date().toISOString(),
    };

    // Set order with unapproved marker
    dbService.saveTransaction(unapprovedTx, 'PENDING', 'PAYPAL-UNAPPROVED-ORDER-99', 'PAYPAL_SANDBOX');

    const res = await fetch(`${baseUrl}/api/paypal/capture-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paypalOrderId: 'PAYPAL-UNAPPROVED-ORDER-99',
        localOrderId: unapprovedOrderId,
      }),
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe('Order Not Approved');
    expect(body.issue).toBe('ORDER_NOT_APPROVED');

    const check = dbService.getTransaction(unapprovedOrderId);
    expect(check?.paymentStatus).not.toBe('CAPTURED');
  });

  // TEST 7: Capture of approved order succeeds and updates database
  it('TEST 7: Capture of approved order succeeds and updates database', async () => {
    const approvedOrderId = `TEST-7-APPROVED-${Date.now()}`;
    const tx: TransactionData = {
      orderId: approvedOrderId,
      amount: 65.00,
      currency: 'USD',
      customer: { name: 'Approved Buyer', email: 'approved@example.com' },
      items: [{ id: '1', name: 'Security Key', price: 65, quantity: 1 }],
      telemetry: {
        ipAddress: '198.51.100.5',
        ipCountry: 'US',
        isProxyOrVpn: false,
        deviceFingerprint: 'dfp_clean',
        userAgent: 'Safari',
        billingCountry: 'US',
        shippingCountry: 'US',
        shippingAddressMatchesBilling: true,
        emailDomain: 'example.com',
        isDisposableEmail: false,
      },
      createdAt: new Date().toISOString(),
    };

    // Create order
    const createRes = await fetch(`${baseUrl}/api/paypal/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction: tx }),
    });
    expect(createRes.status).toBe(200);
    const createBody = await createRes.json();

    // Capture approved order
    const captureRes = await fetch(`${baseUrl}/api/paypal/capture-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paypalOrderId: createBody.paypalOrderId,
        localOrderId: approvedOrderId,
      }),
    });

    expect(captureRes.status).toBe(200);
    const captureBody = await captureRes.json();
    expect(captureBody.success).toBe(true);
    expect(captureBody.status).toBe('CAPTURED');
    expect(captureBody.captureId).toBeDefined();

    const check = dbService.getTransaction(approvedOrderId);
    expect(check?.paymentStatus).toBe('CAPTURED');
    expect(check?.paypalCaptureId).toBe(captureBody.captureId);

    const logs = dbService.getAuditLogs(approvedOrderId);
    expect(logs.some((l) => l.action === 'PAYMENT_CAPTURED')).toBe(true);
  });

  // TEST 8: Duplicate capture is handled idempotently
  it('TEST 8: Duplicate capture is handled idempotently', async () => {
    const dupOrderId = `TEST-8-DUP-${Date.now()}`;
    const tx: TransactionData = {
      orderId: dupOrderId,
      amount: 100.00,
      currency: 'USD',
      customer: { name: 'Idempotency User', email: 'idempotent@example.com' },
      items: [{ id: '1', name: 'Item', price: 100, quantity: 1 }],
      telemetry: {
        ipAddress: '198.51.100.1',
        ipCountry: 'US',
        isProxyOrVpn: false,
        deviceFingerprint: 'dfp_clean',
        userAgent: 'Safari',
        billingCountry: 'US',
        shippingCountry: 'US',
        shippingAddressMatchesBilling: true,
        emailDomain: 'example.com',
        isDisposableEmail: false,
      },
      createdAt: new Date().toISOString(),
    };

    const createRes = await fetch(`${baseUrl}/api/paypal/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction: tx }),
    });
    const createBody = await createRes.json();

    // 1st Capture
    const cap1 = await fetch(`${baseUrl}/api/paypal/capture-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paypalOrderId: createBody.paypalOrderId,
        localOrderId: dupOrderId,
      }),
    });
    expect(cap1.status).toBe(200);
    const cap1Body = await cap1.json();

    // 2nd Capture (Duplicate attempt)
    const cap2 = await fetch(`${baseUrl}/api/paypal/capture-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paypalOrderId: createBody.paypalOrderId,
        localOrderId: dupOrderId,
      }),
    });

    expect(cap2.status).toBe(409);
    const cap2Body = await cap2.json();
    expect(cap2Body.error).toBe('Transaction already captured');
    expect(cap2Body.captureId).toBe(cap1Body.captureId);
    expect(cap2Body.paymentStatus).toBe('CAPTURED');
  });

  // TEST 9: Buyer cancellation is handled gracefully
  it('TEST 9: Buyer cancellation is handled gracefully', async () => {
    const cancelOrderId = `TEST-9-CANCEL-${Date.now()}`;
    const tx: TransactionData = {
      orderId: cancelOrderId,
      amount: 45.00,
      currency: 'USD',
      customer: { name: 'Changed Mind', email: 'cancel@example.com' },
      items: [{ id: '1', name: 'Item', price: 45, quantity: 1 }],
      telemetry: {
        ipAddress: '198.51.100.1',
        ipCountry: 'US',
        isProxyOrVpn: false,
        deviceFingerprint: 'dfp_clean',
        userAgent: 'Safari',
        billingCountry: 'US',
        shippingCountry: 'US',
        shippingAddressMatchesBilling: true,
        emailDomain: 'example.com',
        isDisposableEmail: false,
      },
      createdAt: new Date().toISOString(),
    };

    await fetch(`${baseUrl}/api/paypal/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction: tx }),
    });

    const cancelRes = await fetch(`${baseUrl}/api/paypal/cancel-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        localOrderId: cancelOrderId,
        reason: 'Buyer cancelled during PayPal approval flow',
      }),
    });

    expect(cancelRes.status).toBe(200);
    const cancelBody = await cancelRes.json();
    expect(cancelBody.status).toBe('CANCELLED');
    expect(cancelBody.success).toBe(true);

    const check = dbService.getTransaction(cancelOrderId);
    expect(check?.paymentStatus).toBe('CANCELLED');

    const logs = dbService.getAuditLogs(cancelOrderId);
    expect(logs.some((l) => l.action === 'BUYER_CANCELLED')).toBe(true);
  });

  // TEST 10: Audit log records all lifecycle events
  it('TEST 10: Audit log records all lifecycle events', () => {
    const allLogs = dbService.getAuditLogs();
    expect(allLogs.length).toBeGreaterThan(0);

    const actions = new Set(allLogs.map((l) => l.action));

    expect(actions.has('RISK_ASSESSED')).toBe(true);
    expect(actions.has('ORDER_CREATED')).toBe(true);
    expect(actions.has('PAYMENT_BLOCKED')).toBe(true);
    expect(actions.has('REVIEW_HELD')).toBe(true);
    expect(actions.has('PAYMENT_CAPTURED')).toBe(true);
    expect(actions.has('BUYER_CANCELLED')).toBe(true);

    // Validate structure of audit records
    for (const log of allLogs.slice(0, 10)) {
      expect(log.id).toBeDefined();
      expect(log.transactionId).toBeDefined();
      expect(log.timestamp).toBeDefined();
      expect(log.actor).toBeDefined();
      expect(log.policyVersion).toBeDefined();
      expect(typeof log.details).toBe('object');
    }
  });
});
