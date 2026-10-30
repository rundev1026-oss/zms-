import { initDb, getDb } from '../src/lib/db';

async function audit() {
  await initDb();
  const db = getDb();

  const tablesRes = await db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
  const tableNames = tablesRes.rows.map(r => String(r.name)).filter(n => !n.startsWith('sqlite_') && !n.startsWith('_libsql'));

  console.log(`Found ${tableNames.length} active application tables in data/zms.db:`);
  
  const report: { table: string; count: number; columns: string[] }[] = [];

  for (const t of tableNames) {
    const countRes = await db.execute(`SELECT COUNT(*) as cnt FROM ${t}`);
    const colRes = await db.execute(`PRAGMA table_info(${t})`);
    report.push({
      table: t,
      count: Number(countRes.rows[0].cnt),
      columns: colRes.rows.map(c => String(c.name))
    });
  }

  for (const item of report) {
    console.log(`- ${item.table} (${item.count} rows)`);
    console.log(`    Columns: ${item.columns.join(', ')}`);
  }
}

audit().catch(console.error);

