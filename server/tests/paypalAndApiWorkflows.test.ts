import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import { ExplainableRiskEngine } from '../src/engine/explainability.js';
import { dbService } from '../src/db/database.js';
import { TransactionData } from '../src/types/index.js';
import { app } from '../src/server.js';
import { paypalClient } from '../src/services/paypalClient.js';

describe('PayShield AI - End-to-End System Integration Suite (Tests A to J)', () => {
  const engine = new ExplainableRiskEngine();
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    // Mock PayPal capture API call for deterministic unit tests (per Phase 9 guidelines)
    vi.spyOn(paypalClient, 'captureOrder').mockImplementation(async (paypalOrderId: string) => {
      if (paypalOrderId === 'PAYPAL-DECLINED-CARD-99') {
        const error: any = new Error('Instrument declined by issuing bank');
        error.statusCode = 400;
        error.issue = 'INSTRUMENT_DECLINED';
        throw error;
      }
      return {
        success: true,
        captureId: `CAP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        status: 'COMPLETED',
        amount: '65.00',
        currency: 'USD',
      };
    });

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
    vi.restoreAllMocks();
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // ============================================================================
  // TEST A — Legitimate payment:
  // A low-risk transaction passes assessment and can proceed through PayPal Sandbox checkout.
  // ============================================================================
  it('TEST A — Legitimate payment: Low-risk transaction proceeds through PayPal Sandbox checkout', async () => {
    const normalTx: TransactionData = {
      orderId: `TEST-A-NORMAL-${Date.now()}`,
      amount: 65.00,
      currency: 'USD',
      customer: {
        name: 'Sarah Connor',
        email: 'sarah.connor@gmail.com',
        phone: '+1-555-019-3321',
      },
      items: [{ id: 'prod-101', name: 'Hardware Security Key (FIDO2)', price: 65.00, quantity: 1 }],
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

    // 1. Backend creates PayPal order after risk assessment
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

    // 2. Capture approved order
    const captureRes = await fetch(`${baseUrl}/api/paypal/capture-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paypalOrderId: body.paypalOrderId,
        localOrderId: normalTx.orderId,
      }),
    });

    expect(captureRes.status).toBe(200);
    const captureBody = await captureRes.json();
    expect(captureBody.success).toBe(true);
    expect(captureBody.status).toBe('CAPTURED');
    expect(captureBody.captureId).toBeDefined();

    const verifiedTx = dbService.getTransaction(normalTx.orderId);
    expect(verifiedTx?.paymentStatus).toBe('CAPTURED');
    expect(verifiedTx?.paypalCaptureId).toBe(captureBody.captureId);

    const logs = dbService.getAuditLogs(normalTx.orderId);
    expect(logs.some((l) => l.action === 'PAYMENT_CAPTURED')).toBe(true);
  }, 15000);

  // ============================================================================
  // TEST B — Suspicious transaction:
  // The backend blocks the attempt before PayPal order creation. No capture occurs.
  // ============================================================================
  it('TEST B — Suspicious transaction: Backend blocks attempt before PayPal order creation', async () => {
    const suspiciousTx: TransactionData = {
      orderId: `TEST-B-SUSPICIOUS-${Date.now()}`,
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
    expect(body.message).toContain('Payment blocked by PayShield AI');
    expect(body.noOrderCreated).toBe(true);
    expect(body.assessment.tier).toBe('BLOCK');
    expect(body.assessment.overallScore).toBeGreaterThanOrEqual(65);

    const savedTx = dbService.getTransaction(suspiciousTx.orderId);
    expect(savedTx).toBeDefined();
    expect(savedTx?.paymentStatus).toBe('BLOCKED');
    expect(savedTx?.paypalOrderId).toBeUndefined();

    // Verify capture is strictly rejected on blocked transactions
    const capRes = await fetch(`${baseUrl}/api/paypal/capture-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paypalOrderId: 'PAYPAL-FAKE-ATTACK-01',
        localOrderId: suspiciousTx.orderId,
      }),
    });

    expect(capRes.status).toBe(403);
    const capBody = await capRes.json();
    expect(capBody.error).toBe('Payment Capture Refused');

    const auditLogs = dbService.getAuditLogs(suspiciousTx.orderId);
    expect(auditLogs.some((l) => l.action === 'PAYMENT_BLOCKED')).toBe(true);
  });

  // ============================================================================
  // TEST C — Needs review:
  // The transaction cannot proceed until the configured review requirement is satisfied.
  // ============================================================================
  it('TEST C — Needs review: Order creation withheld until review requirement satisfied', async () => {
    const uncertainTx: TransactionData = {
      orderId: `TEST-C-REVIEW-${Date.now()}`,
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

    // Capture attempt must be refused without merchant review approval
    const capRes = await fetch(`${baseUrl}/api/paypal/capture-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paypalOrderId: 'PAYPAL-HELD-ORDER',
        localOrderId: uncertainTx.orderId,
      }),
    });
    expect(capRes.status).toBe(403);
    const capBody = await capRes.json();
    expect(capBody.error).toBe('Payment Capture Refused');

    // Merchant can override after manual review
    const overrideRes = await fetch(`${baseUrl}/api/orders/${uncertainTx.orderId}/override`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-actor-role': 'MERCHANT_ADMIN',
        'x-actor-name': 'Lead Fraud Analyst',
      },
      body: JSON.stringify({ action: 'ALLOW', notes: 'Customer identity verified by phone' }),
    });
    expect(overrideRes.status).toBe(200);

    const updatedTx = dbService.getTransaction(uncertainTx.orderId);
    expect(updatedTx?.paymentStatus).toBe('PENDING');

    const auditLogs = dbService.getAuditLogs(uncertainTx.orderId);
    expect(auditLogs.some((l) => l.action === 'MERCHANT_OVERRIDE')).toBe(true);
  });

  // ============================================================================
  // TEST D — Buyer cancellation:
  // The transaction is not marked completed.
  // ============================================================================
  it('TEST D — Buyer cancellation: Transaction recorded as cancelled and not completed', async () => {
    const cancelOrderId = `TEST-D-CANCEL-${Date.now()}`;
    const tx: TransactionData = {
      orderId: cancelOrderId,
      amount: 65.00,
      currency: 'USD',
      customer: { name: 'Buyer Cancelled', email: 'cancel.buyer@example.com' },
      items: [{ id: 'prod-101', name: 'Hardware Security Key (FIDO2)', price: 65.00, quantity: 1 }],
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
        reason: 'Buyer cancelled during PayPal Sandbox approval flow',
      }),
    });

    expect(cancelRes.status).toBe(200);
    const cancelBody = await cancelRes.json();
    expect(cancelBody.status).toBe('CANCELLED');
    expect(cancelBody.success).toBe(true);

    const check = dbService.getTransaction(cancelOrderId);
    expect(check?.paymentStatus).toBe('CANCELLED');
    expect(check?.paymentStatus).not.toBe('CAPTURED');

    // Attempting capture on cancelled transaction is refused
    const capRes = await fetch(`${baseUrl}/api/paypal/capture-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paypalOrderId: check?.paypalOrderId || 'PAYPAL-CANCELLED-ID',
        localOrderId: cancelOrderId,
      }),
    });
    expect(capRes.status).toBe(400);

    const logs = dbService.getAuditLogs(cancelOrderId);
    expect(logs.some((l) => l.action === 'BUYER_CANCELLED')).toBe(true);
  });

  // ============================================================================
  // TEST E — Payment capture failure:
  // The transaction is not falsely marked successful.
  // ============================================================================
  it('TEST E — Payment capture failure: Declined payment is not marked successful', async () => {
    const declinedOrderId = `TEST-E-DECLINED-${Date.now()}`;
    const tx: TransactionData = {
      orderId: declinedOrderId,
      amount: 65.00,
      currency: 'USD',
      customer: { name: 'Declined Buyer', email: 'declined@example.com' },
      items: [{ id: 'prod-101', name: 'Hardware Security Key (FIDO2)', price: 65.00, quantity: 1 }],
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

    // Save initial transaction
    dbService.saveTransaction(tx, 'PENDING', 'PAYPAL-DECLINED-CARD-99', 'PAYPAL_SANDBOX');

    // Capture attempt encounters instrument decline
    const captureRes = await fetch(`${baseUrl}/api/paypal/capture-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paypalOrderId: 'PAYPAL-DECLINED-CARD-99',
        localOrderId: declinedOrderId,
      }),
    });

    expect(captureRes.status).toBe(400);
    const body = await captureRes.json();
    expect(body.error).toBe('Payment Declined');
    expect(body.issue).toBe('INSTRUMENT_DECLINED');

    const check = dbService.getTransaction(declinedOrderId);
    expect(check?.paymentStatus).toBe('DECLINED');
    expect(check?.paymentStatus).not.toBe('CAPTURED');

    const logs = dbService.getAuditLogs(declinedOrderId);
    expect(logs.some((l) => l.action === 'PAYMENT_DECLINED')).toBe(true);
  });

  // ============================================================================
  // TEST F — Duplicate requests:
  // Repeated requests do not create duplicate captures or inconsistent records.
  // ============================================================================
  it('TEST F — Duplicate requests: Repeated captures are rejected with HTTP 409 idempotently', async () => {
    const dupOrderId = `TEST-F-DUP-${Date.now()}`;
    const tx: TransactionData = {
      orderId: dupOrderId,
      amount: 65.00,
      currency: 'USD',
      customer: { name: 'Idempotency Buyer', email: 'idempotent@example.com' },
      items: [{ id: 'prod-101', name: 'Hardware Security Key (FIDO2)', price: 65.00, quantity: 1 }],
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

    // 2nd Capture (Duplicate retry)
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

    const check = dbService.getTransaction(dupOrderId);
    expect(check?.paymentStatus).toBe('CAPTURED');
  });

  // ============================================================================
  // TEST G — Manipulated requests:
  // Modified prices, unauthorized capture requests, invalid order IDs, and forged payment statuses are rejected.
  // ============================================================================
  describe('TEST G — Manipulated requests', () => {
    it('G1: rejects modified catalog product prices (e.g. $499 firewall sent as $1.00)', async () => {
      const manipulatedPriceTx = {
        orderId: `TEST-G1-PRICE-${Date.now()}`,
        amount: 1.00,
        currency: 'USD',
        customer: { name: 'Attacker', email: 'attacker@fraud.com' },
        items: [{ id: 'prod-103', name: 'Micro Network Firewall', price: 1.00, quantity: 1 }], // Catalog price is $499.00
        telemetry: {
          ipAddress: '198.51.100.1',
          ipCountry: 'US',
          isProxyOrVpn: false,
          deviceFingerprint: 'dfp_clean',
          userAgent: 'Safari',
          billingCountry: 'US',
          shippingCountry: 'US',
          shippingAddressMatchesBilling: true,
          emailDomain: 'fraud.com',
          isDisposableEmail: false,
        },
        createdAt: new Date().toISOString(),
      };

      const res = await fetch(`${baseUrl}/api/paypal/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: manipulatedPriceTx }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Transaction Validation Failed');
      expect(body.message).toContain('Price manipulation detected');
    });

    it('G2: rejects mismatched total amount (items sum $65.00 but amount sent as $5.00)', async () => {
      const mismatchedAmountTx = {
        orderId: `TEST-G2-MISMATCH-${Date.now()}`,
        amount: 5.00, // Tampered total!
        currency: 'USD',
        customer: { name: 'Tamperer', email: 'tamper@test.com' },
        items: [{ id: 'prod-101', name: 'Hardware Security Key (FIDO2)', price: 65.00, quantity: 1 }],
        telemetry: {
          ipAddress: '198.51.100.1',
          ipCountry: 'US',
          isProxyOrVpn: false,
          deviceFingerprint: 'dfp_clean',
          userAgent: 'Safari',
          billingCountry: 'US',
          shippingCountry: 'US',
          shippingAddressMatchesBilling: true,
          emailDomain: 'test.com',
          isDisposableEmail: false,
        },
        createdAt: new Date().toISOString(),
      };

      const res = await fetch(`${baseUrl}/api/paypal/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: mismatchedAmountTx }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Transaction Validation Failed');
      expect(body.message).toContain('Amount manipulation detected');
    });

    it('G3: rejects invalid or negative quantities', async () => {
      const invalidQtyTx = {
        orderId: `TEST-G3-QTY-${Date.now()}`,
        amount: 65.00,
        currency: 'USD',
        customer: { name: 'Negative Qty', email: 'negative@test.com' },
        items: [{ id: 'prod-101', name: 'Hardware Security Key (FIDO2)', price: 65.00, quantity: -2 }],
        telemetry: {
          ipAddress: '198.51.100.1',
          ipCountry: 'US',
        },
      };

      const res = await fetch(`${baseUrl}/api/paypal/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: invalidQtyTx }),
      });

      expect(res.status).toBe(400);
    });

    it('G4: rejects forged client paymentStatus and enforces server authority', async () => {
      const forgedStatusTx = {
        orderId: `TEST-G4-FORGE-${Date.now()}`,
        amount: 65.00,
        currency: 'USD',
        customer: { name: 'Forging Attacker', email: 'forge@test.com' },
        items: [{ id: 'prod-101', name: 'Hardware Security Key (FIDO2)', price: 65.00, quantity: 1 }],
        telemetry: {
          ipAddress: '198.51.100.1',
          ipCountry: 'US',
          isProxyOrVpn: false,
          deviceFingerprint: 'dfp_clean',
          userAgent: 'Safari',
          billingCountry: 'US',
          shippingCountry: 'US',
          shippingAddressMatchesBilling: true,
          emailDomain: 'test.com',
          isDisposableEmail: false,
        },
        paymentStatus: 'CAPTURED', // Client attempting to forge CAPTURED status!
        paypalCaptureId: 'FORGED-CAPTURE-ID-999',
      };

      const res = await fetch(`${baseUrl}/api/paypal/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: forgedStatusTx }),
      });

      expect(res.status).toBe(200);
      const check = dbService.getTransaction(forgedStatusTx.orderId);
      // Backend must ignore forged client status and maintain PENDING
      expect(check?.paymentStatus).toBe('PENDING');
      expect(check?.paypalCaptureId).toBeUndefined();
    });

    it('G5: rejects unauthorized capture requests on non-existent or blank order IDs', async () => {
      const res = await fetch(`${baseUrl}/api/paypal/capture-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paypalOrderId: 'PAYPAL-NONEXISTENT',
          localOrderId: 'NONEXISTENT-ORDER-ID-999',
        }),
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toContain('not found');
    });
  });

  // ============================================================================
  // TEST H — AI service failure:
  // The application follows its configured safe failure policy.
  // ============================================================================
  it('TEST H — AI service failure: Safe failure policy is engaged and transaction is held for review', async () => {
    const tx: TransactionData = {
      orderId: `TEST-H-AI-FAIL-${Date.now()}`,
      amount: 65.00,
      currency: 'USD',
      customer: { name: 'Service Outage Buyer', email: 'buyer@example.com' },
      items: [{ id: 'prod-101', name: 'Hardware Security Key (FIDO2)', price: 65.00, quantity: 1 }],
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

    // Request with simulated AI service failure
    const res = await fetch(`${baseUrl}/api/paypal/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-simulate-ai-failure': 'true',
      },
      body: JSON.stringify({ transaction: tx }),
    });

    // Safe failure policy must NEVER automatically approve; it holds in REVIEW with 422
    expect(res.status).toBe(422);
    const body = await res.json();

    expect(body.status).toBe('PENDING_RISK_REVIEW');
    expect(body.assessment.tier).toBe('REVIEW');
    expect(body.assessment.overallScore).toBe(50);
    expect(body.assessment.confidence).toBe(0.0);
    expect(body.assessment.signals.some((s: any) => s.id === 'AI_SERVICE_UNAVAILABLE')).toBe(true);

    const check = dbService.getTransaction(tx.orderId);
    expect(check?.paymentStatus).toBe('PENDING_RISK_REVIEW');
  });

  // ============================================================================
  // TEST I — Database persistence:
  // Transactions and audit events remain available after application restart.
  // ============================================================================
  it('TEST I — Database persistence: Transactions, items, telemetry, and audit records persist in SQLite', () => {
    const persistId = `TEST-I-PERSIST-${Date.now()}`;
    const testTx: TransactionData = {
      orderId: persistId,
      amount: 149.99,
      currency: 'USD',
      customer: { name: 'Persistence Validator', email: 'persist@payshield.ai', phone: '+1-555-010-8833' },
      items: [{ id: 'prod-102', name: 'Encrypted NVMe SSD 1TB', price: 149.99, quantity: 1 }],
      telemetry: {
        ipAddress: '198.51.100.99',
        ipCountry: 'US',
        isProxyOrVpn: false,
        deviceFingerprint: 'dfp_persist_val',
        userAgent: 'Mozilla/5.0 Chrome',
        billingCountry: 'US',
        shippingCountry: 'US',
        shippingAddressMatchesBilling: true,
        emailDomain: 'payshield.ai',
        isDisposableEmail: false,
        accountAgeDays: 45,
        ordersInLast24Hours: 1,
        failedAttemptsInLastHour: 0,
      },
      createdAt: new Date().toISOString(),
    };

    const assessment = engine.assess(testTx);
    dbService.saveTransaction(testTx, 'PENDING', 'PAYPAL-PERSIST-123', 'PAYPAL_SANDBOX');
    dbService.saveRiskAssessment(assessment);
    dbService.logAudit(persistId, 'RISK_ASSESSED', 'SYSTEM_RISK_ENGINE', { score: assessment.overallScore });
    dbService.logAudit(persistId, 'PAYMENT_CAPTURED', 'PAYPAL_GATEWAY', { captureId: 'CAP-PERSIST-999' });

    // Retrieve and verify data integrity
    const retrievedTx = dbService.getTransaction(persistId);
    expect(retrievedTx).not.toBeNull();
    expect(retrievedTx?.orderId).toBe(persistId);
    expect(retrievedTx?.amount).toBe(149.99);
    expect(retrievedTx?.customer.email).toBe('persist@payshield.ai');
    expect(retrievedTx?.items[0].id).toBe('prod-102');
    expect(retrievedTx?.paymentSource).toBe('PAYPAL_SANDBOX');

    const retrievedAssessment = dbService.getRiskAssessment(persistId);
    expect(retrievedAssessment).not.toBeNull();
    expect(retrievedAssessment?.overallScore).toBe(assessment.overallScore);
    expect(retrievedAssessment?.tier).toBe(assessment.tier);

    const logs = dbService.getAuditLogs(persistId);
    expect(logs.length).toBe(2);
    expect(logs.some((l) => l.action === 'RISK_ASSESSED')).toBe(true);
    expect(logs.some((l) => l.action === 'PAYMENT_CAPTURED')).toBe(true);
  });

  // ============================================================================
  // TEST J — Dashboard consistency:
  // The UI displays the actual backend and database states.
  // ============================================================================
  it('TEST J — Dashboard consistency: Transactions list accurately reflects DB states and distinguishes sources', async () => {
    const res = await fetch(`${baseUrl}/api/orders?limit=100`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(Array.isArray(body.transactions)).toBe(true);
    expect(body.count).toBe(body.transactions.length);

    // Verify source classification
    const sources = new Set(body.transactions.map((t: any) => t.paymentSource));
    expect(sources.has('SYNTHETIC_BENCHMARK') || sources.has('MOCK_SIMULATOR') || sources.has('PAYPAL_SANDBOX')).toBe(true);

    // Verify each transaction record structure matches UI requirements
    for (const tx of body.transactions.slice(0, 5)) {
      expect(tx.orderId).toBeDefined();
      expect(tx.amount).toBeGreaterThan(0);
      expect(tx.paymentStatus).toBeDefined();
      expect(tx.paymentSource).toBeDefined();
      expect(tx.createdAt).toBeDefined();
    }
  });
});
