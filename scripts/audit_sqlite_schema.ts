import { createClient } from '@libsql/client';
import * as path from 'path';

async function main() {
  const dbPath = path.resolve('data/zms.db');
  const client = createClient({
    url: `file:${dbPath.replace(/\\/g, '/')}`,
  });

  const tablesResult = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );

  console.log(`=== FOUND ${tablesResult.rows.length} TABLES IN SQLITE ===`);
  const tables = tablesResult.rows.map(r => r.name as string);

  for (const table of tables) {
    const countRes = await client.execute(`SELECT COUNT(*) as cnt FROM "${table}"`);
    const count = countRes.rows[0].cnt;
    const schemaRes = await client.execute(`PRAGMA table_info("${table}")`);
    const cols = schemaRes.rows.map(c => `${c.name} (${c.type})`).join(', ');
    console.log(`[${table}] (${count} rows): ${cols}`);
  }
}

main().catch(console.error);

