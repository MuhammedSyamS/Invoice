import express from 'express';
import mongoose from 'mongoose';
import { Recurring } from '../models/Recurring.js';
import { recordAudit } from '../middleware/dataProtection.js';

const router = express.Router();

const buildRecurringQuery = (id) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  return isObjectId ? { $or: [{ id }, { _id: id }] } : { id };
};

// GET active recurring templates
router.get('/', async (req, res) => {
  try {
    const filter = req.query.includeDeleted === 'true' ? {} : { isDeleted: { $ne: true } };
    const templates = await Recurring.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: templates });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST upsert recurring template
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) return res.status(400).json({ success: false, error: 'Template ID is required' });

    const template = await Recurring.findOneAndUpdate(
      { id: data.id },
      { $set: { ...data, isDeleted: false } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: template });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE recurring template - Soft delete with audit log
router.delete('/:id', async (req, res) => {
  try {
    const query = buildRecurringQuery(req.params.id);
    const template = await Recurring.findOne(query);
    if (!template) return res.status(404).json({ success: false, error: 'Recurring template not found' });

    const deleter = req.user?.name || req.body?.deletedBy || 'Admin';
    const reason = req.body?.reason || 'User initiated recurring template deletion';

    await template.softDelete(deleter, reason);

    await recordAudit({
      action: 'SOFT_DELETE',
      entityType: 'Recurring',
      entityId: template.id,
      entityIdentifier: template.clientName || template.id,
      req,
      reason,
      impact: `Recurring template for ${template.clientName || template.id} soft-deleted.`,
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Recurring template safely archived. Document remains restorable.',
      isSoftDeleted: true,
      data: template,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST restore recurring template
router.post('/:id/restore', async (req, res) => {
  try {
    const query = buildRecurringQuery(req.params.id);
    const template = await Recurring.findOne(query);
    if (!template) return res.status(404).json({ success: false, error: 'Recurring template not found' });

    await template.restore();

    await recordAudit({
      action: 'RESTORE',
      entityType: 'Recurring',
      entityId: template.id,
      entityIdentifier: template.clientName || template.id,
      req,
      reason: req.body?.reason || 'Restored recurring template.',
      impact: 'Recurring template returned to active status.',
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Recurring template successfully restored to active records.',
      data: template,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
