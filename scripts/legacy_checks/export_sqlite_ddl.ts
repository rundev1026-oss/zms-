import { createClient } from '@libsql/client';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  const client = createClient({ url: 'file:' + path.resolve('data/zms.db').replace(/\\/g, '/') });
  const rows = await client.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  
  let ddl = '';
  for (const r of rows.rows) {
    ddl += `-- TABLE: ${r.name}\n${r.sql};\n\n`;
  }
  fs.writeFileSync('scripts/sqlite_all_ddl.sql', ddl);
  console.log(`Saved ${rows.rows.length} table DDLs to scripts/sqlite_all_ddl.sql`);
}

main().catch(console.error);

