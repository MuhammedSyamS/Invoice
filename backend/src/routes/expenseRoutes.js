import express from 'express';
import mongoose from 'mongoose';
import { Expense } from '../models/Expense.js';
import { recordAudit } from '../middleware/dataProtection.js';

const router = express.Router();

const buildExpenseQuery = (id) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  return isObjectId ? { $or: [{ id }, { _id: id }] } : { id };
};

// GET active expenses
router.get('/', async (req, res) => {
  try {
    const filter = req.query.includeDeleted === 'true' ? {} : { isDeleted: { $ne: true } };
    const expenses = await Expense.find(filter).sort({ date: -1 });
    res.json({ success: true, data: expenses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST save or upsert expense
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) return res.status(400).json({ success: false, error: 'Expense ID is required' });

    const expense = await Expense.findOneAndUpdate(
      { id: data.id },
      { $set: { ...data, isDeleted: false } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: expense });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE expense - Soft delete with audit log
router.delete('/:id', async (req, res) => {
  try {
    const query = buildExpenseQuery(req.params.id);
    const expense = await Expense.findOne(query);
    if (!expense) return res.status(404).json({ success: false, error: 'Expense not found' });

    const deleter = req.user?.name || req.body?.deletedBy || 'Admin';
    const reason = req.body?.reason || 'User initiated expense deletion';

    await expense.softDelete(deleter, reason);

    await recordAudit({
      action: 'SOFT_DELETE',
      entityType: 'Expense',
      entityId: expense.id,
      entityIdentifier: `${expense.category} - ₹${expense.amount} (${expense.payee || 'Expense'})`,
      req,
      reason,
      impact: `Expense record of ₹${expense.amount} soft-deleted and preserved in archive.`,
      status: 'success',
      details: {
        amount: expense.amount,
        category: expense.category,
        payee: expense.payee,
      },
    });

    res.json({
      success: true,
      message: 'Expense safely archived. Document remains fully restorable.',
      isSoftDeleted: true,
      data: expense,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST restore expense
router.post('/:id/restore', async (req, res) => {
  try {
    const query = buildExpenseQuery(req.params.id);
    const expense = await Expense.findOne(query);
    if (!expense) return res.status(404).json({ success: false, error: 'Expense not found' });

    await expense.restore();

    await recordAudit({
      action: 'RESTORE',
      entityType: 'Expense',
      entityId: expense.id,
      entityIdentifier: `${expense.category} - ₹${expense.amount}`,
      req,
      reason: req.body?.reason || 'Restored to active expenses list.',
      impact: `Expense of ₹${expense.amount} returned to active status.`,
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Expense successfully restored to active records.',
      data: expense,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
