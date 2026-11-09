import { createClient } from '@libsql/client';

const client = createClient({ url: 'file:data/zms.db' });

async function run() {
  console.log('--- 1. Check accounting_reference_snapshots ---');
  const snapTable = await client.execute("SELECT name, sql FROM sqlite_master WHERE name='accounting_reference_snapshots'");
  console.log('Exists:', snapTable.rows.length > 0);
  if (snapTable.rows.length > 0) {
    console.log(snapTable.rows[0].sql);
    const snapRows = await client.execute("SELECT count(*) as cnt FROM accounting_reference_snapshots");
    console.log('Existing snapshots count:', snapRows.rows[0].cnt);
  }

  console.log('\n--- 2. Sample GL with beneficiary or application ---');
  const sampleGL = await client.execute(`
    SELECT id, journal_no, transaction_id, beneficiary_id, application_id, account_code, account_name, entry_type, amount 
    FROM general_ledger_entries 
    WHERE (beneficiary_id IS NOT NULL AND beneficiary_id != '') 
       OR (application_id IS NOT NULL AND application_id != '') 
    LIMIT 5
  `);
  console.log(JSON.stringify(sampleGL.rows, null, 2));

  console.log('\n--- 3. Foreign Keys on All Tables referencing beneficiaries, assistance_applications, households, etc. ---');
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  for (const t of tables.rows) {
    const fks = await client.execute(`PRAGMA foreign_key_list("${t.name}")`);
    for (const fk of fks.rows) {
      if (['beneficiaries', 'assistance_applications', 'beneficiary_assessments', 'households', 'follow_up_plans'].includes(fk.table)) {
        console.log(`Table [${t.name}] column (${fk.from}) -> [${fk.table}] (${fk.to}) on_delete=${fk.on_delete}`);
      }
    }
  }

  console.log('\n--- 4. Check financial_transactions that have beneficiary_id or application_id ---');
  const txBen = await client.execute(`
    SELECT count(*) as cnt FROM financial_transactions 
    WHERE (beneficiary_id IS NOT NULL AND beneficiary_id != '')
       OR (application_id IS NOT NULL AND application_id != '')
  `);
  console.log(`Financial transactions with ben/app: ${txBen.rows[0].cnt}`);

  console.log('\n--- 5. Check cash_flow tables and disbursement items ---');
  const cfd = await client.execute("SELECT count(*) as cnt FROM cash_flow_disbursement_items");
  const cfc = await client.execute("SELECT count(*) as cnt FROM cash_flow_clearance_items");
  const cfw = await client.execute("SELECT count(*) as cnt FROM cash_flow_workflows");
  console.log(`cash_flow_workflows: ${cfw.rows[0].cnt}`);
  console.log(`cash_flow_disbursement_items: ${cfd.rows[0].cnt}`);
  console.log(`cash_flow_clearance_items: ${cfc.rows[0].cnt}`);

  const cfdSample = await client.execute("SELECT * FROM cash_flow_disbursement_items LIMIT 3");
  console.log('Sample cash_flow_disbursement_items:', JSON.stringify(cfdSample.rows, null, 2));
}

run().catch(console.error);
