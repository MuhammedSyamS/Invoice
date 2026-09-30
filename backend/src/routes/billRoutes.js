import express from 'express';
import mongoose from 'mongoose';
import { Bill } from '../models/Bill.js';
import { Payment } from '../models/Payment.js';
import { calculateAuthoritativeBillFinancials } from '../utils/finance.js';

const router = express.Router();

// GET all bills
router.get('/', async (req, res) => {
  try {
    const bills = await Bill.find().sort({ createdAt: -1 });
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

    const existingPayments = await Payment.find({
      $or: [{ billId: data.id }, { documentId: data.id }],
    });

    const finalizedData = calculateAuthoritativeBillFinancials(data, existingPayments);

    const bill = await Bill.findOneAndUpdate(
      { id: data.id },
      { $set: finalizedData },
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

// DELETE bill
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { $or: [{ id }, { _id: id }, { billNumber: id }] } : { $or: [{ id }, { billNumber: id }] };
    const result = await Bill.findOneAndDelete(query);
    if (!result) return res.status(404).json({ success: false, error: 'Bill not found' });
    res.json({ success: true, message: 'Bill deleted successfully' });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Failed to delete bill.' : err.message,
    });
  }
});

export default router;
