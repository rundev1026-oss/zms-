import { createClient } from '@libsql/client';

const livePath = 'file:c:/Users/mukhl/Documents/GitHub/zms-/data/zms.db';
const snapPath = 'file:c:/Users/mukhl/Documents/GitHub/zms-/data/backups/full-reset-20261113-174639/zms-consistent.db';

const snap = createClient({ url: snapPath });
const snapTx = await snap.execute('SELECT COUNT(*) AS n FROM financial_transactions');
const snapApps = await snap.execute('SELECT COUNT(*) AS n FROM assistance_applications');
const snapMembers = await snap.execute('SELECT COUNT(*) AS n FROM beneficiaries');
if (Number(snapTx.rows[0].n) !== 19 || Number(snapApps.rows[0].n) !== 1 || Number(snapMembers.rows[0].n) !== 6) {
  throw new Error(`Backup check failed tx=${snapTx.rows[0].n} apps=${snapApps.rows[0].n} members=${snapMembers.rows[0].n}`);
}

const db = createClient({ url: livePath });
const tx = await db.transaction('write');

const CLEAR = [
  'follow_up_attachments',
  'follow_up_records',
  'follow_up_plans',
  'admin_expense_lines',
  'admin_expense_documents',
  'finance_movement_lines',
  'finance_movement_documents',
  'cash_flow_clearance_items',
  'cash_flow_disbursement_items',
  'finance_handover_records',
  'treasurer_transfer_evidence',
  'workflow_attachments',
  'finance_approval_events',
  'cash_flow_withdrawals',
  'assistance_execution_records',
  'assistance_refund_records',
  'assistance_finance_discrepancies',
  'application_documents',
  'beneficiary_assessments',
  'assistance_followups',
  'assistance_lifecycle_transitions',
  'application_history',
  'general_ledger_entries',
  'bank_reconciliations',
  'payment_vouchers',
  'payment_reconciliation_records',
  'payment_webhook_events',
  'payment_webhook_idempotency',
  'donation_qr_sessions',
  'accounting_reference_snapshots',
  'fund_budget_adjustments',
  'meeting_resolutions',
  'financial_transactions',
  'cash_flow_workflows',
  'assistance_applications',
  'notification_user_reads',
  'system_notifications',
];

const WATCH = [
  ...CLEAR,
  'follow_up_audit_logs',
  'beneficiaries',
  'households',
  'household_members',
  'beneficiary_asnaf',
  'beneficiary_edit_history',
  'beneficiary_registration_history',
  'users',
  'bank_accounts',
  'fund_accounts',
  'faqir_miskin_sub_funds',
  'assistance_types',
  'assistance_formats',
  'asnaf_allocations',
  'admin_expense_categories',
  'audit_logs',
  'bank_account_audit_logs',
  'asnaf_relationship_audit_logs',
  'faqir_miskin_history',
  'system_settings',
  'branches',
  'campaigns',
  'document_sequences',
];

async function countMap(runner) {
  const out = {};
  for (const name of WATCH) {
    const exists = await runner.execute({
      sql: "SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name = ?",
      args: [name],
    });
    if (exists.rows.length === 0) {
      out[name] = null;
      continue;
    }
    const c = await runner.execute(`SELECT COUNT(*) AS n FROM "${name}"`);
    out[name] = Number(c.rows[0].n);
  }
  return out;
}

try {
  await tx.execute('PRAGMA foreign_keys = ON');
  const before = await countMap(tx);
  const history = await tx.execute('SELECT * FROM application_history');
  const life = await tx.execute('SELECT * FROM assistance_lifecycle_transitions');
  const actor = await tx.execute(
    "SELECT id, name, role FROM users WHERE role = 'super_admin' ORDER BY id LIMIT 1"
  );
  const user = actor.rows[0];
  if (!user) throw new Error('super_admin user missing');

  const stamp = new Date().toISOString();
  await tx.execute({
    sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, old_values)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      `audit-full-reset-${Date.now()}`,
      stamp,
      String(user.id),
      String(user.name),
      String(user.role),
      'FULL_TRANSACTION_RESET',
      'system',
      'full-reset-20261113',
      'ล้างข้อมูลธุรกรรมทั้งระบบตามคำสั่ง Full Transaction Data Reset โดยเก็บทะเบียนสมาชิก Master Data บัญชีธนาคาร ผู้ใช้งาน สิทธิ์ การตั้งค่า และบันทึกการตรวจสอบเดิมไว้ ยอดเงินถูกปรับเป็นศูนย์เพราะไม่มีรายการธุรกรรมเหลืออยู่',
      JSON.stringify({ applicationHistory: history.rows, lifecycle: life.rows, before }),
    ],
  });

  const deleted = {};
  for (const name of CLEAR) {
    if (before[name] === null) continue;
    const res = await tx.execute(`DELETE FROM "${name}"`);
    deleted[name] = Number(res.rowsAffected ?? 0);
  }

  await tx.execute(`
    UPDATE bank_accounts
    SET opening_balance = 0,
        current_balance = 0,
        reconciled_balance = 0,
        last_reconciled_at = NULL,
        last_reconciled_by = NULL,
        updated_at = CURRENT_TIMESTAMP
  `);
  await tx.execute(`
    UPDATE fund_accounts
    SET total_received = 0,
        committed_amount = 0,
        disbursed_amount = 0,
        available_amount = 0,
        updated_at = CURRENT_TIMESTAMP
  `);
  await tx.execute(`
    UPDATE asnaf_allocations
    SET target_amount = 0,
        allocated_amount = 0,
        disbursed_amount = 0,
        remaining_amount = 0,
        committed_amount = 0,
        budget_adjustment = 0
  `);
  await tx.execute(`
    UPDATE faqir_miskin_sub_funds
    SET target_amount = 0,
        allocated_amount = 0,
        disbursed_amount = 0,
        remaining_amount = 0,
        committed_amount = 0,
        budget_adjustment = 0
  `);
  await tx.execute(`
    UPDATE campaigns
    SET raised_amount = 0,
        donor_count = 0
  `);

  const after = await countMap(tx);
  const protect = [
    'beneficiaries',
    'households',
    'household_members',
    'beneficiary_asnaf',
    'beneficiary_edit_history',
    'beneficiary_registration_history',
    'users',
    'bank_accounts',
    'fund_accounts',
    'faqir_miskin_sub_funds',
    'assistance_types',
    'assistance_formats',
    'asnaf_allocations',
    'admin_expense_categories',
    'bank_account_audit_logs',
    'asnaf_relationship_audit_logs',
    'faqir_miskin_history',
    'system_settings',
    'branches',
    'campaigns',
    'document_sequences',
  ];
  for (const name of protect) {
    if (before[name] !== after[name]) {
      throw new Error(`Protected table changed ${name}: ${before[name]} -> ${after[name]}`);
    }
  }
  if (after.audit_logs !== before.audit_logs + 1) {
    throw new Error(`audit_logs expected ${before.audit_logs + 1} got ${after.audit_logs}`);
  }
  for (const name of CLEAR) {
    if (after[name] !== 0 && after[name] !== null) {
      throw new Error(`Table not empty ${name}=${after[name]}`);
    }
  }
  const money = await tx.execute(`
    SELECT
      (SELECT COALESCE(SUM(opening_balance + current_balance + reconciled_balance), 0) FROM bank_accounts) AS bank,
      (SELECT COALESCE(SUM(total_received + committed_amount + disbursed_amount + available_amount), 0) FROM fund_accounts) AS funds,
      (SELECT COALESCE(SUM(disbursed_amount + committed_amount + remaining_amount + allocated_amount + target_amount), 0) FROM asnaf_allocations) AS alloc,
      (SELECT COALESCE(SUM(committed_amount + disbursed_amount + allocated_amount + remaining_amount), 0) FROM faqir_miskin_sub_funds) AS sub,
      (SELECT COALESCE(SUM(raised_amount), 0) FROM campaigns) AS raised,
      (SELECT COUNT(*) FROM general_ledger_entries) AS gl
  `);
  const m = money.rows[0];
  for (const key of ['bank', 'funds', 'alloc', 'sub', 'raised', 'gl']) {
    if (Number(m[key]) !== 0) throw new Error(`Money not zero ${key}=${m[key]}`);
  }

  await tx.commit();
  console.log(JSON.stringify({ ok: true, deleted, before, after, money: m }, null, 2));
} catch (error) {
  await tx.rollback();
  console.error('ROLLED_BACK', error);
  process.exit(1);
}
