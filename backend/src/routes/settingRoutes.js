import express from 'express';
import { Setting } from '../models/Setting.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    let settings = await Setting.findOne({ id: 'global_settings' });
    if (!settings) {
      settings = await Setting.create({ id: 'global_settings' });
    }
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/', async (req, res) => {
  try {
    const settings = await Setting.findOneAndUpdate(
      { id: 'global_settings' },
      { $set: req.body },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
