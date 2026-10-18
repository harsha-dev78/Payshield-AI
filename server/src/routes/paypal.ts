import { Router, Request, Response } from 'express';
import { paypalClient } from '../services/paypalClient.js';
import { dbService } from '../db/database.js';
import { riskEngine } from '../engine/explainability.js';
import { CONFIG } from '../config.js';
import { TransactionData } from '../types/index.js';

export const paypalRouter = Router();

// GET /api/paypal/status - Safe configuration inspector
paypalRouter.get('/status', (req: Request, res: Response) => {
  const isMock = paypalClient.isMockConfigured();
  res.json({
    mode: isMock ? 'SANDBOX_MOCK_SIMULATOR' : 'LIVE_PAYPAL_SANDBOX',
    apiBase: CONFIG.PAYPAL.API_BASE,
    clientIdConfigured: !isMock,
    clientSecretConfigured: !isMock,
    environment: 'sandbox',
    riskEngineActive: true,
    policyVersion: CONFIG.RISK.POLICY_VERSION,
  });
});

// POST /api/paypal/create-order - Enforces risk gate before PayPal order creation
paypalRouter.post('/create-order', async (req: Request, res: Response) => {
  try {
    const { transaction } = req.body as { transaction: TransactionData };

    if (!transaction || !transaction.orderId || !transaction.amount) {
      return res.status(400).json({ error: 'Missing transaction data or amount' });
    }

    // Step 1: Execute server-side risk assessment FIRST
    const assessment = riskEngine.assess(transaction);
    dbService.saveTransaction(transaction, assessment.tier === 'BLOCK' ? 'BLOCKED' : 'PENDING');
    dbService.saveRiskAssessment(assessment);

    dbService.logAudit(
      transaction.orderId,
      'RISK_ASSESSED',
      'SYSTEM_RISK_ENGINE',
      {
        score: assessment.overallScore,
        tier: assessment.tier,
        gateAction: assessment.tier === 'BLOCK' ? 'CHECKOUT_PREVENTED' : 'CHECKOUT_PERMITTED',
      },
      assessment.policyVersion
    );

    // Step 2: Enforce security policy - Refuse checkout order creation if High Risk
    if (assessment.tier === 'BLOCK') {
      dbService.logAudit(
        transaction.orderId,
        'PAYMENT_BLOCKED',
        'SYSTEM_RISK_ENGINE',
        {
          reason: 'Severe risk threshold violation. Order creation rejected by PayShield policy.',
          riskScore: assessment.overallScore,
        },
        assessment.policyVersion
      );

      return res.status(403).json({
        error: 'Order Blocked by Risk Policy',
        message: 'This transaction triggered critical security anomalies and cannot be processed automatically.',
        assessment,
      });
    }

    // Step 3: Create order on PayPal Sandbox API using secure server-side credentials
    const paypalOrder = await paypalClient.createOrder(
      transaction.orderId,
      transaction.amount,
      transaction.currency || 'USD',
      `PayShield Order ${transaction.orderId}`
    );

    // Update SQLite with PayPal order ID
    dbService.saveTransaction(transaction, 'PENDING', paypalOrder.id);
    dbService.logAudit(
      transaction.orderId,
      'ORDER_CREATED',
      'PAYPAL_GATEWAY',
      {
        paypalOrderId: paypalOrder.id,
        status: paypalOrder.status,
      },
      assessment.policyVersion
    );

    res.json({
      paypalOrderId: paypalOrder.id,
      localOrderId: transaction.orderId,
      assessment,
      status: paypalOrder.status,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'PayPal Order Creation Failed', details: error.message });
  }
});

// POST /api/paypal/capture-order - Captures payment and updates audit trail
paypalRouter.post('/capture-order', async (req: Request, res: Response) => {
  try {
    const { paypalOrderId, localOrderId } = req.body as { paypalOrderId: string; localOrderId: string };

    if (!paypalOrderId || !localOrderId) {
      return res.status(400).json({ error: 'Missing paypalOrderId or localOrderId' });
    }

    const existingTx = dbService.getTransaction(localOrderId);
    if (!existingTx) {
      return res.status(404).json({ error: 'Local transaction record not found' });
    }

    // Guard against duplicate captures
    if (existingTx.paymentStatus === 'CAPTURED') {
      return res.status(400).json({
        error: 'Transaction already captured',
        orderId: localOrderId,
        captureId: existingTx.paypalCaptureId,
      });
    }

    // Execute capture on PayPal Sandbox
    const captureResult = await paypalClient.captureOrder(paypalOrderId);

    if (captureResult.status === 'COMPLETED') {
      dbService.updatePaymentStatus(localOrderId, 'CAPTURED', captureResult.captureId);

      dbService.logAudit(
        localOrderId,
        'PAYMENT_CAPTURED',
        'PAYPAL_GATEWAY',
        {
          paypalOrderId,
          captureId: captureResult.captureId,
          amount: existingTx.amount,
          currency: existingTx.currency,
        }
      );

      res.json({
        success: true,
        orderId: localOrderId,
        paypalOrderId,
        captureId: captureResult.captureId,
        status: 'CAPTURED',
        message: 'Payment successfully captured in PayPal Sandbox and logged in PayShield audit trail.',
      });
    } else {
      res.status(400).json({
        success: false,
        orderId: localOrderId,
        paypalOrderId,
        status: captureResult.status,
        message: 'PayPal capture returned non-completed status.',
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'PayPal Capture Failed', details: error.message });
  }
});
