import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    documentId: { type: String, required: true, index: true },
    documentNumber: { type: String, index: true },
    documentType: { type: String, enum: ['invoice', 'bill'], required: true },
    clientName: { type: String, required: true },
    customerCompany: { type: String },
    amount: { type: Number, required: true },
    paymentDate: { type: String, required: true },
    paymentMethod: { type: String, required: true },
    referenceNumber: { type: String, default: '' },
    notes: { type: String, default: '' },
    isAdvance: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Payment = mongoose.model('Payment', paymentSchema);
