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

// System Health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    name: 'PayShield AI Engine',
    version: '1.0.0',
    policyVersion: CONFIG.RISK.POLICY_VERSION,
    database: 'SQLite',
    environment: CONFIG.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend static assets in production or when client/dist exists
const clientDistCandidates = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), '../client/dist'),
];
const clientDistPath = clientDistCandidates.find((p) => fs.existsSync(p));

if (clientDistPath) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Seed sample data if empty
seedSyntheticDataIfNeeded();

// Start HTTP server binding to 0.0.0.0 for containerized cloud hosts
const PORT = CONFIG.PORT;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(`🛡️  PayShield AI Server running on port ${PORT}`);
  console.log(`📡  API Base: http://${HOST}:${PORT}/api`);
  console.log(`⚖️  Risk Policy: ${CONFIG.RISK.POLICY_VERSION}`);
  if (clientDistPath) {
    console.log(`📦  Serving Static UI from: ${clientDistPath}`);
  }
  console.log(`=======================================================`);
});

export default app;
