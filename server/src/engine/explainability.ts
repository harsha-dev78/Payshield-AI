import { 
  TransactionData, 
  RiskAssessment, 
  RiskSignal, 
  RiskTier, 
  SignalCategory,
  CounterfactualSuggestion 
} from '../types/index.js';
import { DETERMINISTIC_RULES } from './rules.js';
import { CONFIG } from '../config.js';

export class ExplainableRiskEngine {
  private policyVersion: string;
  private allowThreshold: number;
  private reviewThreshold: number;

  constructor() {
    this.policyVersion = CONFIG.RISK.POLICY_VERSION;
    this.allowThreshold = CONFIG.RISK.ALLOW_THRESHOLD;
    this.reviewThreshold = CONFIG.RISK.REVIEW_THRESHOLD;
  }

  public assess(tx: TransactionData): RiskAssessment {
    const signals: RiskSignal[] = [];
    let rawScore = 15; // Baseline merchant baseline risk for e-commerce

    // Evaluate each deterministic rule
    for (const rule of DETERMINISTIC_RULES) {
      const result = rule.evaluate(tx);
      if (result && result.triggered) {
        signals.push({
          id: rule.id,
          name: rule.name,
          category: rule.category,
          severity: rule.severity,
          scoreContribution: result.contribution,
          observedFact: result.fact,
          inferenceReason: result.reason,
          isModelPrediction: false,
        });
        rawScore += result.contribution;
      }
    }

    // Bound score between 0 and 100
    const overallScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    // Determine Tier based on configured policy thresholds
    let tier: RiskTier = 'ALLOW';
    if (overallScore > this.reviewThreshold) {
      tier = 'BLOCK';
    } else if (overallScore >= this.allowThreshold) {
      tier = 'REVIEW';
    }

    // Calculate Data Confidence (0.0 to 1.0) and identify missing information
    const missingInformation: string[] = [];
    let fieldsPresent = 0;
    const requiredChecks = [
      { check: !!tx.customer.phone, name: 'Customer phone number' },
      { check: !!tx.telemetry.deviceFingerprint, name: 'Browser hardware fingerprint' },
      { check: tx.telemetry.accountAgeDays !== undefined, name: 'Customer account creation age' },
      { check: !!tx.telemetry.billingCountry, name: 'Verified billing statement country' },
      { check: !!tx.telemetry.ipCountry, name: 'IP geolocation coordinates' },
    ];

    for (const item of requiredChecks) {
      if (item.check) {
        fieldsPresent++;
      } else {
        missingInformation.push(item.name);
      }
    }
    const confidence = parseFloat((fieldsPresent / requiredChecks.length).toFixed(2));

    // Aggregate category weighted impact
    const categoryTotals: Record<SignalCategory, number> = {
      GEOGRAPHY: 0,
      VELOCITY: 0,
      BEHAVIORAL: 0,
      FINANCIAL: 0,
      NETWORK: 0,
    };

    for (const sig of signals) {
      categoryTotals[sig.category] += sig.scoreContribution;
    }

    const factors = Object.entries(categoryTotals)
      .filter(([_, impact]) => impact !== 0)
      .map(([cat, impact]) => ({
        category: cat as SignalCategory,
        weightedImpact: impact,
        description: impact > 0 
          ? `Elevated risk detected in ${cat.toLowerCase()} telemetry (+${impact} pts)`
          : `Positive trust attributes observed in ${cat.toLowerCase()} (${impact} pts)`,
      }));

    // Generate counterfactual recommendations: "What Would Change This Decision?"
    const counterfactuals: CounterfactualSuggestion[] = [];

    if (signals.some((s) => s.id === 'PROXY_VPN_DETECTED')) {
      counterfactuals.push({
        condition: 'Shopper completes checkout over verified residential IP or cellular connection (no VPN)',
        potentialScoreImpact: -22,
        rationale: 'Eliminates anonymous network masking, confirming true physical origin.',
      });
    }

    if (signals.some((s) => s.id === 'GEO_IP_MISMATCH')) {
      counterfactuals.push({
        condition: 'Buyer provides verified matching residential delivery and billing documentation',
        potentialScoreImpact: -25,
        rationale: 'Confirms authorized intent for cross-border or overseas shipping.',
      });
    }

    if (signals.some((s) => s.id === 'HIGH_VELOCITY_FAILURES')) {
      counterfactuals.push({
        condition: 'Buyer passes 2-factor authentication / PayPal 3D-Secure challenge with 0 new declines',
        potentialScoreImpact: -30,
        rationale: 'Proves human cardholder presence and halts automated credential abuse concerns.',
      });
    }

    if (signals.some((s) => s.id === 'DISPOSABLE_EMAIL')) {
      counterfactuals.push({
        condition: 'Buyer re-verifies order confirmation via a permanent, verified personal or work email',
        potentialScoreImpact: -18,
        rationale: 'Establishes persistent dispute contactability.',
      });
    }

    if (counterfactuals.length === 0) {
      counterfactuals.push({
        condition: 'Additional transaction history accumulated over 30 days',
        potentialScoreImpact: -10,
        rationale: 'Builds positive merchant trust baseline.',
      });
    }

    // Recommendation summary
    let action: 'PROCEED' | 'MANUAL_REVIEW' | 'HOLD_CHECKOUT' | 'REJECT' = 'PROCEED';
    let summary = 'Safe to capture via PayPal Sandbox.';
    let merchantGuidance = 'All observed signals are within normal parameters. Proceed with automated payment capture.';

    if (tier === 'BLOCK') {
      action = 'HOLD_CHECKOUT';
      summary = `Critical risk signals detected (Score: ${overallScore}/100). Automated capture suspended.`;
      merchantGuidance = 'Do not proceed with instant fulfillment. Strong indicators of automated testing or geographic mismatch. Recommend manual verification before any shipment.';
    } else if (tier === 'REVIEW') {
      action = 'MANUAL_REVIEW';
      summary = `Moderate anomalies detected (Score: ${overallScore}/100). Review recommended.`;
      merchantGuidance = 'Order exhibits elevated risk attributes. Buyer authentication (e.g. PayPal buyer protection or address confirmation) recommended prior to processing.';
    }

    return {
      transactionId: tx.orderId,
      overallScore,
      tier,
      confidence,
      signals,
      factors,
      missingInformation,
      counterfactuals,
      recommendation: {
        action,
        summary,
        merchantGuidance,
      },
      policyVersion: this.policyVersion,
      assessedAt: new Date().toISOString(),
    };
  }
}

export const riskEngine = new ExplainableRiskEngine();
