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

const invoiceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    invoiceNumber: { type: String, required: true, index: true },
    clientId: { type: String, required: true },
    clientName: { type: String, required: true },
    clientCompany: { type: String, default: '' },
    clientEmail: { type: String, default: '' },
    clientPhone: { type: String, default: '' },
    clientAddress: { type: String, default: '' },
    clientGstin: { type: String, default: '' },
    clientPan: { type: String, default: '' },
    issueDate: { type: String, required: true },
    dueDate: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled'],
      default: 'draft',
      index: true,
    },
    items: [lineItemSchema],
    subtotal: { type: Number, required: true, default: 0 },
    discountRate: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    categoryId: { type: String, index: true },
    categoryName: { type: String },
    terms: { type: String, default: '' },
    paymentTermsDays: { type: Number },
    notes: { type: String, default: '' },
    currency: { type: String, default: 'INR' },
    isInterState: { type: Boolean, default: false },

    // Signatory and Company Overrides
    signatoryTitle: { type: String, default: '' },
    companyName: { type: String },
    companyTagline: { type: String },
    companyAddress: { type: String },
    companyPincode: { type: String },
    companyTaxId: { type: String },
    companyPhone: { type: String },
    companyEmail: { type: String },
    companyWebsite: { type: String },
    bankName: { type: String },
    accountName: { type: String },
    accountNumber: { type: String },
    ifscSwift: { type: String },
    upiId: { type: String },
    logoUrl: { type: String },
    showCompanyLogo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Invoice = mongoose.model('Invoice', invoiceSchema);
