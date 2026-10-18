import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uri = process.env.MONGODB_URI || 'mongodb+srv://highphaus_db_user:4EXXaOLtb3Im7Lo8@highp.4aoxomy.mongodb.net/highphaus_invoices?retryWrites=true&w=majority';

async function backup() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  
  const backupDir = path.resolve(__dirname, '../../backups', new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(backupDir, { recursive: true });
  
  console.log(`Starting backup of database ${db.databaseName} to ${backupDir}...`);
  const manifest = {
    database: db.databaseName,
    createdAt: new Date().toISOString(),
    collections: {},
  };

  for (const c of collections) {
    const docs = await db.collection(c.name).find().toArray();
    manifest.collections[c.name] = docs.length;
    const filePath = path.join(backupDir, `${c.name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf-8');
    console.log(`✓ Backed up ${docs.length} documents from collection '${c.name}'`);
  }

  fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  console.log('✅ Enterprise backup completed successfully!');
  process.exit(0);
}

backup().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
