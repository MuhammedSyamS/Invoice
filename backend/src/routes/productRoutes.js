import express from 'express';
import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { recordAudit } from '../middleware/dataProtection.js';

const router = express.Router();

const buildProductQuery = (id) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  return isObjectId ? { $or: [{ id }, { _id: id }] } : { id };
};

// GET active products
router.get('/', async (req, res) => {
  try {
    const filter = req.query.includeDeleted === 'true' ? {} : { isDeleted: { $ne: true } };
    const products = await Product.find(filter).sort({ name: 1 });
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST save or upsert product
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) return res.status(400).json({ success: false, error: 'Product ID is required' });

    const product = await Product.findOneAndUpdate(
      { id: data.id },
      { $set: { ...data, isDeleted: false } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE product - Soft delete with audit log
router.delete('/:id', async (req, res) => {
  try {
    const query = buildProductQuery(req.params.id);
    const product = await Product.findOne(query);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    const deleter = req.user?.name || req.body?.deletedBy || 'Admin';
    const reason = req.body?.reason || 'User initiated product deletion';

    await product.softDelete(deleter, reason);

    await recordAudit({
      action: 'SOFT_DELETE',
      entityType: 'Product',
      entityId: product.id,
      entityIdentifier: product.name,
      req,
      reason,
      impact: `Product ${product.name} soft-deleted and preserved in archive.`,
      status: 'success',
    });

    res.json({
      success: true,
      message: `Product ${product.name} safely archived. Document remains restorable.`,
      isSoftDeleted: true,
      data: product,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST restore product
router.post('/:id/restore', async (req, res) => {
  try {
    const query = buildProductQuery(req.params.id);
    const product = await Product.findOne(query);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    await product.restore();

    await recordAudit({
      action: 'RESTORE',
      entityType: 'Product',
      entityId: product.id,
      entityIdentifier: product.name,
      req,
      reason: req.body?.reason || 'Restored product.',
      impact: `Product ${product.name} returned to active status.`,
      status: 'success',
    });

    res.json({
      success: true,
      message: `Product ${product.name} successfully restored to active records.`,
      data: product,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
