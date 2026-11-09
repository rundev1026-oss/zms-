import { createClient } from '@libsql/client';

const client = createClient({ url: 'file:data/zms.db' });

async function main() {
  console.log('====================================================');
  console.log('PHASE 1: AUDITING ALL TABLES & ROW COUNTS');
  console.log('====================================================');

  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log(`Total tables in database: ${tables.rows.length}`);

  const counts = [];
  for (const t of tables.rows) {
    const tableName = t.name;
    if (tableName.startsWith('sqlite_') || tableName.startsWith('_')) continue;
    try {
      const res = await client.execute(`SELECT COUNT(*) as cnt FROM "${tableName}"`);
      counts.push({ name: tableName, count: Number(res.rows[0].cnt) });
    } catch (e) {
      counts.push({ name: tableName, count: -1, error: e.message });
    }
  }

  console.log('\n--- ALL TABLES WITH ROW COUNTS ---');
  for (const c of counts) {
    console.log(`${c.name.padEnd(35)} : ${c.count} rows`);
  }

  // Check Foreign Keys on each table
  console.log('\n--- FOREIGN KEY REFERENCES RELATED TO BENEFICIARY / APPLICATION / AID ---');
  for (const t of tables.rows) {
    const tableName = t.name;
    const fks = await client.execute(`PRAGMA foreign_key_list("${tableName}")`);
    for (const fk of fks.rows) {
      if (
        fk.table.includes('beneficiar') ||
        fk.table.includes('application') ||
        fk.table.includes('disburse') ||
        fk.table.includes('assessment') ||
        fk.table.includes('approval')
      ) {
        console.log(`Table "${tableName}" (${fk.from}) --> references "${fk.table}" (${fk.to}) [on_delete=${fk.on_delete}]`);
      }
    }
  }

  // Check General Ledger columns and links to application/beneficiary
  console.log('\n--- GENERAL LEDGER REFERENCES ---');
  const glInfo = await client.execute("PRAGMA table_info(general_ledger_entries)");
  console.log(glInfo.rows.map(r => `${r.name} (${r.type})`));

  const glWithBen = await client.execute(`
    SELECT COUNT(*) as cnt FROM general_ledger_entries 
    WHERE (beneficiary_id IS NOT NULL AND beneficiary_id != '' AND beneficiary_id != 'ben-system-internal')
       OR (application_id IS NOT NULL AND application_id != '' AND application_id != 'app-system-internal')
  `);
  console.log('GL entries referencing real beneficiary or application:', glWithBen.rows[0].cnt);

  const glTotal = await client.execute("SELECT COUNT(*) as cnt FROM general_ledger_entries");
  console.log('GL total rows:', glTotal.rows[0].cnt);

  // Check Financial Transactions
  console.log('\n--- FINANCIAL TRANSACTIONS REFERENCES ---');
  const txInfo = await client.execute("PRAGMA table_info(financial_transactions)");
  console.log(txInfo.rows.map(r => `${r.name} (${r.type})`));

  const txTotal = await client.execute("SELECT COUNT(*) as cnt FROM financial_transactions");
  console.log('Financial transactions total rows:', txTotal.rows[0].cnt);
}

main().catch(console.error);
