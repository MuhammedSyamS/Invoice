import express from 'express';
import mongoose from 'mongoose';
import { Bill } from '../models/Bill.js';
import { Payment } from '../models/Payment.js';
import { calculateAuthoritativeBillFinancials } from '../utils/finance.js';
import { recordAudit } from '../middleware/dataProtection.js';

const router = express.Router();

const buildBillQuery = (id) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  return isObjectId ? { $or: [{ id }, { _id: id }, { billNumber: id }] } : { $or: [{ id }, { billNumber: id }] };
};

// GET active bills
router.get('/', async (req, res) => {
  try {
    const filter = req.query.includeDeleted === 'true' ? {} : { isDeleted: { $ne: true } };
    const bills = await Bill.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: bills });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Failed to fetch bills.' : err.message,
    });
  }
});

// POST create or upsert bill
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) return res.status(400).json({ success: false, error: 'Bill ID is required' });

    const queryIds = [data.id].filter(Boolean);
    if (data._id) queryIds.push(String(data._id));

    const existingPayments = await Payment.find({
      documentType: 'bill',
      $or: [{ billId: { $in: queryIds } }, { documentId: { $in: queryIds } }],
      isDeleted: { $ne: true },
    });

    const finalizedData = calculateAuthoritativeBillFinancials(data, existingPayments);

    const bill = await Bill.findOneAndUpdate(
      { id: data.id },
      { $set: { ...finalizedData, isDeleted: false } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: bill });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Failed to save bill.' : err.message,
    });
  }
});

// DELETE bill - Soft delete with audit log
router.delete('/:id', async (req, res) => {
  try {
    const query = buildBillQuery(req.params.id);
    const bill = await Bill.findOne(query);
    if (!bill) return res.status(404).json({ success: false, error: 'Bill not found' });

    const deleter = req.user?.name || req.body?.deletedBy || 'Admin';
    const reason = req.body?.reason || 'User initiated bill deletion';

    await bill.softDelete(deleter, reason);

    await recordAudit({
      action: 'SOFT_DELETE',
      entityType: 'Bill',
      entityId: bill.id,
      entityIdentifier: bill.billNumber,
      req,
      reason,
      impact: `Bill ${bill.billNumber} soft-deleted and preserved in archive.`,
      status: 'success',
    });

    res.json({
      success: true,
      message: `Bill ${bill.billNumber} safely archived. Document remains restorable.`,
      isSoftDeleted: true,
      data: bill,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Failed to delete bill.' : err.message,
    });
  }
});

// POST restore bill
router.post('/:id/restore', async (req, res) => {
  try {
    const query = buildBillQuery(req.params.id);
    const bill = await Bill.findOne(query);
    if (!bill) return res.status(404).json({ success: false, error: 'Bill not found' });

    await bill.restore();

    await recordAudit({
      action: 'RESTORE',
      entityType: 'Bill',
      entityId: bill.id,
      entityIdentifier: bill.billNumber,
      req,
      reason: req.body?.reason || 'Restored bill.',
      impact: `Bill ${bill.billNumber} returned to active status.`,
      status: 'success',
    });

    res.json({
      success: true,
      message: `Bill ${bill.billNumber} successfully restored to active records.`,
      data: bill,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Failed to restore bill.' : err.message,
    });
  }
});

export default router;
