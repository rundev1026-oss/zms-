import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';

const dbPath = path.resolve('data/zms.db');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.resolve(`data/zms.db.backup-pre-reset-${timestamp}`);

console.log('Source DB:', dbPath);
const stat = fs.statSync(dbPath);
console.log('Source DB Size:', (stat.size / 1024 / 1024).toFixed(3), 'MB');

fs.copyFileSync(dbPath, backupPath);
const backupStat = fs.statSync(backupPath);
console.log('Backup created at:', backupPath);
console.log('Backup DB Size:', (backupStat.size / 1024 / 1024).toFixed(3), 'MB');

const backupClient = createClient({ url: `file:${backupPath.replace(/\\/g, '/')}` });
const integrity = await backupClient.execute('PRAGMA integrity_check');
console.log('Integrity check on backup:', JSON.stringify(integrity.rows));

// Also verify tables count in backup
const tables = await backupClient.execute("SELECT count(*) as cnt FROM sqlite_master WHERE type='table'");
console.log('Total tables in backup:', tables.rows[0].cnt);
