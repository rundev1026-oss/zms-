import { createClient } from '@libsql/client';

const client = createClient({ url: 'file:data/zms.db' });

async function checkGLReferences() {
  const glRows = await client.execute(`
    SELECT id, journal_no, transaction_id, application_id, beneficiary_id, account_code, account_name, amount, entry_date
    FROM general_ledger_entries
    WHERE (beneficiary_id IS NOT NULL AND beneficiary_id != '' AND beneficiary_id != 'ben-system-internal')
       OR (application_id IS NOT NULL AND application_id != '' AND application_id != 'app-system-internal')
  `);

  console.log(`GL rows referencing ben/app: ${glRows.rows.length}`);
  
  const benIds = new Set(glRows.rows.map(r => r.beneficiary_id).filter(Boolean));
  const appIds = new Set(glRows.rows.map(r => r.application_id).filter(Boolean));
  
  console.log(`Unique beneficiary_ids in GL: ${benIds.size}`);
  console.log(`Unique application_ids in GL: ${appIds.size}`);

  // Fetch the actual beneficiaries
  const benPlaceholders = Array.from(benIds).map(() => '?').join(',');
  const bens = benPlaceholders ? await client.execute({
    sql: `SELECT * FROM beneficiaries WHERE id IN (${benPlaceholders})`,
    args: Array.from(benIds)
  }) : { rows: [] };
  console.log(`Found ${bens.rows.length} beneficiaries matching GL references`);

  // Fetch the actual applications
  const appPlaceholders = Array.from(appIds).map(() => '?').join(',');
  const apps = appPlaceholders ? await client.execute({
    sql: `SELECT * FROM assistance_applications WHERE id IN (${appPlaceholders})`,
    args: Array.from(appIds)
  }) : { rows: [] };
  console.log(`Found ${apps.rows.length} applications matching GL references`);
}

checkGLReferences().catch(console.error);
