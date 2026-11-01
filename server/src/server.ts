import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { CONFIG } from './config.js';
import { ordersRouter } from './routes/orders.js';
import { paypalRouter } from './routes/paypal.js';
import { auditRouter } from './routes/audit.js';
import { seedSyntheticDataIfNeeded } from './db/seeds.js';
import { paypalClient } from './services/paypalClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security and utility middleware
app.use(cors());
app.use(express.json());

// Request logging in development
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (CONFIG.NODE_ENV !== 'test') {
      console.log(`[${req.method}] ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// API Routes
app.use('/api/orders', ordersRouter);
app.use('/api/paypal', paypalRouter);
app.use('/api/audit', auditRouter);

// System Health & Render Health Check (respond at /health, /api/health)
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'healthy',
    name: 'PayShield AI Engine',
    version: '1.0.0',
    policyVersion: CONFIG.RISK.POLICY_VERSION,
    database: 'SQLite',
    environment: CONFIG.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Fast HEAD response for edge balancers and health checkers
app.head(['/', '/health', '/api/health'], (req, res) => {
  res.status(200).end();
});

// Serve frontend static assets in production or when client/dist exists
const clientDistCandidates = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), '../client/dist'),
];
const clientDistPath = clientDistCandidates.find((p) => fs.existsSync(p));

if (clientDistPath && fs.existsSync(path.join(clientDistPath, 'index.html'))) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
      if (err) {
        next(err);
      }
    });
  });
} else {
  // If static assets aren't built, serve a fallback API welcome at /
  app.get('/', (req, res) => {
    res.status(200).json({
      name: 'PayShield AI Engine',
      status: 'healthy',
      apiBase: '/api',
      message: 'PayShield AI Backend API is active.',
    });
  });
}

// API 404 fallback (ensure JSON is always returned for unmatched /api routes)
app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'API Route Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    path: req.originalUrl,
  });
});

// Global JSON Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }
  const status = typeof err.statusCode === 'number' ? err.statusCode : (typeof err.status === 'number' ? err.status : 500);
  console.error(`[Unhandled Server Error] ${req.method} ${req.originalUrl}:`, err);
  res.status(status).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.',
    issue: err.issue,
  });
});

// Seed sample data if empty
seedSyntheticDataIfNeeded();

// Start HTTP server binding to 0.0.0.0 for containerized cloud hosts
const PORT = CONFIG.PORT;
const HOST = '0.0.0.0';

if (CONFIG.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, () => {
    const creds = paypalClient.getCredentialsResolution();

    console.log(`=======================================================`);
    console.log(`🛡️  PayShield AI Server running on port ${PORT}`);
    console.log(`📡  API Base: http://${HOST}:${PORT}/api`);
    console.log(`⚖️  Risk Policy: ${CONFIG.RISK.POLICY_VERSION}`);
    console.log(`💳  PayPal Environment: ${CONFIG.PAYPAL.ENVIRONMENT}`);
    console.log(`💳  PayPal API Base: ${CONFIG.PAYPAL.API_BASE}`);
    console.log(`💳  PayPal Client ID Configured: ${creds.clientIdConfigured ? 'true' : 'false'} (Source: ${creds.clientIdKey || 'NONE'})`);
    console.log(`💳  PayPal Secret Configured: ${creds.clientSecretConfigured ? 'true' : 'false'} (Source: ${creds.clientSecretKey || 'NONE'})`);
    console.log(`💳  Detected Environment Keys: ${JSON.stringify(creds.detectedPayPalKeys)}`);
    if (clientDistPath) {
      console.log(`📦  Serving Static UI from: ${clientDistPath}`);
    }
    console.log(`=======================================================`);

    paypalClient.verifyAuthentication().then((auth) => {
      if (auth.authenticated) {
        console.log(`✅  PayPal Sandbox Authentication: VERIFIED (${auth.authLatencyMs}ms)`);
      } else {
        console.warn(`⚠️  PayPal Sandbox Authentication: FAILED - ${auth.error || 'Check Render environment variables'}`);
      }
    }).catch((err) => {
      console.warn(`⚠️  PayPal Sandbox Authentication Check Error:`, err.message);
    });
  });
}

export { app };
export default app;
