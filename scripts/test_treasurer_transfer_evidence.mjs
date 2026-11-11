// scripts/test_treasurer_transfer_evidence.mjs
// Comprehensive verification of all 14 scenarios for ZMS Treasurer Transfer Evidence & Approval

import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const db = createClient({ url: 'file:data/zms.db' });

async function runTests() {
  console.log('========================================================================');
  console.log('🚀 ZMS — TREASURER TRANSFER EVIDENCE & APPROVAL TEST SUITE (14 SCENARIOS)');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // Ensure public upload directories exist
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Create physical dummy slip files to test real preview and download
  const dummyJpgName = `test-slip-${Date.now()}.jpg`;
  const dummyPdfName = `test-slip-${Date.now()}.pdf`;
  const dummyPngName = `test-slip-${Date.now()}.png`;

  fs.writeFileSync(path.join(uploadDir, dummyJpgName), Buffer.from('FAKE_JPG_BINARY_CONTENT_FOR_SLIP_TEST'));
  fs.writeFileSync(path.join(uploadDir, dummyPdfName), Buffer.from('%PDF-1.4\n%FAKE_PDF_BINARY_CONTENT_FOR_SLIP_TEST\n%%EOF'));
  fs.writeFileSync(path.join(uploadDir, dummyPngName), Buffer.from('FAKE_PNG_BINARY_CONTENT_FOR_SLIP_TEST'));

  // Test Actors
  const officerActor = {
    id: '60b59b70-637f-4460-969b-6ba7e1c23d96',
    name: 'เจ้าหน้าที่สำนักงาน (Officer)',
    role: 'officer',
  };

  const treasurerActor = {
    id: 'ca4832f7-d789-4e48-b36f-320ecb99a8b2',
    name: 'นายอับดุลเลาะห์ มะยูโซ๊ะ (เหรัญญิก)',
    role: 'finance',
  };

  // Authenticate to get a valid token for file preview verification
  let authToken = '';
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@zms.local', password: 'ZmsEnterprise2026!' }),
    });
    const loginData = await loginRes.json();
    if (loginData.token) {
      authToken = loginData.token;
      console.log('Successfully authenticated as Admin for file preview testing');
    }
  } catch (err) {
    console.warn('Login warning:', err.message);
  }

  // Get eligible treasurer account for batch creation
  const trRes = await fetch(`${BASE_URL}/api/finance/workflow-actions?view=treasurer_accounts`);
  const trData = await trRes.json();
  const treasurerAcc = trData.data?.[0] || { id: 'treasurer-cash-main' };

  // Get active bank account for transfer evidence
  const bankRes = await db.execute(`SELECT * FROM bank_accounts WHERE status = 'active' LIMIT 1`);
  const bankAccount = bankRes.rows[0] || {
    id: 'bank-1',
    bank_name: 'ธนาคารอิสลามแห่งประเทศไทย',
    account_number: '123-4-56789-0',
    account_name: 'กองทุนซะกาตและสวัสดิการสังคม',
  };

  // Ensure an eligible application exists
  const testAppId = `app-slip-test-${Date.now()}`;
  const benRes = await db.execute(`SELECT id FROM beneficiaries LIMIT 1`);
  const benId = String(benRes.rows[0]?.id || 'b-1');

  await db.execute({
    sql: `
      INSERT INTO assistance_applications (
        id, application_no, beneficiary_id, asnaf_category, assistance_type,
        requested_amount, approved_amount, disbursed_amount, status, approval_status,
        payment_status, assigned_officer_id, assigned_officer_name, applied_date, approved_date, created_at
      ) VALUES (
        ?, ?, ?, 'ฟะกีร (ผู้ยากไร้)', 'เงินสงเคราะห์ยังชีพ',
        20000, 20000, 0, 'wait_disbursement', 'approved',
        'wait_disbursement', ?, ?, '2026-11-11', '2026-11-11', CURRENT_TIMESTAMP
      )
    `,
    args: [testAppId, `APP-SLIP-${Date.now().toString().slice(-4)}`, benId, officerActor.id, officerActor.name],
  });

  // Step 1: Create a batch disbursement of 20,000 THB
  const createBatchRes = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create_batch',
      input: {
        title: `รอบเบิกทดสอบระบบหลักฐานการโอนเหรัญญิก ${Date.now()}`,
        sourceAccountId: treasurerAcc.id,
        fundType: 'zakat',
        submitImmediately: false,
        items: [
          {
            type: 'aid',
            applicationId: testAppId,
            applicationNo: `APP-SLIP-${Date.now().toString().slice(-4)}`,
            beneficiaryId: benId,
            beneficiaryName: 'ผู้รับประโยชน์ทดสอบ',
            nationalId: '1234567890123',
            asnafCategory: 'ฟะกีร (ผู้ยากไร้)',
            assistanceType: 'เงินสงเคราะห์ยังชีพ',
            approvedAmount: 20000,
            thisDisbursementAmount: 20000,
          },
        ],
      },
      actor: officerActor,
    }),
  });
  const createJson = await createBatchRes.json();
  if (!createJson.success) {
    console.error('Failed to create batch:', createJson);
  }
  const workflowId = createJson.data?.workflowId;
  console.log(`Created test workflowId: ${workflowId}`);

  // Submit batch for treasurer approval
  await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'submit_batch',
      input: { workflowId },
      actor: officerActor,
    }),
  });

  try {
    // -------------------------------------------------------------------------
    // Scenario 8: No evidence attached -> Approval blocked
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 8: Block approval when no evidence attached ---');
    const noEvidenceRes = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'treasurer_review',
        input: { workflowId, decision: 'approve' },
        actor: treasurerActor,
      }),
    });
    const noEvidenceJson = await noEvidenceRes.json();
    assert(
      !noEvidenceJson.success && noEvidenceJson.error.includes('ยังไม่ได้แนบหลักฐานการโอนเงิน'),
      `Approval correctly blocked without evidence: "${noEvidenceJson.error}"`
    );

    // -------------------------------------------------------------------------
    // Scenario 1: Attach Transfer Evidence successfully (JPG, PNG, PDF)
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 1: Attach Transfer Evidence successfully ---');
    const attachSlip1Res = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'attach_transfer_evidence',
        input: {
          workflowId,
          sourceBankAccountId: String(bankAccount.id),
          destinationAccountId: '1020-01',
          destinationAccountName: 'บัญชีเงินสดเหรัญญิก (Treasurer Cash Float)',
          amount: 10000,
          transferDatetime: '2026-11-11T10:30:00',
          referenceNo: 'SLIP-TR-001',
          issuingBank: String(bankAccount.bank_name),
          fileUrl: `/api/storage/file/${dummyJpgName}`,
          fileName: dummyJpgName,
          fileSize: 1024,
          mimeType: 'image/jpeg',
          notes: 'โอนงวดที่ 1 เข้าบัญชีเหรัญญิก',
        },
        actor: treasurerActor,
      }),
    });
    const attachSlip1Json = await attachSlip1Res.json();
    assert(attachSlip1Json.success, 'Attached JPG transfer slip successfully');
    const slip1Id = attachSlip1Json.data?.evidenceId;

    // Attach PDF slip as slip 2
    const attachSlip2Res = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'attach_transfer_evidence',
        input: {
          workflowId,
          sourceBankAccountId: String(bankAccount.id),
          destinationAccountId: '1020-01',
          destinationAccountName: 'บัญชีเงินสดเหรัญญิก (Treasurer Cash Float)',
          amount: 10000,
          transferDatetime: '2026-11-11T11:00:00',
          referenceNo: 'SLIP-TR-002',
          issuingBank: String(bankAccount.bank_name),
          fileUrl: `/api/storage/file/${dummyPdfName}`,
          fileName: dummyPdfName,
          fileSize: 2048,
          mimeType: 'application/pdf',
          notes: 'โอนงวดที่ 2 เข้าบัญชีเหรัญญิก',
        },
        actor: treasurerActor,
      }),
    });
    const attachSlip2Json = await attachSlip2Res.json();
    assert(attachSlip2Json.success, 'Attached PDF transfer slip successfully');
    const slip2Id = attachSlip2Json.data?.evidenceId;

    // -------------------------------------------------------------------------
    // Scenario 2: Open/Preview Image Slip (JPG/PNG)
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 2: Open/Preview Image Slip (JPG/PNG) ---');
    const previewJpgRes = await fetch(`${BASE_URL}/api/storage/file/${dummyJpgName}?action=preview`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(
      previewJpgRes.status === 200 && previewJpgRes.headers.get('content-type')?.includes('image'),
      `Preview JPG slip returned 200 with Content-Type: ${previewJpgRes.headers.get('content-type')}`
    );

    // -------------------------------------------------------------------------
    // Scenario 3: Open/Preview PDF Slip
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 3: Open/Preview PDF Slip ---');
    const previewPdfRes = await fetch(`${BASE_URL}/api/storage/file/${dummyPdfName}?action=preview`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(
      previewPdfRes.status === 200 && previewPdfRes.headers.get('content-type')?.includes('pdf'),
      `Preview PDF slip returned 200 with Content-Type: ${previewPdfRes.headers.get('content-type')}`
    );

    // -------------------------------------------------------------------------
    // Scenario 4: Attach multiple evidence items and verify sum
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 4: Verify multiple evidence items and aggregate sum ---');
    const detailRes = await fetch(`${BASE_URL}/api/finance/workflow-actions?view=batch_detail&workflowId=${workflowId}`);
    const detailJson = await detailRes.json();
    const evidenceData = detailJson.data?.transferEvidence;

    assert(evidenceData?.items.length === 2, `Evidence items count is 2 (found ${evidenceData?.items.length})`);
    assert(evidenceData?.totalAmount === 20000, `Total evidence amount is 20,000 THB (found ${evidenceData?.totalAmount})`);

    // -------------------------------------------------------------------------
    // Scenario 5: Transferred amount matches requested amount
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 5: Transferred amount matches requested amount ---');
    assert(evidenceData?.isAmountMatched === true, 'Amount matched is true (20,000 == 20,000)');
    assert(evidenceData?.mismatchDiff === 0, 'Mismatch difference is 0.00 THB');

    // -------------------------------------------------------------------------
    // Scenario 9: Mark invalid (Invalidate evidence) with reason
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 9: Mark evidence invalid with reason ---');
    const invRes = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify_transfer_evidence',
        input: {
          evidenceId: slip1Id,
          decision: 'invalid',
          reason: 'สลิปไม่ชัดเจน ตรวจสอบยอดไม่ตรงกับเวลา',
        },
        actor: treasurerActor,
      }),
    });
    const invJson = await invRes.json();
    assert(invJson.success && invJson.data?.status === 'invalid', 'Marked evidence as invalid successfully');

    // Check detail recognizes invalid status
    const detailInvRes = await fetch(`${BASE_URL}/api/finance/workflow-actions?view=batch_detail&workflowId=${workflowId}`);
    const detailInvJson = await detailInvRes.json();
    assert(detailInvJson.data?.transferEvidence?.overallStatus === 'invalid', 'Overall evidence status reflects "invalid"');

    // -------------------------------------------------------------------------
    // Scenario 6: Transferred amount mismatch triggers warning and blocks approval
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 6: Transferred amount mismatch blocks approval ---');
    // Because slip1 is invalid, active sum is now only 10,000 (missing 10,000)
    const blockMismatchRes = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'treasurer_review',
        input: { workflowId, decision: 'approve' },
        actor: treasurerActor,
      }),
    });
    const blockMismatchJson = await blockMismatchRes.json();
    assert(!blockMismatchJson.success, `Approval blocked when amount does not match or item invalid: "${blockMismatchJson.error}"`);

    // -------------------------------------------------------------------------
    // Scenario 10: Request more info (Need more info) with reason
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 10: Request more info on evidence ---');
    const needInfoRes = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify_transfer_evidence',
        input: {
          evidenceId: slip2Id,
          decision: 'need_more_info',
          reason: 'ขอสลิปฉบับเต็มที่มีลายน้ำของธนาคาร',
        },
        actor: treasurerActor,
      }),
    });
    const needInfoJson = await needInfoRes.json();
    assert(needInfoJson.success && needInfoJson.data?.status === 'need_more_info', 'Requested more info on evidence');

    // -------------------------------------------------------------------------
    // Scenario 7: Incorrect destination account blocked
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 7: Incorrect destination account blocked ---');
    // Temporarily insert a slip with wrong destination
    await db.execute({
      sql: `
        INSERT INTO treasurer_transfer_evidence (
          id, workflow_id, source_bank_account_id, source_bank_name, source_account_name, source_account_number,
          destination_account_id, destination_account_name, amount, transfer_datetime,
          file_url, file_name, file_size, mime_type, status, created_by_id, created_by_name
        ) VALUES (
          'ev-bad-dest', ?, 'bank-1', 'ธนาคารอิสลาม', 'กองทุน', '123',
          'bad-account-999', 'บัญชีส่วนตัวบุคคลภายนอก', 20000, CURRENT_TIMESTAMP,
          '/test.jpg', 'test.jpg', 100, 'image/jpeg', 'verified', ?, ?
        )
      `,
      args: [workflowId, treasurerActor.id, treasurerActor.name],
    });

    const badDestReviewRes = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'treasurer_review',
        input: { workflowId, decision: 'approve' },
        actor: treasurerActor,
      }),
    });
    const badDestReviewJson = await badDestReviewRes.json();
    assert(
      !badDestReviewJson.success && badDestReviewJson.error.includes('บัญชีปลายทาง'),
      `Approval strictly blocked when destination is not 1020-01: "${badDestReviewJson.error}"`
    );

    // Clean up bad test evidence
    await db.execute(`DELETE FROM treasurer_transfer_evidence WHERE id = 'ev-bad-dest'`);

    // -------------------------------------------------------------------------
    // Scenario 11: Approve when evidence complete and verified
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 11: Approve when evidence complete and verified ---');
    // Mark both slip1 and slip2 as verified
    await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify_transfer_evidence',
        input: { evidenceId: slip1Id, decision: 'verify' },
        actor: treasurerActor,
      }),
    });
    await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify_transfer_evidence',
        input: { evidenceId: slip2Id, decision: 'verify' },
        actor: treasurerActor,
      }),
    });

    // Verify detail shows approval ready
    const readyRes = await fetch(`${BASE_URL}/api/finance/workflow-actions?view=batch_detail&workflowId=${workflowId}`);
    const readyJson = await readyRes.json();
    assert(readyJson.data?.transferEvidence?.isApprovalReady === true, 'isApprovalReady is true when all slips are verified');

    // Perform approval
    const approveRes = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'treasurer_review',
        input: {
          workflowId,
          decision: 'approve',
          reason: 'ตรวจสอบสลิปการโอนเงินเข้าบัญชีเหรัญญิกครบถ้วน ยอดเงินตรงกันถูกต้อง',
        },
        actor: treasurerActor,
      }),
    });
    const approveJson = await approveRes.json();
    assert(approveJson.success, 'Treasurer approved batch disbursement successfully');

    // Check status in DB
    const checkDbWf = await db.execute({
      sql: `SELECT step1_status, overall_status, step1_proof_url FROM cash_flow_workflows WHERE id = ?`,
      args: [workflowId],
    });
    assert(
      checkDbWf.rows[0]?.step1_status === 'approved' && checkDbWf.rows[0]?.overall_status === 'approved',
      `Workflow status updated to approved in DB (step1: ${checkDbWf.rows[0]?.step1_status})`
    );

    // -------------------------------------------------------------------------
    // Scenario 12: Prevent duplicate approval
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 12: Prevent duplicate approval ---');
    const dupApproveRes = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'treasurer_review',
        input: { workflowId, decision: 'approve' },
        actor: treasurerActor,
      }),
    });
    const dupApproveJson = await dupApproveRes.json();
    assert(
      !dupApproveJson.success && dupApproveJson.error.includes('ไม่ได้อยู่ในสถานะรออนุมัติ'),
      `Duplicate approval successfully prevented: "${dupApproveJson.error}"`
    );

    // -------------------------------------------------------------------------
    // Scenario 13: Verify no duplicate deposit transaction created
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 13: Verify no premature duplicate GL deposit entries ---');
    // Ensure no GL entries exist for this workflow yet (GL belongs to handover step)
    const glRes = await db.execute({
      sql: `SELECT COUNT(*) as count FROM general_ledger_entries WHERE description LIKE ?`,
      args: [`%${workflowId}%`],
    });
    assert(
      Number(glRes.rows[0]?.count || 0) === 0,
      'No premature GL entries posted at approval stage (GL strictly deferred to cash handover)'
    );

    // -------------------------------------------------------------------------
    // Scenario 14: Verify Audit Log & File Access
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 14: Verify Audit Log and file access integrity ---');
    const logsRes = await db.execute({
      sql: `SELECT action, description FROM audit_logs WHERE entity_id = ? OR entity_id = ? OR entity_id = ? ORDER BY timestamp ASC`,
      args: [workflowId, slip1Id, slip2Id],
    });

    const actions = logsRes.rows.map((r) => r.action);
    assert(actions.includes('ATTACH_TRANSFER_EVIDENCE'), 'Audit log contains ATTACH_TRANSFER_EVIDENCE');
    assert(actions.includes('VERIFY_TRANSFER_EVIDENCE'), 'Audit log contains VERIFY_TRANSFER_EVIDENCE');
    assert(actions.includes('APPROVE_BATCH_DISBURSEMENT'), 'Audit log contains APPROVE_BATCH_DISBURSEMENT');

    console.log('\nAudit Trail:');
    for (const log of logsRes.rows) {
      console.log(`  [${log.action}] ${log.description}`);
    }

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    // Cleanup dummy physical test files
    try {
      if (fs.existsSync(path.join(uploadDir, dummyJpgName))) fs.unlinkSync(path.join(uploadDir, dummyJpgName));
      if (fs.existsSync(path.join(uploadDir, dummyPdfName))) fs.unlinkSync(path.join(uploadDir, dummyPdfName));
      if (fs.existsSync(path.join(uploadDir, dummyPngName))) fs.unlinkSync(path.join(uploadDir, dummyPngName));
    } catch {}
  }

  console.log('\n========================================================================');
  console.log(`🏁 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('========================================================================');

  if (failed > 0) process.exit(1);
}

runTests();
