import express from 'express';
import { Bill } from '../models/Bill.js';

const router = express.Router();

// GET all bills
router.get('/', async (req, res) => {
  try {
    const bills = await Bill.find().sort({ createdAt: -1 });
    res.json({ success: true, data: bills });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create or upsert bill
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) return res.status(400).json({ success: false, error: 'Bill ID is required' });

    const bill = await Bill.findOneAndUpdate(
      { id: data.id },
      { $set: data },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: bill });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE bill
router.delete('/:id', async (req, res) => {
  try {
    const result = await Bill.findOneAndDelete({ id: req.params.id });
    if (!result) return res.status(404).json({ success: false, error: 'Bill not found' });
    res.json({ success: true, message: 'Bill deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
