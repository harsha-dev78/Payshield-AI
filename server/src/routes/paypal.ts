import { Router, Request, Response } from 'express';
import { paypalClient, PayPalError } from '../services/paypalClient.js';
import { dbService } from '../db/database.js';
import { riskEngine } from '../engine/explainability.js';
import { CONFIG } from '../config.js';
import { TransactionData } from '../types/index.js';

export const paypalRouter = Router();

// GET /api/paypal/status - Safe configuration inspector
paypalRouter.get('/status', (req: Request, res: Response) => {
  const isMock = paypalClient.isMockConfigured();
  res.json({
    mode: isMock ? 'MOCK_SIMULATOR' : 'PAYPAL_SANDBOX',
    apiBase: CONFIG.PAYPAL.API_BASE,
    clientIdConfigured: !isMock,
    clientSecretConfigured: !isMock,
    environment: CONFIG.PAYPAL.ENVIRONMENT,
    riskEngineActive: true,
    policyVersion: CONFIG.RISK.POLICY_VERSION,
  });
});

// POST /api/paypal/create-order - Enforces risk gate before PayPal order creation
paypalRouter.post('/create-order', async (req: Request, res: Response) => {
  try {
    const { transaction, returnUrl: clientReturnUrl, cancelUrl: clientCancelUrl } = req.body as {
      transaction: TransactionData;
      returnUrl?: string;
      cancelUrl?: string;
    };

    if (!transaction || !transaction.orderId || !transaction.amount) {
      return res.status(400).json({ error: 'Missing transaction data or amount' });
    }

    const isMock = paypalClient.isMockConfigured();
    const paymentSource = isMock ? 'MOCK_SIMULATOR' : 'PAYPAL_SANDBOX';

    // Step 1: Execute server-side risk assessment FIRST
    const assessment = riskEngine.assess(transaction);

    // Step 2: Handle High Risk (BLOCK) -> Reject before contacting PayPal
    if (assessment.tier === 'BLOCK') {
      dbService.saveTransaction(transaction, 'BLOCKED', undefined, paymentSource);
      dbService.saveRiskAssessment(assessment);

      dbService.logAudit(
        transaction.orderId,
        'RISK_ASSESSED',
        'SYSTEM_RISK_ENGINE',
        {
          score: assessment.overallScore,
          tier: assessment.tier,
          gateAction: 'CHECKOUT_PREVENTED',
          paymentSource,
        },
        assessment.policyVersion
      );

      dbService.logAudit(
        transaction.orderId,
        'PAYMENT_BLOCKED',
        'SYSTEM_RISK_ENGINE',
        {
          reason: 'Severe risk threshold violation. Order creation rejected by PayShield pre-capture policy.',
          riskScore: assessment.overallScore,
          signals: assessment.signals.map((s) => s.id),
          paymentSource,
        },
        assessment.policyVersion
      );

      return res.status(403).json({
        error: 'Payment Blocked by Risk Policy',
        status: 'BLOCKED',
        message: 'Payment blocked by PayShield AI. The transaction exceeded the configured risk threshold. No PayPal order or payment was created.',
        assessment,
        paymentSource,
        noOrderCreated: true,
      });
    }

    // Step 3: Handle Medium Risk (REVIEW) -> Enforce review policy (withhold checkout)
    if (assessment.tier === 'REVIEW') {
      dbService.saveTransaction(transaction, 'PENDING_RISK_REVIEW', undefined, paymentSource);
      dbService.saveRiskAssessment(assessment);

      dbService.logAudit(
        transaction.orderId,
        'RISK_ASSESSED',
        'SYSTEM_RISK_ENGINE',
        {
          score: assessment.overallScore,
          tier: assessment.tier,
          gateAction: 'MERCHANT_REVIEW_REQUIRED',
          paymentSource,
        },
        assessment.policyVersion
      );

      dbService.logAudit(
        transaction.orderId,
        'REVIEW_HELD',
        'SYSTEM_RISK_ENGINE',
        {
          reason: 'Medium risk score (30-65). Order creation held pending merchant review.',
          riskScore: assessment.overallScore,
          signals: assessment.signals.map((s) => s.id),
          paymentSource,
        },
        assessment.policyVersion
      );

      return res.status(422).json({
        error: 'Review Policy Required',
        status: 'PENDING_RISK_REVIEW',
        message: 'Transaction flagged for manual merchant review. PayPal order creation is withheld until review policy approval.',
        assessment,
        paymentSource,
        noOrderCreated: true,
      });
    }

    // Step 4: Low Risk (ALLOW) -> Proceed with PayPal Order Creation
    dbService.saveTransaction(transaction, 'PENDING', undefined, paymentSource);
    dbService.saveRiskAssessment(assessment);

    dbService.logAudit(
      transaction.orderId,
      'RISK_ASSESSED',
      'SYSTEM_RISK_ENGINE',
      {
        score: assessment.overallScore,
        tier: assessment.tier,
        gateAction: 'CHECKOUT_PERMITTED',
        paymentSource,
      },
      assessment.policyVersion
    );

    // Determine return and cancel URLs dynamically
    const origin =
      (req.headers.origin as string) ||
      (req.headers.referer ? new URL(req.headers.referer).origin : 'http://localhost:5173');

    const returnUrl =
      clientReturnUrl ||
      `${origin}/?paypal_action=approved&token=${transaction.orderId}&localOrderId=${encodeURIComponent(transaction.orderId)}`;
    const cancelUrl =
      clientCancelUrl ||
      `${origin}/?paypal_action=cancelled&localOrderId=${encodeURIComponent(transaction.orderId)}`;

    // Create order on PayPal Sandbox API using secure server-side credentials
    const paypalOrder = await paypalClient.createOrder(
      transaction.orderId,
      transaction.amount,
      transaction.currency || 'USD',
      `PayShield Order ${transaction.orderId}`,
      returnUrl,
      cancelUrl
    );

    const approveLink = paypalOrder.links?.find((l: any) => l.rel === 'approve')?.href;

    // Update SQLite with PayPal order ID & payment source
    dbService.saveTransaction(transaction, 'PENDING', paypalOrder.id, paymentSource);
    dbService.logAudit(
      transaction.orderId,
      'ORDER_CREATED',
      'PAYPAL_GATEWAY',
      {
        paypalOrderId: paypalOrder.id,
        status: paypalOrder.status,
        paymentSource,
        hasApproveLink: Boolean(approveLink),
      },
      assessment.policyVersion
    );

    res.json({
      paypalOrderId: paypalOrder.id,
      localOrderId: transaction.orderId,
      assessment,
      status: paypalOrder.status,
      approveUrl: approveLink,
      mode: paymentSource,
      links: paypalOrder.links,
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({
      error: 'PayPal Order Creation Failed',
      message: error.message || 'Unable to create order on PayPal Sandbox.',
      issue: error.issue,
    });
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
      return res.status(404).json({ error: 'Local transaction record not found', orderId: localOrderId });
    }

    // Security Gate check: Never capture an order marked BLOCKED
    if (existingTx.paymentStatus === 'BLOCKED') {
      return res.status(403).json({
        error: 'Payment Capture Refused',
        message: 'This transaction was classified as High Risk (BLOCKED) and cannot be captured. No PayPal order or payment was authorized.',
        orderId: localOrderId,
      });
    }

    // Security Gate check: Never capture an order held in PENDING_RISK_REVIEW without merchant approval
    if (existingTx.paymentStatus === 'PENDING_RISK_REVIEW') {
      return res.status(403).json({
        error: 'Payment Capture Refused',
        message: 'This transaction is currently held in PENDING_RISK_REVIEW and cannot be captured without merchant review approval.',
        orderId: localOrderId,
      });
    }

    // Security Gate check: Never capture a CANCELLED transaction
    if (existingTx.paymentStatus === 'CANCELLED') {
      return res.status(400).json({
        error: 'Payment Capture Refused',
        message: 'This transaction was cancelled by the buyer and cannot be captured.',
        orderId: localOrderId,
      });
    }

    // Guard against duplicate captures
    if (existingTx.paymentStatus === 'CAPTURED') {
      return res.status(409).json({
        error: 'Transaction already captured',
        orderId: localOrderId,
        captureId: existingTx.paypalCaptureId,
        paymentStatus: 'CAPTURED',
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
          paymentSource: existingTx.paymentSource,
        }
      );

      res.json({
        success: true,
        orderId: localOrderId,
        paypalOrderId,
        captureId: captureResult.captureId,
        status: 'CAPTURED',
        paymentSource: existingTx.paymentSource,
        message: 'Payment successfully captured in PayPal Sandbox and logged in PayShield audit trail.',
      });
    } else {
      dbService.updatePaymentStatus(localOrderId, 'FAILED');
      dbService.logAudit(
        localOrderId,
        'PAYMENT_FAILED',
        'PAYPAL_GATEWAY',
        {
          paypalOrderId,
          status: captureResult.status,
          paymentSource: existingTx.paymentSource,
        }
      );

      res.status(400).json({
        success: false,
        orderId: localOrderId,
        paypalOrderId,
        status: captureResult.status,
        message: 'PayPal capture returned non-completed status.',
      });
    }
  } catch (error: any) {
    const isAlreadyCaptured =
      error.issue === 'ORDER_ALREADY_CAPTURED' ||
      (error.message && error.message.includes('ORDER_ALREADY_CAPTURED'));

    if (isAlreadyCaptured && req.body.localOrderId) {
      const existingTx = dbService.getTransaction(req.body.localOrderId);
      return res.status(409).json({
        error: 'Transaction already captured',
        orderId: req.body.localOrderId,
        captureId: existingTx?.paypalCaptureId,
        paymentStatus: 'CAPTURED',
      });
    }

    if (error.issue === 'ORDER_NOT_APPROVED') {
      return res.status(422).json({
        error: 'Order Not Approved',
        message: 'The buyer has not yet approved this payment on PayPal Sandbox. Please complete approval on PayPal first.',
        issue: error.issue,
        orderId: req.body.localOrderId,
      });
    }

    if (error.issue === 'INSTRUMENT_DECLINED') {
      if (req.body.localOrderId) {
        dbService.updatePaymentStatus(req.body.localOrderId, 'DECLINED');
        dbService.logAudit(req.body.localOrderId, 'PAYMENT_DECLINED', 'PAYPAL_GATEWAY', {
          paypalOrderId: req.body.paypalOrderId,
          reason: 'Instrument declined in PayPal Sandbox',
        });
      }
      return res.status(400).json({
        error: 'Payment Declined',
        message: 'The payment method was declined in PayPal Sandbox. Try another sandbox payment method.',
        issue: error.issue,
      });
    }

    const statusCode = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    res.status(statusCode).json({
      error: 'PayPal Capture Failed',
      message: error.message || 'Error occurred while capturing PayPal order.',
      issue: error.issue,
    });
  }
});

// POST /api/paypal/cancel-order - Safely handles cancellation by buyer
paypalRouter.post('/cancel-order', (req: Request, res: Response) => {
  try {
    const { localOrderId, paypalOrderId, reason } = req.body as {
      localOrderId: string;
      paypalOrderId?: string;
      reason?: string;
    };

    if (!localOrderId) {
      return res.status(400).json({ error: 'Missing localOrderId' });
    }

    const existingTx = dbService.getTransaction(localOrderId);
    if (!existingTx) {
      return res.status(404).json({ error: 'Local transaction record not found' });
    }

    if (existingTx.paymentStatus === 'CAPTURED') {
      return res.status(400).json({ error: 'Cannot cancel an already captured transaction' });
    }

    dbService.cancelTransaction(localOrderId);
    dbService.logAudit(
      localOrderId,
      'BUYER_CANCELLED',
      'BUYER',
      {
        paypalOrderId: paypalOrderId || existingTx.paypalOrderId,
        reason: reason || 'Buyer cancelled during PayPal Sandbox approval flow',
        paymentSource: existingTx.paymentSource,
      }
    );

    res.json({
      success: true,
      orderId: localOrderId,
      status: 'CANCELLED',
      message: 'Transaction successfully marked as cancelled.',
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to record cancellation', details: error.message });
  }
});

// GET /api/paypal/order/:id - Live inspection of PayPal order status
paypalRouter.get('/order/:id', async (req: Request, res: Response) => {
  try {
    const orderDetails = await paypalClient.getOrder(req.params.id);
    res.json(orderDetails);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      error: 'Failed to retrieve PayPal order details',
      message: error.message,
      issue: error.issue,
    });
  }
});

