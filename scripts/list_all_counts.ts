import { createClient } from '@libsql/client';
import * as path from 'path';

async function main() {
  const client = createClient({ url: 'file:' + path.resolve('data/zms.db').replace(/\\/g, '/') });
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  let totalRows = 0;
  for (const t of tables.rows) {
    const c = await client.execute(`SELECT COUNT(*) as cnt FROM "${t.name}"`);
    const count = Number(c.rows[0].cnt);
    totalRows += count;
    console.log(`${String(t.name).padEnd(35)} : ${count}`);
  }
  console.log(`\nTotal tables: ${tables.rows.length}, Total rows: ${totalRows}`);
}
main().catch(console.error);

