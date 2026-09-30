import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    date: { type: String, required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    paymentMethod: { type: String, default: 'UPI' },
    receiptUrl: { type: String },
  },
  { timestamps: true }
);

export const Expense = mongoose.model('Expense', expenseSchema);
