import express from 'express';
import mongoose from 'mongoose';
import { Client } from '../models/Client.js';
import { recordAudit } from '../middleware/dataProtection.js';

const router = express.Router();

const buildClientQuery = (id) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  return isObjectId ? { $or: [{ id }, { _id: id }] } : { id };
};

// GET active clients
router.get('/', async (req, res) => {
  try {
    const filter = req.query.includeDeleted === 'true' ? {} : { isDeleted: { $ne: true } };
    const clients = await Client.find(filter).sort({ name: 1 });
    res.json({ success: true, data: clients });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Failed to fetch clients.' : err.message,
    });
  }
});

// POST save or upsert client
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) return res.status(400).json({ success: false, error: 'Client ID is required' });

    const client = await Client.findOneAndUpdate(
      { id: data.id },
      { $set: { ...data, isDeleted: false } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: client });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Failed to save client.' : err.message,
    });
  }
});

// DELETE client - Soft delete with audit log
router.delete('/:id', async (req, res) => {
  try {
    const query = buildClientQuery(req.params.id);
    const client = await Client.findOne(query);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    const deleter = req.user?.name || req.body?.deletedBy || 'Admin';
    const reason = req.body?.reason || 'User initiated client archiving';

    await client.softDelete(deleter, reason);

    await recordAudit({
      action: 'SOFT_DELETE',
      entityType: 'Client',
      entityId: client.id,
      entityIdentifier: client.name,
      req,
      reason,
      impact: `Client record ${client.name} soft-deleted and preserved in archive.`,
      status: 'success',
    });

    res.json({
      success: true,
      message: `Client ${client.name} safely archived. Document remains fully restorable.`,
      isSoftDeleted: true,
      data: client,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Failed to archive client.' : err.message,
    });
  }
});

// POST restore client
router.post('/:id/restore', async (req, res) => {
  try {
    const query = buildClientQuery(req.params.id);
    const client = await Client.findOne(query);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    await client.restore();

    await recordAudit({
      action: 'RESTORE',
      entityType: 'Client',
      entityId: client.id,
      entityIdentifier: client.name,
      req,
      reason: req.body?.reason || 'Restored to active clients list.',
      impact: `Client ${client.name} returned to active status.`,
      status: 'success',
    });

    res.json({
      success: true,
      message: `Client ${client.name} successfully restored to active records.`,
      data: client,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Failed to restore client.' : err.message,
    });
  }
});

export default router;
