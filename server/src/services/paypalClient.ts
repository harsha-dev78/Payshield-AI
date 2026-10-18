import { CONFIG } from '../config.js';

interface PayPalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export class PayPalClient {
  private clientId: string;
  private clientSecret: string;
  private apiBase: string;
  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor() {
    this.clientId = CONFIG.PAYPAL.CLIENT_ID;
    this.clientSecret = CONFIG.PAYPAL.CLIENT_SECRET;
    this.apiBase = CONFIG.PAYPAL.API_BASE;
  }

  public isMockConfigured(): boolean {
    return (
      !this.clientId ||
      this.clientId === 'your_sandbox_client_id_here' ||
      this.clientId === 'sandbox_mock_client_id' ||
      !this.clientSecret ||
      this.clientSecret === 'your_sandbox_client_secret_here' ||
      this.clientSecret === 'sandbox_mock_client_secret'
    );
  }

  private async getAccessToken(): Promise<string> {
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
      throw new Error(`PayPal OAuth Authentication Failed: ${response.status} - ${errorText}`);
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
    description = 'PayShield Verified Merchant Checkout'
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
            value: amount.toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: 'PayShield Secure Checkout',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: 'http://localhost:5173/checkout?status=success',
        cancel_url: 'http://localhost:5173/checkout?status=cancelled',
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
      throw new Error(`PayPal Order Creation Failed: ${response.status} - ${errorText}`);
    }

    return (await response.json()) as { id: string; status: string; links: any[] };
  }

  public async captureOrder(paypalOrderId: string): Promise<{
    id: string;
    status: string;
    captureId: string;
    raw: any;
  }> {
    if (this.isMockConfigured() || paypalOrderId.startsWith('PAYPAL-SANDBOX-')) {
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
      throw new Error(`PayPal Order Capture Failed: ${response.status} - ${errorText}`);
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
