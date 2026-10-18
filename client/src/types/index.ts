export type RiskTier = 'ALLOW' | 'REVIEW' | 'BLOCK';
export type SignalCategory = 'GEOGRAPHY' | 'VELOCITY' | 'BEHAVIORAL' | 'FINANCIAL' | 'NETWORK';
export type SignalSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CustomerTelemetry {
  ipAddress: string;
  ipCountry: string;
  isProxyOrVpn: boolean;
  deviceFingerprint: string;
  userAgent: string;
  billingCountry: string;
  shippingCountry: string;
  shippingAddressMatchesBilling: boolean;
  emailDomain: string;
  isDisposableEmail: boolean;
  accountAgeDays?: number;
  ordersInLast24Hours?: number;
  failedAttemptsInLastHour?: number;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}

export interface TransactionData {
  orderId: string;
  amount: number;
  currency: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  items: OrderItem[];
  telemetry: CustomerTelemetry;
  createdAt: string;
  paymentStatus?: string;
  riskScore?: number | null;
  riskTier?: RiskTier | 'UNASSESSED';
  confidence?: number | null;
  paypalOrderId?: string;
  paypalCaptureId?: string;
}

export interface RiskSignal {
  id: string;
  name: string;
  category: SignalCategory;
  severity: SignalSeverity;
  scoreContribution: number;
  observedFact: string;
  inferenceReason: string;
  isModelPrediction?: boolean;
}

export interface CounterfactualSuggestion {
  condition: string;
  potentialScoreImpact: number;
  rationale: string;
}

export interface RiskAssessment {
  transactionId: string;
  overallScore: number;
  tier: RiskTier;
  confidence: number;
  signals: RiskSignal[];
  factors: {
    category: SignalCategory;
    weightedImpact: number;
    description: string;
  }[];
  missingInformation: string[];
  counterfactuals: CounterfactualSuggestion[];
  recommendation: {
    action: 'PROCEED' | 'MANUAL_REVIEW' | 'HOLD_CHECKOUT' | 'REJECT';
    summary: string;
    merchantGuidance: string;
  };
  policyVersion: string;
  assessedAt: string;
}

export interface AuditRecord {
  id: string;
  transactionId: string;
  timestamp: string;
  action: 'RISK_ASSESSED' | 'ORDER_CREATED' | 'BUYER_APPROVED' | 'PAYMENT_CAPTURED' | 'PAYMENT_BLOCKED' | 'MERCHANT_OVERRIDE';
  actor: 'SYSTEM_RISK_ENGINE' | 'PAYPAL_GATEWAY' | 'MERCHANT_ADMIN' | 'BUYER';
  details: Record<string, any>;
  policyVersion: string;
}

export interface MLPredictionResult {
  modelType: string;
  modelVersion: string;
  fraudProbability: number;
  predictedTier: RiskTier;
  modelConfidence: number;
  topFeatureWeights: { feature: string; weight: number; impact: 'INCREASE_RISK' | 'DECREASE_RISK' }[];
  groundedExplanation: string;
}

export interface SystemStatus {
  status: string;
  name: string;
  version: string;
  policyVersion: string;
  database: string;
  environment: string;
  timestamp: string;
}

