import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, default: 0 },
    taxRate: { type: Number, default: 18 },
    hsnSac: { type: String, default: '' },
    unit: { type: String, default: 'unit' },
    categoryId: { type: String, default: '' },
    categoryName: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Product = mongoose.model('Product', productSchema);
