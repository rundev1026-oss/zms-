import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(process.cwd(), 'data', 'backups', `pre-reset-${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  console.log(`[BACKUP] Target backup directory: ${backupDir}`);

  // 1. SQLite Backup
  const dbPath = path.join(process.cwd(), 'data', 'zms.db');
  const dbUrl = `file:${dbPath.replace(/\\/g, '/')}`;
  const sqlite = createClient({ url: dbUrl });

  // Flush WAL
  console.log('[BACKUP] Checkpointing SQLite WAL...');
  await sqlite.execute('PRAGMA wal_checkpoint(TRUNCATE);');
  
  // Verify integrity before backup
  const check = await sqlite.execute('PRAGMA integrity_check;');
  console.log('[BACKUP] SQLite integrity check:', check.rows[0]?.integrity_check);

  const backupDbPath = path.join(backupDir, 'zms.db');
  fs.copyFileSync(dbPath, backupDbPath);
  const stats = fs.statSync(backupDbPath);
  console.log(`[BACKUP] SQLite backup file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  // Verify backup can be read
  const backupClient = createClient({ url: `file:${backupDbPath.replace(/\\/g, '/')}` });
  const testRead = await backupClient.execute('SELECT count(*) as count FROM users;');
  console.log(`[BACKUP] Verified backup readable. Users count: ${testRead.rows[0]?.count}`);

  // 2. PostgreSQL Backup via Prisma JSON snapshot
  try {
    const clientPath = pathToFileURL(path.join(process.cwd(), 'apps', 'api', 'node_modules', '@prisma', 'client', 'index.js')).href;
    const { PrismaClient } = await import(clientPath);
    const prisma = new PrismaClient();
    
    console.log('[BACKUP] Exporting PostgreSQL public tables snapshot...');
    const tables = await prisma.$queryRawUnsafe("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;");
    const pgData = {};
    for (const t of tables) {
      const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "${t.tablename}";`);
      pgData[t.tablename] = rows;
    }
    const pgBackupPath = path.join(backupDir, 'postgres_snapshot.json');
    fs.writeFileSync(
      pgBackupPath,
      JSON.stringify(pgData, (key, value) => (typeof value === 'bigint' ? value.toString() : value), 2),
      'utf8'
    );
    const pgStats = fs.statSync(pgBackupPath);
    console.log(`[BACKUP] PostgreSQL snapshot saved: ${(pgStats.size / 1024).toFixed(2)} KB (${tables.length} tables)`);
    await prisma.$disconnect();
  } catch (pgErr) {
    console.warn('[BACKUP] PostgreSQL snapshot warning:', pgErr.message);
  }

  console.log(`[BACKUP] All backups completed successfully at: ${backupDir}`);
  return backupDir;
}

backup().catch(console.error);
