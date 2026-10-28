import { createClient, Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Database file stored locally in project data folder
const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'zms.db');
const dbUrl = `file:${dbPath.replace(/\\/g, '/')}`;

let client: Client | null = null;

export function getDb(): Client {
  if (!client) {
    client = createClient({
      url: dbUrl,
    });
  }
  return client;
}

let dbInitPromise: Promise<void> | null = null;

export async function initDb(): Promise<void> {
  if (dbInitPromise) return dbInitPromise;
  dbInitPromise = (async () => {
    const db = getDb();

    // Enable WAL mode and 10s busy timeout for high concurrency safety
    try {
      await db.execute('PRAGMA journal_mode = WAL;');
      await db.execute('PRAGMA busy_timeout = 10000;');
    } catch {}

  // Create tables with SQLite DDL
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      role_title_th TEXT NOT NULL,
      phone TEXT NOT NULL,
      branch TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      password_hash TEXT,
      salt TEXT,
      session_token TEXT,
      session_expires_at TEXT,
      last_login TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure migration columns exist in users table
  const userTableCols = await db.execute(`PRAGMA table_info(users)`);
  const userColNames = userTableCols.rows.map((c) => String(c.name));
  if (!userColNames.includes('password_hash')) {
    try { await db.execute(`ALTER TABLE users ADD COLUMN password_hash TEXT;`); } catch {}
  }
  if (!userColNames.includes('salt')) {
    try { await db.execute(`ALTER TABLE users ADD COLUMN salt TEXT;`); } catch {}
  }
  if (!userColNames.includes('session_token')) {
    try { await db.execute(`ALTER TABLE users ADD COLUMN session_token TEXT;`); } catch {}
  }
  if (!userColNames.includes('session_expires_at')) {
    try { await db.execute(`ALTER TABLE users ADD COLUMN session_expires_at TEXT;`); } catch {}
  }
  if (!userColNames.includes('first_name')) {
    try { await db.execute(`ALTER TABLE users ADD COLUMN first_name TEXT;`); } catch {}
  }
  if (!userColNames.includes('last_name')) {
    try { await db.execute(`ALTER TABLE users ADD COLUMN last_name TEXT;`); } catch {}
  }
  if (!userColNames.includes('branch_id')) {
    try { await db.execute(`ALTER TABLE users ADD COLUMN branch_id TEXT;`); } catch {}
  }
  if (!userColNames.includes('department_id')) {
    try { await db.execute(`ALTER TABLE users ADD COLUMN department_id TEXT;`); } catch {}
  }
  if (!userColNames.includes('failed_login_attempts')) {
    try { await db.execute(`ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;`); } catch {}
  }
  if (!userColNames.includes('locked_until')) {
    try { await db.execute(`ALTER TABLE users ADD COLUMN locked_until TEXT;`); } catch {}
  }
  if (!userColNames.includes('email_verified')) {
    try { await db.execute(`ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;`); } catch {}
  }
  if (!userColNames.includes('phone_verified')) {
    try { await db.execute(`ALTER TABLE users ADD COLUMN phone_verified INTEGER DEFAULT 0;`); } catch {}
  }
  if (!userColNames.includes('pdpa_consent_date')) {
    try { await db.execute(`ALTER TABLE users ADD COLUMN pdpa_consent_date TEXT;`); } catch {}
  }
  if (!userColNames.includes('pdpa_consent_version')) {
    try { await db.execute(`ALTER TABLE users ADD COLUMN pdpa_consent_version TEXT DEFAULT 'v2569.1';`); } catch {}
  }
  if (!userColNames.includes('notification_email')) {
    try { await db.execute(`ALTER TABLE users ADD COLUMN notification_email INTEGER DEFAULT 1;`); } catch {}
  }
  if (!userColNames.includes('notification_sms')) {
    try { await db.execute(`ALTER TABLE users ADD COLUMN notification_sms INTEGER DEFAULT 0;`); } catch {}
  }
  if (!userColNames.includes('notification_app')) {
    try { await db.execute(`ALTER TABLE users ADD COLUMN notification_app INTEGER DEFAULT 1;`); } catch {}
  }
  if (!userColNames.includes('password_setup_status')) {
    try { await db.execute(`ALTER TABLE users ADD COLUMN password_setup_status TEXT DEFAULT 'pending_setup';`); } catch {}
  }
  if (!userColNames.includes('national_id')) {
    try { await db.execute(`ALTER TABLE users ADD COLUMN national_id TEXT;`); } catch {}
  }
  if (!userColNames.includes('beneficiary_id')) {
    try { await db.execute(`ALTER TABLE users ADD COLUMN beneficiary_id TEXT;`); } catch {}
  }

  // Branches & Departments
  await db.execute(`
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      name_en TEXT,
      branch_type TEXT DEFAULT 'regional_branch',
      parent_branch_id TEXT,
      address TEXT,
      subdistrict TEXT,
      district TEXT,
      province TEXT NOT NULL,
      postcode TEXT,
      phone TEXT,
      email TEXT,
      manager_user_id TEXT,
      manager_name TEXT,
      is_headquarters INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      deactivated_reason TEXT,
      created_by_id TEXT,
      created_by_name TEXT,
      updated_by_id TEXT,
      updated_by_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const branchCols = await db.execute(`PRAGMA table_info(branches)`);
  const branchColNames = branchCols.rows.map((c) => String(c.name));
  const branchNewCols: [string, string][] = [
    ['name_en', 'TEXT'],
    ['branch_type', "TEXT DEFAULT 'regional_branch'"],
    ['parent_branch_id', 'TEXT'],
    ['address', 'TEXT'],
    ['subdistrict', 'TEXT'],
    ['district', 'TEXT'],
    ['postcode', 'TEXT'],
    ['phone', 'TEXT'],
    ['email', 'TEXT'],
    ['manager_user_id', 'TEXT'],
    ['manager_name', 'TEXT'],
    ['status', "TEXT DEFAULT 'active'"],
    ['deactivated_reason', 'TEXT'],
    ['created_by_id', 'TEXT'],
    ['created_by_name', 'TEXT'],
    ['updated_by_id', 'TEXT'],
    ['updated_by_name', 'TEXT'],
    ['updated_at', 'DATETIME'],
  ];
  for (const [col, colType] of branchNewCols) {
    if (!branchColNames.includes(col)) {
      try { await db.execute(`ALTER TABLE branches ADD COLUMN ${col} ${colType};`); } catch {}
    }
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      name_en TEXT,
      description TEXT,
      branch_id TEXT DEFAULT 'br-hq',
      head_user_id TEXT,
      head_name TEXT,
      allowed_roles TEXT DEFAULT '["officer"]',
      status TEXT DEFAULT 'active',
      deactivated_reason TEXT,
      created_by_id TEXT,
      created_by_name TEXT,
      updated_by_id TEXT,
      updated_by_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const deptCols = await db.execute(`PRAGMA table_info(departments)`);
  const deptColNames = deptCols.rows.map((c) => String(c.name));
  const deptNewCols: [string, string][] = [
    ['name_en', 'TEXT'],
    ['branch_id', "TEXT DEFAULT 'br-hq'"],
    ['head_user_id', 'TEXT'],
    ['head_name', 'TEXT'],
    ['allowed_roles', 'TEXT DEFAULT \'["officer"]\''],
    ['status', "TEXT DEFAULT 'active'"],
    ['deactivated_reason', 'TEXT'],
    ['created_by_id', 'TEXT'],
    ['created_by_name', 'TEXT'],
    ['updated_by_id', 'TEXT'],
    ['updated_by_name', 'TEXT'],
    ['updated_at', 'DATETIME'],
  ];
  for (const [col, colType] of deptNewCols) {
    if (!deptColNames.includes(col)) {
      try { await db.execute(`ALTER TABLE departments ADD COLUMN ${col} ${colType};`); } catch {}
    }
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      used_at TEXT,
      created_ip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);


  await db.execute(`
    CREATE TABLE IF NOT EXISTS households (
      id TEXT PRIMARY KEY,
      household_no TEXT UNIQUE NOT NULL,
      address TEXT NOT NULL,
      province TEXT NOT NULL,
      district TEXT NOT NULL,
      subdistrict TEXT,
      community TEXT NOT NULL,
      housing_condition TEXT,
      housing_notes TEXT,
      living_score INTEGER DEFAULT 0,
      monthly_income REAL DEFAULT 0,
      monthly_expense REAL DEFAULT 0,
      debt_amount REAL DEFAULT 0,
      debt_purpose TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS household_members (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      relation TEXT NOT NULL,
      age INTEGER NOT NULL,
      occupation TEXT NOT NULL,
      monthly_income REAL DEFAULT 0,
      health_status TEXT DEFAULT 'healthy',
      health_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (household_id) REFERENCES households (id) ON DELETE CASCADE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS beneficiaries (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      national_id TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      asnaf_category TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (household_id) REFERENCES households (id) ON DELETE CASCADE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS assistance_applications (
      id TEXT PRIMARY KEY,
      application_no TEXT UNIQUE NOT NULL,
      beneficiary_id TEXT NOT NULL,
      asnaf_category TEXT NOT NULL,
      requested_amount REAL NOT NULL,
      approved_amount REAL,
      disbursed_amount REAL,
      status TEXT DEFAULT 'draft',
      urgency_level TEXT DEFAULT 'normal',
      assigned_officer_id TEXT NOT NULL,
      assigned_officer_name TEXT NOT NULL,
      approved_by_id TEXT,
      approved_by_name TEXT,
      approved_date TEXT,
      approval_notes TEXT,
      disbursement_date TEXT,
      disbursed_by_id TEXT,
      disbursed_by_name TEXT,
      disbursement_ref TEXT,
      disbursement_proof_url TEXT,
      disbursement_notes TEXT,
      applied_date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries (id) ON DELETE CASCADE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS application_documents (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      file_url TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      upload_date TEXT NOT NULL,
      verified_by_id TEXT,
      verified_by_name TEXT,
      verified_date TEXT,
      rejection_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES assistance_applications (id) ON DELETE CASCADE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS beneficiary_assessments (
      id TEXT PRIMARY KEY,
      application_id TEXT UNIQUE NOT NULL,
      assessed_by_id TEXT NOT NULL,
      assessed_by_name TEXT NOT NULL,
      assessed_date TEXT NOT NULL,
      living_score INTEGER DEFAULT 0,
      housing_condition TEXT NOT NULL,
      housing_notes TEXT NOT NULL,
      debt_burden_summary TEXT NOT NULL,
      primary_hardship TEXT NOT NULL,
      officer_recommendation TEXT NOT NULL,
      recommended_amount REAL NOT NULL,
      recommended_fund_id TEXT NOT NULL,
      general_notes TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES assistance_applications (id) ON DELETE CASCADE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS assistance_followups (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      followup_date TEXT NOT NULL,
      officer_id TEXT NOT NULL,
      officer_name TEXT NOT NULL,
      status_summary TEXT NOT NULL,
      is_living_improved INTEGER DEFAULT 0,
      notes TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES assistance_applications (id) ON DELETE CASCADE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS application_history (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      status TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      changed_by_id TEXT NOT NULL,
      changed_by_name TEXT NOT NULL,
      notes TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES assistance_applications (id) ON DELETE CASCADE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS fund_accounts (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      total_received REAL DEFAULT 0,
      committed_amount REAL DEFAULT 0,
      disbursed_amount REAL DEFAULT 0,
      available_amount REAL DEFAULT 0,
      target_goal REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS financial_transactions (
      id TEXT PRIMARY KEY,
      transaction_no TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      fund_id TEXT NOT NULL,
      fund_name TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payer_or_payee TEXT NOT NULL,
      reference_no TEXT NOT NULL,
      receipt_url TEXT,
      slip_url TEXT,
      status TEXT DEFAULT 'completed',
      reversal_ref_id TEXT,
      reversal_reason TEXT,
      reversed_at TEXT,
      reversed_by_id TEXT,
      reversed_by_name TEXT,
      recorded_by_id TEXT NOT NULL,
      recorded_by_name TEXT NOT NULL,
      verified_by_id TEXT,
      verified_by_name TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure migration columns exist in financial_transactions
  const tableCols = await db.execute(`PRAGMA table_info(financial_transactions)`);
  const colNames = tableCols.rows.map((c) => String(c.name));
  if (!colNames.includes('reversal_ref_id')) {
    try { await db.execute(`ALTER TABLE financial_transactions ADD COLUMN reversal_ref_id TEXT;`); } catch {}
  }
  if (!colNames.includes('reversal_reason')) {
    try { await db.execute(`ALTER TABLE financial_transactions ADD COLUMN reversal_reason TEXT;`); } catch {}
  }
  if (!colNames.includes('reversed_at')) {
    try { await db.execute(`ALTER TABLE financial_transactions ADD COLUMN reversed_at TEXT;`); } catch {}
  }
  if (!colNames.includes('reversed_by_id')) {
    try { await db.execute(`ALTER TABLE financial_transactions ADD COLUMN reversed_by_id TEXT;`); } catch {}
  }
  if (!colNames.includes('reversed_by_name')) {
    try { await db.execute(`ALTER TABLE financial_transactions ADD COLUMN reversed_by_name TEXT;`); } catch {}
  }

  // Ensure migration columns exist in beneficiaries (Survey Section A)
  const benCols = await db.execute(`PRAGMA table_info(beneficiaries)`);
  const benColNames = benCols.rows.map((c) => String(c.name));
  const benNewCols: [string, string][] = [
    ['title_prefix', 'TEXT DEFAULT "นาย"'],
    ['birth_date', 'TEXT'],
    ['age', 'INTEGER DEFAULT 0'],
    ['occupation', 'TEXT'],
    ['marital_status', 'TEXT DEFAULT "single"'],
    ['postcode', 'TEXT'],
    ['house_no', 'TEXT'],
    ['village_no', 'TEXT'],
    ['subdistrict', 'TEXT'],
    ['branch_id', 'TEXT DEFAULT "br-hq"'],
    ['branch_name', 'TEXT DEFAULT "สำนักงานใหญ่ กรุงเทพมหานคร"'],
    ['registration_no', 'TEXT'],
    ['registration_status', 'TEXT DEFAULT "pending_verification"'],
    ['registered_date', 'TEXT'],
    ['surveyor_id', 'TEXT'],
    ['surveyor_name', 'TEXT'],
    ['qualification_date', 'TEXT'],
    ['qualification_notes', 'TEXT'],
    ['qualified_by_id', 'TEXT'],
    ['qualified_by_name', 'TEXT'],
    ['evaluator_checklist', 'TEXT'],
    ['disability_notes', 'TEXT'],
    ['illness_notes', 'TEXT'],
    ['living_limitations', 'TEXT'],
    ['hardship_reasons', 'TEXT'],
    ['member_id', 'TEXT'],
    ['latitude', 'REAL'],
    ['longitude', 'REAL'],
    ['residence_address', 'TEXT'],
    ['place_name', 'TEXT'],
    ['location_updated_at', 'TEXT'],
    ['location_updated_by', 'TEXT'],
    ['location_verification_status', "TEXT DEFAULT 'not_specified'"],
  ];
  for (const [col, colType] of benNewCols) {
    if (!benColNames.includes(col)) {
      try { await db.execute(`ALTER TABLE beneficiaries ADD COLUMN ${col} ${colType};`); } catch {}
    }
  }

  // Create table for registration status history (Audit trail for beneficiary qualification)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS beneficiary_registration_history (
      id TEXT PRIMARY KEY,
      beneficiary_id TEXT NOT NULL,
      status TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      changed_by_id TEXT NOT NULL,
      changed_by_name TEXT NOT NULL,
      notes TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries (id) ON DELETE CASCADE
    );
  `);

  // Create table for individual beneficiary registry edit history (Audit trail with field-level diffs)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS beneficiary_edit_history (
      id TEXT PRIMARY KEY,
      beneficiary_id TEXT NOT NULL,
      edited_by_id TEXT NOT NULL,
      edited_by_name TEXT NOT NULL,
      edited_by_role TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      changes_summary TEXT,
      changes_detail TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries (id) ON DELETE CASCADE
    );
  `);

  // ==========================================
  // Follow-up & Monitoring System Tables (ZMS)
  // ==========================================
  await db.execute(`
    CREATE TABLE IF NOT EXISTS follow_up_plans (
      id TEXT PRIMARY KEY,
      assistance_record_id TEXT NOT NULL,
      beneficiary_id TEXT NOT NULL,
      assistance_type TEXT NOT NULL,
      requires_followup INTEGER DEFAULT 1,
      opt_out_reason TEXT,
      min_visits INTEGER NOT NULL DEFAULT 1,
      completed_visits INTEGER DEFAULT 0,
      remaining_visits INTEGER DEFAULT 0,
      status TEXT DEFAULT 'not_started',
      next_followup_date TEXT,
      assigned_officer_id TEXT,
      assigned_officer_name TEXT,
      branch_id TEXT,
      branch_name TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assistance_record_id) REFERENCES assistance_applications (id) ON DELETE CASCADE,
      FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries (id) ON DELETE CASCADE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS follow_up_records (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      application_id TEXT NOT NULL,
      beneficiary_id TEXT NOT NULL,
      visit_number INTEGER NOT NULL,
      followup_date TEXT NOT NULL,
      visit_format TEXT NOT NULL DEFAULT 'field_visit',
      location TEXT,
      inspector_id TEXT NOT NULL,
      inspector_name TEXT NOT NULL,
      inspection_details TEXT NOT NULL,
      visit_result TEXT NOT NULL,
      progress_assessment TEXT NOT NULL,
      problems_and_obstacles TEXT,
      additional_support_needed TEXT,
      officer_recommendation TEXT,
      next_appointment_date TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plan_id) REFERENCES follow_up_plans (id) ON DELETE CASCADE,
      FOREIGN KEY (application_id) REFERENCES assistance_applications (id) ON DELETE CASCADE,
      FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries (id) ON DELETE CASCADE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS follow_up_attachments (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      caption TEXT,
      uploaded_by_id TEXT,
      uploaded_by_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (record_id) REFERENCES follow_up_records (id) ON DELETE CASCADE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS follow_up_audit_logs (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      action TEXT NOT NULL,
      old_values TEXT,
      new_values TEXT,
      actor_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plan_id) REFERENCES follow_up_plans (id) ON DELETE CASCADE
    );
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_fup_plan_aid ON follow_up_plans (assistance_record_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_fup_plan_bid ON follow_up_plans (beneficiary_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_fup_plan_status ON follow_up_plans (status);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_fup_rec_pid ON follow_up_records (plan_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_fup_rec_aid ON follow_up_records (application_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_fup_att_rid ON follow_up_attachments (record_id);`);

  // Ensure application_documents can link to either application_id or beneficiary_id + Cloud Storage columns
  const docCols = await db.execute(`PRAGMA table_info(application_documents)`);
  const docColNames = docCols.rows.map((c) => String(c.name));
  if (!docColNames.includes('beneficiary_id')) {
    try { await db.execute(`ALTER TABLE application_documents ADD COLUMN beneficiary_id TEXT;`); } catch {}
  }
  if (!docColNames.includes('storage_provider')) {
    try { await db.execute(`ALTER TABLE application_documents ADD COLUMN storage_provider TEXT DEFAULT 'local';`); } catch {}
  }
  if (!docColNames.includes('storage_path')) {
    try { await db.execute(`ALTER TABLE application_documents ADD COLUMN storage_path TEXT;`); } catch {}
  }
  if (!docColNames.includes('file_size')) {
    try { await db.execute(`ALTER TABLE application_documents ADD COLUMN file_size INTEGER DEFAULT 0;`); } catch {}
  }
  if (!docColNames.includes('mime_type')) {
    try { await db.execute(`ALTER TABLE application_documents ADD COLUMN mime_type TEXT;`); } catch {}
  }
  if (!docColNames.includes('checksum')) {
    try { await db.execute(`ALTER TABLE application_documents ADD COLUMN checksum TEXT;`); } catch {}
  }
  if (!docColNames.includes('is_confidential')) {
    try { await db.execute(`ALTER TABLE application_documents ADD COLUMN is_confidential INTEGER DEFAULT 1;`); } catch {}
  }
  if (!docColNames.includes('uploaded_by_id')) {
    try { await db.execute(`ALTER TABLE application_documents ADD COLUMN uploaded_by_id TEXT;`); } catch {}
  }
  if (!docColNames.includes('uploaded_by_name')) {
    try { await db.execute(`ALTER TABLE application_documents ADD COLUMN uploaded_by_name TEXT;`); } catch {}
  }

  // Ensure anchor record exists for standalone beneficiary registry documents
  try {
    await db.execute(`
      INSERT OR IGNORE INTO assistance_applications (
        id, application_no, beneficiary_id, status, applied_date, assistance_type
      ) VALUES (
        'REGISTRY-DOCS', 'REGISTRY-DOCS', 'system', 'submitted', '1 ม.ค. 2569', 'เอกสารทะเบียนผู้มีสิทธิ์'
      );
    `);
  } catch {}

  // Safe backfill: ensure all existing beneficiaries have a registration_no and registration_status
  try {
    const unregBeneficiaries = await db.execute(`SELECT id, created_at FROM beneficiaries WHERE registration_no IS NULL OR registration_no = '' ORDER BY created_at ASC`);
    if (unregBeneficiaries.rows.length > 0) {
      const countRes = await db.execute(`SELECT COUNT(*) as c FROM beneficiaries WHERE registration_no IS NOT NULL AND registration_no != ''`);
      let seq = Number(countRes.rows[0].c) + 1;
      for (const b of unregBeneficiaries.rows) {
        const regNo = `REG-2569-${seq.toString().padStart(4, '0')}`;
        seq++;
        // Check if beneficiary has an approved/disbursed application
        const appRes = await db.execute({
          sql: `SELECT status FROM assistance_applications WHERE beneficiary_id = ?`,
          args: [String(b.id)],
        });
        const hasApproved = appRes.rows.some((a) => ['approved', 'wait_disbursement', 'disbursed', 'closed'].includes(String(a.status)));
        const defaultStatus = hasApproved ? 'qualified' : 'pending_verification';
        const regDate = b.created_at ? String(b.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10);
        
        await db.execute({
          sql: `UPDATE beneficiaries SET registration_no = ?, registration_status = COALESCE(registration_status, ?), registered_date = COALESCE(registered_date, ?) WHERE id = ?`,
          args: [regNo, defaultStatus, regDate, String(b.id)],
        });
      }
    }
  } catch (err) {
    console.error('Safe backfill warning:', err);
  }

  // Ensure migration columns exist in households (Survey Sections A, D, E, G, H)
  const hhCols = await db.execute(`PRAGMA table_info(households)`);
  const hhColNames = hhCols.rows.map((c) => String(c.name));
  const hhNewCols: [string, string][] = [
    ['housing_type', 'TEXT DEFAULT "own"'],
    ['land_title_type', 'TEXT DEFAULT "title_deed"'],
    ['land_title_notes', 'TEXT'],
    ['income_breakdown', 'TEXT'],
    ['expense_breakdown', 'TEXT'],
    ['past_assistance', 'TEXT'],
    ['family_situation_summary', 'TEXT'],
    ['urgent_needs', 'TEXT'],
    ['dependent_burdens', 'TEXT'],
    ['coordinator_info', 'TEXT'],
    ['certifier_info', 'TEXT'],
    ['latitude', 'REAL'],
    ['longitude', 'REAL'],
    ['residence_address', 'TEXT'],
    ['place_name', 'TEXT'],
    ['location_updated_at', 'TEXT'],
    ['location_updated_by', 'TEXT'],
    ['location_verification_status', "TEXT DEFAULT 'not_specified'"],
  ];
  for (const [col, colType] of hhNewCols) {
    if (!hhColNames.includes(col)) {
      try { await db.execute(`ALTER TABLE households ADD COLUMN ${col} ${colType};`); } catch {}
    }
  }

  // Ensure migration columns exist in assistance_applications (Survey Sections B, C & Workflow)
  const appCols = await db.execute(`PRAGMA table_info(assistance_applications)`);
  const appColNames = appCols.rows.map((c) => String(c.name));
  const appNewCols: [string, string][] = [
    ['branch_id', 'TEXT DEFAULT "br-hq"'],
    ['branch_name', 'TEXT DEFAULT "สำนักงานใหญ่ กรุงเทพมหานคร"'],
    ['hardship_reasons', 'TEXT'],
    ['assistance_type', 'TEXT DEFAULT "cash"'],
    ['assistance_type_details', 'TEXT'],
    ['necessity_details', 'TEXT'],
    ['evaluator_checklist', 'TEXT'],
    ['rejection_reason', 'TEXT'],
    ['member_id', 'TEXT'],
    ['registration_no', 'TEXT'],
    ['assistance_type_id', 'TEXT'],
    ['assistance_group', 'TEXT DEFAULT "core"'],
  ];
  for (const [col, colType] of appNewCols) {
    if (!appColNames.includes(col)) {
      try { await db.execute(`ALTER TABLE assistance_applications ADD COLUMN ${col} ${colType};`); } catch {}
    }
  }

  // Ensure migration columns exist in household_members (Survey Section F)
  const hmCols = await db.execute(`PRAGMA table_info(household_members)`);
  const hmColNames = hmCols.rows.map((c) => String(c.name));
  if (!hmColNames.includes('education_status')) {
    try { await db.execute(`ALTER TABLE household_members ADD COLUMN education_status TEXT;`); } catch {}
  }
  if (!hmColNames.includes('notes')) {
    try { await db.execute(`ALTER TABLE household_members ADD COLUMN notes TEXT;`); } catch {}
  }

  // Assistance Types Table (Admin-extensible types & 10 Standard Types)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS assistance_types (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      type_group TEXT DEFAULT 'core',
      required_docs TEXT,
      order_index INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const typeCols = await db.execute(`PRAGMA table_info(assistance_types)`);
  const typeColNames = typeCols.rows.map((c) => String(c.name));
  if (!typeColNames.includes('type_group')) {
    try { await db.execute(`ALTER TABLE assistance_types ADD COLUMN type_group TEXT DEFAULT 'core';`); } catch {}
  }
  if (!typeColNames.includes('required_docs')) {
    try { await db.execute(`ALTER TABLE assistance_types ADD COLUMN required_docs TEXT;`); } catch {}
  }
  if (!typeColNames.includes('order_index')) {
    try { await db.execute(`ALTER TABLE assistance_types ADD COLUMN order_index INTEGER DEFAULT 0;`); } catch {}
  }

  // Ensure all 10 standard assistance types are seeded or updated
  const standardTypes = [
    { id: 'ast-core-1', code: 'LIVING_SUPPORT', name: 'ปัจจัยยังชีพ', category: 'cash', group: 'core', desc: 'เงินช่วยเหลือยังชีพฉุกเฉินและข้าวสารอาหารแห้งขั้นพื้นฐานสำหรับครอบครัวที่ขาดแคลน', order: 1 },
    { id: 'ast-core-2', code: 'MONTHLY_ALLOWANCE', name: 'ปัจจัยยังชีพรายเดือน', category: 'cash', group: 'core', desc: 'เงินสงเคราะห์เพื่อการครองชีพรายเดือนต่อเนื่องสำหรับผู้สูงอายุ ผู้พิการ หรือผู้ป่วยติดเตียง', order: 2 },
    { id: 'ast-core-3', code: 'HOUSING_REPAIR_BUILD', name: 'ซ่อมและสร้างที่อยู่อาศัย', category: 'housing', group: 'core', desc: 'ปรับปรุงหลังคารั่ว ฝาผนัง ห้องน้ำ หรือจัดสร้างที่พักอาศัยขั้นพื้นฐานให้ปลอดภัยและมีสุขอนามัย', order: 3 },
    { id: 'ast-core-4', code: 'CAREER_SUPPORT', name: 'สนับสนุนอาชีพ', category: 'cash', group: 'core', desc: 'จัดซื้อเครื่องมือทำกิน อุปกรณ์ประกอบอาชีพ หรือเงินทุนหมุนเวียนตั้งต้นเพื่อการพึ่งพาตนเองอย่างยั่งยืน', order: 4 },
    { id: 'ast-core-5', code: 'EDUCATION_GRANT', name: 'ทุนการศึกษา', category: 'education', group: 'core', desc: 'ทุนการศึกษา ค่าเล่าเรียน ค่าชุดนักเรียน และอุปกรณ์การเรียนสำหรับบุตรหลานในครอบครัวยากไร้', order: 5 },
    { id: 'ast-core-6', code: 'EMERGENCY_AID', name: 'ช่วยเหลือฉุกเฉิน', category: 'cash', group: 'core', desc: 'บรรเทาทุกข์เร่งด่วนกรณีประสบอุบัติภัย อัคคีภัย วาตภัย อุทกภัย หรือวิกฤตสุขภาพเฉียบพลัน', order: 6 },
    { id: 'ast-spec-7', code: 'MUALLAF_SUPPORT', name: 'มุสลิมใหม่', category: 'service', group: 'specific', desc: 'การสงเคราะห์ผู้เข้ารับอิสลามใหม่เพื่อความมั่นคงในการดำรงชีวิต อุปกรณ์ศาสนกิจ และการเรียนรู้หลักศาสนา', order: 7 },
    { id: 'ast-spec-8', code: 'HUMANITARIAN_AID', name: 'มนุษยธรรม', category: 'in_kind', group: 'specific', desc: 'ความช่วยเหลือทางมนุษยธรรมแก่ผู้ลี้ภัย บุคคลไร้ที่พึ่ง หรือผู้เผชิญภาวะวิกฤติตามหลักสิทธิมนุษยชน', order: 8 },
    { id: 'ast-spec-9', code: 'GHARIMUN_DEBT', name: 'ผู้มีหนี้สินล้นตัว', category: 'cash', group: 'specific', desc: 'ปลดเปลื้องภาระหนี้สินจำเป็นจากการกู้ยืมเพื่อการรักษาพยาบาล การศึกษา หรือดำรงชีพ (หมวดฆอริมูน)', order: 9 },
    { id: 'ast-spec-10', code: 'IBN_SABIL', name: 'ผู้เดินทาง', category: 'cash', group: 'specific', desc: 'ค่าเดินทาง ค่าอาหาร และค่าที่พักฉุกเฉินสำหรับผู้เดินทางตกยากและขาดแคลนทุนทรัพย์ (หมวดอิบนุสสะบีล)', order: 10 },
  ];

  for (const st of standardTypes) {
    const existing = await db.execute({
      sql: 'SELECT id FROM assistance_types WHERE code = ? OR name = ?',
      args: [st.code, st.name],
    });
    if (existing.rows.length === 0) {
      await db.execute({
        sql: 'INSERT INTO assistance_types (id, code, name, category, description, type_group, order_index, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
        args: [st.id, st.code, st.name, st.category, st.desc, st.group, st.order],
      });
    } else {
      await db.execute({
        sql: 'UPDATE assistance_types SET type_group = ?, order_index = ?, name = ?, category = ?, description = ? WHERE code = ?',
        args: [st.group, st.order, st.name, st.category, st.desc, st.code],
      });
    }
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      description TEXT NOT NULL,
      ip_address TEXT DEFAULT '127.0.0.1',
      old_values TEXT,
      new_values TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      fund_id TEXT NOT NULL,
      target_amount REAL NOT NULL,
      raised_amount REAL DEFAULT 0,
      donor_count INTEGER DEFAULT 0,
      image_url TEXT,
      status TEXT DEFAULT 'active',
      start_date TEXT,
      end_date TEXT,
      is_featured INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (fund_id) REFERENCES fund_accounts (id)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS zakat_formula_versions (
      id TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      category TEXT NOT NULL,
      category_name_th TEXT NOT NULL,
      effective_date TEXT NOT NULL,
      nisab_standard TEXT NOT NULL,
      nisab_value_thb REAL NOT NULL,
      rate_percentage REAL NOT NULL,
      approved_by TEXT NOT NULL,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);


  // Seed default Branches if empty
  const branchCount = await db.execute('SELECT COUNT(*) as count FROM branches');
  if (Number(branchCount.rows[0].count) === 0) {
    await db.execute(`INSERT INTO branches (
      id, code, name, name_en, branch_type, parent_branch_id, address, subdistrict, district, province, postcode,
      phone, email, manager_user_id, manager_name, is_headquarters, status
    ) VALUES
      ('br-hq', 'BR-BKK', 'สำนักงานใหญ่ กรุงเทพมหานคร', 'Bangkok Headquarters', 'headquarters', NULL, '123/45 ถนนรามคำแหง', 'หัวหมาก', 'บางกะปิ', 'กรุงเทพมหานคร', '10240', '02-123-4567', 'hq@zakatfoundation.or.th', 'u-2', 'ดร. อับดุลลอฮ์ สัจจะธรรม', 1, 'active'),
      ('br-central', 'BR-CTR', 'สาขาภาคกลางและปริมณฑล', 'Central & Metropolitan Branch', 'regional_branch', 'br-hq', '19/4 ถนนรัตนาธิเบศร์', 'บางกระสอ', 'เมืองนนทบุรี', 'นนทบุรี', '11000', '02-555-8899', 'central@zakatfoundation.or.th', 'u-3', 'อุสมาน เจริญสุข', 0, 'active'),
      ('br-south', 'BR-STH', 'สาขาภาคใต้ (ปัตตานี)', 'Southern Regional Branch (Pattani)', 'regional_branch', 'br-hq', '88/12 ถนนเจริญประดิษฐ์', 'รูสะมิแล', 'เมืองปัตตานี', 'ปัตตานี', '94000', '073-333-456', 'south@zakatfoundation.or.th', NULL, 'อุสตาซซาการียา บินดอเลาะ', 0, 'active'),
      ('br-north', 'BR-NTH', 'สาขาภาคเหนือ (เชียงใหม่)', 'Northern Regional Branch (Chiang Mai)', 'regional_branch', 'br-hq', '45/3 ถนนช้างคลาน', 'ช้างคลาน', 'เมืองเชียงใหม่', 'เชียงใหม่', '50100', '053-271-456', 'north@zakatfoundation.or.th', NULL, 'อาจารย์อิบรอฮีม สมบูรณ์', 0, 'active');
    `);
  } else {
    // Safe one-time backfill for existing branches missing extended fields
    await db.execute(`UPDATE branches SET
      name_en = COALESCE(name_en, 'Bangkok Headquarters'),
      branch_type = COALESCE(branch_type, 'headquarters'),
      address = COALESCE(address, '123/45 ถนนรามคำแหง'),
      subdistrict = COALESCE(subdistrict, 'หัวหมาก'),
      district = COALESCE(district, 'บางกะปิ'),
      postcode = COALESCE(postcode, '10240'),
      phone = COALESCE(phone, '02-123-4567'),
      email = COALESCE(email, 'hq@zakatfoundation.or.th'),
      manager_user_id = COALESCE(manager_user_id, 'u-2'),
      manager_name = COALESCE(manager_name, 'ดร. อับดุลลอฮ์ สัจจะธรรม'),
      status = COALESCE(status, 'active')
      WHERE id = 'br-hq' AND (address IS NULL OR address = '');`);

    await db.execute(`UPDATE branches SET
      name_en = COALESCE(name_en, 'Central & Metropolitan Branch'),
      branch_type = COALESCE(branch_type, 'regional_branch'),
      parent_branch_id = COALESCE(parent_branch_id, 'br-hq'),
      address = COALESCE(address, '19/4 ถนนรัตนาธิเบศร์'),
      subdistrict = COALESCE(subdistrict, 'บางกระสอ'),
      district = COALESCE(district, 'เมืองนนทบุรี'),
      postcode = COALESCE(postcode, '11000'),
      phone = COALESCE(phone, '02-555-8899'),
      email = COALESCE(email, 'central@zakatfoundation.or.th'),
      manager_user_id = COALESCE(manager_user_id, 'u-3'),
      manager_name = COALESCE(manager_name, 'อุสมาน เจริญสุข'),
      status = COALESCE(status, 'active')
      WHERE id = 'br-central' AND (address IS NULL OR address = '');`);

    await db.execute(`UPDATE branches SET
      name_en = COALESCE(name_en, 'Southern Regional Branch (Pattani)'),
      branch_type = COALESCE(branch_type, 'regional_branch'),
      parent_branch_id = COALESCE(parent_branch_id, 'br-hq'),
      address = COALESCE(address, '88/12 ถนนเจริญประดิษฐ์'),
      subdistrict = COALESCE(subdistrict, 'รูสะมิแล'),
      district = COALESCE(district, 'เมืองปัตตานี'),
      postcode = COALESCE(postcode, '94000'),
      phone = COALESCE(phone, '073-333-456'),
      email = COALESCE(email, 'south@zakatfoundation.or.th'),
      manager_name = COALESCE(manager_name, 'อุสตาซซาการียา บินดอเลาะ'),
      status = COALESCE(status, 'active')
      WHERE id = 'br-south' AND (address IS NULL OR address = '');`);

    await db.execute(`UPDATE branches SET
      name_en = COALESCE(name_en, 'Northern Regional Branch (Chiang Mai)'),
      branch_type = COALESCE(branch_type, 'regional_branch'),
      parent_branch_id = COALESCE(parent_branch_id, 'br-hq'),
      address = COALESCE(address, '45/3 ถนนช้างคลาน'),
      subdistrict = COALESCE(subdistrict, 'ช้างคลาน'),
      district = COALESCE(district, 'เมืองเชียงใหม่'),
      postcode = COALESCE(postcode, '50100'),
      phone = COALESCE(phone, '053-271-456'),
      email = COALESCE(email, 'north@zakatfoundation.or.th'),
      manager_name = COALESCE(manager_name, 'อาจารย์อิบรอฮีม สมบูรณ์'),
      status = COALESCE(status, 'active')
      WHERE id = 'br-north' AND (address IS NULL OR address = '');`);

    await db.execute(`UPDATE branches SET status = 'active' WHERE status IS NULL OR status = '';`);
  }

  // Seed default Departments if empty
  const deptCount = await db.execute('SELECT COUNT(*) as count FROM departments');
  if (Number(deptCount.rows[0].count) === 0) {
    await db.execute(`INSERT INTO departments (
      id, code, name, name_en, description, branch_id, head_user_id, head_name, allowed_roles, status
    ) VALUES
      ('dept-board', 'DEPT-BRD', 'คณะกรรมการมูลนิธิและชะรีอะฮ์', 'Board & Shariah Governance', 'กำหนดนโยบาย วินิจฉัยข้อชารีอะฮ์ และกำกับดูแลภาพรวม', 'br-hq', 'u-2', 'ดร. อับดุลลอฮ์ สัจจะธรรม', '["executive","approver"]', 'active'),
      ('dept-social', 'DEPT-SOC', 'ฝ่ายสังคมสงเคราะห์และลงพื้นที่', 'Social Welfare & Field Operations', 'รับคำร้อง ตรวจสอบเอกสาร และลงพื้นที่ประเมินคุณสมบัติผู้ขอรับซะกาต', 'br-central', 'u-3', 'อุสมาน เจริญสุข', '["officer"]', 'active'),
      ('dept-finance', 'DEPT-FIN', 'ฝ่ายการเงินและบัญชีกองทุน', 'Finance & Fund Accounting', 'บริหารจัดการรายรับ-จ่าย จัดทำบัญชีแยกกองทุน และโอนจ่ายเงินสวัสดิการ', 'br-hq', 'u-5', 'ฟาติมะฮ์ หวังดี', '["finance"]', 'active'),
      ('dept-it', 'DEPT-SYS', 'ฝ่ายเทคโนโลยีสารสนเทศและการรักษาความปลอดภัย', 'Information Technology & Security', 'ดูแลความปลอดภัยระบบเซิร์ฟเวอร์ ฐานข้อมูล และการสำรองข้อมูล', 'br-hq', 'u-1', 'อิบรอฮีม มานะชัย', '["super_admin"]', 'active'),
      ('dept-public', 'DEPT-PUB', 'แผนกบริการสมาชิกและผู้บริจาคทั่วไป', 'Member & Donor Relations', 'บริการข้อมูลสาธารณะ ประสานงานผู้บริจาค และออกใบสำคัญรับเงิน', 'br-hq', NULL, 'ฝ่ายบริการสมาชิกกลาง', '["member","officer"]', 'active');
    `);
  } else {
    await db.execute(`UPDATE departments SET
      name_en = COALESCE(name_en, 'Board & Shariah Governance'),
      branch_id = COALESCE(branch_id, 'br-hq'),
      head_user_id = COALESCE(head_user_id, 'u-2'),
      head_name = COALESCE(head_name, 'ดร. อับดุลลอฮ์ สัจจะธรรม'),
      allowed_roles = COALESCE(allowed_roles, '["executive","approver"]'),
      status = COALESCE(status, 'active')
      WHERE id = 'dept-board' AND (name_en IS NULL OR name_en = '');`);

    await db.execute(`UPDATE departments SET
      name_en = COALESCE(name_en, 'Social Welfare & Field Operations'),
      branch_id = COALESCE(branch_id, 'br-central'),
      head_user_id = COALESCE(head_user_id, 'u-3'),
      head_name = COALESCE(head_name, 'อุสมาน เจริญสุข'),
      allowed_roles = COALESCE(allowed_roles, '["officer"]'),
      status = COALESCE(status, 'active')
      WHERE id = 'dept-social' AND (name_en IS NULL OR name_en = '');`);

    await db.execute(`UPDATE departments SET
      name_en = COALESCE(name_en, 'Finance & Fund Accounting'),
      branch_id = COALESCE(branch_id, 'br-hq'),
      head_user_id = COALESCE(head_user_id, 'u-5'),
      head_name = COALESCE(head_name, 'ฟาติมะฮ์ หวังดี'),
      allowed_roles = COALESCE(allowed_roles, '["finance"]'),
      status = COALESCE(status, 'active')
      WHERE id = 'dept-finance' AND (name_en IS NULL OR name_en = '');`);

    await db.execute(`UPDATE departments SET
      name_en = COALESCE(name_en, 'Information Technology & Security'),
      branch_id = COALESCE(branch_id, 'br-hq'),
      head_user_id = COALESCE(head_user_id, 'u-1'),
      head_name = COALESCE(head_name, 'อิบรอฮีม มานะชัย'),
      allowed_roles = COALESCE(allowed_roles, '["super_admin"]'),
      status = COALESCE(status, 'active')
      WHERE id = 'dept-it' AND (name_en IS NULL OR name_en = '');`);

    await db.execute(`UPDATE departments SET
      name_en = COALESCE(name_en, 'Member & Donor Relations'),
      branch_id = COALESCE(branch_id, 'br-hq'),
      head_name = COALESCE(head_name, 'ฝ่ายบริการสมาชิกกลาง'),
      allowed_roles = COALESCE(allowed_roles, '["member","officer"]'),
      status = COALESCE(status, 'active')
      WHERE id = 'dept-public' AND (name_en IS NULL OR name_en = '');`);

    await db.execute(`UPDATE departments SET status = 'active' WHERE status IS NULL OR status = '';`);
    await db.execute(`UPDATE departments SET branch_id = 'br-hq' WHERE branch_id IS NULL OR branch_id = '';`);
  }

  // Seed default Users if empty
  const userCount = await db.execute('SELECT COUNT(*) as count FROM users');
  const salt = 'zms_salt_2569';
  const defaultHash = crypto.createHmac('sha256', salt).update('Zms@Secure2569!').digest('hex');

  if (Number(userCount.rows[0].count) === 0) {
    await db.execute({
      sql: `INSERT INTO users (id, email, name, first_name, last_name, role, role_title_th, phone, branch, branch_id, department_id, status, password_setup_status, password_hash, salt, last_login) VALUES
        ('u-1', 'admin@zakatfoundation.or.th', 'อิบรอฮีม มานะชัย', 'อิบรอฮีม', 'มานะชัย', 'super_admin', 'ผู้ดูแลระบบสูงสุด (Super Admin)', '081-234-5678', 'สำนักงานใหญ่ กรุงเทพฯ', 'br-hq', 'dept-it', 'active', 'completed', '${defaultHash}', '${salt}', '16 ต.ค. 2569 16:45'),
        ('u-2', 'exec@zakatfoundation.or.th', 'ดร. อับดุลลอฮ์ สัจจะธรรม', 'อับดุลลอฮ์', 'สัจจะธรรม', 'executive', 'ประธานกรรมการ / ผู้บริหาร (Executive)', '089-876-5432', 'สำนักงานใหญ่ กรุงเทพฯ', 'br-hq', 'dept-board', 'active', 'pending_setup', NULL, NULL, '16 ต.ค. 2569 15:30'),
        ('u-3', 'officer@zakatfoundation.or.th', 'อุสมาน เจริญสุข', 'อุสมาน', 'เจริญสุข', 'officer', 'เจ้าหน้าที่ช่วยเหลือสังคม (Help Officer)', '086-555-1234', 'สาขาภาคกลางและปริมณฑล', 'br-central', 'dept-social', 'active', 'pending_setup', NULL, NULL, '16 ต.ค. 2569 17:15'),
        ('u-4', 'approver@zakatfoundation.or.th', 'อิหม่ามฟารุก อาลี', 'ฟารุก', 'อาลี', 'approver', 'ผู้อนุมัติคำร้อง / ชะรีอะฮ์ (Approver)', '084-333-8899', 'คณะกรรมการพิจารณาซะกาต', 'br-hq', 'dept-board', 'active', 'pending_setup', NULL, NULL, '16 ต.ค. 2569 14:20'),
        ('u-5', 'finance@zakatfoundation.or.th', 'ฟาติมะฮ์ หวังดี', 'ฟาติมะฮ์', 'หวังดี', 'finance', 'หัวหน้าฝ่ายการเงินและบัญชี (Finance)', '085-777-9911', 'ฝ่ายการเงิน สำนักงานใหญ่', 'br-hq', 'dept-finance', 'active', 'pending_setup', NULL, NULL, '16 ต.ค. 2569 16:10'),
        ('u-6', 'yusuf.donor@email.com', 'ยูซุฟ มีลาภ', 'ยูซุฟ', 'มีลาภ', 'member', 'สมาชิก / ผู้บริจาค (Member)', '082-999-4455', 'สำนักงานใหญ่ กรุงเทพฯ', 'br-hq', 'dept-public', 'active', 'completed', '${defaultHash}', '${salt}', '16 ต.ค. 2569 11:00')`,
      args: [],
    });
  } else {
    // One-time migration for existing records missing branch_id or password_setup_status
    const unmigrated = await db.execute(`SELECT COUNT(*) as count FROM users WHERE branch_id IS NULL OR password_setup_status IS NULL`);
    if (Number(unmigrated.rows[0].count) > 0) {
      await db.execute(`UPDATE users SET password_setup_status = 'completed' WHERE id IN ('u-1', 'u-6') AND password_setup_status IS NULL;`);
      await db.execute(`UPDATE users SET password_setup_status = 'pending_setup', password_hash = NULL, salt = NULL WHERE id IN ('u-2', 'u-3', 'u-4', 'u-5') AND password_setup_status IS NULL;`);
      await db.execute(`UPDATE users SET password_setup_status = CASE WHEN password_hash IS NOT NULL THEN 'completed' ELSE 'pending_setup' END WHERE password_setup_status IS NULL;`);
      await db.execute(`UPDATE users SET first_name = 'อิบรอฮีม', last_name = 'มานะชัย', branch_id = 'br-hq', department_id = 'dept-it' WHERE id = 'u-1' AND branch_id IS NULL;`);
      await db.execute(`UPDATE users SET first_name = 'อับดุลลอฮ์', last_name = 'สัจจะธรรม', branch_id = 'br-hq', department_id = 'dept-board' WHERE id = 'u-2' AND branch_id IS NULL;`);
      await db.execute(`UPDATE users SET first_name = 'อุสมาน', last_name = 'เจริญสุข', branch_id = 'br-central', department_id = 'dept-social' WHERE id = 'u-3' AND branch_id IS NULL;`);
      await db.execute(`UPDATE users SET first_name = 'ฟารุก', last_name = 'อาลี', branch_id = 'br-hq', department_id = 'dept-board' WHERE id = 'u-4' AND branch_id IS NULL;`);
      await db.execute(`UPDATE users SET first_name = 'ฟาติมะฮ์', last_name = 'หวังดี', branch_id = 'br-hq', department_id = 'dept-finance' WHERE id = 'u-5' AND branch_id IS NULL;`);
      await db.execute(`UPDATE users SET first_name = 'ยูซุฟ', last_name = 'มีลาภ', branch_id = 'br-hq', department_id = 'dept-public' WHERE id = 'u-6' AND branch_id IS NULL;`);
    }

    // Ensure test member accounts u-6 (registered) and u-7 (unregistered)
    await db.execute(`UPDATE users SET national_id = '1100200000006', beneficiary_id = 'ben-yusuf-006' WHERE id = 'u-6' AND (national_id IS NULL OR national_id = '');`);

    const user7 = await db.execute("SELECT id FROM users WHERE id = 'u-7'");
    if (user7.rows.length === 0) {
      await db.execute(`INSERT INTO users (id, email, name, first_name, last_name, role, role_title_th, phone, branch, branch_id, department_id, status, password_setup_status, password_hash, salt, national_id, last_login) VALUES
        ('u-7', 'areefin.unreg@email.com', 'อารีฟีน ไร้ทะเบียน', 'อารีฟีน', 'ไร้ทะเบียน', 'member', 'สมาชิกทั่วไป (Member)', '082-111-2233', 'สำนักงานใหญ่ กรุงเทพฯ', 'br-hq', 'dept-public', 'active', 'completed', '${defaultHash}', '${salt}', '1100200000007', '17 ต.ค. 2569 10:00');`);
    }

    // Ensure member u-6 has a valid qualified beneficiary registry
    const benYusuf = await db.execute("SELECT id FROM beneficiaries WHERE member_id = 'u-6' OR national_id = '1100200000006'");
    if (benYusuf.rows.length === 0) {
      const hhId = 'hh-yusuf-006';
      await db.execute({
        sql: `INSERT OR IGNORE INTO households (id, household_no, address, province, district, subdistrict, community, housing_condition, monthly_income, monthly_expense)
              VALUES (?, 'HH-2569-0006', '12/4 ซอยเจริญผล', 'กรุงเทพมหานคร', 'มีนบุรี', 'แสนแสบ', 'ชุมชนนูรุ้ลยะกีน', 'normal', 8500, 7000)`,
        args: [hhId],
      });
      await db.execute({
        sql: `INSERT OR IGNORE INTO beneficiaries (
          id, household_id, member_id, full_name, national_id, phone, email, asnaf_category,
          title_prefix, birth_date, age, occupation, marital_status, registration_no, registration_status, registered_date, branch_id, branch_name
        ) VALUES (?, ?, 'u-6', 'นาย ยูซุฟ มีลาภ', '1100200000006', '082-999-4455', 'yusuf.donor@email.com', 'miskin',
          'นาย', '1988-06-15', 38, 'รับจ้างทั่วไป', 'married', 'REG-2569-0006', 'qualified', '2569-10-01', 'br-hq', 'สำนักงานใหญ่ กรุงเทพมหานคร')`,
        args: ['ben-yusuf-006', hhId],
      });
    } else {
      await db.execute(`UPDATE beneficiaries SET member_id = 'u-6' WHERE national_id = '1100200000006' AND (member_id IS NULL OR member_id = '');`);
    }
  }


  // Seed default Funds if empty
  const fundCount = await db.execute('SELECT COUNT(*) as count FROM fund_accounts');
  if (Number(fundCount.rows[0].count) === 0) {
    await db.execute({
      sql: `INSERT INTO fund_accounts (id, code, name, description, category, total_received, committed_amount, disbursed_amount, available_amount, target_goal) VALUES
        ('fund-1', 'FND-ZKT-01', 'กองทุนซะกาตผู้ยากไร้และขัดสน (Faqir & Miskin)', 'เพื่อการยังชีพ ค่าอาหาร ค่ายา และที่อยู่อาศัยขั้นพื้นฐานของผู้ยากไร้', 'zakat', 3500000, 250000, 2100000, 1150000, 5000000),
        ('fund-2', 'FND-ZKT-02', 'กองทุนซะกาตเพื่อการปลดเปลื้องหนี้สิน (Gharimin)', 'ช่วยเหลือผู้มีหนี้สินจำเป็นที่ไม่สามารถชำระได้ตามหลักเกณฑ์', 'zakat', 1400000, 120000, 850000, 430000, 2000000),
        ('fund-3', 'FND-ZKT-03', 'กองทุนซะกาตทุนการศึกษาและเยาวชน (Fi Sabilillah)', 'ทุนการศึกษา อุปกรณ์การเรียน และพัฒนาทักษะอาชีพแก่เยาวชนยากไร้', 'zakat', 2100000, 180000, 1450000, 470000, 3000000),
        ('fund-4', 'FND-ZKT-04', 'กองทุนซะกาตผู้เดินทางตกยาก (Ibn Sabil)', 'ช่วยเหลือค่าเดินทางกลับภูมิลำเนาและเหตุฉุกเฉินระหว่างเดินทาง', 'zakat', 450000, 15000, 315000, 120000, 600000),
        ('fund-5', 'FND-SDQ-01', 'กองทุนศอดะเกาะฮ์และเงินบริจาคทั่วไป (General Sadaqah)', 'เงินบริจาคช่วยเหลือสังคม สาธารณภัย และโครงการพัฒนาชุมชน', 'sadaqah', 2650000, 160000, 1850000, 640000, 4000000),
        ('fund-6', 'FND-OPR-01', 'กองทุนค่าใช้จ่ายดำเนินงานมูลนิธิ (Amil & Operations)', 'ส่วนจัดสรรซะกาตสำหรับเจ้าหน้าที่จัดการซะกาตและค่าดำเนินงานตามสัดส่วนที่อนุมัติ', 'operational', 1050000, 45000, 720000, 285000, 1500000)`,
      args: [],
    });
  }

  // Seed default Financial Transactions if empty
  const txnCount = await db.execute('SELECT COUNT(*) as count FROM financial_transactions');
  if (Number(txnCount.rows[0].count) === 0) {
    const seedTransactions = [
      {
        id: 'txn-seed-1',
        no: 'TXN-REV-2569-00101',
        date: '14 ต.ค. 2569 09:30',
        type: 'income',
        fundId: 'fund-1',
        fundName: 'กองทุนซะกาตผู้ยากไร้และขัดสน (Faqir & Miskin)',
        cat: 'ซะกาตทรัพย์สินทางการเงิน',
        amount: 250000.0,
        method: 'bank_transfer',
        party: 'นายยูซุฟ มีลาภ',
        ref: 'BBL-TF-20261014-8841',
        recUrl: '/receipts/REC-2569-00101.pdf',
        slipUrl: '/slips/slip-seed-1.jpg',
        recordedId: 'u-5',
        recordedName: 'ฟาติมะฮ์ หวังดี',
        notes: 'ซะกาตประจำปีรอบครบรอบนิศอบ 2569',
      },
      {
        id: 'txn-seed-2',
        no: 'TXN-REV-2569-00102',
        date: '14 ต.ค. 2569 11:15',
        type: 'income',
        fundId: 'fund-5',
        fundName: 'กองทุนศอดะเกาะฮ์และเงินบริจาคทั่วไป (General Sadaqah)',
        cat: 'เงินบริจาคทั่วไป/เศาะดะเกาะฮ์',
        amount: 50000.0,
        method: 'promptpay_qr',
        party: 'ผู้ไม่ประสงค์ออกนาม',
        ref: 'KBANK-PP-20261014-9922',
        recUrl: '/receipts/REC-2569-00102.pdf',
        slipUrl: '/slips/slip-seed-2.jpg',
        recordedId: 'u-5',
        recordedName: 'ฟาติมะฮ์ หวังดี',
        notes: 'บริจาคผ่านระบบ PromptPay QR',
      },
      {
        id: 'txn-seed-3',
        no: 'TXN-EXP-2569-00201',
        date: '15 ต.ค. 2569 13:40',
        type: 'expense',
        fundId: 'fund-6',
        fundName: 'กองทุนค่าใช้จ่ายดำเนินงานมูลนิธิ (Amil & Operations)',
        cat: 'ค่าพาหนะลงพื้นที่สำรวจข้อมูลผู้ขอรับซะกาต',
        amount: 2500.0,
        method: 'bank_transfer',
        party: 'นายอุสมาน เจริญสุข (เจ้าหน้าที่)',
        ref: 'EXP-VOUCHER-2569-0044',
        recUrl: '',
        slipUrl: '/slips/slip-seed-exp1.jpg',
        recordedId: 'u-5',
        recordedName: 'ฟาติมะฮ์ หวังดี',
        notes: 'เบิกจ่ายค่าเดินทางลงพื้นที่ชุมชนหนองจอก 3 ครัวเรือน',
      },
      {
        id: 'txn-seed-4',
        no: 'TXN-DISB-2569-00301',
        date: '15 ต.ค. 2569 15:00',
        type: 'disbursement',
        fundId: 'fund-1',
        fundName: 'กองทุนซะกาตผู้ยากไร้และขัดสน (Faqir & Miskin)',
        cat: 'จ่ายเงินสวัสดิการผู้รับซะกาต (APP-2569-001)',
        amount: 15000.0,
        method: 'bank_transfer',
        party: 'นางมัยมูนะฮ์ หวังดี (ผู้รับซะกาต)',
        ref: 'KTB-TRF-25691015-3312',
        recUrl: '',
        slipUrl: '/slips/slip-seed-disb1.jpg',
        recordedId: 'u-5',
        recordedName: 'ฟาติมะฮ์ หวังดี',
        notes: 'โอนเงินช่วยเหลือยังชีพฉุกเฉินและค่ารักษาพยาบาล',
      },
    ];

    for (const s of seedTransactions) {
      await db.execute({
        sql: `INSERT INTO financial_transactions (
          id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
          payer_or_payee, reference_no, receipt_url, slip_url, status, recorded_by_id, recorded_by_name, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?)`,
        args: [
          s.id, s.no, s.date, s.type, s.fundId, s.fundName, s.cat, s.amount, s.method,
          s.party, s.ref, s.recUrl, s.slipUrl, s.recordedId, s.recordedName, s.notes,
        ],
      });
    }
  }

  // Ensure Opening Balance ledger records exist so reconciliation is mathematically exact
  const openingCount = await db.execute("SELECT COUNT(*) as count FROM financial_transactions WHERE category LIKE 'ยอดยกมา%'");
  if (Number(openingCount.rows[0].count) === 0) {
    const openingTxns = [
      { id: 'txn-opn-1', no: 'TXN-OPN-2569-001', date: '01 ต.ค. 2569 08:00', type: 'income', fundId: 'fund-1', fundName: 'กองทุนซะกาตผู้ยากไร้และขัดสน (Faqir & Miskin)', cat: 'ยอดยกมาต้นงวด (Opening Balance)', amount: 3250000.0, ref: 'OPN-BAL-2569-01' },
      { id: 'txn-opn-2', no: 'TXN-OPN-2569-002', date: '01 ต.ค. 2569 08:00', type: 'income', fundId: 'fund-2', fundName: 'กองทุนซะกาตเพื่อการปลดเปลื้องหนี้สิน (Gharimin)', cat: 'ยอดยกมาต้นงวด (Opening Balance)', amount: 1400000.0, ref: 'OPN-BAL-2569-02' },
      { id: 'txn-opn-3', no: 'TXN-OPN-2569-003', date: '01 ต.ค. 2569 08:00', type: 'income', fundId: 'fund-3', fundName: 'กองทุนซะกาตทุนการศึกษาและเยาวชน (Fi Sabilillah)', cat: 'ยอดยกมาต้นงวด (Opening Balance)', amount: 2100000.0, ref: 'OPN-BAL-2569-03' },
      { id: 'txn-opn-4', no: 'TXN-OPN-2569-004', date: '01 ต.ค. 2569 08:00', type: 'income', fundId: 'fund-4', fundName: 'กองทุนซะกาตผู้เดินทางตกยาก (Ibn Sabil)', cat: 'ยอดยกมาต้นงวด (Opening Balance)', amount: 450000.0, ref: 'OPN-BAL-2569-04' },
      { id: 'txn-opn-5', no: 'TXN-OPN-2569-005', date: '01 ต.ค. 2569 08:00', type: 'income', fundId: 'fund-5', fundName: 'กองทุนศอดะเกาะฮ์และเงินบริจาคทั่วไป (General Sadaqah)', cat: 'ยอดยกมาต้นงวด (Opening Balance)', amount: 2600000.0, ref: 'OPN-BAL-2569-05' },
      { id: 'txn-opn-6', no: 'TXN-OPN-2569-006', date: '01 ต.ค. 2569 08:00', type: 'income', fundId: 'fund-6', fundName: 'กองทุนค่าใช้จ่ายดำเนินงานมูลนิธิ (Amil & Operations)', cat: 'ยอดยกมาต้นงวด (Opening Balance)', amount: 1050000.0, ref: 'OPN-BAL-2569-06' },

      { id: 'txn-opn-d1', no: 'TXN-OPN-DISB-01', date: '01 ต.ค. 2569 08:00', type: 'disbursement', fundId: 'fund-1', fundName: 'กองทุนซะกาตผู้ยากไร้และขัดสน (Faqir & Miskin)', cat: 'ยอดยกมาจ่ายสวัสดิการสะสม', amount: 2085000.0, ref: 'OPN-DISB-2569-01' },
      { id: 'txn-opn-d2', no: 'TXN-OPN-DISB-02', date: '01 ต.ค. 2569 08:00', type: 'disbursement', fundId: 'fund-2', fundName: 'กองทุนซะกาตเพื่อการปลดเปลื้องหนี้สิน (Gharimin)', cat: 'ยอดยกมาจ่ายสวัสดิการสะสม', amount: 850000.0, ref: 'OPN-DISB-2569-02' },
      { id: 'txn-opn-d3', no: 'TXN-OPN-DISB-03', date: '01 ต.ค. 2569 08:00', type: 'disbursement', fundId: 'fund-3', fundName: 'กองทุนซะกาตทุนการศึกษาและเยาวชน (Fi Sabilillah)', cat: 'ยอดยกมาจ่ายสวัสดิการสะสม', amount: 1450000.0, ref: 'OPN-DISB-2569-03' },
      { id: 'txn-opn-d4', no: 'TXN-OPN-DISB-04', date: '01 ต.ค. 2569 08:00', type: 'disbursement', fundId: 'fund-4', fundName: 'กองทุนซะกาตผู้เดินทางตกยาก (Ibn Sabil)', cat: 'ยอดยกมาจ่ายสวัสดิการสะสม', amount: 315000.0, ref: 'OPN-DISB-2569-04' },
      { id: 'txn-opn-d5', no: 'TXN-OPN-DISB-05', date: '01 ต.ค. 2569 08:00', type: 'disbursement', fundId: 'fund-5', fundName: 'กองทุนศอดะเกาะฮ์และเงินบริจาคทั่วไป (General Sadaqah)', cat: 'ยอดยกมาจ่ายสวัสดิการสะสม', amount: 1850000.0, ref: 'OPN-DISB-2569-05' },
      { id: 'txn-opn-d6', no: 'TXN-OPN-DISB-06', date: '01 ต.ค. 2569 08:00', type: 'expense', fundId: 'fund-6', fundName: 'กองทุนค่าใช้จ่ายดำเนินงานมูลนิธิ (Amil & Operations)', cat: 'ยอดยกมารายจ่ายดำเนินงานสะสม', amount: 717500.0, ref: 'OPN-EXP-2569-06' },
    ];

    for (const opn of openingTxns) {
      await db.execute({
        sql: `INSERT INTO financial_transactions (
          id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
          payer_or_payee, reference_no, status, recorded_by_id, recorded_by_name, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'bank_transfer', 'ยอดยกมาต้นงวดระบบ', ?, 'completed', 'u-1', 'ผู้ดูแลระบบสูงสุด', 'บันทึกยอดยกมาเริ่มต้นงวดบัญชี 2569')`,
        args: [opn.id, opn.no, opn.date, opn.type, opn.fundId, opn.fundName, opn.cat, opn.amount, opn.ref],
      });
    }
  }

  // Seed default Campaigns if empty
  const campaignCount = await db.execute('SELECT COUNT(*) as count FROM campaigns');
  if (Number(campaignCount.rows[0].count) === 0) {
    const seedCampaigns = [
      {
        id: 'cmp-1',
        title: 'โครงการถุงยังชีพและฟื้นฟูผู้ประสบอุทกภัยฉุกเฉิน',
        slug: 'flood-relief-2569',
        description: 'จัดหาอาหารแห้ง น้ำดื่ม ยารักษาโรค และซ่อมแซมสุขาเคลื่อนที่เพื่อบรรเทาทุกข์เร่งด่วนแก่พี่น้องผู้ประสบภัยน้ำท่วม',
        category: 'emergency',
        fundId: 'fund-5',
        targetAmount: 1000000,
        raisedAmount: 645000,
        donorCount: 312,
        imageUrl: '/images/campaigns/flood-relief.jpg',
        startDate: '01 ต.ค. 2569',
        endDate: '31 ธ.ค. 2569',
        isFeatured: 1
      },
      {
        id: 'cmp-2',
        title: 'โครงการทุนการศึกษาเพื่อเยาวชนกำพร้าและยากไร้ ประจำปี 2569',
        slug: 'orphan-education-2569',
        description: 'มอบทุนการศึกษา ค่าเล่าเรียน ชุดนักเรียน และอุปกรณ์การเรียนแก่เยาวชนกำพร้าใน 8 อัศนาฟ เพื่ออนาคตที่ยั่งยืน',
        category: 'education',
        fundId: 'fund-3',
        targetAmount: 1500000,
        raisedAmount: 920000,
        donorCount: 450,
        imageUrl: '/images/campaigns/education.jpg',
        startDate: '01 ก.ย. 2569',
        endDate: '31 มี.ค. 2570',
        isFeatured: 1
      },
      {
        id: 'cmp-3',
        title: 'โครงการซ่อมแซมและสร้างบ้านเพื่อผู้ยากไร้ 8 อัศนาฟ',
        slug: 'shelter-repair-2569',
        description: 'ปรับปรุงหลังคา ห้องน้ำ และฝาผนังบ้านที่ชำรุดทรุดโทรมให้มีสุขอนามัยและความปลอดภัยในการอยู่อาศัยขั้นพื้นฐาน',
        category: 'zakat',
        fundId: 'fund-1',
        targetAmount: 800000,
        raisedAmount: 530000,
        donorCount: 185,
        imageUrl: '/images/campaigns/home-repair.jpg',
        startDate: '15 ส.ค. 2569',
        endDate: '31 ธ.ค. 2569',
        isFeatured: 1
      },
      {
        id: 'cmp-4',
        title: 'โครงการจัดหาเครื่องมือประกอบอาชีพเพื่อการพึ่งพาตนเอง',
        slug: 'livelihood-empowerment',
        description: 'สนับสนุนอุปกรณ์ค้าขาย รถเข็น จักรเย็บผ้า และแม่พันธุ์ปศุสัตว์แก่ครอบครัวขัดสนเพื่อสร้างรายได้ยังชีพอย่างถาวร',
        category: 'sadaqah',
        fundId: 'fund-1',
        targetAmount: 600000,
        raisedAmount: 310000,
        donorCount: 128,
        imageUrl: '/images/campaigns/livelihood.jpg',
        startDate: '01 ต.ค. 2569',
        endDate: '28 ก.พ. 2570',
        isFeatured: 1
      }
    ];

    for (const c of seedCampaigns) {
      await db.execute({
        sql: `INSERT INTO campaigns (id, title, slug, description, category, fund_id, target_amount, raised_amount, donor_count, image_url, start_date, end_date, is_featured)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [c.id, c.title, c.slug, c.description, c.category, c.fundId, c.targetAmount, c.raisedAmount, c.donorCount, c.imageUrl, c.startDate, c.endDate, c.isFeatured]
      });
    }
  }

  // Seed default Zakat Formula Versions if empty
  const formulaCount = await db.execute('SELECT COUNT(*) as count FROM zakat_formula_versions');
  if (Number(formulaCount.rows[0].count) === 0) {
    const seedFormulas = [
      {
        id: 'form-1',
        version: 'v2569.1',
        category: 'financial',
        categoryNameTh: 'ซะกาตทรัพย์สินทางการเงินและเงินออม',
        effectiveDate: '01 ม.ค. 2569',
        nisabStandard: 'ทองคำบริสุทธิ์ 85 กรัม (เทียบเท่าประมาณ 5.61 บาททองคำ)',
        nisabValueThb: 237575,
        ratePercentage: 2.5,
        approvedBy: 'คณะกรรมการชะรีอะฮ์และนักวิชาการศาสนามูลนิธิฯ',
        notes: 'คำนวณจากยอดทรัพย์สินสุทธิหลังหักหนี้สินระยะสั้นที่ถึงกำหนดชำระ โดยต้องมีมูลค่าไม่ต่ำกว่านิศอบและครบรอบ 1 ปีจันทรคติ (Hawl)'
      },
      {
        id: 'form-2',
        version: 'v2569.1',
        category: 'income',
        categoryNameTh: 'ซะกาตรายได้และเงินเดือนสะสม',
        effectiveDate: '01 ม.ค. 2569',
        nisabStandard: 'ทองคำบริสุทธิ์ 85 กรัม (เทียบเท่าประมาณ 5.61 บาททองคำ)',
        nisabValueThb: 237575,
        ratePercentage: 2.5,
        approvedBy: 'คณะกรรมการชะรีอะฮ์และนักวิชาการศาสนามูลนิธิฯ',
        notes: 'คำนวณจากรายได้ทั้งปีหลังหักค่าใช้จ่ายส่วนตัว ค่าเลี้ยงดูครอบครัว และหนี้สินจำเป็น หากมียอดคงเหลือเกินนิศอบ'
      },
      {
        id: 'form-3',
        version: 'v2569.1',
        category: 'business',
        categoryNameTh: 'ซะกาตธุรกิจการค้าและสินค้าคงเหลือ',
        effectiveDate: '01 ม.ค. 2569',
        nisabStandard: 'ทองคำบริสุทธิ์ 85 กรัม (เทียบเท่าประมาณ 5.61 บาททองคำ)',
        nisabValueThb: 237575,
        ratePercentage: 2.5,
        approvedBy: 'คณะกรรมการชะรีอะฮ์และนักวิชาการศาสนามูลนิธิฯ',
        notes: 'สูตร: (สินทรัพย์หมุนเวียน + สต็อกสินค้าตามราคาขาย + เงินสดในมือ) - หนี้สินการค้าระยะสั้น'
      },
      {
        id: 'form-4',
        version: 'v2569.1',
        category: 'agri',
        categoryNameTh: 'ซะกาตผลผลิตการเกษตรและพืชพันธุ์',
        effectiveDate: '01 ม.ค. 2569',
        nisabStandard: '5 วะสัก (Wasq) หรือประมาณ 653 กิโลกรัม',
        nisabValueThb: 9142,
        ratePercentage: 10.0,
        approvedBy: 'คณะกรรมการชะรีอะฮ์และนักวิชาการศาสนามูลนิธิฯ',
        notes: 'อัตรา 10% หากใช้น้ำฝนธรรมชาติ หรือ 5% หากมีต้นทุนระบบชลประทาน เครื่องสูบน้ำ หรือค่าแรงชลประทาน โดยจ่าย ณ วันเก็บเกี่ยว'
      },
      {
        id: 'form-5',
        version: 'v2569.1',
        category: 'livestock',
        categoryNameTh: 'ซะกาตปศุสัตว์ (วัว ควาย แพะ แกะ)',
        effectiveDate: '01 ม.ค. 2569',
        nisabStandard: 'วัว/ควาย 30 ตัว (จ่ายลูกวัว 1 ตัว) หรือแพะ/แกะ 40 ตัว (จ่าย 1 ตัว)',
        nisabValueThb: 0,
        ratePercentage: 0,
        approvedBy: 'คณะกรรมการชะรีอะฮ์และนักวิชาการศาสนามูลนิธิฯ',
        notes: 'สัตว์เลี้ยงต้องเลี้ยงตามทุ่งหญ้าธรรมชาติเกินกว่าครึ่งปี และเลี้ยงเพื่อการขยายพันธุ์หรือผลิตนม ไม่ใช่เพื่อการใช้แรงงาน'
      }
    ];

    for (const f of seedFormulas) {
      await db.execute({
        sql: `INSERT INTO zakat_formula_versions (id, version, category, category_name_th, effective_date, nisab_standard, nisab_value_thb, rate_percentage, approved_by, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [f.id, f.version, f.category, f.categoryNameTh, f.effectiveDate, f.nisabStandard, f.nisabValueThb, f.ratePercentage, f.approvedBy, f.notes]
      });
    }
  }

  // =========================================================================
  // Master Finance & Accounting Module Schema Extensions (ZMS)
  // =========================================================================

  // 1. Bank Accounts Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id TEXT PRIMARY KEY,
      account_name TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      branch_name TEXT,
      opening_balance REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      reconciled_balance REAL DEFAULT 0,
      last_reconciled_at TEXT,
      last_reconciled_by TEXT,
      status TEXT DEFAULT 'active',
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Bank Reconciliations Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS bank_reconciliations (
      id TEXT PRIMARY KEY,
      bank_account_id TEXT NOT NULL,
      reconciliation_date TEXT NOT NULL,
      system_balance REAL NOT NULL,
      statement_balance REAL NOT NULL,
      difference REAL NOT NULL,
      status TEXT DEFAULT 'balanced',
      notes TEXT,
      proof_url TEXT,
      auditor_id TEXT NOT NULL,
      auditor_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bank_account_id) REFERENCES bank_accounts (id)
    );
  `);

  // 3. 5-Step Deposit-Withdrawal & Cash Movement Workflow Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS cash_flow_workflows (
      id TEXT PRIMARY KEY,
      workflow_no TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      step1_bank_account_id TEXT NOT NULL,
      step1_withdraw_amount REAL NOT NULL,
      step1_date TEXT NOT NULL,
      step1_operator_id TEXT NOT NULL,
      step1_operator_name TEXT NOT NULL,
      step1_approver_id TEXT,
      step1_approver_name TEXT,
      step1_proof_url TEXT,
      step1_notes TEXT,
      step1_status TEXT DEFAULT 'completed',
      step2_treasurer_id TEXT DEFAULT 'custodian-ruslan',
      step2_treasurer_name TEXT DEFAULT 'นายรุสลัน หะสาเมาะ',
      step2_deposit_amount REAL,
      step2_date TEXT,
      step2_ref_no TEXT,
      step2_proof_url TEXT,
      step2_status TEXT DEFAULT 'pending',
      step3_withdrawer_id TEXT DEFAULT 'custodian-mukhlis',
      step3_withdrawer_name TEXT DEFAULT 'นายมุกลิส มีระยะ',
      step3_withdraw_amount REAL,
      step3_date TEXT,
      step3_purpose TEXT,
      step3_target_asnaf TEXT,
      step3_target_fund_id TEXT,
      step3_approver_id TEXT,
      step3_approver_name TEXT,
      step3_status TEXT DEFAULT 'pending',
      step4_allocated_amount REAL DEFAULT 0,
      step4_distribution_summary TEXT,
      step4_status TEXT DEFAULT 'pending',
      step5_reconciled_amount REAL,
      step5_remaining_cash REAL DEFAULT 0,
      step5_auditor_id TEXT,
      step5_auditor_name TEXT,
      step5_closed_at TEXT,
      step5_notes TEXT,
      overall_status TEXT DEFAULT 'in_progress',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Multiple Cash Withdrawals under Cash Flow Workflow (Step 3 multiple line items)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS cash_flow_withdrawals (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      withdrawal_no TEXT UNIQUE NOT NULL,
      amount REAL NOT NULL,
      withdrawal_datetime TEXT NOT NULL,
      withdrawer_id TEXT DEFAULT 'custodian-mukhlis',
      withdrawer_name TEXT DEFAULT 'นายมุกลิส มีระยะ',
      source_description TEXT,
      target_asnaf TEXT NOT NULL,
      target_fund_id TEXT,
      purpose TEXT NOT NULL,
      approver_id TEXT,
      approver_name TEXT,
      proof_url TEXT,
      proof_name TEXT,
      proof_size INTEGER,
      proof_type TEXT,
      notes TEXT,
      status TEXT DEFAULT 'disbursed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workflow_id) REFERENCES cash_flow_workflows (id)
    );
  `);

  // Explicit Unique Index for Withdrawal Voucher No (Concurrency & Integrity Safety)
  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_cfw_withdrawal_no ON cash_flow_withdrawals(withdrawal_no);
  `);

  // Document Sequences table for sequential numbering across fiscal years
  await db.execute(`
    CREATE TABLE IF NOT EXISTS document_sequences (
      id TEXT PRIMARY KEY,
      document_type TEXT NOT NULL,
      fiscal_year TEXT NOT NULL,
      last_sequence INTEGER NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(document_type, fiscal_year)
    );
  `);

  // Finance Handover Records (Handover of Cash Aid from Finance to Case Workers)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS finance_handover_records (
      id TEXT PRIMARY KEY,
      withdrawal_id TEXT NOT NULL,
      workflow_id TEXT NOT NULL,
      handover_no TEXT UNIQUE NOT NULL,
      handover_date TEXT NOT NULL,
      handover_time TEXT NOT NULL,
      handed_over_by_id TEXT NOT NULL,
      handed_over_by_name TEXT NOT NULL,
      received_by_id TEXT,
      received_by_name TEXT NOT NULL,
      received_by_position TEXT,
      amount REAL NOT NULL,
      handover_method TEXT NOT NULL DEFAULT 'cash',
      reference_no TEXT,
      notes TEXT,
      proof_url TEXT NOT NULL,
      proof_name TEXT NOT NULL,
      proof_size INTEGER DEFAULT 0,
      proof_type TEXT DEFAULT 'application/pdf',
      status TEXT NOT NULL DEFAULT 'fully_handed_over',
      cancellation_reason TEXT,
      recorded_by_id TEXT NOT NULL,
      recorded_by_name TEXT NOT NULL,
      confirmed_by_id TEXT NOT NULL,
      confirmed_by_name TEXT NOT NULL,
      confirmed_at TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (withdrawal_id) REFERENCES cash_flow_withdrawals(id)
    );
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_fhr_withdrawal_id ON finance_handover_records(withdrawal_id);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_fhr_workflow_id ON finance_handover_records(workflow_id);
  `);

  // Workflow Attachments across all 5 steps
  await db.execute(`
    CREATE TABLE IF NOT EXISTS workflow_attachments (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      withdrawal_id TEXT,
      step_number INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      uploaded_by_id TEXT NOT NULL,
      uploaded_by_name TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      description TEXT,
      FOREIGN KEY (workflow_id) REFERENCES cash_flow_workflows (id)
    );
  `);

  // Multiple Cash Disbursement Recipients under Step 4 (Linked to approved assistance applications)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS cash_flow_disbursement_items (
      id TEXT PRIMARY KEY,
      withdrawal_id TEXT NOT NULL,
      workflow_id TEXT NOT NULL,
      application_id TEXT NOT NULL,
      beneficiary_id TEXT NOT NULL,
      beneficiary_name TEXT NOT NULL,
      national_id TEXT NOT NULL,
      asnaf_category TEXT NOT NULL,
      assistance_type TEXT NOT NULL,
      area_info TEXT,
      approved_amount REAL NOT NULL,
      disbursed_amount_before REAL DEFAULT 0,
      this_disbursement_amount REAL NOT NULL,
      remaining_balance REAL NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (withdrawal_id) REFERENCES cash_flow_withdrawals (id),
      FOREIGN KEY (workflow_id) REFERENCES cash_flow_workflows (id),
      FOREIGN KEY (application_id) REFERENCES assistance_applications (id)
    );
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_cfdi_application_id ON cash_flow_disbursement_items(application_id);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_cfdi_withdrawal_id ON cash_flow_disbursement_items(withdrawal_id);
  `);

  // Assistance Finance Discrepancies (Discrepancy Reporting by Case Workers back to Finance - Task 2)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS assistance_finance_discrepancies (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      withdrawal_id TEXT,
      category TEXT NOT NULL,
      reported_by_id TEXT NOT NULL,
      reported_by_name TEXT NOT NULL,
      reported_at TEXT NOT NULL,
      expected_amount REAL,
      actual_amount REAL,
      notes TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_investigation',
      resolution_notes TEXT,
      resolved_by_id TEXT,
      resolved_by_name TEXT,
      resolved_at TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES assistance_applications(id)
    );
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_afd_app_id ON assistance_finance_discrepancies(application_id);
  `);

  // Assistance Execution Records (TASK 3: บันทึกยืนยันผลการช่วยเหลือเสร็จสิ้นและจ่ายเป็นงวด)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS assistance_execution_records (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      withdrawal_id TEXT,
      workflow_id TEXT,
      installment_no INTEGER DEFAULT 1,
      total_installments INTEGER DEFAULT 1,
      assistance_type TEXT NOT NULL,
      asnaf_category TEXT NOT NULL,
      execution_date TEXT NOT NULL,
      execution_time TEXT NOT NULL,
      execution_datetime TEXT NOT NULL,
      executor_id TEXT NOT NULL,
      executor_name TEXT NOT NULL,
      assistance_outcome TEXT NOT NULL,
      actual_disbursed_amount REAL NOT NULL DEFAULT 0,
      actual_assistance_value REAL NOT NULL DEFAULT 0,
      details TEXT,
      proof_url TEXT,
      proof_name TEXT,
      proof_size INTEGER,
      proof_type TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      is_confirmed INTEGER NOT NULL DEFAULT 0,
      confirmation_statement TEXT,
      confirmed_by_id TEXT,
      confirmed_by_name TEXT,
      confirmed_at TEXT,
      edit_reason TEXT,
      previous_values TEXT,
      cancellation_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES assistance_applications (id)
    );
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_aer_application_id ON assistance_execution_records(application_id);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_aer_status ON assistance_execution_records(status);
  `);

  // Migration columns on assistance_applications for Task 3
  const appTask3Cols = [
    "assistance_result_status TEXT DEFAULT 'not_started'",
    "assistance_outcome TEXT",
    "actual_assistance_value REAL DEFAULT 0",
    "execution_confirmed_at TEXT",
    "execution_confirmed_by_id TEXT",
    "execution_confirmed_by_name TEXT",
    "installment_count INTEGER DEFAULT 1",
    "current_installment INTEGER DEFAULT 1"
  ];
  for (const col of appTask3Cols) {
    try {
      await db.execute(`ALTER TABLE assistance_applications ADD COLUMN ${col}`);
    } catch {}
  }

  // Assistance Refund & Unspent Cash Returns (TASK 4: บันทึกเงินเหลือคืนจากการช่วยเหลือ)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS assistance_refund_records (
      id TEXT PRIMARY KEY,
      refund_no TEXT UNIQUE NOT NULL,
      application_id TEXT,
      withdrawal_id TEXT,
      workflow_id TEXT,
      refund_date TEXT NOT NULL,
      refund_time TEXT NOT NULL,
      refund_datetime TEXT NOT NULL,
      refund_amount REAL NOT NULL,
      refund_reason TEXT NOT NULL,
      returned_by_id TEXT NOT NULL,
      returned_by_name TEXT NOT NULL,
      received_by_id TEXT NOT NULL,
      received_by_name TEXT NOT NULL,
      target_bank_account_id TEXT,
      target_fund_id TEXT DEFAULT 'fund-1',
      proof_url TEXT,
      proof_name TEXT,
      proof_size INTEGER DEFAULT 0,
      proof_type TEXT DEFAULT 'application/pdf',
      status TEXT DEFAULT 'completed',
      cancellation_reason TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES assistance_applications (id)
    );
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_arr_app_id ON assistance_refund_records(application_id);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_arr_withdrawal_id ON assistance_refund_records(withdrawal_id);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_arr_status ON assistance_refund_records(status);
  `);

  // Migration columns on assistance_applications and cash_flow_withdrawals for Task 4
  const appTask4Cols = [
    "refunded_amount REAL DEFAULT 0",
    "is_refunded INTEGER DEFAULT 0"
  ];
  for (const col of appTask4Cols) {
    try {
      await db.execute(`ALTER TABLE assistance_applications ADD COLUMN ${col}`);
    } catch {}
  }

  const withdrawalTask4Cols = [
    "aid_refunded_amount REAL DEFAULT 0"
  ];
  for (const col of withdrawalTask4Cols) {
    try {
      await db.execute(`ALTER TABLE cash_flow_withdrawals ADD COLUMN ${col}`);
    } catch {}
  }

  // Itemized Office Expense Receipts under Petty Cash Clearance (TASK 6)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS cash_flow_clearance_items (
      id TEXT PRIMARY KEY,
      withdrawal_id TEXT NOT NULL,
      workflow_id TEXT NOT NULL,
      expense_date TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      receipt_url TEXT,
      receipt_name TEXT,
      receipt_size INTEGER,
      receipt_type TEXT,
      category_code TEXT,
      category_name TEXT,
      notes TEXT,
      status TEXT DEFAULT 'accepted',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (withdrawal_id) REFERENCES cash_flow_withdrawals (id),
      FOREIGN KEY (workflow_id) REFERENCES cash_flow_workflows (id)
    );
  `);

  // Migration for additional withdrawal columns
  const additionalWithdrawalCols = [
    "voucher_type TEXT DEFAULT 'aid_disbursement'",
    "requested_amount REAL",
    "approved_amount REAL",
    "actual_received_amount REAL",
    "source_fund_type TEXT",
    "expense_category TEXT",
    "expense_details TEXT",
    "allowed_fund_id TEXT",
    "deadline_date TEXT",
    "clearance_status TEXT DEFAULT 'not_required'",
    "clearance_spent_amount REAL DEFAULT 0",
    "clearance_returned_amount REAL DEFAULT 0",
    "clearance_excess_amount REAL DEFAULT 0",
    "clearance_date TEXT",
    "clearance_return_date TEXT",
    "clearance_overspent_reason TEXT",
    "clearance_overspent_approved_by_id TEXT",
    "clearance_overspent_approved_by_name TEXT",
    "clearance_overspent_approved_at TEXT",
    "clearance_proof_url TEXT",
    "clearance_proof_name TEXT",
    "clearance_proof_size INTEGER",
    "clearance_proof_type TEXT",
    "clearance_notes TEXT",
    "cleared_by_id TEXT",
    "cleared_by_name TEXT",
    "handover_status TEXT DEFAULT 'not_handed_over'",
    "total_handed_over_amount REAL DEFAULT 0",
    "remaining_handover_amount REAL",
    "recipient_case_worker_name TEXT",
    "recipient_case_worker_id TEXT",
    "handover_notes TEXT"
  ];

  for (const colDef of additionalWithdrawalCols) {
    try {
      await db.execute(`ALTER TABLE cash_flow_withdrawals ADD COLUMN ${colDef}`);
    } catch {
      // Column already exists
    }
  }

  // Migration for additional workflow columns if not present
  const additionalWfCols = [
    'step1_ref_no TEXT',
    'step1_fund_type TEXT DEFAULT "zakat"',
    'step1_transfer_ref TEXT',
    'step1_event_date TEXT',
    'step1_event_time TEXT',
    'step1_event_datetime TEXT',
    'step1_proof_name TEXT',
    'step1_proof_size INTEGER',
    'step1_proof_type TEXT',
    'step2_handover_person_name TEXT',
    'step2_handover_person_id TEXT',
    'step2_handover_datetime TEXT',
    'step2_handover_amount REAL',
    'step2_received_datetime TEXT',
    'step2_mismatch_reason TEXT',
    'step2_mismatch_approved_by_id TEXT',
    'step2_mismatch_approved_by_name TEXT',
    'step2_mismatch_approved_at TEXT',
    'step2_auditor_id TEXT',
    'step2_auditor_name TEXT',
    'step2_notes TEXT',
    'step2_event_datetime TEXT',
    'step2_proof_name TEXT',
    'step2_proof_size INTEGER',
    'step2_proof_type TEXT',
    'step4_date TEXT',
    'step4_event_datetime TEXT',
    'step4_proof_url TEXT',
    'step4_proof_name TEXT',
    'step4_proof_size INTEGER',
    'step4_proof_type TEXT',
    'step5_event_datetime TEXT',
    'step5_proof_url TEXT',
    'step5_proof_name TEXT',
    'step5_proof_size INTEGER',
    'step5_proof_type TEXT',
    'step5_status TEXT DEFAULT "pending"',
    'step5_unallocated_amount REAL DEFAULT 0',
    'step5_confirmed_aid_amount REAL DEFAULT 0',
    'step5_confirmed_other_expense_amount REAL DEFAULT 0',
    'step5_voucher_count INTEGER DEFAULT 0',
    'step5_assistance_case_count INTEGER DEFAULT 0',
    'step5_pending_items_count INTEGER DEFAULT 0',
    'step5_missing_proof_count INTEGER DEFAULT 0',
    'step5_discrepancy_amount REAL DEFAULT 0',
    'step5_discrepancy_reason TEXT'
  ];

  for (const colDef of additionalWfCols) {
    try {
      await db.execute(`ALTER TABLE cash_flow_workflows ADD COLUMN ${colDef}`);
    } catch {
      // Column already exists
    }
  }

  // 4. Asnaf Allocations Table (8 Asnafs, 100% total)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS asnaf_allocations (
      id TEXT PRIMARY KEY,
      fiscal_year TEXT NOT NULL,
      asnaf_code TEXT NOT NULL,
      asnaf_name TEXT NOT NULL,
      percentage REAL NOT NULL,
      target_amount REAL DEFAULT 0,
      allocated_amount REAL DEFAULT 0,
      disbursed_amount REAL DEFAULT 0,
      remaining_amount REAL DEFAULT 0,
      policy_ref TEXT,
      updated_by_id TEXT,
      updated_by_name TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS asnaf_allocation_history (
      id TEXT PRIMARY KEY,
      fiscal_year TEXT NOT NULL,
      proportions_json TEXT NOT NULL,
      changed_by_id TEXT NOT NULL,
      changed_by_name TEXT NOT NULL,
      policy_ref TEXT NOT NULL,
      reason TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. Faqir-Miskin Sub-Fund Allocations Table (5 sub-funds, 100% total)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS faqir_miskin_sub_funds (
      id TEXT PRIMARY KEY,
      fiscal_year TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      percentage REAL NOT NULL,
      target_amount REAL DEFAULT 0,
      allocated_amount REAL DEFAULT 0,
      disbursed_amount REAL DEFAULT 0,
      remaining_amount REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      updated_by_id TEXT,
      updated_by_name TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS faqir_miskin_history (
      id TEXT PRIMARY KEY,
      fiscal_year TEXT NOT NULL,
      proportions_json TEXT NOT NULL,
      changed_by_id TEXT NOT NULL,
      changed_by_name TEXT NOT NULL,
      policy_ref TEXT NOT NULL,
      reason TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 6. Administrative Expense Categories Table (10 default categories)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS admin_expense_categories (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      group_name TEXT DEFAULT 'ทั่วไป',
      budget_limit REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration columns for financial_transactions
  const ftCols = await db.execute(`PRAGMA table_info(financial_transactions)`);
  const ftColNames = ftCols.rows.map((c) => String(c.name));
  const ftNewCols: [string, string][] = [
    ['bank_account_id', 'TEXT'],
    ['money_type', 'TEXT DEFAULT "zakat"'],
    ['zakat_year', 'TEXT DEFAULT "2569"'],
    ['asnaf_category', 'TEXT'],
    ['sub_fund_category', 'TEXT'],
    ['beneficiary_id', 'TEXT'],
    ['application_id', 'TEXT'],
    ['donor_name', 'TEXT'],
    ['is_anonymous', 'INTEGER DEFAULT 0'],
    ['usage_restriction', 'TEXT'],
    ['workflow_id', 'TEXT'],
  ];
  for (const [col, colType] of ftNewCols) {
    if (!ftColNames.includes(col)) {
      try { await db.execute(`ALTER TABLE financial_transactions ADD COLUMN ${col} ${colType};`); } catch {}
    }
  }

  // Seed Default Bank Accounts (3 required accounts)
  const bankCount = await db.execute('SELECT COUNT(*) as count FROM bank_accounts');
  if (Number(bankCount.rows[0].count) === 0) {
    const seedBankAccounts = [
      {
        id: 'bank-1',
        name: 'ธนาคารอิสลามแห่งประเทศไทย — มูลนิธิซะกาตและสาธารณกุศล',
        bank: 'ธนาคารอิสลามแห่งประเทศไทย',
        number: '095-1-23456-7',
        branch: 'สำนักงานใหญ่ กรุงเทพมหานคร',
        opening: 4500000.0,
        current: 4500000.0,
        reconciled: 4500000.0,
        lastReconciledAt: '15 ต.ค. 2569',
        lastReconciledBy: 'ฟาติมะฮ์ หวังดี',
        isDefault: 1
      },
      {
        id: 'bank-2',
        name: 'ธนาคารอิสลามแห่งประเทศไทย — มูลนิธิบัยตุลมาล ยะลา',
        bank: 'ธนาคารอิสลามแห่งประเทศไทย',
        number: '095-2-76543-2',
        branch: 'สาขายะลา',
        opening: 2800000.0,
        current: 2800000.0,
        reconciled: 2800000.0,
        lastReconciledAt: '15 ต.ค. 2569',
        lastReconciledBy: 'ฟาติมะฮ์ หวังดี',
        isDefault: 0
      },
      {
        id: 'bank-3',
        name: 'ธนาคารกรุงไทย — มูลนิธิบัยตุลมาล ยะลา',
        bank: 'ธนาคารกรุงไทย',
        number: '912-0-88123-4',
        branch: 'สาขายะลา',
        opening: 1950000.0,
        current: 1950000.0,
        reconciled: 1950000.0,
        lastReconciledAt: '15 ต.ค. 2569',
        lastReconciledBy: 'ฟาติมะฮ์ หวังดี',
        isDefault: 0
      }
    ];

    for (const b of seedBankAccounts) {
      await db.execute({
        sql: `INSERT INTO bank_accounts (id, account_name, bank_name, account_number, branch_name, opening_balance, current_balance, reconciled_balance, last_reconciled_at, last_reconciled_by, is_default)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [b.id, b.name, b.bank, b.number, b.branch, b.opening, b.current, b.reconciled, b.lastReconciledAt, b.lastReconciledBy, b.isDefault]
      });
    }
  }

  // Seed Default 8 Asnaf Allocations (Strict 100% initial breakdown)
  const asnafCount = await db.execute('SELECT COUNT(*) as count FROM asnaf_allocations');
  if (Number(asnafCount.rows[0].count) === 0) {
    const seedAsnafs = [
      { id: 'asnaf-1', code: 'faqir_miskin', name: 'ฟากีร–มิสกิน (ผู้ยากไร้และขัดสน)', pct: 70.0 },
      { id: 'asnaf-2', code: 'amil', name: 'อามีลีน (เจ้าหน้าที่จัดการซะกาต)', pct: 12.0 },
      { id: 'asnaf-3', code: 'muallaf', name: 'มุสลิมใหม่ (มุอัลลัฟ)', pct: 3.0 },
      { id: 'asnaf-4', code: 'gharimin', name: 'ผู้มีหนี้สินล้นตัว (อัล-ฆอรีมีน)', pct: 3.0 },
      { id: 'asnaf-5', code: 'fisabilillah', name: 'ฟีสาบิลิลละฮฺ (ในหนทางของอัลลอฮ์)', pct: 7.0 },
      { id: 'asnaf-6', code: 'ibnsabil', name: 'ผู้เดินทาง/ผู้พลัดถิ่น (อิบนุสสะบีล)', pct: 1.0 },
      { id: 'asnaf-7', code: 'humanitarian', name: 'มนุษยธรรม', pct: 4.0 },
    ];

    for (const a of seedAsnafs) {
      await db.execute({
        sql: `INSERT INTO asnaf_allocations (id, fiscal_year, asnaf_code, asnaf_name, percentage, policy_ref, updated_by_id, updated_by_name)
              VALUES (?, '2569', ?, ?, ?, 'มติคณะกรรมการชะรีอะฮ์ ครั้งที่ 1/2569', 'u-1', 'ผู้ดูแลระบบสูงสุด')`,
        args: [a.id, a.code, a.name, a.pct]
      });
    }
  }

  // Seed Default Faqir-Miskin 5 Sub-Funds (Strict 100% initial breakdown)
  const subFundCount = await db.execute('SELECT COUNT(*) as count FROM faqir_miskin_sub_funds');
  if (Number(subFundCount.rows[0].count) === 0) {
    const seedSubFunds = [
      { id: 'subf-1', code: 'living', name: 'ปัจจัยยังชีพ', pct: 15.0 },
      { id: 'subf-2', code: 'housing', name: 'ซ่อมและสร้างที่อยู่อาศัย', pct: 20.0 },
      { id: 'subf-3', code: 'career', name: 'ต่อยอดอาชีพ', pct: 20.0 },
      { id: 'subf-4', code: 'education', name: 'ทุนการศึกษา', pct: 35.0 },
      { id: 'subf-5', code: 'emergency', name: 'ช่วยเหลือฉุกเฉิน/ภัยพิบัติ', pct: 10.0 },
    ];

    for (const sf of seedSubFunds) {
      await db.execute({
        sql: `INSERT INTO faqir_miskin_sub_funds (id, fiscal_year, code, name, percentage, updated_by_id, updated_by_name)
              VALUES (?, '2569', ?, ?, ?, 'u-1', 'ผู้ดูแลระบบสูงสุด')`,
        args: [sf.id, sf.code, sf.name, sf.pct]
      });
    }
  }

  // Seed Default 11 Admin Expense Categories (TASK 6)
  const seedAdminCats = [
    { id: 'aec-1', code: 'STAFF_COMPENSATION', name: 'ค่าตอบแทนเจ้าหน้าที่', group: 'บุคลากร', order: 1, limit: 500000 },
    { id: 'aec-2', code: 'OFFICE_EXPENSES', name: 'ค่าใช้จ่ายสำนักงาน', group: 'ดำเนินงาน', order: 2, limit: 120000 },
    { id: 'aec-3', code: 'VEHICLE_FUEL', name: 'ค่าน้ำมันรถ', group: 'ยานพาหนะ', order: 3, limit: 60000 },
    { id: 'aec-4', code: 'VEHICLE_MAINTENANCE', name: 'รถยนต์', group: 'ยานพาหนะ', order: 4, limit: 80000 },
    { id: 'aec-5', code: 'INTERNET_TELECOM', name: 'ค่าอินเทอร์เน็ต', group: 'สาธารณูปโภค', order: 5, limit: 30000 },
    { id: 'aec-6', code: 'TRAVEL_EXPENSES', name: 'ค่าเดินทาง', group: 'ดำเนินงาน', order: 6, limit: 75000 },
    { id: 'aec-7', code: 'BOOKKEEPING_FEE', name: 'ค่าทำบัญชี', group: 'วิชาชีพ', order: 7, limit: 50000 },
    { id: 'aec-8', code: 'AUDIT_FEE', name: 'ค่าตรวจสอบบัญชี', group: 'วิชาชีพ', order: 8, limit: 60000 },
    { id: 'aec-9', code: 'MEALS_CATERING', name: 'อาหาร', group: 'สวัสดิการ', order: 9, limit: 45000 },
    { id: 'aec-10', code: 'ELECTRICITY_BILL', name: 'ค่าไฟฟ้า', group: 'สาธารณูปโภค', order: 10, limit: 40000 },
    { id: 'aec-11', code: 'OTHER_EXPENSES', name: 'อื่น ๆ', group: 'ทั่วไป', order: 11, limit: 50000 },
  ];

  for (const c of seedAdminCats) {
    const existing = await db.execute({
      sql: 'SELECT id FROM admin_expense_categories WHERE code = ?',
      args: [c.code]
    });
    if (existing.rows.length === 0) {
      await db.execute({
        sql: `INSERT INTO admin_expense_categories (id, code, name, group_name, budget_limit, order_index, is_active)
              VALUES (?, ?, ?, ?, ?, ?, 1)`,
        args: [c.id, c.code, c.name, c.group, c.limit, c.order]
      });
    }
  }

  })();
  return dbInitPromise;
}

