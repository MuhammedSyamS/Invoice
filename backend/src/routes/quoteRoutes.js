import express from 'express';
import mongoose from 'mongoose';
import { Quote } from '../models/Quote.js';
import { recordAudit } from '../middleware/dataProtection.js';

const router = express.Router();

const buildQuoteQuery = (id) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  return isObjectId
    ? { $or: [{ id }, { _id: id }, { quoteNumber: id }] }
    : { $or: [{ id }, { quoteNumber: id }] };
};

// GET active quotes
router.get('/', async (req, res) => {
  try {
    const filter = req.query.includeDeleted === 'true' ? {} : { isDeleted: { $ne: true } };
    const quotes = await Quote.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: quotes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET quote by ID
router.get('/:id', async (req, res) => {
  try {
    const query = buildQuoteQuery(req.params.id);
    const filter = req.query.includeDeleted === 'true' ? query : { ...query, isDeleted: { $ne: true } };
    const quote = await Quote.findOne(filter);
    if (!quote) return res.status(404).json({ success: false, error: 'Quote not found' });
    res.json({ success: true, data: quote });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST upsert quote
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) return res.status(400).json({ success: false, error: 'Quote ID is required' });

    const quote = await Quote.findOneAndUpdate(
      { id: data.id },
      { $set: { ...data, isDeleted: false } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: quote });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE quote - Soft delete with audit log
router.delete('/:id', async (req, res) => {
  try {
    const query = buildQuoteQuery(req.params.id);
    const quote = await Quote.findOne(query);
    if (!quote) return res.status(404).json({ success: false, error: 'Quote not found' });

    const deleter = req.user?.name || req.body?.deletedBy || 'Admin';
    const reason = req.body?.reason || 'User initiated quote archiving';

    await quote.softDelete(deleter, reason);

    await recordAudit({
      action: 'SOFT_DELETE',
      entityType: 'Quote',
      entityId: quote.id,
      entityIdentifier: quote.quoteNumber,
      req,
      reason,
      impact: `Quote ${quote.quoteNumber} soft-deleted and preserved in archive.`,
      status: 'success',
    });

    res.json({
      success: true,
      message: `Quote ${quote.quoteNumber} safely archived. Document remains restorable.`,
      isSoftDeleted: true,
      data: quote,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST restore quote
router.post('/:id/restore', async (req, res) => {
  try {
    const query = buildQuoteQuery(req.params.id);
    const quote = await Quote.findOne(query);
    if (!quote) return res.status(404).json({ success: false, error: 'Quote not found' });

    await quote.restore();

    await recordAudit({
      action: 'RESTORE',
      entityType: 'Quote',
      entityId: quote.id,
      entityIdentifier: quote.quoteNumber,
      req,
      reason: req.body?.reason || 'Restored to active quotes list.',
      impact: `Quote ${quote.quoteNumber} returned to active status.`,
      status: 'success',
    });

    res.json({
      success: true,
      message: `Quote ${quote.quoteNumber} successfully restored to active records.`,
      data: quote,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
