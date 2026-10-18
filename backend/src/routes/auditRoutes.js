import express from 'express';
import { AuditLog } from '../models/AuditLog.js';

const router = express.Router();

// GET /api/audit-logs - View tamper-resistant audit logs
router.get('/', async (req, res, next) => {
  try {
    const { action, entityType, status, limit = 100, page = 1 } = req.query;
    const filter = {};

    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;
    if (status) filter.status = status;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const maxLimit = Math.min(200, parseInt(limit, 10) || 100);

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(maxLimit),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: maxLimit,
        pages: Math.ceil(total / maxLimit),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
