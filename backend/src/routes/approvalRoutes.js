import express from 'express';
import mongoose from 'mongoose';
import { ApprovalRequest } from '../models/ApprovalRequest.js';
import { recordAudit, requireOwner } from '../middleware/dataProtection.js';
import { Invoice } from '../models/Invoice.js';
import { Client } from '../models/Client.js';
import { Expense } from '../models/Expense.js';
import { Quote } from '../models/Quote.js';
import { Recurring } from '../models/Recurring.js';
import { Bill } from '../models/Bill.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { Payment } from '../models/Payment.js';

const router = express.Router();

const buildApprovalQuery = (id) => {
  return mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ _id: id }, { requestId: id }] }
    : { requestId: id };
};


const ENTITY_MODEL_MAP = {
  invoice: Invoice,
  invoices: Invoice,
  client: Client,
  clients: Client,
  expense: Expense,
  expenses: Expense,
  quote: Quote,
  quotes: Quote,
  recurring: Recurring,
  bill: Bill,
  bills: Bill,
  category: Category,
  categories: Category,
  product: Product,
  products: Product,
  payment: Payment,
  payments: Payment,
};

// GET /api/approvals - List all approvals
router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    const approvals = await ApprovalRequest.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: approvals });
  } catch (err) {
    next(err);
  }
});

// POST /api/approvals/request - Step 1: Submit destruction request
router.post('/request', async (req, res, next) => {
  try {
    const { operation, entityType, targetIds, targetIdentifiers, reason, impactSummary } = req.body;

    if (!operation || !entityType || !Array.isArray(targetIds) || targetIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'operation, entityType, and a non-empty targetIds array are required.',
      });
    }

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: 'A detailed business justification reason (minimum 5 characters) is required for destructive requests.',
      });
    }

    const caller = req.user || {
      name: 'System Requester',
      email: 'requester@highphaus.com',
      role: 'Admin',
    };

    const requestId = `apr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

    const newApproval = await ApprovalRequest.create({
      requestId,
      operation,
      entityType,
      targetIds,
      targetIdentifiers: targetIdentifiers || targetIds,
      reason: reason.trim(),
      impactSummary: impactSummary || `Destructive ${operation} requested on ${targetIds.length} ${entityType} record(s).`,
      recordCount: targetIds.length,
      status: 'pending',
      requestedBy: {
        userId: caller.id,
        name: caller.name,
        email: caller.email,
        role: caller.role,
      },
      expiresAt,
    });

    await recordAudit({
      action: 'APPROVAL_REQUESTED',
      entityType,
      entityId: requestId,
      entityIdentifier: `Request for ${targetIds.length} ${entityType} records`,
      req,
      reason: reason.trim(),
      impact: `Pending approval for destructive operation: ${operation}`,
      status: 'pending',
      details: {
        requestId,
        targetIds,
        operation,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Destructive operation request recorded. Awaiting explicit authorization from Workspace Owner.',
      data: newApproval,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/approvals/:id/approve - Step 2a: Owner approves request
router.post('/:id/approve', requireOwner, async (req, res, next) => {
  try {
    const { approvalReason, allowSelfApprovalOverride } = req.body;
    const approval = await ApprovalRequest.findOne(buildApprovalQuery(req.params.id));

    if (!approval) {
      return res.status(404).json({ success: false, error: 'Approval request not found.' });
    }

    if (approval.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot approve request with current status: ${approval.status}`,
      });
    }

    if (new Date() > new Date(approval.expiresAt)) {
      approval.status = 'expired';
      await approval.save();
      return res.status(400).json({
        success: false,
        error: 'This approval request has expired and cannot be approved.',
      });
    }

    // Separation of duties check
    if (approval.requestedBy.email === req.user.email && !allowSelfApprovalOverride) {
      return res.status(403).json({
        success: false,
        error: 'Separation of duties violation: The requester cannot approve their own destructive request without explicit audited override.',
        code: 'SEPARATION_OF_DUTIES_REQUIRED',
      });
    }

    approval.status = 'approved';
    approval.approvedBy = {
      userId: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      approvedAt: new Date(),
      approvalReason: approvalReason || 'Explicitly authorized by Workspace Owner.',
    };

    await approval.save();

    await recordAudit({
      action: 'APPROVAL_GRANTED',
      entityType: approval.entityType,
      entityId: approval.requestId,
      entityIdentifier: `Approved ${approval.operation} on ${approval.targetIds.length} records`,
      req,
      reason: approval.approvedBy.approvalReason,
      impact: 'Destructive action explicitly authorized.',
      status: 'success',
      authorizedBy: req.user,
      details: {
        approvalId: approval.requestId,
        targetIds: approval.targetIds,
      },
    });

    res.json({
      success: true,
      message: 'Destructive operation has been APPROVED by Workspace Owner. It may now be executed.',
      data: approval,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/approvals/:id/reject - Step 2b: Owner rejects request
router.post('/:id/reject', requireOwner, async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    const approval = await ApprovalRequest.findOne(buildApprovalQuery(req.params.id));

    if (!approval) {
      return res.status(404).json({ success: false, error: 'Approval request not found.' });
    }

    if (approval.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot reject request with status: ${approval.status}`,
      });
    }

    approval.status = 'rejected';
    approval.rejectedBy = {
      userId: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      rejectedAt: new Date(),
      rejectionReason: rejectionReason || 'Rejected by Workspace Owner.',
    };

    await approval.save();

    await recordAudit({
      action: 'APPROVAL_REJECTED',
      entityType: approval.entityType,
      entityId: approval.requestId,
      entityIdentifier: `Rejected ${approval.operation}`,
      req,
      reason: approval.rejectedBy.rejectionReason,
      impact: 'Destructive action blocked and rejected.',
      status: 'rejected',
      authorizedBy: req.user,
    });

    res.json({
      success: true,
      message: 'Destructive operation request rejected by Workspace Owner.',
      data: approval,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/approvals/:id/execute - Step 3: Execute approved operation
router.post('/:id/execute', requireOwner, async (req, res, next) => {
  try {
    const approval = await ApprovalRequest.findOne(buildApprovalQuery(req.params.id));

    if (!approval) {
      return res.status(404).json({ success: false, error: 'Approval request not found.' });
    }

    if (approval.status !== 'approved') {
      return res.status(403).json({
        success: false,
        error: `CRITICAL SECURITY BLOCK: Operation cannot be executed. Request status is '${approval.status}', not 'approved'.`,
        code: 'EXECUTION_NOT_AUTHORIZED',
      });
    }

    if (new Date() > new Date(approval.expiresAt)) {
      approval.status = 'expired';
      await approval.save();
      return res.status(400).json({
        success: false,
        error: 'Approval has expired before execution.',
      });
    }

    const Model = ENTITY_MODEL_MAP[approval.entityType.toLowerCase()];
    if (!Model) {
      return res.status(400).json({
        success: false,
        error: `Unsupported entity type: ${approval.entityType}`,
      });
    }

    let deletedCount = 0;

    if (
      approval.operation === 'PERMANENT_PURGE' ||
      approval.operation === 'PERMANENT_RECORD_DELETE' ||
      approval.operation === 'BULK_DELETE'
    ) {
      // Execute permanent purge on specific approved target IDs only
      const validObjectIds = approval.targetIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
      const orConditions = [
        { id: { $in: approval.targetIds } },
        { invoiceNumber: { $in: approval.targetIds } },
      ];
      if (validObjectIds.length > 0) {
        orConditions.push({ _id: { $in: validObjectIds } });
      }
      const deleteResult = await Model.deleteMany({ $or: orConditions });
      deletedCount = deleteResult.deletedCount;
    }



    approval.status = 'executed';
    approval.executedAt = new Date();
    approval.executedBy = {
      userId: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    };
    approval.executionResult = { deletedCount };
    await approval.save();

    await recordAudit({
      action: 'PERMANENT_PURGE_EXECUTED',
      entityType: approval.entityType,
      entityId: approval.requestId,
      entityIdentifier: `Executed purge on ${deletedCount} records`,
      req,
      reason: approval.reason,
      impact: `Permanently removed ${deletedCount} records following Owner approval.`,
      status: 'success',
      authorizedBy: approval.approvedBy,
      details: {
        approvalId: approval.requestId,
        deletedCount,
        targetIds: approval.targetIds,
      },
    });

    res.json({
      success: true,
      message: `Approved operation successfully executed. Permanently purged ${deletedCount} record(s).`,
      data: {
        requestId: approval.requestId,
        deletedCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
