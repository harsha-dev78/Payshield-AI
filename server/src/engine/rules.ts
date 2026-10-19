import { TransactionData, RiskSignal, SignalCategory, SignalSeverity } from '../types/index.js';

export interface EvaluationRule {
  id: string;
  name: string;
  category: SignalCategory;
  severity: SignalSeverity;
  evaluate: (tx: TransactionData) => { triggered: boolean; contribution: number; fact: string; reason: string } | null;
}

const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'throwawaymail.com', 'guerrillamail.com', '10minutemail.com',
  'mailinator.com', 'sharklasers.com', 'yopmail.com', 'trashmail.com'
]);

export const DETERMINISTIC_RULES: EvaluationRule[] = [
  {
    id: 'GEO_IP_MISMATCH',
    name: 'IP & Delivery Country Discrepancy',
    category: 'GEOGRAPHY',
    severity: 'HIGH',
    evaluate: (tx) => {
      const ipCountry = (tx.telemetry.ipCountry || '').toUpperCase();
      const shippingCountry = (tx.telemetry.shippingCountry || '').toUpperCase();
      if (!ipCountry || !shippingCountry) return null;

      if (ipCountry !== shippingCountry) {
        return {
          triggered: true,
          contribution: 28,
          fact: `Observed IP country is ${ipCountry}, whereas destination shipping country is ${shippingCountry}.`,
          reason: 'Geographic divergence between origin connection and physical drop-off destination is a frequent indicator of compromised accounts or forwarding hubs.',
        };
      }
      return null;
    },
  },
  {
    id: 'PROXY_VPN_DETECTED',
    name: 'Anonymizing Network / Datacenter IP',
    category: 'NETWORK',
    severity: 'MEDIUM',
    evaluate: (tx) => {
      if (tx.telemetry.isProxyOrVpn) {
        return {
          triggered: true,
          contribution: 22,
          fact: `Connection IP ${tx.telemetry.ipAddress} resolves to a known commercial VPN, Tor node, or datacenter proxy.`,
          reason: 'Anonymizing proxy masking prevents accurate geographic attribution and obfuscates true user origin.',
        };
      }
      return null;
    },
  },
  {
    id: 'HIGH_VELOCITY_FAILURES',
    name: 'Rapid Failed Payment Velocity',
    category: 'VELOCITY',
    severity: 'CRITICAL',
    evaluate: (tx) => {
      const fails = tx.telemetry.failedAttemptsInLastHour || 0;
      if (fails >= 3) {
        return {
          triggered: true,
          contribution: 35,
          fact: `${fails} declined or failed checkout attempts detected from this fingerprint within the preceding 60 minutes.`,
          reason: 'High card-testing velocity patterns correlate strongly with automated credential stuffing or brute-force testing.',
        };
      }
      return null;
    },
  },
  {
    id: 'DISPOSABLE_EMAIL',
    name: 'Disposable / Ephemeral Email Inbox',
    category: 'BEHAVIORAL',
    severity: 'MEDIUM',
    evaluate: (tx) => {
      const domain = (tx.telemetry?.emailDomain || tx.customer?.email?.split('@')[1] || '').toLowerCase();
      if (tx.telemetry?.isDisposableEmail || DISPOSABLE_DOMAINS.has(domain)) {
        return {
          triggered: true,
          contribution: 18,
          fact: `Registered contact email uses an ephemeral domain: @${domain || 'unknown'}.`,
          reason: 'Temporary email services offer zero persistent identity, complicating chargeback contact and dispute resolution.',
        };
      }
      return null;
    },
  },
  {
    id: 'HIGH_VALUE_UNVERIFIED',
    name: 'Elevated Basket Value on Young Account',
    category: 'FINANCIAL',
    severity: 'HIGH',
    evaluate: (tx) => {
      const age = tx.telemetry.accountAgeDays ?? 0;
      if (tx.amount > 350 && age < 5) {
        return {
          triggered: true,
          contribution: 25,
          fact: `Order total is $${tx.amount.toFixed(2)}, placed by an account created ${age === 0 ? 'today' : `${age} days ago`}.`,
          reason: 'High-ticket purchases immediately upon account creation lack transactional history baseline.',
        };
      }
      return null;
    },
  },
  {
    id: 'BILLING_SHIPPING_MISMATCH',
    name: 'Billing vs Shipping Address Mismatch',
    category: 'GEOGRAPHY',
    severity: 'LOW',
    evaluate: (tx) => {
      if (tx.telemetry.shippingAddressMatchesBilling === false) {
        return {
          triggered: true,
          contribution: 12,
          fact: `Billing address (${tx.telemetry.billingCountry}) differs from delivery address (${tx.telemetry.shippingCountry}).`,
          reason: 'Delivery to third-party or alternate addresses increases risk of unauthorized card usage.',
        };
      }
      return null;
    },
  },
  // Positive trust signals (reduces risk score)
  {
    id: 'ESTABLISHED_HISTORY',
    name: 'Established Account History',
    category: 'BEHAVIORAL',
    severity: 'INFO',
    evaluate: (tx) => {
      const age = tx.telemetry.accountAgeDays ?? 0;
      const fails = tx.telemetry.failedAttemptsInLastHour || 0;
      if (age >= 90 && fails === 0) {
        return {
          triggered: true,
          contribution: -20,
          fact: `Account has been active for ${age} days with zero recorded payment failures.`,
          reason: 'Established account history with reliable checkout record strongly lowers risk.',
        };
      }
      return null;
    },
  },
  {
    id: 'DOMESTIC_CONSISTENCY',
    name: 'Harmonious Geographic Alignment',
    category: 'GEOGRAPHY',
    severity: 'INFO',
    evaluate: (tx) => {
      const ip = (tx.telemetry.ipCountry || '').toUpperCase();
      const bill = (tx.telemetry.billingCountry || '').toUpperCase();
      const ship = (tx.telemetry.shippingCountry || '').toUpperCase();
      if (ip && bill && ship && ip === bill && bill === ship && !tx.telemetry.isProxyOrVpn) {
        return {
          triggered: true,
          contribution: -15,
          fact: `IP (${ip}), Billing (${bill}), and Shipping (${ship}) originate from the same domestic territory on a residential connection.`,
          reason: 'Direct geographical cohesion without proxy masking indicates typical consumer checkout behavior.',
        };
      }
      return null;
    },
  },
];
