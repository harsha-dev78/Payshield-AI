import express from 'express';
import cors from 'cors';
import { CONFIG } from './config.js';
import { ordersRouter } from './routes/orders.js';
import { paypalRouter } from './routes/paypal.js';
import { auditRouter } from './routes/audit.js';
import { seedSyntheticDataIfNeeded } from './db/seeds.js';

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

// Seed sample data if empty
seedSyntheticDataIfNeeded();

// Start HTTP server
const PORT = CONFIG.PORT;
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🛡️  PayShield AI Backend Server running on port ${PORT}`);
  console.log(`📡  API Base: http://localhost:${PORT}/api`);
  console.log(`⚖️  Risk Policy: ${CONFIG.RISK.POLICY_VERSION}`);
  console.log(`=======================================================`);
});

export default app;
