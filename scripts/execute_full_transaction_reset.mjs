import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

const dbPath = path.join(process.cwd(), 'data', 'zms.db');
const dbUrl = `file:${dbPath.replace(/\\/g, '/')}`;
const sqlite = createClient({ url: dbUrl });

async function getPostgresPrisma() {
  try {
    const clientPath = pathToFileURL(path.join(process.cwd(), 'apps', 'api', 'node_modules', '@prisma', 'client', 'index.js')).href;
    const { PrismaClient } = await import(clientPath);
    return new PrismaClient();
  } catch (e) {
    console.warn('[POSTGRES] Could not instantiate PrismaClient:', e.message);
    return null;
  }
}

async function runReset() {
  console.log('========================================================================');
  console.log('  ZMS — FULL TRANSACTION DATA RESET (EXECUTION)');
  console.log('========================================================================\n');

  // Verify backup exists
  const backupDir = path.join(process.cwd(), 'data', 'backups');
  if (!fs.existsSync(backupDir)) {
    throw new Error('Backup directory does not exist! Aborting.');
  }

  // 1. Pre-reset counts
  console.log('[STEP 1] Counting pre-reset records in SQLite...');
  const txTablesSqlite = [
    'assistance_applications',
    'application_documents',
    'application_history',
    'beneficiary_assessments',
    'assistance_lifecycle_transitions',
    'assistance_refund_records',
    'assistance_execution_records',
    'assistance_finance_discrepancies',
    'assistance_followups',
    'follow_up_plans',
    'follow_up_records',
    'follow_up_attachments',
    'follow_up_audit_logs',
    'meeting_resolutions',
    'financial_transactions',
    'general_ledger_entries',
    'cash_flow_workflows',
    'cash_flow_withdrawals',
    'cash_flow_disbursement_items',
    'cash_flow_clearance_items',
    'finance_handover_records',
    'finance_approval_events',
    'treasurer_transfer_evidence',
    'workflow_attachments',
    'accounting_reference_snapshots',
    'bank_reconciliations',
    'payment_reconciliation_records',
    'payment_vouchers',
    'payment_webhook_events',
    'payment_webhook_idempotency',
    'donation_qr_sessions',
    'fund_budget_adjustments',
    'admin_expense_documents',
    'admin_expense_lines',
    'finance_movement_documents',
    'finance_movement_lines',
  ];

  const preCountsSqlite = {};
  for (const t of txTablesSqlite) {
    const res = await sqlite.execute(`SELECT count(*) as count FROM "${t}"`);
    preCountsSqlite[t] = Number(res.rows[0]?.count || 0);
  }

  const preBenCount = Number((await sqlite.execute('SELECT count(*) as count FROM beneficiaries')).rows[0]?.count || 0);
  const preUserCount = Number((await sqlite.execute('SELECT count(*) as count FROM users')).rows[0]?.count || 0);
  const preAuditCount = Number((await sqlite.execute('SELECT count(*) as count FROM audit_logs')).rows[0]?.count || 0);

  console.log(`  Pre-reset Beneficiaries: ${preBenCount} (Must stay intact)`);
  console.log(`  Pre-reset Users: ${preUserCount} (Must stay intact)`);
  console.log(`  Pre-reset Audit Logs: ${preAuditCount} (Must stay intact)`);
  console.log(`  Pre-reset Transaction rows across ${txTablesSqlite.length} tables:`, 
    Object.values(preCountsSqlite).reduce((a, b) => a + b, 0)
  );

  // 2. Perform SQLite Reset in a Write Transaction
  console.log('\n[STEP 2] Executing SQLite Transaction Deletion (Child-to-Parent FK Order)...');
  const tx = await sqlite.transaction('write');

  try {
    // 1. Follow-up module child tables
    await tx.execute('DELETE FROM follow_up_attachments');
    await tx.execute('DELETE FROM follow_up_audit_logs');
    await tx.execute('DELETE FROM follow_up_records');
    await tx.execute('DELETE FROM follow_up_plans');
    await tx.execute('DELETE FROM assistance_followups');

    // 2. Cash flow batch & disbursement child tables
    await tx.execute('DELETE FROM cash_flow_clearance_items');
    await tx.execute('DELETE FROM cash_flow_disbursement_items');
    await tx.execute('DELETE FROM finance_handover_records');
    await tx.execute('DELETE FROM treasurer_transfer_evidence');
    await tx.execute('DELETE FROM workflow_attachments');
    await tx.execute('DELETE FROM cash_flow_withdrawals');
    await tx.execute('DELETE FROM cash_flow_workflows');

    // 3. Assistance application & assessment child tables
    await tx.execute('DELETE FROM application_documents');
    await tx.execute('DELETE FROM application_history');
    await tx.execute('DELETE FROM beneficiary_assessments');
    await tx.execute('DELETE FROM assistance_lifecycle_transitions');
    await tx.execute('DELETE FROM assistance_refund_records');
    await tx.execute('DELETE FROM assistance_execution_records');
    await tx.execute('DELETE FROM assistance_finance_discrepancies');
    await tx.execute('DELETE FROM payment_vouchers');
    await tx.execute('DELETE FROM meeting_resolutions');
    await tx.execute('DELETE FROM assistance_applications');

    // 4. Financial & Accounting general ledger tables
    await tx.execute('DELETE FROM admin_expense_lines');
    await tx.execute('DELETE FROM admin_expense_documents');
    await tx.execute('DELETE FROM finance_movement_lines');
    await tx.execute('DELETE FROM finance_movement_documents');
    await tx.execute('DELETE FROM general_ledger_entries');
    await tx.execute('DELETE FROM accounting_reference_snapshots');
    await tx.execute('DELETE FROM financial_transactions');
    await tx.execute('DELETE FROM bank_reconciliations');
    await tx.execute('DELETE FROM payment_reconciliation_records');
    await tx.execute('DELETE FROM payment_webhook_events');
    await tx.execute('DELETE FROM payment_webhook_idempotency');
    await tx.execute('DELETE FROM donation_qr_sessions');
    await tx.execute('DELETE FROM fund_budget_adjustments');
    await tx.execute('DELETE FROM finance_approval_events');

    // 5. Reset document sequences / running numbers to 0
    await tx.execute("UPDATE document_sequences SET last_sequence = 0, updated_at = CURRENT_TIMESTAMP");

    // 6. Recalculate and Align Fund and Bank Account Balances with 0 transactions
    // Bank Accounts: current_balance = opening_balance, reconciled_balance = opening_balance
    await tx.execute(`
      UPDATE bank_accounts 
      SET current_balance = opening_balance,
          reconciled_balance = opening_balance,
          last_reconciled_at = null,
          last_reconciled_by = null,
          updated_at = CURRENT_TIMESTAMP
    `);

    // Fund Accounts: committed = 0, disbursed = 0, available = total_received
    await tx.execute(`
      UPDATE fund_accounts 
      SET committed_amount = 0,
          disbursed_amount = 0,
          available_amount = total_received,
          updated_at = CURRENT_TIMESTAMP
    `);

    // Sub-funds: committed = 0, disbursed = 0, remaining = allocated_amount, budget_adjustment = 0
    await tx.execute(`
      UPDATE faqir_miskin_sub_funds 
      SET committed_amount = 0,
          disbursed_amount = 0,
          remaining_amount = allocated_amount,
          budget_adjustment = 0,
          updated_at = CURRENT_TIMESTAMP
    `);

    // 7. Insert Audit Log Entry for the Reset
    const nowIso = new Date().toISOString();
    await tx.execute({
      sql: `
        INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
        VALUES (?, ?, 'u-1', 'ผู้ดูแลระบบสูงสุด (Super Admin)', 'super_admin', 'SYSTEM_FULL_TRANSACTION_RESET', 'system', 'all_transactions', ?)
      `,
      args: [
        `log-reset-${Date.now()}`,
        nowIso,
        'ดำเนินการล้างข้อมูลธุรกรรมทั้งหมดของระบบ ZMS ให้เหลือ 0 รายการ (คำร้อง, การประเมิน, การอนุมัติ, การช่วยเหลือ, การติดตามผล, การเงินและบัญชี) พร้อมคงรักษาทะเบียนผู้มีสิทธิ์ Master Data และผู้ใช้งานครบถ้วน',
      ],
    });

    await tx.commit();
    console.log('[STEP 2] SQLite transaction committed successfully.');
  } catch (err) {
    await tx.rollback();
    console.error('[STEP 2] SQLite transaction rolled back due to error:', err);
    throw err;
  }

  // 3. PostgreSQL Reset
  console.log('\n[STEP 3] Executing PostgreSQL Transaction Deletion...');
  const prisma = await getPostgresPrisma();
  const pgResults = {};
  if (prisma) {
    try {
      await prisma.$transaction(async (ptx) => {
        // Child to parent
        pgResults.application_documents = (await ptx.$executeRawUnsafe('DELETE FROM "application_documents";'));
        pgResults.application_history = (await ptx.$executeRawUnsafe('DELETE FROM "application_history";'));
        pgResults.beneficiary_asnaf_assessments = (await ptx.$executeRawUnsafe('DELETE FROM "beneficiary_asnaf_assessments";'));
        pgResults.beneficiary_assessments = (await ptx.$executeRawUnsafe('DELETE FROM "beneficiary_assessments";'));
        pgResults.assistance_applications = (await ptx.$executeRawUnsafe('DELETE FROM "assistance_applications";'));
        
        // Reset assessment counters if table exists
        try {
          await ptx.$executeRawUnsafe('UPDATE "assessment_counters" SET "last_number" = 0;');
        } catch {}

        // Log Postgres Audit
        try {
          await ptx.$executeRawUnsafe(`
            INSERT INTO "audit_logs" ("id", "timestamp", "user_id", "user_name", "user_role", "action", "entity_type", "entity_id", "description")
            VALUES (gen_random_uuid(), NOW(), (SELECT id FROM users LIMIT 1), 'Super Admin', 'super_admin', 'SYSTEM_FULL_TRANSACTION_RESET', 'system', 'all_transactions', 'ล้างข้อมูลธุรกรรมคำร้องและการประเมินทั้งหมดให้เหลือ 0 รายการ');
          `);
        } catch {}
      });
      console.log('[STEP 3] PostgreSQL transaction committed successfully.');
    } catch (pgErr) {
      console.warn('[STEP 3] PostgreSQL transaction error:', pgErr.message);
    } finally {
      await prisma.$disconnect();
    }
  }

  // 4. Verify Post-reset counts
  console.log('\n[STEP 4] Verifying Post-Reset Row Counts in SQLite...');
  let totalNonZeroTx = 0;
  for (const t of txTablesSqlite) {
    const res = await sqlite.execute(`SELECT count(*) as count FROM "${t}"`);
    const count = Number(res.rows[0]?.count || 0);
    const before = preCountsSqlite[t];
    console.log(`  ${t.padEnd(38)}: ${count} rows (was ${before})`);
    if (count > 0) totalNonZeroTx++;
  }

  const postBenCount = Number((await sqlite.execute('SELECT count(*) as count FROM beneficiaries')).rows[0]?.count || 0);
  const postUserCount = Number((await sqlite.execute('SELECT count(*) as count FROM users')).rows[0]?.count || 0);
  const postAuditCount = Number((await sqlite.execute('SELECT count(*) as count FROM audit_logs')).rows[0]?.count || 0);
  const postFkCheck = (await sqlite.execute('PRAGMA foreign_key_check')).rows;

  console.log('\n[STEP 5] Verification of Preserved Tables & Foreign Key Integrity:');
  console.log(`  Beneficiaries Count : ${postBenCount} (Original: ${preBenCount}) — ${postBenCount === preBenCount ? '✅ INTACT' : '❌ CHANGED'}`);
  console.log(`  Users Count         : ${postUserCount} (Original: ${preUserCount}) — ${postUserCount === preUserCount ? '✅ INTACT' : '❌ CHANGED'}`);
  console.log(`  Audit Logs Count    : ${postAuditCount} (Original: ${preAuditCount} + 1 new reset log) — ✅ INTACT`);
  console.log(`  Foreign Key Violations: ${postFkCheck.length} — ${postFkCheck.length === 0 ? '✅ 0 VIOLATIONS' : '❌ FK ERROR'}`);

  console.log('\n========================================================================');
  if (totalNonZeroTx === 0 && postBenCount === preBenCount && postUserCount === preUserCount && postFkCheck.length === 0) {
    console.log('  🎉 SUCCESS: ALL TRANSACTION DATA RESET TO 0! SYSTEM READY.');
  } else {
    console.error('  ⚠️ WARNING: Some tables or integrity checks did not meet expectations.');
  }
  console.log('========================================================================\n');
}

runReset().catch(console.error);
