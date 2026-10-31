const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}

loadEnvFile(path.resolve(__dirname, '../.env'));
const prisma = new PrismaClient();

async function main() {
  const url = process.env.DATABASE_URL || '';
  const parsed = new URL(url.replace(/^postgresql:\/\//, 'http://'));
  const version = await prisma.$queryRaw`SELECT version() AS version`;
  const tables = await prisma.$queryRaw`
    SELECT c.relname AS name, c.relkind AS kind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm')
    ORDER BY c.relname
  `;
  const counts = [];
  let total = 0;
  for (const table of tables) {
    if (table.kind !== 'r') continue;
    const rows = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS c FROM "${table.name}"`);
    const count = rows[0].c;
    total += count;
    counts.push({ table: table.name, count });
  }
  const fks = await prisma.$queryRaw`
    SELECT tc.table_name AS from_table, kcu.column_name AS from_column,
           ccu.table_name AS to_table, ccu.column_name AS to_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name
  `;
  const routines = await prisma.$queryRaw`
    SELECT routine_name, routine_type
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    ORDER BY routine_name
  `;
  const triggers = await prisma.$queryRaw`
    SELECT event_object_table AS table_name, trigger_name
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name
  `;
  const views = tables.filter((t) => t.kind !== 'r');
  console.log(JSON.stringify({
    environment: process.env.NODE_ENV,
    host: parsed.hostname,
    database: parsed.pathname.replace(/^\//, '').split('?')[0],
    user: decodeURIComponent(parsed.username),
    postgres: version[0].version.split(',')[0],
    tableCount: counts.length,
    recordTotal: total,
    counts,
    foreignKeyCount: fks.length,
    views,
    routines,
    triggers,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
