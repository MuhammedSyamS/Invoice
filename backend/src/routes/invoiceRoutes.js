import express from 'express';
import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice.js';
import { Payment } from '../models/Payment.js';
import { calculateAuthoritativeInvoiceFinancials } from '../utils/finance.js';

const router = express.Router();

// GET all invoices
router.get('/', async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
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
    const id = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { $or: [{ id }, { _id: id }, { invoiceNumber: id }] } : { $or: [{ id }, { invoiceNumber: id }] };
    const invoice = await Invoice.findOne(query);
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
    const existingPayments = await Payment.find({
      $or: [{ invoiceId: data.id }, { documentId: data.id }],
    });

    const finalizedData = calculateAuthoritativeInvoiceFinancials(data, existingPayments);

    const invoice = await Invoice.findOneAndUpdate(
      { id: data.id },
      { $set: finalizedData },
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

    const existingPayments = await Payment.find({
      $or: [{ invoiceId: id }, { documentId: id }],
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

// DELETE invoice by id
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { $or: [{ id }, { _id: id }, { invoiceNumber: id }] } : { $or: [{ id }, { invoiceNumber: id }] };
    const result = await Invoice.findOneAndDelete(query);
    if (!result) return res.status(404).json({ success: false, error: 'Invoice not found' });
    res.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Failed to delete invoice.' : err.message,
    });
  }
});

export default router;
