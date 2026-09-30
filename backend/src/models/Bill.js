import mongoose from 'mongoose';

const billItemSchema = new mongoose.Schema(
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

const billSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    billNumber: { type: String, required: true, index: true },
    customerId: { type: String, required: true },
    customerName: { type: String, required: true },
    customerCompany: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    customerEmail: { type: String, default: '' },
    customerAddress: { type: String, default: '' },
    customerGstin: { type: String, default: '' },
    billDate: { type: String, required: true },
    items: [billItemSchema],
    subtotal: { type: Number, required: true, default: 0 },
    discountRate: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    isInterState: { type: Boolean, default: false },
    roundOff: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    categoryId: { type: String, index: true },
    categoryName: { type: String },
    paymentStatus: {
      type: String,
      enum: ['paid', 'partially_paid', 'unpaid', 'cancelled'],
      default: 'paid',
      index: true,
    },
    paymentMethod: { type: String, default: 'UPI' },
    notes: { type: String, default: '' },
    signatoryTitle: { type: String, default: '' },
    currency: { type: String, default: 'INR' },
  },
  { timestamps: true }
);

export const Bill = mongoose.model('Bill', billSchema);
