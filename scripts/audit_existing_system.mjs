import { getDb, initDb } from '../src/lib/db.ts';

async function audit() {
  await initDb();
  const db = getDb();
  const tablesRes = await db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log('--- SQLITE TABLES ---');
  console.log(tablesRes.rows.map(r => r.name));

  // Check roles table if any
  const hasRoles = tablesRes.rows.some(r => r.name === 'roles');
  if (hasRoles) {
    const rolesRes = await db.execute("SELECT * FROM roles");
    console.log('--- ROLES IN SQLITE ---', rolesRes.rows);
  } else {
    console.log('--- NO ROLES TABLE IN SQLITE ---');
  }

  // Check users columns
  const userCols = await db.execute("PRAGMA table_info(users)");
  console.log('--- USERS COLUMNS ---', userCols.rows.map(r => r.name));

  // Check branches columns
  const branchCols = await db.execute("PRAGMA table_info(branches)");
  console.log('--- BRANCHES COLUMNS ---', branchCols.rows.map(r => r.name));

  // Check departments columns
  const deptCols = await db.execute("PRAGMA table_info(departments)");
  console.log('--- DEPARTMENTS COLUMNS ---', deptCols.rows.map(r => r.name));

  process.exit(0);
}

audit().catch(err => {
  console.error(err);
  process.exit(1);
});
