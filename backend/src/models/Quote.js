import mongoose from 'mongoose';

const lineItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    productId: { type: String },
    description: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    unitPrice: { type: Number, required: true, default: 0 },
    taxRate: { type: Number, default: 0 },
    hsnSac: { type: String },
    unit: { type: String, default: 'unit' },
    categoryId: { type: String },
    categoryName: { type: String },
    amount: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const quoteSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    quoteNumber: { type: String, required: true, index: true },
    clientId: { type: String, required: true },
    clientName: { type: String, required: true },
    clientCompany: { type: String, default: '' },
    clientEmail: { type: String, default: '' },
    issueDate: { type: String, required: true },
    validUntil: { type: String, required: true },
    items: [lineItemSchema],
    subtotal: { type: Number, required: true, default: 0 },
    taxTotal: { type: Number, default: 0 },
    discountRate: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'sent', 'accepted', 'rejected', 'converted'],
      default: 'draft',
      index: true,
    },
    notes: { type: String, default: '' },
    terms: { type: String, default: '' },
    currency: { type: String, default: 'INR' },
    convertedInvoiceId: { type: String },
    createdAt: { type: String },
    lastModifiedBy: { type: String },
    lastModifiedAt: { type: String },
  },
  { timestamps: true }
);

export const Quote = mongoose.model('Quote', quoteSchema);
