import express from 'express';
import { Payment } from '../models/Payment.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const payments = await Payment.find().sort({ paymentDate: -1, createdAt: -1 });
    res.json({ success: true, data: payments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) return res.status(400).json({ success: false, error: 'Payment ID is required' });

    const payment = await Payment.findOneAndUpdate(
      { id: data.id },
      { $set: data },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: payment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await Payment.findOneAndDelete({ id: req.params.id });
    if (!result) return res.status(404).json({ success: false, error: 'Payment not found' });
    res.json({ success: true, message: 'Payment deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
