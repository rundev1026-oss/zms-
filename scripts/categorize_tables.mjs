import { createClient } from '@libsql/client';

const client = createClient({ url: 'file:data/zms.db' });

async function checkAll() {
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  const categorized = {
    targetToClear: [],
    preservedFinanceAndMaster: [],
    unknownOrAudit: []
  };

  const targetTableNames = new Set([
    // Menu 1: Beneficiaries & Households
    'beneficiaries',
    'beneficiary_asnaf',
    'beneficiary_edit_history',
    'beneficiary_registration_history',
    'households',
    'household_members',
    
    // Menu 2 & 4: Assistance Applications & History & Lifecycle
    'assistance_applications',
    'application_documents',
    'application_history',
    'assistance_lifecycle_transitions',
    
    // Menu 3: Assessments
    'beneficiary_assessments',
    
    // Menu 5: Disbursement, Aid Records, Followups
    'assistance_execution_records',
    'assistance_finance_discrepancies',
    'assistance_refund_records',
    'assistance_followups',
    'follow_up_plans',
    'follow_up_records',
    'follow_up_attachments',
    'follow_up_audit_logs',
    'cash_flow_disbursement_items'
  ]);

  for (const t of tables.rows) {
    const tableName = t.name;
    if (tableName.startsWith('sqlite_') || tableName.startsWith('_')) continue;

    const res = await client.execute(`SELECT COUNT(*) as cnt FROM "${tableName}"`);
    const count = Number(res.rows[0].cnt);

    if (targetTableNames.has(tableName)) {
      categorized.targetToClear.push({ tableName, count });
    } else {
      categorized.preservedFinanceAndMaster.push({ tableName, count });
    }
  }

  console.log('=== TARGET TABLES TO CLEAR ===');
  let totalTargetRows = 0;
  for (const item of categorized.targetToClear) {
    console.log(`${item.tableName.padEnd(35)}: ${item.count} rows`);
    totalTargetRows += item.count;
  }
  console.log(`TOTAL TARGET ROWS TO CLEAR: ${totalTargetRows}`);

  console.log('\n=== PRESERVED FINANCE, MASTER DATA, USERS, SYSTEM TABLES ===');
  for (const item of categorized.preservedFinanceAndMaster) {
    console.log(`${item.tableName.padEnd(35)}: ${item.count} rows`);
  }
}

checkAll().catch(console.error);
