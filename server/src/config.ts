import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env if present (local dev)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config(); // fallback

export function cleanEnvString(val?: string, fallback = ''): string {
  if (!val) return fallback;
  let cleaned = val.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned || fallback;
}

export function cleanUrlString(val?: string, fallback = ''): string {
  const cleaned = cleanEnvString(val, fallback);
  return cleaned.replace(/\/+$/, '');
}

export const MOCK_PLACEHOLDERS = new Set([
  '',
  'your_sandbox_client_id_here',
  'your_paypal_sandbox_client_id_here',
  'sandbox_mock_client_id',
  'your_client_id',
  'sandbox_client_id',
  'client_id_placeholder',
]);

export const MOCK_SECRET_PLACEHOLDERS = new Set([
  '',
  'your_sandbox_client_secret_here',
  'your_paypal_sandbox_client_secret_here',
  'sandbox_mock_client_secret',
  'your_client_secret',
  'sandbox_client_secret',
  'client_secret_placeholder',
]);

export interface PayPalCredentialsResolution {
  clientId: string;
  clientSecret: string;
  clientIdConfigured: boolean;
  clientSecretConfigured: boolean;
  clientIdKey: string | null;
  clientSecretKey: string | null;
  detectedPayPalKeys: string[];
}

// Known prioritized names for Client ID and Secret in cloud host environments (Render, Heroku, etc.)
const CLIENT_ID_CANDIDATES = [
  'PAYPAL_CLIENT_ID',
  'PAYPAL_SANDBOX_CLIENT_ID',
  'PAYPAL_APP_CLIENT_ID',
  'PAYPAL_REST_CLIENT_ID',
  'PAYPAL_API_CLIENT_ID',
  'PAYPAL_CLIENTID',
  'PAYPAL_KEY',
  'CLIENT_ID',
  'VITE_PAYPAL_CLIENT_ID',
  'REACT_APP_PAYPAL_CLIENT_ID',
  'NEXT_PUBLIC_PAYPAL_CLIENT_ID',
];

const CLIENT_SECRET_CANDIDATES = [
  'PAYPAL_CLIENT_SECRET',
  'PAYPAL_SANDBOX_CLIENT_SECRET',
  'PAYPAL_APP_CLIENT_SECRET',
  'PAYPAL_REST_SECRET',
  'PAYPAL_API_SECRET',
  'PAYPAL_CLIENTSECRET',
  'PAYPAL_SECRET',
  'PAYPAL_SECRET_KEY',
  'PAYPAL_SANDBOX_SECRET',
  'PAYPAL_SANDBOX_SECRET_KEY',
  'PAYPAL_CLIENT_SECRET_KEY',
  'CLIENT_SECRET',
  'VITE_PAYPAL_CLIENT_SECRET',
  'REACT_APP_PAYPAL_CLIENT_SECRET',
  'NEXT_PUBLIC_PAYPAL_CLIENT_SECRET',
];

export function resolvePayPalCredentials(): PayPalCredentialsResolution {
  // 1. Gather all keys present in process.env relating to paypal/client/secret
  const allEnvKeys = Object.keys(process.env);
  const detectedPayPalKeys = allEnvKeys
    .filter((k) => {
      const lower = k.toLowerCase();
      return (
        lower.includes('paypal') ||
        lower.includes('client_id') ||
        lower.includes('clientsecret') ||
        lower.includes('secret_key')
      );
    })
    .map((k) => k.trim());

  let foundClientId = '';
  let foundClientIdKey: string | null = null;
  let foundClientSecret = '';
  let foundClientSecretKey: string | null = null;

  // 2. Search prioritized explicit candidates
  for (const candidate of CLIENT_ID_CANDIDATES) {
    const matchedEnvKey = allEnvKeys.find((k) => k.trim().toUpperCase() === candidate.toUpperCase());
    if (matchedEnvKey && process.env[matchedEnvKey]) {
      const val = cleanEnvString(process.env[matchedEnvKey]);
      if (val && !MOCK_PLACEHOLDERS.has(val.toLowerCase())) {
        foundClientId = val;
        foundClientIdKey = matchedEnvKey;
        break;
      }
    }
  }

  // Fallback regex scan for Client ID if not found in candidate list
  if (!foundClientId) {
    for (const key of allEnvKeys) {
      const trimmedKey = key.trim();
      if (/^(?:paypal[_-]?)?(?:sandbox[_-]?)?(?:app[_-]?)?(?:api[_-]?)?(?:rest[_-]?)?(?:vite[_-]?)?client[_-]?id$/i.test(trimmedKey)) {
        const val = cleanEnvString(process.env[key]);
        if (val && !MOCK_PLACEHOLDERS.has(val.toLowerCase())) {
          foundClientId = val;
          foundClientIdKey = trimmedKey;
          break;
        }
      }
    }
  }

  // 3. Search prioritized explicit candidates for Secret
  for (const candidate of CLIENT_SECRET_CANDIDATES) {
    const matchedEnvKey = allEnvKeys.find((k) => k.trim().toUpperCase() === candidate.toUpperCase());
    if (matchedEnvKey && process.env[matchedEnvKey]) {
      const val = cleanEnvString(process.env[matchedEnvKey]);
      if (val && !MOCK_SECRET_PLACEHOLDERS.has(val.toLowerCase())) {
        foundClientSecret = val;
        foundClientSecretKey = matchedEnvKey;
        break;
      }
    }
  }

  // Fallback regex scan for Secret if not found in candidate list
  if (!foundClientSecret) {
    for (const key of allEnvKeys) {
      const trimmedKey = key.trim();
      if (/^(?:paypal[_-]?)?(?:sandbox[_-]?)?(?:app[_-]?)?(?:api[_-]?)?(?:client[_-]?)?secret(?:[_-]?key)?$/i.test(trimmedKey)) {
        const val = cleanEnvString(process.env[key]);
        if (val && !MOCK_SECRET_PLACEHOLDERS.has(val.toLowerCase())) {
          foundClientSecret = val;
          foundClientSecretKey = trimmedKey;
          break;
        }
      }
    }
  }

  const clientIdConfigured = Boolean(foundClientId && !MOCK_PLACEHOLDERS.has(foundClientId));
  const clientSecretConfigured = Boolean(foundClientSecret && !MOCK_SECRET_PLACEHOLDERS.has(foundClientSecret));

  return {
    clientId: foundClientId,
    clientSecret: foundClientSecret,
    clientIdConfigured,
    clientSecretConfigured,
    clientIdKey: foundClientIdKey,
    clientSecretKey: foundClientSecretKey,
    detectedPayPalKeys,
  };
}

export const CONFIG = {
  get PORT() {
    return parseInt(process.env.PORT || '5000', 10);
  },
  get NODE_ENV() {
    return process.env.NODE_ENV || 'development';
  },
  PAYPAL: {
    get CLIENT_ID() {
      return resolvePayPalCredentials().clientId;
    },
    get CLIENT_SECRET() {
      return resolvePayPalCredentials().clientSecret;
    },
    get ENVIRONMENT() {
      return (cleanEnvString(process.env.PAYPAL_ENVIRONMENT) || 'sandbox').toLowerCase();
    },
    get API_BASE() {
      const rawEnv = (cleanEnvString(process.env.PAYPAL_ENVIRONMENT) || 'sandbox').toLowerCase();
      const defaultApiBase = (rawEnv === 'live' || rawEnv === 'production')
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';
      return cleanUrlString(process.env.PAYPAL_API_BASE, defaultApiBase);
    },
  },
  RISK: {
    ALLOW_THRESHOLD: parseInt(process.env.RISK_THRESHOLD_ALLOW || '30', 10),
    REVIEW_THRESHOLD: parseInt(process.env.RISK_THRESHOLD_REVIEW || '65', 10),
    POLICY_VERSION: 'v1.2.0-deterministic-baseline',
  },
  get DATABASE_PATH() {
    return process.env.DATABASE_PATH || path.resolve(__dirname, '../payshield.db');
  },
};
