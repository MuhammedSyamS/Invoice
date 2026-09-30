import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, default: 'global_settings' },
    companyName: { type: String, default: 'Highphaus Creative Marketing Agency' },
    tagline: { type: String, default: 'Full-Funnel Digital Growth & Brand Strategy' },
    email: { type: String, default: 'accounts@highphaus.com' },
    phone: { type: String, default: '+91 98765 43210' },
    website: { type: String, default: 'www.highphaus.com' },
    address: { type: String, default: 'Level 4, Highphaus Tower, Cyber City, Bangalore - 560001, Karnataka, India' },
    pincode: { type: String, default: '560001' },
    taxId: { type: String, default: '29ABCDE1234F1Z5' },
    pan: { type: String, default: 'ABCDE1234F' },
    currency: { type: String, default: 'INR' },
    defaultTaxRate: { type: Number, default: 18 },
    invoicePrefix: { type: String, default: 'INV' },
    billPrefix: { type: String, default: 'BILL' },
    defaultPaymentTermsDays: { type: Number, default: 15 },
    notesFooter: { type: String, default: 'Thank you for partnering with Highphaus. Payment is due as per contract terms via NEFT/IMPS or UPI.' },
    billNotesFooter: { type: String, default: 'All bill purchases are eligible for service exchange within 7 days against original receipt.' },
    bankName: { type: String, default: 'HDFC Bank Ltd' },
    accountHolderName: { type: String, default: 'Highphaus Creative Marketing Agency' },
    accountNumber: { type: String, default: '50200012345678' },
    ifscSwift: { type: String, default: 'HDFC0001234' },
    upiId: { type: String, default: 'highphaus@hdfcbank' },
    logoUrl: { type: String, default: '' },
    brandColor: { type: String, default: '#6366f1' },
    theme: { type: String, default: 'dark' },
  },
  { timestamps: true }
);

export const Setting = mongoose.model('Setting', settingSchema);
