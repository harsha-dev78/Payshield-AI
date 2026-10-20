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
  isSynthetic?: boolean;
}

export interface RiskSignal {
  id: string;
  name: string;
  category: SignalCategory;
  severity: SignalSeverity;
  scoreContribution: number; // Positive increases risk, negative decreases risk
  observedFact: string; // Factual observed telemetry
  inferenceReason: string; // Why this contributes to risk
  isModelPrediction?: boolean; // Distinguishes observed fact from ML prediction
}

export interface CounterfactualSuggestion {
  condition: string; // What would change the score
  potentialScoreImpact: number; // Estimated score change
  rationale: string; // Why this changes certainty
}

export interface RiskAssessment {
  transactionId: string;
  overallScore: number; // 0 - 100
  tier: RiskTier;
  confidence: number; // 0.0 - 1.0 based on data completeness
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
  actor: 'SYSTEM_RISK_ENGINE' | 'PAYPAL_GATEWAY' | 'MERCHANT_ADMIN' | 'BUYER' | 'GUEST_JUDGE';
  details: Record<string, unknown>;
  policyVersion: string;
}

export interface PayPalOrderResponse {
  id: string;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  links?: { href: string; rel: string; method: string }[];
}
