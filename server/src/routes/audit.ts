import { Router, Request, Response } from 'express';
import { dbService } from '../db/database.js';

export const auditRouter = Router();

// GET /api/audit - List audit trail logs
auditRouter.get('/', (req: Request, res: Response) => {
  try {
    const orderId = req.query.orderId as string | undefined;
    const logs = dbService.getAuditLogs(orderId);
    res.json({ logs, count: logs.length });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve audit logs', details: error.message });
  }
});
