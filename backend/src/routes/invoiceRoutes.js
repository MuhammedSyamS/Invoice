import express from 'express';
import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice.js';
import { Payment } from '../models/Payment.js';
import { calculateAuthoritativeInvoiceFinancials } from '../utils/finance.js';
import { recordAudit } from '../middleware/dataProtection.js';

const router = express.Router();

const buildInvoiceQuery = (id) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  return isObjectId ? { $or: [{ id }, { _id: id }, { invoiceNumber: id }] } : { $or: [{ id }, { invoiceNumber: id }] };
};

// GET all active invoices (excludes soft-deleted by default)
router.get('/', async (req, res) => {
  try {
    const filter = req.query.includeDeleted === 'true' ? {} : { isDeleted: { $ne: true } };
    const invoices = await Invoice.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: invoices });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Failed to fetch invoices.' : err.message,
    });
  }
});

// GET invoice by id
router.get('/:id', async (req, res) => {
  try {
    const query = buildInvoiceQuery(req.params.id);
    const filter = req.query.includeDeleted === 'true' ? query : { ...query, isDeleted: { $ne: true } };
    const invoice = await Invoice.findOne(filter);
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Failed to fetch invoice.' : err.message,
    });
  }
});

// POST create or upsert invoice with authoritative financials
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) return res.status(400).json({ success: false, error: 'Invoice ID is required' });

    // Look up existing payments for this invoice to authoritatively calculate ledger balance
    const queryIds = [data.id].filter(Boolean);
    if (data._id) queryIds.push(String(data._id));

    const existingPayments = await Payment.find({
      documentType: 'invoice',
      $or: [{ invoiceId: { $in: queryIds } }, { documentId: { $in: queryIds } }],
      isDeleted: { $ne: true },
    });

    const finalizedData = calculateAuthoritativeInvoiceFinancials(data, existingPayments);

    const invoice = await Invoice.findOneAndUpdate(
      { id: data.id },
      { $set: { ...finalizedData, isDeleted: false } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Failed to save invoice.' : err.message,
    });
  }
});

// PUT update invoice by id
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;

    const queryIds = [id, data.id].filter(Boolean);
    if (data._id) queryIds.push(String(data._id));

    const existingPayments = await Payment.find({
      documentType: 'invoice',
      $or: [{ invoiceId: { $in: queryIds } }, { documentId: { $in: queryIds } }],
      isDeleted: { $ne: true },
    });

    const finalizedData = calculateAuthoritativeInvoiceFinancials(data, existingPayments);

    const invoice = await Invoice.findOneAndUpdate(
      { id },
      { $set: finalizedData },
      { new: true }
    );
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Failed to update invoice.' : err.message,
    });
  }
});

// DELETE invoice - Soft delete with full audit trail (Permanent destruction prohibited)
router.delete('/:id', async (req, res) => {
  try {
    const query = buildInvoiceQuery(req.params.id);
    const invoice = await Invoice.findOne(query);
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    const deleter = req.user?.name || req.body?.deletedBy || 'Admin';
    const reason = req.body?.reason || 'User initiated invoice deletion';

    await invoice.softDelete(deleter, reason);

    await recordAudit({
      action: 'SOFT_DELETE',
      entityType: 'Invoice',
      entityId: invoice.id,
      entityIdentifier: invoice.invoiceNumber,
      req,
      reason,
      impact: `Invoice ${invoice.invoiceNumber} soft-deleted and preserved in MongoDB Atlas archive.`,
      status: 'success',
      details: {
        total: invoice.total,
        clientName: invoice.clientName,
      },
    });

    res.json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} safely archived. Document remains fully preserved and restorable.`,
      isSoftDeleted: true,
      data: invoice,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Failed to archive invoice.' : err.message,
    });
  }
});

// POST restore invoice
router.post('/:id/restore', async (req, res) => {
  try {
    const query = buildInvoiceQuery(req.params.id);
    const invoice = await Invoice.findOne(query);
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    await invoice.restore();

    await recordAudit({
      action: 'RESTORE',
      entityType: 'Invoice',
      entityId: invoice.id,
      entityIdentifier: invoice.invoiceNumber,
      req,
      reason: req.body?.reason || 'Restored to active invoices list.',
      impact: `Invoice ${invoice.invoiceNumber} returned to active status.`,
      status: 'success',
    });

    res.json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} successfully restored to active records.`,
      data: invoice,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Failed to restore invoice.' : err.message,
    });
  }
});

export default router;
