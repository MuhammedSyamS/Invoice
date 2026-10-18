import mongoose from 'mongoose';

const lineItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    productId: { type: String },
    description: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    unitPrice: { type: Number, required: true, default: 0 },
    taxRate: { type: Number, default: 0 },
    amount: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const recurringSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    clientId: { type: String, required: true },
    clientName: { type: String, required: true },
    clientCompany: { type: String, default: '' },
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
      default: 'monthly',
    },
    items: [lineItemSchema],
    amount: { type: Number, required: true, default: 0 },
    currency: { type: String, default: 'INR' },
    nextDueDate: { type: String, required: true },
    lastGeneratedDate: { type: String },
    status: {
      type: String,
      enum: ['active', 'paused'],
      default: 'active',
      index: true,
    },
    createdAt: { type: String },
    lastModifiedBy: { type: String },
    lastModifiedAt: { type: String },
  },
  { timestamps: true }
);

export const Recurring = mongoose.model('Recurring', recurringSchema);
