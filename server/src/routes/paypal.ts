import { Router, Request, Response } from 'express';
import { paypalClient, PayPalError } from '../services/paypalClient.js';
import { dbService } from '../db/database.js';
import { riskEngine } from '../engine/explainability.js';
import { CONFIG } from '../config.js';
import { TransactionData } from '../types/index.js';
import { validateTransactionIntegrity } from '../specs/transactionSchema.js';

export const paypalRouter = Router();

// GET /api/paypal/status, /health, /credentials-status - Secure PayPal configuration & live authentication health check
const handlePayPalHealthCheck = async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const authCheck = await paypalClient.verifyAuthentication();

  res.json({
    status: authCheck.authenticated ? 'healthy' : 'degraded',
    mode: authCheck.mode,
    apiBase: CONFIG.PAYPAL.API_BASE,
    authenticated: authCheck.authenticated,
    authLatencyMs: authCheck.authLatencyMs,
    authError: authCheck.error,
    clientIdConfigured: authCheck.clientIdConfigured,
    clientSecretConfigured: authCheck.clientSecretConfigured,
    clientIdKey: authCheck.clientIdKey,
    clientSecretKey: authCheck.clientSecretKey,
    detectedPayPalKeys: authCheck.detectedPayPalKeys,
    environment: CONFIG.PAYPAL.ENVIRONMENT,
    riskEngineActive: true,
    policyVersion: CONFIG.RISK.POLICY_VERSION,
    reason: authCheck.reason,
    verifiedAt: new Date().toISOString(),
  });
};

paypalRouter.get('/status', handlePayPalHealthCheck);
paypalRouter.get('/health', handlePayPalHealthCheck);
paypalRouter.get('/credentials-status', handlePayPalHealthCheck);

// POST /api/paypal/create-order - Enforces risk gate before PayPal order creation
paypalRouter.post('/create-order', async (req: Request, res: Response) => {
  try {
    const { transaction: rawTransaction, returnUrl: clientReturnUrl, cancelUrl: clientCancelUrl } = req.body as {
      transaction: unknown;
      returnUrl?: string;
      cancelUrl?: string;
    };

    // Server-Side Transaction Integrity Validation
    const validation = validateTransactionIntegrity(rawTransaction);
    if (!validation.valid || !validation.data) {
      return res.status(400).json({
        error: 'Transaction Validation Failed',
        message: validation.error || 'Invalid transaction payload.',
      });
    }

    const transaction = validation.data as TransactionData;

    const isMock = paypalClient.isMockConfigured();
    const paymentSource = isMock ? 'MOCK_SIMULATOR' : 'PAYPAL_SANDBOX';

    // Step 1: Execute server-side risk assessment FIRST (with Safe Failure Policy fallback support)
    const simulateFailure = req.headers['x-simulate-ai-failure'] === 'true';
    const assessment = simulateFailure
      ? riskEngine.safeFallbackAssessment(transaction, new Error('Simulated external AI service outage'))
      : riskEngine.assess(transaction);

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
    const creds = paypalClient.getCredentialsResolution();
    if (!creds.clientIdConfigured || !creds.clientSecretConfigured) {
      let specificMessage = '';
      if (!creds.clientIdConfigured && !creds.clientSecretConfigured) {
        specificMessage = 'Neither PayPal Client ID nor Client Secret was detected in Render environment variables. Expected: PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.';
      } else if (!creds.clientIdConfigured) {
        specificMessage = `PayPal Client ID is missing or placeholder, but Client Secret was found (via ${creds.clientSecretKey}). Please add PAYPAL_CLIENT_ID in Render.`;
      } else {
        specificMessage = `PayPal Client ID was found (via ${creds.clientIdKey}), but PayPal Client Secret is missing or placeholder. Please add PAYPAL_CLIENT_SECRET in Render.`;
      }

      console.warn(`[PayPal Credentials Diagnostic] Rejected order creation for ${transaction.orderId}:`, {
        clientIdConfigured: creds.clientIdConfigured,
        clientSecretConfigured: creds.clientSecretConfigured,
        clientIdKey: creds.clientIdKey,
        clientSecretKey: creds.clientSecretKey,
        detectedKeys: creds.detectedPayPalKeys,
      });

      dbService.saveTransaction(transaction, 'FAILED', undefined, 'UNCONFIGURED');
      return res.status(400).json({
        error: 'PayPal Sandbox Credentials Missing',
        message: specificMessage,
        issue: 'CREDENTIALS_MISSING',
        diagnostic: {
          clientIdConfigured: creds.clientIdConfigured,
          clientSecretConfigured: creds.clientSecretConfigured,
          clientIdKey: creds.clientIdKey,
          clientSecretKey: creds.clientSecretKey,
          detectedPayPalKeys: creds.detectedPayPalKeys,
        },
      });
    }

    dbService.saveTransaction(transaction, 'PENDING', undefined, 'PAYPAL_SANDBOX');
    dbService.saveRiskAssessment(assessment);

    dbService.logAudit(
      transaction.orderId,
      'RISK_ASSESSED',
      'SYSTEM_RISK_ENGINE',
      {
        score: assessment.overallScore,
        tier: assessment.tier,
        gateAction: 'CHECKOUT_PERMITTED',
        paymentSource: 'PAYPAL_SANDBOX',
      },
      assessment.policyVersion
    );

    // Determine return and cancel URLs dynamically
    const origin =
      (req.headers.origin as string) ||
      (req.headers.referer ? new URL(req.headers.referer).origin : 'http://localhost:5173');

    const returnUrl =
      clientReturnUrl ||
      `${origin}/?paypal_action=approved&localOrderId=${encodeURIComponent(transaction.orderId)}`;
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
    if (!approveLink) {
      throw new PayPalError('PayPal Sandbox API did not return an approval link.', 502, 'NO_APPROVE_LINK');
    }

    console.log(`[PayPal Sandbox] Order created successfully: PayPal ID ${paypalOrder.id} for local order ${transaction.orderId}`);

    // Update SQLite with genuine PayPal order ID & payment source
    dbService.saveTransaction(transaction, 'PENDING', paypalOrder.id, 'PAYPAL_SANDBOX');
    dbService.logAudit(
      transaction.orderId,
      'ORDER_CREATED',
      'PAYPAL_GATEWAY',
      {
        paypalOrderId: paypalOrder.id,
        status: paypalOrder.status,
        paymentSource: 'PAYPAL_SANDBOX',
        hasApproveLink: true,
      },
      assessment.policyVersion
    );

    res.json({
      paypalOrderId: paypalOrder.id,
      localOrderId: transaction.orderId,
      assessment,
      status: paypalOrder.status,
      approveUrl: approveLink,
      mode: 'PAYPAL_SANDBOX',
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

    if (
      !paypalOrderId ||
      typeof paypalOrderId !== 'string' ||
      !paypalOrderId.trim() ||
      !localOrderId ||
      typeof localOrderId !== 'string' ||
      !localOrderId.trim()
    ) {
      return res.status(400).json({ error: 'Missing or invalid paypalOrderId or localOrderId' });
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

