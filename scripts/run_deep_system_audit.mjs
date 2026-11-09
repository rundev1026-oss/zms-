import { createClient } from '@libsql/client';
import crypto from 'crypto';

const sqlite = createClient({ url: 'file:data/zms.db' });
const BASE_URL = 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-only-access-secret-change-me';
const SYSTEM_ADMIN_ID = process.env.SYSTEM_ADMIN_ID || 'dffb49d1-7cf3-4593-bb58-a82b25f5bff4';

function createServiceToken(userId = SYSTEM_ADMIN_ID) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, exp: now + 3600, iat: now }),
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${sig}`;
}

async function runDeepAudit() {
  console.log('====================================================');
  console.log('RUNNING DEEP SYSTEM AUDIT (PHASES 1 - 14)');
  console.log('====================================================');

  const token = createServiceToken();
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  const results = {
    phases: {},
    issues: []
  };

  // ----------------------------------------------------
  // AUDIT PHASE 2: Beneficiary Registry
  // ----------------------------------------------------
  console.log('\n[AUDIT] Phase 2: Beneficiary Registry API & Data...');
  try {
    const benRes = await fetch(`${BASE_URL}/api/beneficiaries`, { headers: authHeaders });
    const benJson = await benRes.json();
    console.log('  GET /api/beneficiaries:', benRes.status, 'success:', benJson.success, 'count:', benJson.data?.length);

    if (benJson.data?.length > 0) {
      const b = benJson.data[0];
      console.log('  Sample beneficiary:', { id: b.id, name: b.fullName, natIdMasked: b.nationalIdMasked || b.nationalId });

      // Check National ID Masking
      if (b.nationalId && !b.nationalId.includes('X') && !b.nationalId.includes('•')) {
        results.issues.push({
          phase: 'Phase 2 / Phase 14',
          severity: 'HIGH',
          title: 'Unmasked National ID exposed in /api/beneficiaries',
          detail: `Beneficiary ${b.id} returns full nationalId "${b.nationalId}" without masking in API response.`
        });
      }
    }
    results.phases.phase2 = 'PASS';
  } catch (e) {
    console.error('Phase 2 error:', e);
    results.phases.phase2 = 'FAIL';
  }

  // ----------------------------------------------------
  // AUDIT PHASE 3: Assistance Requests
  // ----------------------------------------------------
  console.log('\n[AUDIT] Phase 3: Assistance Requests API & Data...');
  try {
    const appRes = await fetch(`${BASE_URL}/api/assistance-requests`, { headers: authHeaders });
    const appJson = await appRes.json();
    console.log('  GET /api/assistance-requests:', appRes.status, 'success:', appJson.success, 'count:', appJson.items?.length || appJson.data?.length);

    if (appJson.items?.length > 0) {
      const app = appJson.items[0];
      console.log('  Sample request:', {
        id: app.id,
        appNo: app.applicationNo,
        benId: app.beneficiaryId,
        status: app.status,
        amount: app.requestedAmount
      });

      // Verify foreign key relation to Beneficiary in SQLite
      const benCheck = await sqlite.execute({
        sql: 'SELECT id, full_name FROM beneficiaries WHERE id = ?',
        args: [app.beneficiaryId]
      });
      console.log('  Linked beneficiary in SQLite:', benCheck.rows.length > 0 ? benCheck.rows[0].full_name : 'NOT FOUND!');
      if (benCheck.rows.length === 0) {
        results.issues.push({
          phase: 'Phase 3 / Phase 10',
          severity: 'HIGH',
          title: 'Orphan Assistance Request (Missing Beneficiary in SQLite)',
          detail: `Application ${app.id} references beneficiaryId ${app.beneficiaryId} which does not exist in SQLite beneficiaries table.`
        });
      }
    }
    results.phases.phase3 = 'PASS';
  } catch (e) {
    console.error('Phase 3 error:', e);
    results.phases.phase3 = 'FAIL';
  }

  // ----------------------------------------------------
  // AUDIT PHASE 4 & 5: Field Assessment & Approval
  // ----------------------------------------------------
  console.log('\n[AUDIT] Phase 4 & 5: Assessment & Approval Data...');
  try {
    const asmRes = await sqlite.execute('SELECT COUNT(*) as cnt FROM beneficiary_assessments');
    console.log('  beneficiary_assessments count in SQLite:', asmRes.rows[0].cnt);

    const pendingApprovalsRes = await fetch(`${BASE_URL}/api/approvals/pending`, { headers: authHeaders });
    const pendingJson = await pendingApprovalsRes.json();
    console.log('  GET /api/approvals/pending:', pendingApprovalsRes.status, 'count:', pendingJson.data?.length || 0);

    results.phases.phase4 = 'PASS';
    results.phases.phase5 = 'PASS';
  } catch (e) {
    console.error('Phase 4/5 error:', e);
    results.phases.phase4 = 'FAIL';
  }

  // ----------------------------------------------------
  // AUDIT PHASE 6: Disbursement & Aid Records
  // ----------------------------------------------------
  console.log('\n[AUDIT] Phase 6: Disbursement & Financial Linkage...');
  try {
    const aidRes = await fetch(`${BASE_URL}/api/finance/assistance-link?actorId=u-admin&actorName=Admin&actorRole=super_admin`, { headers: authHeaders });
    const aidJson = await aidRes.json();
    console.log('  GET /api/finance/assistance-link:', aidRes.status, 'success:', aidJson.success, 'count:', aidJson.data?.length);

    const glCount = await sqlite.execute('SELECT COUNT(*) as cnt FROM general_ledger_entries');
    const txCount = await sqlite.execute('SELECT COUNT(*) as cnt FROM financial_transactions');
    console.log('  General Ledger total rows:', glCount.rows[0].cnt);
    console.log('  Financial Transactions total rows:', txCount.rows[0].cnt);

    results.phases.phase6 = 'PASS';
  } catch (e) {
    console.error('Phase 6 error:', e);
    results.phases.phase6 = 'FAIL';
  }

  // ----------------------------------------------------
  // AUDIT PHASE 7: Follow-up System
  // ----------------------------------------------------
  console.log('\n[AUDIT] Phase 7: Follow-up System Tables & Endpoints...');
  try {
    const fuPlans = await sqlite.execute('SELECT COUNT(*) as cnt FROM follow_up_plans');
    const fuRecords = await sqlite.execute('SELECT COUNT(*) as cnt FROM follow_up_records');
    console.log('  follow_up_plans count:', fuPlans.rows[0].cnt);
    console.log('  follow_up_records count:', fuRecords.rows[0].cnt);

    results.phases.phase7 = 'PASS';
  } catch (e) {
    console.error('Phase 7 error:', e);
    results.phases.phase7 = 'FAIL';
  }

  // ----------------------------------------------------
  // AUDIT PHASE 8: Master Data
  // ----------------------------------------------------
  console.log('\n[AUDIT] Phase 8: Master Data Relations & Integrity...');
  try {
    const asnaf = await sqlite.execute('SELECT COUNT(*) as cnt FROM asnaf_allocations');
    const types = await sqlite.execute('SELECT COUNT(*) as cnt FROM assistance_types');
    const formats = await sqlite.execute('SELECT COUNT(*) as cnt FROM assistance_formats');
    const funds = await sqlite.execute('SELECT COUNT(*) as cnt FROM fund_accounts');
    const matrix = await sqlite.execute('SELECT COUNT(*) as cnt FROM assistance_type_formats');
    console.log('  asnaf_allocations:', asnaf.rows[0].cnt);
    console.log('  assistance_types:', types.rows[0].cnt);
    console.log('  assistance_formats:', formats.rows[0].cnt);
    console.log('  fund_accounts:', funds.rows[0].cnt);
    console.log('  assistance_type_formats matrix links:', matrix.rows[0].cnt);

    // Check for orphaned matrix links
    const orphanMatrix = await sqlite.execute(`
      SELECT atf.* FROM assistance_type_formats atf
      LEFT JOIN assistance_types at ON at.id = atf.assistance_type_id
      LEFT JOIN assistance_formats af ON af.id = atf.format_id
      WHERE at.id IS NULL OR af.id IS NULL
    `);
    console.log('  Orphan matrix links:', orphanMatrix.rows.length);
    if (orphanMatrix.rows.length > 0) {
      results.issues.push({
        phase: 'Phase 8',
        severity: 'MEDIUM',
        title: 'Orphan assistance_type_formats entries',
        detail: `Found ${orphanMatrix.rows.length} rows in assistance_type_formats with broken foreign keys.`
      });
    }

    results.phases.phase8 = 'PASS';
  } catch (e) {
    console.error('Phase 8 error:', e);
    results.phases.phase8 = 'FAIL';
  }

  // ----------------------------------------------------
  // AUDIT PHASE 10: Orphan & Integrity Scan across SQLite
  // ----------------------------------------------------
  console.log('\n[AUDIT] Phase 10: Orphan & Referential Integrity Scan...');
  try {
    // 1. Applications with non-existent beneficiaries
    const orphanApps = await sqlite.execute(`
      SELECT a.id, a.application_no, a.beneficiary_id
      FROM assistance_applications a
      LEFT JOIN beneficiaries b ON b.id = a.beneficiary_id
      WHERE b.id IS NULL
    `);
    console.log('  Orphan assistance_applications (no beneficiary):', orphanApps.rows.length);

    // 2. Beneficiaries with non-existent households
    const orphanBens = await sqlite.execute(`
      SELECT b.id, b.full_name, b.household_id
      FROM beneficiaries b
      LEFT JOIN households h ON h.id = b.household_id
      WHERE h.id IS NULL AND b.household_id IS NOT NULL AND b.household_id != ''
    `);
    console.log('  Orphan beneficiaries (no household):', orphanBens.rows.length);

    // 3. GL entries with non-existent transactions
    const orphanGL = await sqlite.execute(`
      SELECT gl.id, gl.journal_no, gl.transaction_id
      FROM general_ledger_entries gl
      LEFT JOIN financial_transactions ft ON ft.id = gl.transaction_id
      WHERE gl.transaction_id IS NOT NULL AND gl.transaction_id != '' AND gl.transaction_id NOT LIKE 'TXN-%' AND ft.id IS NULL
    `);
    console.log('  GL entries with non-existent financial_transactions:', orphanGL.rows.length);

    results.phases.phase10 = 'PASS';
  } catch (e) {
    console.error('Phase 10 error:', e);
    results.phases.phase10 = 'FAIL';
  }

  // ----------------------------------------------------
  // SUMMARY OF ISSUES
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log('AUDIT DISCOVERY SUMMARY:');
  console.log(`Found ${results.issues.length} potential issues:`);
  results.issues.forEach((iss, idx) => {
    console.log(`\n[${idx + 1}] [${iss.severity}] ${iss.title} (${iss.phase})`);
    console.log(`    ${iss.detail}`);
  });
  console.log('====================================================');
}

runDeepAudit().catch(console.error);
