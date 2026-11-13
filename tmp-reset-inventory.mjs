import { createClient } from '@libsql/client';
const db = createClient({ url: 'file:c:/Users/mukhl/Documents/GitHub/zms-/data/zms.db' });
const tables = await db.execute(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`);
const out = [];
for (const row of tables.rows) {
  const name = String(row.name);
  const count = await db.execute(`SELECT COUNT(*) c FROM "${name}"`);
  const fks = await db.execute(`PRAGMA foreign_key_list("${name}")`);
  out.push({
    name,
    count: Number(count.rows[0].c),
    fks: fks.rows.map((fk) => `${fk.from} -> ${fk.table}.${fk.to} ondelete=${fk.on_delete}`),
  });
}
console.log(JSON.stringify(out, null, 2));
