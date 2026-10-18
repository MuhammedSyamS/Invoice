import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb+srv://highphaus_db_user:4EXXaOLtb3Im7Lo8@highp.4aoxomy.mongodb.net/highphaus_invoices?retryWrites=true&w=majority';

export const expensesToRestore = [
  {
    id: 'exp-001',
    category: 'Software & Subscriptions',
    payee: 'Figma Inc & Adobe Creative Cloud',
    reason: 'Design Software Enterprise Licensing',
    amount: 14500,
    taxAmount: 2610,
    date: '2026-08-05',
    paymentMethod: 'Card',
    referenceNumber: 'SUB-FIGMA-8841',
    notes: 'Monthly design team enterprise licenses',
    status: 'paid',
    createdAt: '2026-08-05T10:00:00.000Z',
    createdBy: 'Admin',
  },
  {
    id: 'exp-002',
    category: 'Marketing & Ads',
    payee: 'Google Ads & Meta Advertising',
    reason: 'Agency Self-Promotion & Ads Campaign',
    amount: 45000,
    taxAmount: 8100,
    date: '2026-08-18',
    paymentMethod: 'Bank Transfer',
    referenceNumber: 'WIRE-META-0049',
    notes: 'Agency self-promotion campaign ad spend',
    status: 'paid',
    createdAt: '2026-08-18T14:30:00.000Z',
    createdBy: 'Admin',
  },
  {
    id: 'exp-003',
    category: 'Contractors & Freelancers',
    payee: 'Rahul K. (3D Animator)',
    reason: 'Samudhra Water 3D Asset Modeling',
    amount: 35000,
    taxAmount: 0,
    date: '2026-08-28',
    paymentMethod: 'UPI',
    referenceNumber: 'UPI-RAHUL-3D',
    notes: 'Freelance 3D asset modeling for client commercial',
    status: 'paid',
    createdAt: '2026-08-28T16:45:00.000Z',
    createdBy: 'Admin',
  },
  {
    id: 'exp-test-01',
    category: 'Software & Subscriptions',
    payee: 'Adobe Creative Cloud',
    reason: 'Design License',
    amount: 1200,
    taxAmount: 0,
    date: '2026-10-18',
    paymentMethod: 'UPI',
    referenceNumber: '',
    notes: '',
    status: 'paid',
    createdAt: '2026-10-18T00:12:22.170Z',
    createdBy: 'Admin',
  },
];

async function run() {
  await mongoose.connect(uri);
  const col = mongoose.connection.db.collection('expenses');
  for (const exp of expensesToRestore) {
    await col.updateOne({ id: exp.id }, { $set: exp }, { upsert: true });
    console.log('Restored expense:', exp.id, exp.payee, exp.amount);
  }
  const allExpenses = await col.find().toArray();
  console.log('Current expenses in MongoDB count:', allExpenses.length);
  allExpenses.forEach(e => console.log(' - Expense:', e.id, e.payee, '₹' + e.amount));
  process.exit(0);
}

run().catch(err => {
  console.error('Restore error:', err);
  process.exit(1);
});
