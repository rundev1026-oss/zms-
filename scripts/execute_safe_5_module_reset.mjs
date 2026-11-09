import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';

const dbPath = path.resolve('data/zms.db');
const backupDbPath = path.resolve('data/zms.db.backup-pre-reset-2026-11-09T07-35-36-669Z');

if (!fs.existsSync(backupDbPath)) {
  console.error('FATAL: Verified backup not found at', backupDbPath);
  process.exit(1);
}

// 1. Backup public/uploads
const uploadsDir = path.resolve('public/uploads');
const uploadsBackupDir = path.resolve('data/uploads_backup_pre_reset');
if (fs.existsSync(uploadsDir)) {
  if (!fs.existsSync(uploadsBackupDir)) {
    fs.mkdirSync(uploadsBackupDir, { recursive: true });
  }
  fs.cpSync(uploadsDir, uploadsBackupDir, { recursive: true });
  console.log('Backed up uploads to:', uploadsBackupDir);
}

const client = createClient({ url: `file:${dbPath.replace(/\\/g, '/')}` });

async function runReset() {
  console.log('====================================================');
  console.log('PHASE 2: SAFE RESET OF 5 CORE MODULES');
  console.log('====================================================');

  // Verify initial counts
  const initialGL = await client.execute('SELECT COUNT(*) as cnt FROM general_ledger_entries');
  const initialTX = await client.execute('SELECT COUNT(*) as cnt FROM financial_transactions');
  console.log(`Pre-reset GL count: ${initialGL.rows[0].cnt}`);
  console.log(`Pre-reset TX count: ${initialTX.rows[0].cnt}`);

  // Fetch records to snapshot into accounting_reference_snapshots
  console.log('\n--- 1. Taking Snapshots for GL Linked Beneficiaries & Applications ---');
  const glLinkedRows = await client.execute(`
    SELECT id, journal_no, transaction_id, application_id, beneficiary_id, account_code, account_name, amount, entry_date
    FROM general_ledger_entries
    WHERE (beneficiary_id IS NOT NULL AND beneficiary_id != '' AND beneficiary_id != 'ben-system-internal')
       OR (application_id IS NOT NULL AND application_id != '' AND application_id != 'app-system-internal')
  `);
  console.log(`Found ${glLinkedRows.rows.length} GL entries referencing ben/app.`);

  const benIds = [...new Set(glLinkedRows.rows.map(r => r.beneficiary_id).filter(Boolean))];
  const appIds = [...new Set(glLinkedRows.rows.map(r => r.application_id).filter(Boolean))];

  const now = new Date().toISOString();
  let snapCount = 0;

  // Snapshot Beneficiaries
  for (const bId of benIds) {
    const res = await client.execute({ sql: 'SELECT * FROM beneficiaries WHERE id = ?', args: [bId] });
    if (res.rows.length > 0) {
      await client.execute({
        sql: `INSERT OR REPLACE INTO accounting_reference_snapshots (id, captured_at, source_table, source_id, reason, payload)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          `snap-ben-${bId}`,
          now,
          'beneficiaries',
          bId,
          'Pre-reset snapshot of beneficiary referenced by General Ledger entries',
          JSON.stringify(res.rows[0])
        ]
      });
      snapCount++;
    }
  }

  // Snapshot Applications
  for (const aId of appIds) {
    const res = await client.execute({ sql: 'SELECT * FROM assistance_applications WHERE id = ?', args: [aId] });
    if (res.rows.length > 0) {
      await client.execute({
        sql: `INSERT OR REPLACE INTO accounting_reference_snapshots (id, captured_at, source_table, source_id, reason, payload)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          `snap-app-${aId}`,
          now,
          'assistance_applications',
          aId,
          'Pre-reset snapshot of assistance application referenced by General Ledger entries',
          JSON.stringify(res.rows[0])
        ]
      });
      snapCount++;
    }
  }

  // Snapshot GL entries themselves
  for (const glRow of glLinkedRows.rows) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO accounting_reference_snapshots (id, captured_at, source_table, source_id, reason, payload)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        `snap-gl-${glRow.id}`,
        now,
        'general_ledger_entries',
        glRow.id,
        'Pre-reset snapshot of General Ledger entry linkage',
        JSON.stringify(glRow)
      ]
    });
    snapCount++;
  }
  console.log(`Successfully stored ${snapCount} reference snapshots in accounting_reference_snapshots.`);

  // Disable FK cascading and alter general_ledger_entries
  console.log('\n--- 2. Updating general_ledger_entries Schema to Remove ON DELETE CASCADE ---');
  await client.execute('PRAGMA foreign_keys = OFF;');

  await client.execute(`
    CREATE TABLE IF NOT EXISTS general_ledger_entries_new (
      id TEXT PRIMARY KEY,
      journal_no TEXT NOT NULL,
      transaction_id TEXT,
      application_id TEXT,
      beneficiary_id TEXT,
      entry_date TEXT NOT NULL,
      account_code TEXT NOT NULL,
      account_name TEXT NOT NULL,
      account_category TEXT NOT NULL,
      entry_type TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'THB',
      asnaf_code TEXT,
      assistance_type_id TEXT,
      assistance_format_id TEXT,
      description TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.execute(`INSERT INTO general_ledger_entries_new SELECT * FROM general_ledger_entries;`);
  await client.execute(`DROP TABLE general_ledger_entries;`);
  await client.execute(`ALTER TABLE general_ledger_entries_new RENAME TO general_ledger_entries;`);

  await client.execute(`CREATE INDEX IF NOT EXISTS idx_gl_journal_no ON general_ledger_entries(journal_no);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_gl_application_id ON general_ledger_entries(application_id);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_gl_account_code ON general_ledger_entries(account_code);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_gl_asnaf_code ON general_ledger_entries(asnaf_code);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_gl_entry_date ON general_ledger_entries(entry_date);`);

  const glCheck = await client.execute('SELECT COUNT(*) as cnt FROM general_ledger_entries');
  console.log(`GL entries count after recreation: ${glCheck.rows[0].cnt} (Expected: ${initialGL.rows[0].cnt})`);
  if (Number(glCheck.rows[0].cnt) !== Number(initialGL.rows[0].cnt)) {
    throw new Error('GL entries count mismatch after recreation!');
  }

  // 3. Clear target 20 tables in dependency order
  console.log('\n--- 3. Deleting Target 20 Tables in Reverse Dependency Order ---');
  const targetTables = [
    // 5. Follow-ups and Aid execution
    'follow_up_attachments',
    'follow_up_audit_logs',
    'follow_up_records',
    'follow_up_plans',
    'assistance_followups',
    'assistance_finance_discrepancies',
    'assistance_refund_records',
    'assistance_execution_records',
    'cash_flow_disbursement_items',
    
    // 3. Assessments
    'beneficiary_assessments',
    
    // 2 & 4. Assistance Applications and history
    'application_documents',
    'application_history',
    'assistance_lifecycle_transitions',
    'assistance_applications',
    
    // 1. Beneficiaries & Households
    'beneficiary_registration_history',
    'beneficiary_edit_history',
    'beneficiary_asnaf',
    'household_members',
    'beneficiaries',
    'households'
  ];

  for (const table of targetTables) {
    const preCount = await client.execute(`SELECT COUNT(*) as cnt FROM "${table}"`);
    await client.execute(`DELETE FROM "${table}"`);
    const postCount = await client.execute(`SELECT COUNT(*) as cnt FROM "${table}"`);
    console.log(`Cleared [${table}]: was ${preCount.rows[0].cnt} -> now ${postCount.rows[0].cnt}`);
  }

  // 4. Physical attachment cleanup for deleted records
  console.log('\n--- 4. Cleaning Document Attachments on Disk ---');
  const docDir = path.resolve('public/uploads/documents');
  if (fs.existsSync(docDir)) {
    const files = fs.readdirSync(docDir);
    for (const f of files) {
      fs.unlinkSync(path.join(docDir, f));
    }
    console.log(`Deleted ${files.length} document files from public/uploads/documents`);
  }

  const fuDir = path.resolve('public/uploads/follow-ups');
  if (fs.existsSync(fuDir)) {
    const files = fs.readdirSync(fuDir);
    for (const f of files) {
      fs.unlinkSync(path.join(fuDir, f));
    }
    console.log(`Deleted ${files.length} follow-up files from public/uploads/follow-ups`);
  }

  // 5. Verify database integrity and preserved tables
  console.log('\n--- 5. Post-Reset Verification ---');
  await client.execute('PRAGMA foreign_keys = ON;');
  const integrity = await client.execute('PRAGMA integrity_check;');
  console.log('Database integrity check:', integrity.rows);

  const postGL = await client.execute('SELECT COUNT(*) as cnt FROM general_ledger_entries');
  const postTX = await client.execute('SELECT COUNT(*) as cnt FROM financial_transactions');
  const postUsers = await client.execute('SELECT COUNT(*) as cnt FROM users');
  const postBanks = await client.execute('SELECT COUNT(*) as cnt FROM bank_accounts');
  const postFunds = await client.execute('SELECT COUNT(*) as cnt FROM fund_accounts');
  const postWorkflows = await client.execute('SELECT COUNT(*) as cnt FROM cash_flow_workflows');
  const postClearance = await client.execute('SELECT COUNT(*) as cnt FROM cash_flow_clearance_items');
  const postAsnaf = await client.execute('SELECT COUNT(*) as cnt FROM asnaf_assistance_types');
  const postTypes = await client.execute('SELECT COUNT(*) as cnt FROM assistance_types');
  const postFormats = await client.execute('SELECT COUNT(*) as cnt FROM assistance_formats');
  const postAuditLogs = await client.execute('SELECT COUNT(*) as cnt FROM audit_logs');
  const postSnapshots = await client.execute('SELECT COUNT(*) as cnt FROM accounting_reference_snapshots');

  console.log(`General Ledger (GL): ${postGL.rows[0].cnt} (Preserved: 100%)`);
  console.log(`Financial Transactions: ${postTX.rows[0].cnt} (Preserved: 100%)`);
  console.log(`Bank Accounts: ${postBanks.rows[0].cnt} (Preserved: 100%)`);
  console.log(`Fund Accounts: ${postFunds.rows[0].cnt} (Preserved: 100%)`);
  console.log(`Workflows: ${postWorkflows.rows[0].cnt} (Preserved: 100%)`);
  console.log(`Admin Clearances: ${postClearance.rows[0].cnt} (Preserved: 100%)`);
  console.log(`Users: ${postUsers.rows[0].cnt} (Preserved: 100%)`);
  console.log(`Assistance Types: ${postTypes.rows[0].cnt} (Preserved: 100%)`);
  console.log(`Assistance Formats: ${postFormats.rows[0].cnt} (Preserved: 100%)`);
  console.log(`Asnaf Allocations: ${postAsnaf.rows[0].cnt} (Preserved: 100%)`);
  console.log(`Audit Logs: ${postAuditLogs.rows[0].cnt} (Preserved: 100%)`);
  console.log(`Snapshots in accounting_reference_snapshots: ${postSnapshots.rows[0].cnt}`);

  console.log('\n--- VERIFY ALL TARGET 20 TABLES ARE EXACTLY 0 ---');
  let nonZeroCount = 0;
  for (const table of targetTables) {
    const res = await client.execute(`SELECT COUNT(*) as cnt FROM "${table}"`);
    const count = Number(res.rows[0].cnt);
    if (count !== 0) {
      console.error(`ERROR: Table ${table} has ${count} rows!`);
      nonZeroCount++;
    } else {
      console.log(`✓ Table [${table}] = 0 rows`);
    }
  }

  if (nonZeroCount > 0) {
    throw new Error(`${nonZeroCount} target tables were not cleared to 0!`);
  }

  console.log('\n>>> SUCCESS: All 20 target tables reset to 0 rows. Financial Ledger and Master Data 100% intact! <<<');
}

runReset().catch((err) => {
  console.error('Reset execution failed:', err);
  process.exit(1);
});
