import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    date: { type: String, required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    payee: { type: String, default: '' },
    reason: { type: String, default: '' },
    description: { type: String, default: '' },
    notes: { type: String, default: '' },
    taxAmount: { type: Number, default: 0 },
    paymentMethod: { type: String, default: 'UPI' },
    referenceNumber: { type: String, default: '' },
    status: { type: String, default: 'paid' },
    receiptUrl: { type: String },
    createdBy: { type: String, default: 'Admin' },
    createdAt: { type: String },
    lastModifiedBy: { type: String },
    lastModifiedAt: { type: String },
  },
  { timestamps: true }
);

export const Expense = mongoose.model('Expense', expenseSchema);
