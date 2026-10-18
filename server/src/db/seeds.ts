import { dbService } from './database.js';
import { riskEngine } from '../engine/explainability.js';
import { TransactionData } from '../types/index.js';

export const SYNTHETIC_TRANSACTIONS: TransactionData[] = [
  {
    orderId: 'ORD-7102',
    amount: 89.50,
    currency: 'USD',
    customer: {
      name: 'Sarah Jenkins',
      email: 'sarah.jenkins@gmail.com',
      phone: '+1-555-019-4821',
    },
    items: [
      { id: 'item-101', name: 'Ergonomic Mechanical Keyboard', price: 89.50, quantity: 1, category: 'Electronics' }
    ],
    telemetry: {
      ipAddress: '198.51.100.42',
      ipCountry: 'US',
      isProxyOrVpn: false,
      deviceFingerprint: 'dfp_macbook_chrome_8fa9c',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      billingCountry: 'US',
      shippingCountry: 'US',
      shippingAddressMatchesBilling: true,
      emailDomain: 'gmail.com',
      isDisposableEmail: false,
      accountAgeDays: 140,
      ordersInLast24Hours: 1,
      failedAttemptsInLastHour: 0,
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    orderId: 'ORD-9430',
    amount: 199.99,
    currency: 'USD',
    customer: {
      name: 'Marcus Vance',
      email: 'm.vance@outlook.com',
      phone: '+1-555-014-9922',
    },
    items: [
      { id: 'item-204', name: 'Noise-Cancelling Wireless Headphones', price: 199.99, quantity: 1, category: 'Audio' }
    ],
    telemetry: {
      ipAddress: '203.0.113.19',
      ipCountry: 'US',
      isProxyOrVpn: true, // Commercial VPN used
      deviceFingerprint: 'dfp_win11_edge_3bc11',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      billingCountry: 'US',
      shippingCountry: 'US',
      shippingAddressMatchesBilling: false, // Alternate shipping address
      emailDomain: 'outlook.com',
      isDisposableEmail: false,
      accountAgeDays: 18,
      ordersInLast24Hours: 2,
      failedAttemptsInLastHour: 0,
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 52).toISOString(),
  },
  {
    orderId: 'ORD-3199',
    amount: 649.00,
    currency: 'USD',
    customer: {
      name: 'Alexei Ivanov',
      email: 'buyer991@tempmail.com', // Disposable email
    },
    items: [
      { id: 'item-501', name: 'Ultra-Wide Gaming Monitor 34"', price: 649.00, quantity: 1, category: 'Hardware' }
    ],
    telemetry: {
      ipAddress: '185.220.101.5',
      ipCountry: 'NL', // Netherlands IP
      isProxyOrVpn: true, // Known Tor/Proxy exit
      deviceFingerprint: 'dfp_linux_firefox_77ab1',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0',
      billingCountry: 'DE',
      shippingCountry: 'US', // Cross-border shipping
      shippingAddressMatchesBilling: false,
      emailDomain: 'tempmail.com',
      isDisposableEmail: true,
      accountAgeDays: 0, // Brand new account
      ordersInLast24Hours: 5,
      failedAttemptsInLastHour: 4, // Card-testing velocity!
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
  },
  {
    orderId: 'ORD-4412',
    amount: 45.00,
    currency: 'USD',
    customer: {
      name: 'Elena Rostova',
      email: 'elena.rostova@icloud.com',
      phone: '+1-555-018-3319',
    },
    items: [
      { id: 'item-109', name: 'Smart Home Security Sensor Kit', price: 45.00, quantity: 1, category: 'IoT' }
    ],
    telemetry: {
      ipAddress: '198.51.100.88',
      ipCountry: 'US',
      isProxyOrVpn: false,
      deviceFingerprint: 'dfp_iphone_safari_12ae4',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      billingCountry: 'US',
      shippingCountry: 'US',
      shippingAddressMatchesBilling: true,
      emailDomain: 'icloud.com',
      isDisposableEmail: false,
      accountAgeDays: 280,
      ordersInLast24Hours: 1,
      failedAttemptsInLastHour: 0,
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 130).toISOString(),
  },
  {
    orderId: 'ORD-5520',
    amount: 420.00,
    currency: 'USD',
    customer: {
      name: 'Devon Reed',
      email: 'devon.reed@proton.me',
    },
    items: [
      { id: 'item-801', name: 'Developer Portable Workstation Dock', price: 420.00, quantity: 1, category: 'Hardware' }
    ],
    telemetry: {
      ipAddress: '192.0.2.77',
      ipCountry: 'GB',
      isProxyOrVpn: false,
      deviceFingerprint: 'dfp_win11_chrome_90fd2',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      billingCountry: 'GB',
      shippingCountry: 'US', // Delivery overseas
      shippingAddressMatchesBilling: false,
      emailDomain: 'proton.me',
      isDisposableEmail: false,
      accountAgeDays: 3,
      ordersInLast24Hours: 1,
      failedAttemptsInLastHour: 1,
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
  }
];

export function seedSyntheticDataIfNeeded(): void {
  const existing = dbService.listTransactions(1, 0);
  if (existing.length > 0) return;

  console.log('🌱 Seeding initial synthetic transactions and audit records...');

  for (const tx of SYNTHETIC_TRANSACTIONS) {
    const assessment = riskEngine.assess(tx);
    const paymentStatus = assessment.tier === 'BLOCK' ? 'BLOCKED' : (assessment.tier === 'ALLOW' ? 'CAPTURED' : 'PENDING');
    const mockPaypalId = assessment.tier !== 'BLOCK' ? `PAYPAL-${tx.orderId}` : undefined;

    dbService.saveTransaction(tx, paymentStatus, mockPaypalId);
    dbService.saveRiskAssessment(assessment);

    // Initial audit entry
    dbService.logAudit(
      tx.orderId,
      'RISK_ASSESSED',
      'SYSTEM_RISK_ENGINE',
      {
        score: assessment.overallScore,
        tier: assessment.tier,
        signalsTriggered: assessment.signals.map((s) => s.id),
        actionTaken: assessment.recommendation.action,
      },
      assessment.policyVersion
    );

    if (paymentStatus === 'CAPTURED') {
      dbService.logAudit(
        tx.orderId,
        'PAYMENT_CAPTURED',
        'PAYPAL_GATEWAY',
        {
          paypalOrderId: mockPaypalId,
          captureId: `CAP-${tx.orderId}`,
          amount: tx.amount,
          currency: tx.currency,
        },
        assessment.policyVersion
      );
    } else if (paymentStatus === 'BLOCKED') {
      dbService.logAudit(
        tx.orderId,
        'PAYMENT_BLOCKED',
        'SYSTEM_RISK_ENGINE',
        {
          reason: 'Severe risk threshold violation. Auto-capture prevented.',
          score: assessment.overallScore,
        },
        assessment.policyVersion
      );
    }
  }

  console.log('✅ Synthetic benchmark transactions seeded successfully.');
}
