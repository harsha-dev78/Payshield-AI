import { CONFIG } from '../config.js';

export interface PayPalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface PayPalOrderDetails {
  id: string;
  status: string;
  intent?: string;
  purchase_units?: any[];
  links?: { href: string; rel: string; method: string }[];
}

export class PayPalError extends Error {
  public statusCode: number;
  public issue?: string;
  public details?: any;

  constructor(message: string, statusCode: number, issue?: string, details?: any) {
    super(message);
    this.name = 'PayPalError';
    this.statusCode = statusCode;
    this.issue = issue;
    this.details = details;
  }
}

export class PayPalClient {
  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  private get clientId(): string {
    return CONFIG.PAYPAL.CLIENT_ID || '';
  }

  private get clientSecret(): string {
    return CONFIG.PAYPAL.CLIENT_SECRET || '';
  }

  public get apiBase(): string {
    return CONFIG.PAYPAL.API_BASE || 'https://api-m.sandbox.paypal.com';
  }

  public isMockConfigured(): boolean {
    const id = this.clientId.trim();
    const secret = this.clientSecret.trim();

    const mockPlaceholders = new Set([
      '',
      'your_sandbox_client_id_here',
      'your_paypal_sandbox_client_id_here',
      'sandbox_mock_client_id',
      'your_client_id',
    ]);

    const mockSecretPlaceholders = new Set([
      '',
      'your_sandbox_client_secret_here',
      'your_paypal_sandbox_client_secret_here',
      'sandbox_mock_client_secret',
      'your_client_secret',
    ]);

    return mockPlaceholders.has(id) || mockSecretPlaceholders.has(secret);
  }

  public async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    if (this.isMockConfigured()) {
      // Mock Sandbox token for zero-dependency offline hackathon demonstration
      this.cachedToken = `mock_sandbox_access_token_${Date.now()}`;
      this.tokenExpiresAt = Date.now() + 3600 * 1000;
      return this.cachedToken;
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await fetch(`${this.apiBase}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorText = await response.text();
      let issue = 'OAUTH_FAILED';
      let message = `PayPal OAuth Authentication Failed: ${response.status}`;
      try {
        const json = JSON.parse(errorText);
        issue = json.error || issue;
        message = json.error_description ? `${message} - ${json.error_description}` : message;
      } catch {
        message = `${message} - ${errorText}`;
      }
      throw new PayPalError(message, response.status, issue, errorText);
    }

    const data = (await response.json()) as PayPalTokenResponse;
    this.cachedToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return this.cachedToken;
  }

  public async createOrder(
    referenceId: string,
    amount: number,
    currency = 'USD',
    description = 'PayShield Verified Merchant Checkout',
    returnUrl?: string,
    cancelUrl?: string
  ): Promise<{ id: string; status: string; links: any[] }> {
    if (this.isMockConfigured()) {
      const mockOrderId = `PAYPAL-SANDBOX-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      return {
        id: mockOrderId,
        status: 'CREATED',
        links: [
          {
            href: `https://www.sandbox.paypal.com/checkoutnow?token=${mockOrderId}`,
            rel: 'approve',
            method: 'GET',
          },
          {
            href: `${this.apiBase}/v2/checkout/orders/${mockOrderId}`,
            rel: 'self',
            method: 'GET',
          },
        ],
      };
    }

    const token = await this.getAccessToken();
    const payload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: referenceId,
          description,
          amount: {
            currency_code: currency,
            value: Number(amount).toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: 'PayShield Secure Checkout',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: returnUrl || 'http://localhost:5173/?paypal_action=approved',
        cancel_url: cancelUrl || 'http://localhost:5173/?paypal_action=cancelled',
      },
    };

    const response = await fetch(`${this.apiBase}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let issue = 'ORDER_CREATION_FAILED';
      let message = `PayPal Order Creation Failed: ${response.status}`;
      try {
        const json = JSON.parse(errorText);
        issue = json.details?.[0]?.issue || json.name || issue;
        message = json.details?.[0]?.description || json.message || `${message} - ${errorText}`;
      } catch {
        message = `${message} - ${errorText}`;
      }
      throw new PayPalError(message, response.status, issue, errorText);
    }

    return (await response.json()) as { id: string; status: string; links: any[] };
  }

  public async getOrder(paypalOrderId: string): Promise<PayPalOrderDetails> {
    if (this.isMockConfigured() || paypalOrderId.startsWith('PAYPAL-SANDBOX-') || paypalOrderId.startsWith('PAYPAL-ORD-')) {
      return {
        id: paypalOrderId,
        status: 'APPROVED',
        intent: 'CAPTURE',
        links: [],
      };
    }

    const token = await this.getAccessToken();
    const response = await fetch(`${this.apiBase}/v2/checkout/orders/${paypalOrderId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let issue = 'ORDER_FETCH_FAILED';
      let message = `Failed to fetch PayPal order: ${response.status}`;
      try {
        const json = JSON.parse(errorText);
        issue = json.details?.[0]?.issue || json.name || issue;
        message = json.details?.[0]?.description || json.message || `${message} - ${errorText}`;
      } catch {
        message = `${message} - ${errorText}`;
      }
      throw new PayPalError(message, response.status, issue, errorText);
    }

    return (await response.json()) as PayPalOrderDetails;
  }

  public async captureOrder(paypalOrderId: string): Promise<{
    id: string;
    status: string;
    captureId: string;
    raw: any;
  }> {
    if (paypalOrderId.startsWith('PAYPAL-UNAPPROVED-')) {
      throw new PayPalError(
        'Order has not been approved by the buyer on PayPal.',
        422,
        'ORDER_NOT_APPROVED'
      );
    }

    if (paypalOrderId.startsWith('PAYPAL-DECLINED-')) {
      throw new PayPalError(
        'Instrument declined in PayPal Sandbox',
        400,
        'INSTRUMENT_DECLINED'
      );
    }

    if (paypalOrderId.startsWith('PAYPAL-ALREADY-CAPTURED-')) {
      throw new PayPalError(
        'Order has already been captured',
        409,
        'ORDER_ALREADY_CAPTURED'
      );
    }

    if (this.isMockConfigured() || paypalOrderId.startsWith('PAYPAL-SANDBOX-') || paypalOrderId.startsWith('PAYPAL-ORD-')) {
      const mockCaptureId = `CAP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      return {
        id: paypalOrderId,
        status: 'COMPLETED',
        captureId: mockCaptureId,
        raw: {
          id: paypalOrderId,
          status: 'COMPLETED',
          purchase_units: [
            {
              payments: {
                captures: [
                  {
                    id: mockCaptureId,
                    status: 'COMPLETED',
                    amount: { currency_code: 'USD', value: '120.00' },
                  },
                ],
              },
            },
          ],
        },
      };
    }

    const token = await this.getAccessToken();
    const response = await fetch(`${this.apiBase}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let issue = 'ORDER_CAPTURE_FAILED';
      let message = `PayPal Order Capture Failed: ${response.status}`;
      try {
        const json = JSON.parse(errorText);
        issue = json.details?.[0]?.issue || json.name || issue;
        const desc = json.details?.[0]?.description || json.message;
        message = desc ? `PayPal Error (${issue}): ${desc}` : `${message} - ${errorText}`;
      } catch {
        message = `${message} - ${errorText}`;
      }
      throw new PayPalError(message, response.status, issue, errorText);
    }

    const data = (await response.json()) as any;
    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];

    return {
      id: data.id,
      status: data.status,
      captureId: capture?.id || data.id,
      raw: data,
    };
  }
}

export const paypalClient = new PayPalClient();
