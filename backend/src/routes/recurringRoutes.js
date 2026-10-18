import express from 'express';
import { Recurring } from '../models/Recurring.js';

const router = express.Router();

// GET all recurring templates
router.get('/', async (req, res) => {
  try {
    const templates = await Recurring.find().sort({ createdAt: -1 });
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
      { $set: data },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: template });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE recurring template
router.delete('/:id', async (req, res) => {
  try {
    const result = await Recurring.findOneAndDelete({ id: req.params.id });
    if (!result) return res.status(404).json({ success: false, error: 'Recurring template not found' });
    res.json({ success: true, message: 'Recurring template deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
