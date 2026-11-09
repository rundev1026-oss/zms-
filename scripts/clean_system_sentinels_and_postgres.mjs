import { createClient } from '@libsql/client';

async function main() {
  console.log('=== 1. CLEANING SENTINEL RECORDS FROM SQLITE ===');
  const sqlite = createClient({ url: 'file:data/zms.db' });
  await sqlite.execute('PRAGMA foreign_keys = OFF;');
  await sqlite.execute({ sql: 'DELETE FROM assistance_applications WHERE id = ?', args: ['app-system-internal'] });
  await sqlite.execute({ sql: 'DELETE FROM beneficiaries WHERE id = ?', args: ['ben-system-internal'] });
  await sqlite.execute({ sql: 'DELETE FROM households WHERE id = ?', args: ['hh-system'] });
  await sqlite.execute('PRAGMA foreign_keys = ON;');

  const bCount = await sqlite.execute('SELECT count(*) as cnt FROM beneficiaries');
  const aCount = await sqlite.execute('SELECT count(*) as cnt FROM assistance_applications');
  const hCount = await sqlite.execute('SELECT count(*) as cnt FROM households');

  console.log('SQLite beneficiaries count:', bCount.rows[0].cnt);
  console.log('SQLite assistance_applications count:', aCount.rows[0].cnt);
  console.log('SQLite households count:', hCount.rows[0].cnt);
}

main().catch(console.error);
