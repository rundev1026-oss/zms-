import { createClient } from '@libsql/client';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'zms.db');
const client = createClient({ url: `file:${dbPath.replace(/\\/g, '/')}` });

async function analyzeFks() {
  const tablesRes = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  const tables = tablesRes.rows.map((r) => String(r.name));

  const fks = [];
  for (const t of tables) {
    const fkRes = await client.execute(`PRAGMA foreign_key_list("${t}")`);
    for (const r of fkRes.rows) {
      fks.push({
        table: t,
        id: r.id,
        toTable: r.table,
        fromCol: r.from,
        toCol: r.to,
      });
    }
  }

  console.log(`Found ${fks.length} Foreign Key constraints in SQLite:`);
  for (const f of fks) {
    console.log(`  ${f.table} (${f.fromCol}) -> ${f.toTable} (${f.toCol})`);
  }
}

analyzeFks().catch(console.error);
