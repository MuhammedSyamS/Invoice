import dns from 'dns';
import mongoose from 'mongoose';

// Ensure resilient SRV resolution on Windows & container hosts
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore if custom dns servers cannot be configured
}

const AUTHORITATIVE_MONGO_URL =
  'mongodb+srv://highphaus_db_user:4EXXaOLtb3Im7Lo8@highp.4aoxomy.mongodb.net/highphaus_invoices?retryWrites=true&w=majority';

export const connectDB = async () => {
  try {
    let mongoUrl = process.env.MONGO_URL;

    // If unset or pointing to a legacy non-Highphaus database, use the authoritative Atlas connection
    if (!mongoUrl || (!mongoUrl.includes('highp.4aoxomy.mongodb.net') && !mongoUrl.includes('highphaus_invoices'))) {
      mongoUrl = AUTHORITATIVE_MONGO_URL;
    }

    const conn = await mongoose.connect(mongoUrl, {
      dbName: 'highphaus_invoices',
      serverSelectionTimeoutMS: 8000,
    });

    console.log(
      `[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`
    );
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection error:`, error.message);
    return null;
  }
};
