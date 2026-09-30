import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';

import invoiceRoutes from './routes/invoiceRoutes.js';
import billRoutes from './routes/billRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import settingRoutes from './routes/settingRoutes.js';
import syncRoutes from './routes/syncRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env or root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
if (!process.env.MONGO_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

// CORS — allow Vercel frontend in production, all in dev
const allowedOrigins = isProd
  ? [
      process.env.FRONTEND_URL || 'https://invoice-saas-two.vercel.app',
      'https://invoice-backend-j9fv.onrender.com',
    ]
  : ['*'];

// Middleware
app.use(
  cors(
    isProd
      ? {
          origin: (origin, cb) => {
            if (!origin || allowedOrigins.some((o) => origin.startsWith(o))) return cb(null, true);
            cb(new Error('CORS not allowed: ' + origin));
          },
          credentials: true,
        }
      : { origin: '*' }
  )
);
app.use(express.json({ limit: '15mb' }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    database: process.env.MONGO_URL ? 'configured' : 'missing_connection_string',
  });
});

// API Routes
app.use('/api/invoices', invoiceRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/sync', syncRoutes);

// Root fallback
app.get('/', (req, res) => {
  res.send('Highphaus Invoicing SaaS Backend API with MongoDB is running.');
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`[Backend Server] Highphaus SaaS API running on http://localhost:${PORT}`);
      console.log(`[Backend Server] NODE_ENV=${process.env.NODE_ENV || 'development'}`);
      if (isProd) console.log(`[Backend Server] CORS allowed origins: ${allowedOrigins.join(', ')}`);
    });
  });
}

export default app;
