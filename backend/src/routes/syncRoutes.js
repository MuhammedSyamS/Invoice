import express from 'express';
import { Invoice } from '../models/Invoice.js';
import { Bill } from '../models/Bill.js';
import { Client } from '../models/Client.js';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Payment } from '../models/Payment.js';
import { Expense } from '../models/Expense.js';
import { Setting } from '../models/Setting.js';
import { User } from '../models/User.js';
import { Quote } from '../models/Quote.js';
import { Recurring } from '../models/Recurring.js';
import { recordAudit } from '../middleware/dataProtection.js';

const router = express.Router();

// GET all active data from MongoDB Atlas (excludes soft-deleted items)
router.get('/', async (req, res) => {
  try {
    const includeDeleted = req.query.includeDeleted === 'true';
    const filter = includeDeleted ? {} : { isDeleted: { $ne: true } };

    const [invoices, bills, clients, products, categories, payments, expenses, settings, users, quotes, recurring] = await Promise.all([
      Invoice.find(filter).sort({ createdAt: -1 }),
      Bill.find(filter).sort({ createdAt: -1 }),
      Client.find(filter).sort({ name: 1 }),
      Product.find(filter).sort({ name: 1 }),
      Category.find(filter).sort({ name: 1 }),
      Payment.find(filter).sort({ paymentDate: -1 }),
      Expense.find(filter).sort({ date: -1 }),
      Setting.findOne({ id: 'global_settings' }),
      User.find(filter).select('-password').sort({ createdAt: -1 }),
      Quote.find(filter).sort({ createdAt: -1 }),
      Recurring.find(filter).sort({ createdAt: -1 }),
    ]);

    res.json({
      success: true,
      data: {
        invoices,
        bills,
        clients,
        products,
        categories,
        payments,
        expenses,
        settings,
        users,
        quotes,
        recurring,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST bulk sync frontend data into MongoDB (non-destructive upsert)
router.post('/seed', async (req, res) => {
  try {
    const { invoices, bills, clients, products, categories, payments, expenses, settings, quotes, recurring } = req.body;

    const operations = [];

    if (Array.isArray(invoices) && invoices.length > 0) {
      operations.push(
        ...invoices.map((inv) =>
          Invoice.findOneAndUpdate({ id: inv.id }, { $set: { ...inv, isDeleted: false } }, { upsert: true, new: true })
        )
      );
    }

    if (Array.isArray(bills) && bills.length > 0) {
      operations.push(
        ...bills.map((b) =>
          Bill.findOneAndUpdate({ id: b.id }, { $set: { ...b, isDeleted: false } }, { upsert: true, new: true })
        )
      );
    }

    if (Array.isArray(clients) && clients.length > 0) {
      operations.push(
        ...clients.map((c) =>
          Client.findOneAndUpdate({ id: c.id }, { $set: { ...c, isDeleted: false } }, { upsert: true, new: true })
        )
      );
    }

    if (Array.isArray(products) && products.length > 0) {
      operations.push(
        ...products.map((p) =>
          Product.findOneAndUpdate({ id: p.id }, { $set: { ...p, isDeleted: false } }, { upsert: true, new: true })
        )
      );
    }

    if (Array.isArray(categories) && categories.length > 0) {
      operations.push(
        ...categories.map((cat) =>
          Category.findOneAndUpdate({ id: cat.id }, { $set: { ...cat, isDeleted: false } }, { upsert: true, new: true })
        )
      );
    }

    if (Array.isArray(payments) && payments.length > 0) {
      operations.push(
        ...payments.map((pmt) =>
          Payment.findOneAndUpdate({ id: pmt.id }, { $set: { ...pmt, isDeleted: false } }, { upsert: true, new: true })
        )
      );
    }

    if (Array.isArray(expenses) && expenses.length > 0) {
      operations.push(
        ...expenses.map((exp) =>
          Expense.findOneAndUpdate({ id: exp.id }, { $set: { ...exp, isDeleted: false } }, { upsert: true, new: true })
        )
      );
    }

    if (Array.isArray(quotes) && quotes.length > 0) {
      operations.push(
        ...quotes.map((q) =>
          Quote.findOneAndUpdate({ id: q.id }, { $set: { ...q, isDeleted: false } }, { upsert: true, new: true })
        )
      );
    }

    if (Array.isArray(recurring) && recurring.length > 0) {
      operations.push(
        ...recurring.map((r) =>
          Recurring.findOneAndUpdate({ id: r.id }, { $set: { ...r, isDeleted: false } }, { upsert: true, new: true })
        )
      );
    }

    if (settings && typeof settings === 'object') {
      operations.push(
        Setting.findOneAndUpdate(
          { id: 'global_settings' },
          { $set: settings },
          { upsert: true, new: true }
        )
      );
    }

    await Promise.all(operations);

    res.json({
      success: true,
      message: `Successfully synchronized ${operations.length} records into MongoDB Atlas database.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/sync/reset - Strict security interceptor: blocks all attempts to reset database
router.post('/reset', async (req, res) => {
  await recordAudit({
    action: 'DATABASE_RESET_BLOCKED',
    entityType: 'Database',
    entityId: 'global',
    entityIdentifier: 'highphaus_invoices',
    req,
    reason: 'Attempted to invoke database reset endpoint.',
    impact: 'Blocked by enterprise security policy.',
    status: 'blocked',
    details: {
      headers: req.headers,
    },
  });

  res.status(403).json({
    success: false,
    error: 'CRITICAL SECURITY VIOLATION: Database reset is permanently prohibited by enterprise data protection policy. Destructive resets cannot be performed.',
    code: 'DATABASE_RESET_PROHIBITED',
  });
});

export default router;
