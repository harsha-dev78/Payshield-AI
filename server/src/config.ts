import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config(); // fallback

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  PAYPAL: {
    CLIENT_ID: process.env.PAYPAL_CLIENT_ID || 'sandbox_mock_client_id',
    CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET || 'sandbox_mock_client_secret',
    ENVIRONMENT: (process.env.PAYPAL_ENVIRONMENT || 'sandbox').toLowerCase(),
    API_BASE:
      process.env.PAYPAL_API_BASE ||
      ((process.env.PAYPAL_ENVIRONMENT || 'sandbox').toLowerCase() === 'live' ||
      (process.env.PAYPAL_ENVIRONMENT || 'sandbox').toLowerCase() === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com'),
  },
  RISK: {
    ALLOW_THRESHOLD: parseInt(process.env.RISK_THRESHOLD_ALLOW || '30', 10),
    REVIEW_THRESHOLD: parseInt(process.env.RISK_THRESHOLD_REVIEW || '65', 10),
    POLICY_VERSION: 'v1.2.0-deterministic-baseline',
  },
  DATABASE_PATH: process.env.DATABASE_PATH || path.resolve(__dirname, '../payshield.db'),
};
