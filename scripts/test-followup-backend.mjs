import { createClient } from '@libsql/client';
import path from 'path';

async function run() {
  const client = createClient({ url: 'file:' + path.resolve('data/zms.db').replace(/\\/g, '/') });

  // Test tables exist
  const tables = await client.execute(`
    SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'follow_up%'
  `);
  console.log('Follow-up tables in DB:', tables.rows.map(r => r.name));
}

run().catch(console.error);
