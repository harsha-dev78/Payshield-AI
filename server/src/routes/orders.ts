import { Router, Request, Response } from 'express';
import { dbService } from '../db/database.js';
import { riskEngine } from '../engine/explainability.js';
import { riskClassifier } from '../engine/classifier.js';
import { TransactionData } from '../types/index.js';


import { validateTransactionIntegrity } from '../specs/transactionSchema.js';

export const ordersRouter = Router();

// GET /api/orders - List transactions
ordersRouter.get('/', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const list = dbService.listTransactions(limit, offset);
    res.json({ transactions: list, count: list.length });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve transactions', details: error.message });
  }
});

// GET /api/orders/:id - Get specific transaction details
ordersRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const tx = dbService.getTransaction(req.params.id);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    const assessment = dbService.getRiskAssessment(req.params.id);
    let mlPrediction = null;
    if (assessment) {
      try {
        mlPrediction = riskClassifier.predict(tx, assessment);
      } catch (err: any) {
        console.error(`[Classifier] ML prediction error for ${req.params.id}:`, err);
        mlPrediction = {
          modelType: 'Lightweight Logistic Regression Ensemble (Safe Fallback)',
          modelVersion: 'v1.0.0-fallback',
          fraudProbability: assessment.overallScore / 100,
          predictedTier: assessment.tier,
          modelConfidence: assessment.confidence,
          topFeatureWeights: [],
          groundedExplanation: 'Machine learning prediction service was temporarily degraded. Deterministic rule baseline was safely maintained.',
        };
      }
    }
    res.json({ transaction: tx, assessment, mlPrediction });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve transaction details', details: error.message });
  }
});


// POST /api/orders/evaluate - Run risk evaluation on order payload
ordersRouter.post('/evaluate', (req: Request, res: Response) => {
  try {
    const validation = validateTransactionIntegrity(req.body);
    if (!validation.valid || !validation.data) {
      return res.status(400).json({
        error: 'Malformed transaction payload',
        message: validation.error || 'Missing or invalid orderId, amount, items, or telemetry.',
      });
    }

    const tx = validation.data as TransactionData;

    const simulateFailure = req.headers['x-simulate-ai-failure'] === 'true';
    const assessment = simulateFailure
      ? riskEngine.safeFallbackAssessment(tx, new Error('Simulated external AI service outage'))
      : riskEngine.assess(tx);

    const initialStatus = assessment.tier === 'BLOCK' ? 'BLOCKED' : (assessment.tier === 'REVIEW' ? 'PENDING_RISK_REVIEW' : 'PENDING');

    dbService.saveTransaction(tx, initialStatus);
    dbService.saveRiskAssessment(assessment);

    dbService.logAudit(
      tx.orderId,
      'RISK_ASSESSED',
      'SYSTEM_RISK_ENGINE',
      {
        score: assessment.overallScore,
        tier: assessment.tier,
        signalsTriggered: assessment.signals.map((s) => s.id),
        action: assessment.recommendation.action,
      },
      assessment.policyVersion
    );

    res.json({
      orderId: tx.orderId,
      assessment,
      status: initialStatus,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Evaluation failed', details: error.message });
  }
});

// POST /api/orders/:id/override - Merchant decision override
ordersRouter.post('/:id/override', (req: Request, res: Response) => {
  try {
    const { action, notes } = req.body as { action: 'ALLOW' | 'BLOCK'; notes?: string };
    const orderId = req.params.id;

    const tx = dbService.getTransaction(orderId);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const newStatus = action === 'ALLOW' ? 'PENDING' : 'BLOCKED';
    dbService.updatePaymentStatus(orderId, newStatus);

    const actorRole = (req.headers['x-actor-role'] as string) || 'MERCHANT_ADMIN';
    const actorName = (req.headers['x-actor-name'] as string) || (actorRole === 'MERCHANT_ADMIN' ? 'Merchant Administrator' : 'Demo Evaluator');
    const actor = actorRole === 'GUEST_JUDGE' ? 'GUEST_JUDGE' : 'MERCHANT_ADMIN';

    dbService.logAudit(
      orderId,
      'MERCHANT_OVERRIDE',
      actor,
      {
        priorStatus: tx.paymentStatus,
        newStatus,
        overrideAction: action,
        merchantNotes: notes || 'Manual merchant review decision',
        actingUser: actorName,
        authRole: actorRole,
      }
    );

    res.json({
      success: true,
      orderId,
      newStatus,
      message: `Transaction successfully updated to ${newStatus} via merchant override.`,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Override failed', details: error.message });
  }
});
