import express from 'express';
import mongoose from 'mongoose';
import { Payment } from '../models/Payment.js';
import { recordAudit } from '../middleware/dataProtection.js';

const router = express.Router();

const buildPaymentQuery = (id) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  return isObjectId ? { $or: [{ id }, { _id: id }] } : { id };
};

// GET active payments
router.get('/', async (req, res) => {
  try {
    const filter = req.query.includeDeleted === 'true' ? {} : { isDeleted: { $ne: true } };
    const payments = await Payment.find(filter).sort({ paymentDate: -1, createdAt: -1 });
    res.json({ success: true, data: payments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST save or upsert payment
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) return res.status(400).json({ success: false, error: 'Payment ID is required' });

    if (!data.clientName && data.customerName) {
      data.clientName = data.customerName;
    }
    if (!data.customerName && data.clientName) {
      data.customerName = data.clientName;
    }

    const payment = await Payment.findOneAndUpdate(
      { id: data.id },
      { $set: { ...data, isDeleted: false } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: payment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE payment - Soft delete with audit log
router.delete('/:id', async (req, res) => {
  try {
    const query = buildPaymentQuery(req.params.id);
    const payment = await Payment.findOne(query);
    if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });

    const deleter = req.user?.name || req.body?.deletedBy || 'Admin';
    const reason = req.body?.reason || 'User initiated payment record deletion';

    await payment.softDelete(deleter, reason);

    await recordAudit({
      action: 'SOFT_DELETE',
      entityType: 'Payment',
      entityId: payment.id,
      entityIdentifier: `Payment of ₹${payment.amount} (${payment.documentNumber || payment.documentId})`,
      req,
      reason,
      impact: `Payment entry of ₹${payment.amount} soft-deleted and preserved in archive.`,
      status: 'success',
      details: {
        amount: payment.amount,
        documentId: payment.documentId,
      },
    });

    res.json({
      success: true,
      message: 'Payment safely archived. Document remains restorable.',
      isSoftDeleted: true,
      data: payment,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST restore payment
router.post('/:id/restore', async (req, res) => {
  try {
    const query = buildPaymentQuery(req.params.id);
    const payment = await Payment.findOne(query);
    if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });

    await payment.restore();

    await recordAudit({
      action: 'RESTORE',
      entityType: 'Payment',
      entityId: payment.id,
      entityIdentifier: `Payment of ₹${payment.amount}`,
      req,
      reason: req.body?.reason || 'Restored payment entry.',
      impact: `Payment returned to active ledger.`,
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Payment successfully restored to active records.',
      data: payment,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
