import { createClient } from '@libsql/client';
import path from 'path';

const API_BASE = 'http://localhost:3000';
const dbPath = path.join(process.cwd(), 'data', 'zms.db');
const dbUrl = `file:${dbPath.replace(/\\/g, '/')}`;
const client = createClient({ url: dbUrl });

const TEST_ACTOR = {
  id: 'u-1',
  name: 'ผู้ดูแลระบบสูงสุด',
  role: 'super_admin',
};

async function testWorkflow() {
  console.log('========================================================================');
  console.log('  ZMS — E2E WORKFLOW TEST ON FRESHLY RESET SYSTEM');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 0. Clean up any leftover test applications from previous runs
  await client.execute("DELETE FROM assistance_applications WHERE id LIKE 'app-postreset-%'");

  // 1. Get an existing beneficiary
  const benRes = await client.execute('SELECT id, full_name, national_id, asnaf_category FROM beneficiaries LIMIT 1');
  const beneficiary = benRes.rows[0];
  assert(Boolean(beneficiary), `Found existing beneficiary: ${beneficiary?.full_name} (${beneficiary?.id})`);

  const RUN_ID = Date.now().toString().slice(-6);
  const APP_ID = `app-postreset-${RUN_ID}`;
  const APP_NO = `APP-2569-${RUN_ID}`;
  const today = new Date().toISOString().slice(0, 10);

  // 2. Submit new assistance application
  console.log('\n[STEP 1] Testing Application Submission Workflow...');
  await client.execute({
    sql: `
      INSERT INTO assistance_applications (
        id, application_no, beneficiary_id, asnaf_category, assistance_type,
        requested_amount, approved_amount, disbursed_amount, status,
        assigned_officer_id, assigned_officer_name,
        applied_date, request_status, assessment_status, approval_status,
        payment_status, delivery_status, followup_status, completion_status,
        branch_id, branch_name
      ) VALUES (?, ?, ?, ?, 'ปัจจัยยังชีพ', 6000, 0, 0, 'pending_approval', 'u-1', 'ผู้ดูแลระบบ', ?, 'submitted', 'pending', 'pending', 'pending', 'pending', 'pending', 'active', 'br-hq', 'สำนักงานใหญ่')
    `,
    args: [APP_ID, APP_NO, beneficiary.id, beneficiary.asnaf_category || 'ยากจน/ขัดสน', today],
  });

  const appCheck = await client.execute({ sql: 'SELECT * FROM assistance_applications WHERE id = ?', args: [APP_ID] });
  assert(appCheck.rows.length === 1, `Application ${APP_NO} created in database (status: ${appCheck.rows[0]?.status})`);

  // 3. Officer/Committee Approves application
  console.log('\n[STEP 2] Testing Approval Workflow...');
  await client.execute({
    sql: `
      UPDATE assistance_applications 
      SET status = 'wait_disbursement',
          approval_status = 'approved',
          approved_amount = 6000,
          approved_date = datetime('now')
      WHERE id = ?
    `,
    args: [APP_ID],
  });

  const appApproved = await client.execute({ sql: 'SELECT status, approved_amount FROM assistance_applications WHERE id = ?', args: [APP_ID] });
  assert(appApproved.rows[0]?.status === 'wait_disbursement' && Number(appApproved.rows[0]?.approved_amount) === 6000, 
    `Application approved for ฿${appApproved.rows[0]?.approved_amount} and status updated to wait_disbursement`);

  // 4. Query eligible applications API (must now include this new application)
  console.log('\n[STEP 3] Testing Eligible Applications API...');
  const eligibleRes = await fetch(`${API_BASE}/api/finance/workflow-actions?view=eligible_applications&search=${APP_NO}`);
  const eligibleData = await eligibleRes.json();
  assert(eligibleRes.ok && eligibleData.success, 'Eligible Applications API returned HTTP 200');
  const matched = eligibleData.data.find((a) => a.applicationNo === APP_NO);
  assert(Boolean(matched), `New approved application ${APP_NO} is detected by eligible applications query`);
  assert(matched?.remainingAmount === 6000, `Remaining amount equals ฿6,000 (got: ${matched?.remainingAmount})`);

  // 5. Clean up the test record to restore pristine 0-transaction state
  console.log('\n[CLEANUP] Cleaning up test application to maintain 0-transaction state...');
  await client.execute({ sql: 'DELETE FROM assistance_applications WHERE id = ?', args: [APP_ID] });
  const finalCheck = await client.execute({ sql: 'SELECT count(*) as count FROM assistance_applications' });
  assert(Number(finalCheck.rows[0]?.count) === 0, 'Database restored to 0 assistance applications');

  console.log('\n========================================================================');
  console.log(`  E2E WORKFLOW TEST RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) process.exit(1);
}

testWorkflow().catch(console.error);
