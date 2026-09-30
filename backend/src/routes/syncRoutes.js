import express from 'express';
import { Invoice } from '../models/Invoice.js';
import { Bill } from '../models/Bill.js';
import { Client } from '../models/Client.js';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Payment } from '../models/Payment.js';
import { Expense } from '../models/Expense.js';
import { Setting } from '../models/Setting.js';

const router = express.Router();

// GET all data from MongoDB for lightning-fast full initial load
router.get('/', async (req, res) => {
  try {
    const [invoices, bills, clients, products, categories, payments, expenses, settings] = await Promise.all([
      Invoice.find().sort({ createdAt: -1 }),
      Bill.find().sort({ createdAt: -1 }),
      Client.find().sort({ name: 1 }),
      Product.find().sort({ name: 1 }),
      Category.find().sort({ name: 1 }),
      Payment.find().sort({ paymentDate: -1 }),
      Expense.find().sort({ date: -1 }),
      Setting.findOne({ id: 'global_settings' }),
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
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST bulk seed or sync frontend data into MongoDB
router.post('/seed', async (req, res) => {
  try {
    const { invoices, bills, clients, products, categories, payments, expenses, settings } = req.body;

    const operations = [];

    if (Array.isArray(invoices) && invoices.length > 0) {
      operations.push(
        ...invoices.map((inv) =>
          Invoice.findOneAndUpdate({ id: inv.id }, { $set: inv }, { upsert: true, new: true })
        )
      );
    }

    if (Array.isArray(bills) && bills.length > 0) {
      operations.push(
        ...bills.map((b) =>
          Bill.findOneAndUpdate({ id: b.id }, { $set: b }, { upsert: true, new: true })
        )
      );
    }

    if (Array.isArray(clients) && clients.length > 0) {
      operations.push(
        ...clients.map((c) =>
          Client.findOneAndUpdate({ id: c.id }, { $set: c }, { upsert: true, new: true })
        )
      );
    }

    if (Array.isArray(products) && products.length > 0) {
      operations.push(
        ...products.map((p) =>
          Product.findOneAndUpdate({ id: p.id }, { $set: p }, { upsert: true, new: true })
        )
      );
    }

    if (Array.isArray(categories) && categories.length > 0) {
      operations.push(
        ...categories.map((cat) =>
          Category.findOneAndUpdate({ id: cat.id }, { $set: cat }, { upsert: true, new: true })
        )
      );
    }

    if (Array.isArray(payments) && payments.length > 0) {
      operations.push(
        ...payments.map((pmt) =>
          Payment.findOneAndUpdate({ id: pmt.id }, { $set: pmt }, { upsert: true, new: true })
        )
      );
    }

    if (Array.isArray(expenses) && expenses.length > 0) {
      operations.push(
        ...expenses.map((exp) =>
          Expense.findOneAndUpdate({ id: exp.id }, { $set: exp }, { upsert: true, new: true })
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
      message: `Successfully synchronized ${operations.length} records into MongoDB database.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
