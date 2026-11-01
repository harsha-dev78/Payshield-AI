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

async function fetchWithRetry(url: string, options: RequestInit, retries = 2, delayMs = 500): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err: any) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  return fetch(url, options);
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

  public async getAccessToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    if (this.isMockConfigured()) {
      throw new PayPalError(
        'PayPal Sandbox credentials are not configured or are invalid. Please configure PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in your server environment variables.',
        401,
        'CREDENTIALS_MISSING'
      );
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await fetchWithRetry(`${this.apiBase}/v1/oauth2/token`, {
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

  public async verifyAuthentication(): Promise<{
    authenticated: boolean;
    mode: 'PAYPAL_SANDBOX' | 'UNCONFIGURED';
    apiBase: string;
    authLatencyMs?: number;
    error?: string;
  }> {
    if (this.isMockConfigured()) {
      return {
        authenticated: false,
        mode: 'UNCONFIGURED',
        apiBase: this.apiBase,
        error: 'PayPal Client ID and Secret are missing or set to placeholder values in environment variables.',
      };
    }

    const start = Date.now();
    try {
      const token = await this.getAccessToken();
      return {
        authenticated: Boolean(token && token.length > 0),
        mode: 'PAYPAL_SANDBOX',
        apiBase: this.apiBase,
        authLatencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        authenticated: false,
        mode: 'PAYPAL_SANDBOX',
        apiBase: this.apiBase,
        error: err.issue || err.message || 'Authentication failed',
        authLatencyMs: Date.now() - start,
      };
    }
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
      throw new PayPalError(
        'Cannot create PayPal order: PayPal Sandbox credentials are not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET on Render.',
        401,
        'CREDENTIALS_MISSING'
      );
    }

    let token = await this.getAccessToken();
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

    let response = await fetchWithRetry(`${this.apiBase}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 401) {
      token = await this.getAccessToken(true);
      response = await fetchWithRetry(`${this.apiBase}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    }

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
    const token = await this.getAccessToken();
    const response = await fetchWithRetry(`${this.apiBase}/v2/checkout/orders/${paypalOrderId}`, {
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

    let token = await this.getAccessToken();
    let response = await fetchWithRetry(`${this.apiBase}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });

    if (response.status === 401) {
      token = await this.getAccessToken(true);
      response = await fetchWithRetry(`${this.apiBase}/v2/checkout/orders/${paypalOrderId}/capture`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
    }

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
