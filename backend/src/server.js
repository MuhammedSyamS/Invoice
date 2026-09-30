import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
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

// Load environment variables — .env.production takes priority in production
const envFile = process.env.NODE_ENV === 'production' ? '../.env.production' : '../.env';
dotenv.config({ path: path.resolve(__dirname, envFile) });
// Fallback: try root .env if MONGO_URL still not set
if (!process.env.MONGO_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Managed by frontend host
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration — strict in production, permits localhost dev origins & configured production origins
const allowedOrigins = [
  'https://invoice-saas-two.vercel.app',
  'https://invoice-backend-j9fv.onrender.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5000',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
}

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow non-browser requests (mobile, postman, curl)
      if (!origin) return cb(null, true);
      const isAllowed = allowedOrigins.some((o) => origin === o || origin.startsWith(o));
      if (isAllowed || !isProd) {
        return cb(null, true);
      }
      return cb(null, false);
    },
    credentials: true,
  })
);

// Rate Limiting — 1000 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

app.use(express.json({ limit: '15mb' }));

// Health Check Endpoint with active MongoDB connection status check
app.get('/api/health', (req, res) => {
  const readyStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const dbStateIndex = mongoose.connection.readyState;
  const dbStatus = readyStates[dbStateIndex] || 'unknown';
  const isDbReady = dbStateIndex === 1;

  res.status(isDbReady ? 200 : 200).json({
    status: isDbReady ? 'online' : 'degraded',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      configured: Boolean(process.env.MONGO_URL),
    },
    environment: process.env.NODE_ENV || 'development',
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

// Centralized Production Error Handler (prevents stack traces & query leakage)
app.use((err, req, res, next) => {
  console.error('[API Error]:', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    error: isProd ? 'Internal server error occurred.' : (err.message || 'Internal server error occurred.'),
  });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`[Backend Server] Highphaus SaaS API running on http://localhost:${PORT}`);
      console.log(`[Backend Server] NODE_ENV=${process.env.NODE_ENV || 'development'}`);
      console.log(`[Backend Server] CORS allowed origins: ${allowedOrigins.join(', ')}`);
    });
  });
}

export default app;
