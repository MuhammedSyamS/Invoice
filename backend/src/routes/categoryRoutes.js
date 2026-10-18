import express from 'express';
import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { recordAudit } from '../middleware/dataProtection.js';

const router = express.Router();

const buildCategoryQuery = (id) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  return isObjectId ? { $or: [{ id }, { _id: id }] } : { id };
};

// GET active categories
router.get('/', async (req, res) => {
  try {
    const filter = req.query.includeDeleted === 'true' ? {} : { isDeleted: { $ne: true } };
    const categories = await Category.find(filter).sort({ name: 1 });
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST save or upsert category
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) return res.status(400).json({ success: false, error: 'Category ID is required' });

    const category = await Category.findOneAndUpdate(
      { id: data.id },
      { $set: { ...data, isDeleted: false } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE category - Soft delete with audit log
router.delete('/:id', async (req, res) => {
  try {
    const query = buildCategoryQuery(req.params.id);
    const category = await Category.findOne(query);
    if (!category) return res.status(404).json({ success: false, error: 'Category not found' });

    const deleter = req.user?.name || req.body?.deletedBy || 'Admin';
    const reason = req.body?.reason || 'User initiated category deletion';

    await category.softDelete(deleter, reason);

    await recordAudit({
      action: 'SOFT_DELETE',
      entityType: 'Category',
      entityId: category.id,
      entityIdentifier: category.name,
      req,
      reason,
      impact: `Category ${category.name} soft-deleted and preserved in archive.`,
      status: 'success',
    });

    res.json({
      success: true,
      message: `Category ${category.name} safely archived. Document remains restorable.`,
      isSoftDeleted: true,
      data: category,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST restore category
router.post('/:id/restore', async (req, res) => {
  try {
    const query = buildCategoryQuery(req.params.id);
    const category = await Category.findOne(query);
    if (!category) return res.status(404).json({ success: false, error: 'Category not found' });

    await category.restore();

    await recordAudit({
      action: 'RESTORE',
      entityType: 'Category',
      entityId: category.id,
      entityIdentifier: category.name,
      req,
      reason: req.body?.reason || 'Restored category.',
      impact: `Category ${category.name} returned to active status.`,
      status: 'success',
    });

    res.json({
      success: true,
      message: `Category ${category.name} successfully restored to active records.`,
      data: category,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
