import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config(); // fallback

function cleanEnvString(val?: string, fallback = ''): string {
  if (!val) return fallback;
  let cleaned = val.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned || fallback;
}

function cleanUrlString(val?: string, fallback = ''): string {
  const cleaned = cleanEnvString(val, fallback);
  return cleaned.replace(/\/+$/, '');
}

const rawEnv = cleanEnvString(process.env.PAYPAL_ENVIRONMENT, 'sandbox').toLowerCase();
const defaultApiBase = (rawEnv === 'live' || rawEnv === 'production')
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  PAYPAL: {
    CLIENT_ID: cleanEnvString(process.env.PAYPAL_CLIENT_ID, 'sandbox_mock_client_id'),
    CLIENT_SECRET: cleanEnvString(process.env.PAYPAL_CLIENT_SECRET, 'sandbox_mock_client_secret'),
    ENVIRONMENT: rawEnv,
    API_BASE: cleanUrlString(process.env.PAYPAL_API_BASE, defaultApiBase),
  },
  RISK: {
    ALLOW_THRESHOLD: parseInt(process.env.RISK_THRESHOLD_ALLOW || '30', 10),
    REVIEW_THRESHOLD: parseInt(process.env.RISK_THRESHOLD_REVIEW || '65', 10),
    POLICY_VERSION: 'v1.2.0-deterministic-baseline',
  },
  DATABASE_PATH: process.env.DATABASE_PATH || path.resolve(__dirname, '../payshield.db'),
};
