import { createClient } from '@libsql/client';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

async function inspectSqlite() {
  const dbPath = path.join(process.cwd(), 'data', 'zms.db');
  const dbUrl = `file:${dbPath.replace(/\\/g, '/')}`;
  const client = createClient({ url: dbUrl });

  const tablesRes = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  const tables = tablesRes.rows.map((r) => String(r.name));
  console.log(`\n=================== SQLITE: data/zms.db (${tables.length} tables) ===================`);
  
  const counts = [];
  for (const t of tables) {
    try {
      const res = await client.execute(`SELECT count(*) as count FROM "${t}"`);
      counts.push({ table: t, count: Number(res.rows[0].count) });
    } catch (e) {
      counts.push({ table: t, count: -1, error: e.message });
    }
  }

  counts.sort((a, b) => b.count - a.count);
  for (const c of counts) {
    console.log(`${c.table.padEnd(45)}: ${c.count} rows`);
  }
}

import { pathToFileURL } from 'url';

async function inspectPostgres() {
  try {
    const clientPath = pathToFileURL(path.join(process.cwd(), 'apps', 'api', 'node_modules', '@prisma', 'client', 'index.js')).href;
    const { PrismaClient } = await import(clientPath);
    const prisma = new PrismaClient();
    const tables = await prisma.$queryRawUnsafe("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;");
    console.log(`\n=================== POSTGRESQL (${tables.length} tables) ===================`);
    for (const t of tables) {
      const res = await prisma.$queryRawUnsafe(`SELECT count(*) as count FROM "${t.tablename}";`);
      const count = Number(res[0]?.count ?? 0);
      if (count > 0) {
        console.log(`${t.tablename.padEnd(45)}: ${count} rows`);
      }
    }
    await prisma.$disconnect();
  } catch (err) {
    console.log('Postgres inspection skipped or failed:', err.message);
  }
}

async function run() {
  await inspectSqlite();
  await inspectPostgres();
}

run().catch(console.error);
