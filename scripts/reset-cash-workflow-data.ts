import { getDb, initDb } from '../src/lib/db';

async function resetCashWorkflowData() {
  await initDb();
  const db = getDb();
  console.log('===========================================================');
  console.log('--- Starting Deletion of All Cash Flow Workflow Records ---');
  console.log('===========================================================');
  
  // 1. Delete disbursement items
  const r1 = await db.execute('DELETE FROM cash_flow_disbursement_items');
  console.log('✓ Deleted cash_flow_disbursement_items rows:', r1.rowsAffected);
  
  // 2. Delete cash withdrawals
  const r2 = await db.execute('DELETE FROM cash_flow_withdrawals');
  console.log('✓ Deleted cash_flow_withdrawals rows:', r2.rowsAffected);
  
  // 3. Delete attachments related to workflows
  const r3 = await db.execute("DELETE FROM workflow_attachments");
  console.log('✓ Deleted workflow_attachments rows:', r3.rowsAffected);
  
  // 4. Delete transactions related to workflows
  const r4 = await db.execute('DELETE FROM financial_transactions WHERE workflow_id IS NOT NULL');
  console.log('✓ Deleted financial_transactions (workflow-linked) rows:', r4.rowsAffected);

  // 5. Delete main workflows
  const r5 = await db.execute('DELETE FROM cash_flow_workflows');
  console.log('✓ Deleted cash_flow_workflows rows:', r5.rowsAffected);

  // 5. Verification
  const c1 = await db.execute('SELECT COUNT(*) as c FROM cash_flow_workflows');
  const c2 = await db.execute('SELECT COUNT(*) as c FROM cash_flow_withdrawals');
  const c3 = await db.execute('SELECT COUNT(*) as c FROM cash_flow_disbursement_items');
  const c4 = await db.execute("SELECT COUNT(*) as c FROM workflow_attachments");
  
  console.log('-----------------------------------------------------------');
  console.log('--- Verification After Reset ---');
  console.log('Remaining cash_flow_workflows:', c1.rows[0].c);
  console.log('Remaining cash_flow_withdrawals:', c2.rows[0].c);
  console.log('Remaining cash_flow_disbursement_items:', c3.rows[0].c);
  console.log('Remaining cash workflow attachments:', c4.rows[0].c);
  console.log('-----------------------------------------------------------');

  if (
    Number(c1.rows[0].c) === 0 &&
    Number(c2.rows[0].c) === 0 &&
    Number(c3.rows[0].c) === 0 &&
    Number(c4.rows[0].c) === 0
  ) {
    console.log('🎉 ALL CASH FLOW WORKFLOW DATA SUCCESSFULLY DELETED & RESET TO 0!');
  } else {
    console.error('⚠️ Warning: Some records still remain.');
  }
}

resetCashWorkflowData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error during cash workflow data reset:', err);
    process.exit(1);
  });
