import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    color: { type: String, default: '#6366f1' },
    icon: { type: String, default: 'Tag' },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Category = mongoose.model('Category', categorySchema);
