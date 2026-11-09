import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';

const sqlite = createClient({ url: 'file:data/zms.db' });
const BASE_URL = 'http://localhost:3000';
const NEST_BASE = 'http://localhost:4000/api/v1';

async function auditSystem() {
  console.log('====================================================');
  console.log('ZMS FULL SYSTEM ARCHITECTURE & DATA INTEGRITY AUDIT');
  console.log('====================================================');

  // 1. Audit SQLite Database
  console.log('\n--- 1. SQLITE DATABASE INVENTORY ---');
  const sqTables = await sqlite.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  const sqliteCounts = [];
  for (const row of sqTables.rows) {
    const t = String(row.name);
    if (t.startsWith('sqlite_') || t.startsWith('_')) continue;
    try {
      const c = await sqlite.execute(`SELECT COUNT(*) as cnt FROM "${t}"`);
      sqliteCounts.push({ table: t, count: Number(c.rows[0].cnt) });
    } catch (e) {
      sqliteCounts.push({ table: t, count: -1, error: e.message });
    }
  }
  console.log(`Total SQLite Tables: ${sqliteCounts.length}`);
  for (const item of sqliteCounts) {
    if (item.count > 0) {
      console.log(`  - ${item.table.padEnd(35)}: ${item.count} rows`);
    }
  }

  // 2. Audit Existing User-Created Records
  console.log('\n--- 2. CURRENT ACTIVE TRANSACTION DATA (PRESERVED) ---');
  const bens = await sqlite.execute("SELECT id, title_prefix, full_name, national_id, phone, registration_no, asnaf_category FROM beneficiaries");
  console.log(`Beneficiaries in SQLite: ${bens.rows.length}`);
  for (const b of bens.rows) {
    console.log('  Beneficiary:', JSON.stringify(b));
  }

  const apps = await sqlite.execute("SELECT id, application_no, beneficiary_id, asnaf_category, requested_amount, approved_amount, status, assistance_type FROM assistance_applications");
  console.log(`Applications in SQLite: ${apps.rows.length}`);
  for (const a of apps.rows) {
    console.log('  Application:', JSON.stringify(a));
  }

  // 3. Test Title Prefix Issue ("นางสาว นางสาว" / "นาย นาย")
  console.log('\n--- 3. CHECKING TITLE PREFIX DUPLICATION IN REGISTRY / FORM ---');
  // Check how name is rendered in views:
  // e.g. does full_name already include title_prefix?
  if (bens.rows.length > 0) {
    const b = bens.rows[0];
    const prefix = String(b.title_prefix || '').trim();
    const fullName = String(b.full_name || '').trim();
    console.log(`  Stored title_prefix : "${prefix}"`);
    console.log(`  Stored full_name    : "${fullName}"`);
    if (fullName.startsWith(prefix) && prefix.length > 0) {
      console.log(`  [ALERT] full_name ALREADY starts with title_prefix "${prefix}"!`);
      console.log(`  If UI renders: \`\${beneficiary.titlePrefix} \${beneficiary.fullName}\`, it will produce: "${prefix} ${fullName}" (DUPLICATION BUG!)`);
    }
  }

  // 4. Check Frontend Route Files and Views
  console.log('\n--- 4. FRONTEND VIEWS & ROUTES INVENTORY ---');
  const viewsDir = path.resolve('src/components/views');
  const views = fs.readdirSync(viewsDir).filter(f => f.endsWith('.tsx'));
  console.log(`Found ${views.length} View components in src/components/views:`);
  views.forEach(v => console.log(`  - ${v}`));

  // 5. Check Next.js API Routes
  console.log('\n--- 5. NEXT.JS API ROUTES INVENTORY ---');
  function getRoutes(dir, base = '') {
    const results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        results.push(...getRoutes(full, `${base}/${ent.name}`));
      } else if (ent.name === 'route.ts' || ent.name === 'route.js') {
        results.push(`/api${base}`);
      }
    }
    return results;
  }
  const apiRoutes = getRoutes(path.resolve('src/app/api'));
  console.log(`Found ${apiRoutes.length} Next.js API endpoints:`);
  apiRoutes.sort().forEach(r => console.log(`  - ${r}`));

  // 6. Check NestJS Modules & Controllers
  console.log('\n--- 6. NESTJS BACKEND MODULES INVENTORY ---');
  const nestModulesDir = path.resolve('apps/api/src');
  if (fs.existsSync(nestModulesDir)) {
    const nestEntries = fs.readdirSync(nestModulesDir, { withFileTypes: true });
    for (const ent of nestEntries) {
      if (ent.isDirectory()) {
        console.log(`  - NestJS Module: ${ent.name}`);
      }
    }
  }
}

auditSystem().catch(console.error);
