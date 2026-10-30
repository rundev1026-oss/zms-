import { createClient } from '@libsql/client';

const client = createClient({ url: 'file:data/zms.db' });
const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('=================================================================');
  console.log('--- TASK 3: ASSISTANCE EXECUTION & COMPLETION AUTOMATED TESTS ---');
  console.log('=================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    const timestamp = Date.now();
    const officerId = 'u-t3-officer-' + timestamp;
    const officerName = 'นายอุสมาน เจริญสุข';
    const unauthorizedOfficerId = 'u-t3-unauth-' + timestamp;
    const unauthorizedOfficerName = 'นางสาวมาริสา ผู้ดูแลอื่น';
    const adminId = 'u-t3-admin';
    const adminName = 'ผู้ดูแลระบบ';

    // 1. Fetch household
    const hhRes = await client.execute('SELECT id FROM households LIMIT 1');
    const householdId = String(hhRes.rows[0].id);

    // 2. Create Test Beneficiaries
    const benId1 = `ben-t3-1-${timestamp}`;
    const benId2 = `ben-t3-2-${timestamp}`;
    const benId3 = `ben-t3-3-${timestamp}`;

    await client.execute({
      sql: `INSERT INTO beneficiaries (id, household_id, full_name, national_id, phone, asnaf_category, registration_no)
            VALUES (?, ?, 'นายสุไลมาน ดอเลาะ', ?, '0891112221', 'fakir', ?)`,
      args: [benId1, householdId, `19402${timestamp.toString().slice(-8)}1`, `REG-2569-0901`],
    });

    await client.execute({
      sql: `INSERT INTO beneficiaries (id, household_id, full_name, national_id, phone, asnaf_category, registration_no)
            VALUES (?, ?, 'นางฟาตีมะห์ ยะผา', ?, '0891112222', 'miskin', ?)`,
      args: [benId2, householdId, `19402${timestamp.toString().slice(-8)}2`, `REG-2569-0902`],
    });

    await client.execute({
      sql: `INSERT INTO beneficiaries (id, household_id, full_name, national_id, phone, asnaf_category, registration_no)
            VALUES (?, ?, 'นายรอฮิม เจะและ', ?, '0891112223', 'gharimin', ?)`,
      args: [benId3, householdId, `19402${timestamp.toString().slice(-8)}3`, `REG-2569-0903`],
    });

    // 3. Setup Test Assistance Applications
    // App 1: Single tranche, fully handed over from finance -> ready for draft & complete
    const appId1 = `app-t3-single-${timestamp}`;
    const appNo1 = `APP-T3-001-${timestamp.toString().slice(-4)}`;
    await client.execute({
      sql: `INSERT INTO assistance_applications (
        id, application_no, beneficiary_id, asnaf_category, assistance_type,
        requested_amount, approved_amount, disbursed_amount, status,
        assigned_officer_id, assigned_officer_name, installment_count, current_installment, applied_date, created_at
      ) VALUES (?, ?, ?, 'fakir', 'เงินสงเคราะห์เพื่อการยังชีพ', 15000, 15000, 0, 'wait_disbursement', ?, ?, 1, 1, '2026-10-20', CURRENT_TIMESTAMP)`,
      args: [appId1, appNo1, benId1, officerId, officerName],
    });

    // App 2: Two tranches installment aid (การช่วยเหลือจ่ายเป็นงวด)
    const appId2 = `app-t3-inst-${timestamp}`;
    const appNo2 = `APP-T3-002-${timestamp.toString().slice(-4)}`;
    await client.execute({
      sql: `INSERT INTO assistance_applications (
        id, application_no, beneficiary_id, asnaf_category, assistance_type,
        requested_amount, approved_amount, disbursed_amount, status,
        assigned_officer_id, assigned_officer_name, installment_count, current_installment, applied_date, created_at
      ) VALUES (?, ?, ?, 'miskin', 'ทุนประกอบอาชีพและเครื่องมือทำกิน', 20000, 20000, 0, 'wait_disbursement', ?, ?, 2, 1, '2026-10-20', CURRENT_TIMESTAMP)`,
      args: [appId2, appNo2, benId2, officerId, officerName],
    });

    // App 3: No cash handover from finance (เพื่อทดสอบ Pre-check validation ปฏิเสธการยืนยัน)
    const appId3 = `app-t3-nohandover-${timestamp}`;
    const appNo3 = `APP-T3-003-${timestamp.toString().slice(-4)}`;
    await client.execute({
      sql: `INSERT INTO assistance_applications (
        id, application_no, beneficiary_id, asnaf_category, assistance_type,
        requested_amount, approved_amount, disbursed_amount, status,
        assigned_officer_id, assigned_officer_name, installment_count, current_installment, applied_date, created_at
      ) VALUES (?, ?, ?, 'gharimin', 'เงินสงเคราะห์เพื่อการยังชีพ', 10000, 10000, 0, 'approved', ?, ?, 1, 1, '2026-10-20', CURRENT_TIMESTAMP)`,
      args: [appId3, appNo3, benId3, officerId, officerName],
    });

    // 4. Setup Cash Withdrawal & Finance Handover for App 1 & App 2
    const flowId = `flow-t3-${timestamp}`;
    const wfNo = `WF-T3-${timestamp.toString().slice(-6)}`;
    await client.execute({
      sql: `INSERT INTO cash_flow_workflows (
              id, workflow_no, title, step1_bank_account_id, step1_withdraw_amount,
              step1_date, step1_operator_id, step1_operator_name, overall_status
            ) VALUES (?, ?, 'เบิกเงินสดช่วยเหลือซะกาต Task 3', 'bank-1', 35000, '2026-10-22', 'u-fin', 'ฝ่ายการเงิน', 'in_progress')`,
      args: [flowId, wfNo],
    });

    const withId1 = `w-t3-1-${timestamp}`;
    const withId2 = `w-t3-2-${timestamp}`;
    const wNo1 = `92/${timestamp.toString().slice(-4)}-1`;
    const wNo2 = `92/${timestamp.toString().slice(-4)}-2`;
    await client.execute({
      sql: `INSERT INTO cash_flow_withdrawals (
              id, workflow_id, withdrawal_no, amount, withdrawal_datetime, target_asnaf, purpose, status,
              handover_status, total_handed_over_amount, remaining_handover_amount, recipient_case_worker_id, recipient_case_worker_name
            ) VALUES (?, ?, ?, 15000, '2026-10-22 09:00:00', 'fakir', 'เบิกเงินสดช่วยเหลือสงเคราะห์', 'disbursed',
                      'fully_handed_over', 15000, 0, ?, ?)`,
      args: [withId1, flowId, wNo1, officerId, officerName],
    });
    await client.execute({
      sql: `INSERT INTO cash_flow_withdrawals (
              id, workflow_id, withdrawal_no, amount, withdrawal_datetime, target_asnaf, purpose, status,
              handover_status, total_handed_over_amount, remaining_handover_amount, recipient_case_worker_id, recipient_case_worker_name
            ) VALUES (?, ?, ?, 20000, '2026-10-22 09:10:00', 'miskin', 'เบิกเงินสดช่วยเหลืออาชีพ', 'disbursed',
                      'fully_handed_over', 20000, 0, ?, ?)`,
      args: [withId2, flowId, wNo2, officerId, officerName],
    });

    // Disbursement items
    await client.execute({
      sql: `INSERT INTO cash_flow_disbursement_items (id, withdrawal_id, workflow_id, application_id, beneficiary_id, beneficiary_name, national_id, asnaf_category, assistance_type, approved_amount, this_disbursement_amount, remaining_balance, status)
            VALUES (?, ?, ?, ?, ?, 'นายสุไลมาน ดอเลาะ', '1940200000001', 'fakir', 'เงินสงเคราะห์เพื่อการยังชีพ', 15000, 15000, 0, 'completed')`,
      args: [`item-t3-1-${timestamp}`, withId1, flowId, appId1, benId1],
    });
    await client.execute({
      sql: `INSERT INTO cash_flow_disbursement_items (id, withdrawal_id, workflow_id, application_id, beneficiary_id, beneficiary_name, national_id, asnaf_category, assistance_type, approved_amount, this_disbursement_amount, remaining_balance, status)
            VALUES (?, ?, ?, ?, ?, 'นางฟาตีมะห์ ยะผา', '1940200000002', 'miskin', 'ทุนประกอบอาชีพและเครื่องมือทำกิน', 20000, 20000, 0, 'completed')`,
      args: [`item-t3-2-${timestamp}`, withId2, flowId, appId2, benId2],
    });

    // Handover records from finance to case worker
    await client.execute({
      sql: `INSERT INTO finance_handover_records (
        id, withdrawal_id, workflow_id, handover_no, handover_date, handover_time,
        handed_over_by_id, handed_over_by_name, received_by_id, received_by_name,
        amount, handover_method, proof_url, proof_name, status, recorded_by_id, recorded_by_name, confirmed_by_id, confirmed_by_name, confirmed_at
      ) VALUES (?, ?, ?, ?, '2026-10-22', '09:00:00', 'u-fin', 'ฝ่ายการเงิน', ?, ?, 15000, 'cash', 'https://zms.org/ho1.pdf', 'ใบส่งมอบเงินสด_1.pdf', 'fully_handed_over', 'u-fin', 'ฝ่ายการเงิน', 'u-fin', 'ฝ่ายการเงิน', '2026-10-22 09:05:00')`,
      args: [`ho-t3-1-${timestamp}`, withId1, flowId, `HO-T3-${timestamp.toString().slice(-4)}-1`, officerId, officerName],
    });
    await client.execute({
      sql: `INSERT INTO finance_handover_records (
        id, withdrawal_id, workflow_id, handover_no, handover_date, handover_time,
        handed_over_by_id, handed_over_by_name, received_by_id, received_by_name,
        amount, handover_method, proof_url, proof_name, status, recorded_by_id, recorded_by_name, confirmed_by_id, confirmed_by_name, confirmed_at
      ) VALUES (?, ?, ?, ?, '2026-10-22', '09:10:00', 'u-fin', 'ฝ่ายการเงิน', ?, ?, 20000, 'cash', 'https://zms.org/ho2.pdf', 'ใบส่งมอบเงินสด_2.pdf', 'fully_handed_over', 'u-fin', 'ฝ่ายการเงิน', 'u-fin', 'ฝ่ายการเงิน', '2026-10-22 09:15:00')`,
      args: [`ho-t3-2-${timestamp}`, withId2, flowId, `HO-T3-${timestamp.toString().slice(-4)}-2`, officerId, officerName],
    });

    // Count initial ledger/transaction count to verify idempotency later
    const initialTransRes = await client.execute('SELECT COUNT(*) as c FROM financial_transactions');
    const initialTransCount = Number(initialTransRes.rows[0].c);

    // =========================================================================
    // TEST SUITE 1: DRAFT SAVING (Rule 4: การบันทึกร่างไม่ถือว่าช่วยเหลือเสร็จสิ้น)
    // =========================================================================
    console.log('--- TEST 1: DRAFT SAVING (การบันทึกร่าง) ---');
    const draftRes = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'draft_execution',
        applicationId: appId1,
        input: {
          installmentNo: 1,
          totalInstallments: 1,
          executionDate: '2026-10-22',
          executionTime: '11:00',
          assistanceOutcome: 'ลงพื้นที่ตรวจเยี่ยมและเตรียมส่งมอบเงินสงเคราะห์',
          actualDisbursedAmount: 15000,
          actualAssistanceValue: 15000,
          details: 'อยู่ระหว่างรอผู้มีสิทธิ์ลงนามในเอกสารยืนยัน',
          proofUrl: '/proofs/draft-inspection.pdf',
          proofName: 'รายงานการตรวจสภาพพื้นที่.pdf',
        },
        actor: { id: officerId, name: officerName, role: 'officer' },
      }),
    });
    const draftJson = await draftRes.json();

    assert(draftRes.status === 200, '1.1 บันทึกแบบร่างสำเร็จ HTTP 200');
    assert(draftJson.success === true, '1.2 draftJson.success เป็น true');
    assert(draftJson.data.isDraft === true, '1.3 ระบุ flag isDraft = true');

    // Verify in Database
    const draftDb = await client.execute({
      sql: 'SELECT * FROM assistance_execution_records WHERE id = ?',
      args: [draftJson.data.recordId],
    });
    assert(draftDb.rows.length === 1, '1.4 บันทึกลงใน assistance_execution_records เรียบร้อย');
    assert(Number(draftDb.rows[0].is_confirmed) === 0, '1.5 is_confirmed = 0 (ยังไม่ยืนยันผล)');
    assert(draftDb.rows[0].status === 'draft', '1.6 สถานะของบันทึกเป็น draft');

    // Critical Rule check: Application status must NOT be disbursed or completed
    const appDraftDb = await client.execute({
      sql: 'SELECT status, disbursed_amount FROM assistance_applications WHERE id = ?',
      args: [appId1],
    });
    assert(appDraftDb.rows[0].status !== 'disbursed', '1.7 กฎสำคัญ: การบันทึกร่างไม่ทำให้สถานะคำร้องเป็น disbursed');
    assert(Number(appDraftDb.rows[0].disbursed_amount) === 0, '1.8 ยอด disbursed_amount ของคำร้องยังคงเป็น 0 บาท');

    // =========================================================================
    // TEST SUITE 2: PRE-CONFIRMATION VALIDATIONS (การตรวจสอบ 6 ข้อก่อนยืนยัน)
    // =========================================================================
    console.log('\n--- TEST 2: PRE-CONFIRMATION VALIDATIONS (ตรวจสอบก่อนยืนยัน) ---');

    // 2.1 Missing Checkbox
    const noCheckRes = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirm_completion',
        applicationId: appId1,
        input: {
          executionDate: '2026-10-22',
          executionTime: '14:30',
          assistanceOutcome: 'ส่งมอบเงินสดเรียบร้อย',
          actualDisbursedAmount: 15000,
          proofUrl: '/proofs/real-receipt.pdf',
          proofName: 'ใบเสร็จจริง.pdf',
          isConfirmed: false, // NOT checked!
          confirmationStatement: '',
        },
        actor: { id: officerId, name: officerName, role: 'officer' },
      }),
    });
    const noCheckJson = await noCheckRes.json();
    assert(noCheckRes.status === 400, '2.1 ปฏิเสธ HTTP 400 เมื่อไม่กด Checkbox');
    assert(noCheckJson.error.includes('ต้องกดยืนยันว่าได้ดำเนินการช่วยเหลือตามรายละเอียดนี้แล้ว'), '2.2 แสดงข้อผิดพลาดเรื่องการกด Checkbox');

    // 2.2 Missing Proof File
    const noProofRes = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirm_completion',
        applicationId: appId1,
        input: {
          executionDate: '2026-10-22',
          executionTime: '14:30',
          assistanceOutcome: 'ส่งมอบเงินสดเรียบร้อย',
          actualDisbursedAmount: 15000,
          proofUrl: '', // Missing proof
          proofName: '',
          isConfirmed: true,
          confirmationStatement: 'ข้าพเจ้ายืนยันว่าได้ดำเนินการช่วยเหลือตามรายละเอียดนี้แล้ว และข้อมูลกับหลักฐานตรงกับการดำเนินงานจริง',
        },
        actor: { id: officerId, name: officerName, role: 'officer' },
      }),
    });
    const noProofJson = await noProofRes.json();
    assert(noProofRes.status === 400, '2.3 ปฏิเสธ HTTP 400 เมื่อไม่มีไฟล์หลักฐาน');
    assert(noProofJson.error.includes('กรุณาแนบไฟล์หลักฐานการช่วยเหลือจริงตามนโยบาย'), '2.4 แสดงข้อผิดพลาดเรื่องหลักฐาน');

    // 2.3 Reported Amount Exceeds Approved Limit
    const overAmtRes = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirm_completion',
        applicationId: appId1,
        input: {
          executionDate: '2026-10-22',
          executionTime: '14:30',
          assistanceOutcome: 'ส่งมอบเงินสดเรียบร้อย',
          actualDisbursedAmount: 99999, // Exceeds 15,000
          proofUrl: '/proofs/real-receipt.pdf',
          proofName: 'ใบเสร็จจริง.pdf',
          isConfirmed: true,
          confirmationStatement: 'ข้าพเจ้ายืนยันว่าได้ดำเนินการช่วยเหลือตามรายละเอียดนี้แล้ว และข้อมูลกับหลักฐานตรงกับการดำเนินงานจริง',
        },
        actor: { id: officerId, name: officerName, role: 'officer' },
      }),
    });
    const overAmtJson = await overAmtRes.json();
    assert(overAmtRes.status === 400, '2.5 ปฏิเสธ HTTP 400 เมื่อยอดเงินเกินอนุมัติ');
    assert(overAmtJson.error.includes('เกินยอดที่ได้รับอนุมัติ'), '2.6 แสดงข้อผิดพลาดว่ายอดเงินเกินอนุมัติ');

    // 2.4 No Handover From Finance (App 3)
    const noHoRes = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirm_completion',
        applicationId: appId3,
        input: {
          executionDate: '2026-10-22',
          executionTime: '14:30',
          assistanceOutcome: 'ส่งมอบเงินสดเรียบร้อย',
          actualDisbursedAmount: 10000,
          proofUrl: '/proofs/real-receipt.pdf',
          proofName: 'ใบเสร็จจริง.pdf',
          isConfirmed: true,
          confirmationStatement: 'ข้าพเจ้ายืนยันว่าได้ดำเนินการช่วยเหลือตามรายละเอียดนี้แล้ว และข้อมูลกับหลักฐานตรงกับการดำเนินงานจริง',
        },
        actor: { id: officerId, name: officerName, role: 'officer' },
      }),
    });
    const noHoJson = await noHoRes.json();
    assert(noHoRes.status === 400, '2.7 ปฏิเสธ HTTP 400 เมื่อยังไม่มีการส่งมอบเงินสดจากฝ่ายการเงิน');
    assert(noHoJson.error.includes('ยังไม่มีการส่งมอบเงินสดจากฝ่ายการเงิน'), '2.8 แสดงข้อผิดพลาดเรื่องการส่งมอบเงินสดจากฝ่ายการเงิน');

    // 2.5 Unauthorized Officer
    const unauthRes = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirm_completion',
        applicationId: appId1,
        input: {
          executionDate: '2026-10-22',
          executionTime: '14:30',
          assistanceOutcome: 'ส่งมอบเงินสดเรียบร้อย',
          actualDisbursedAmount: 15000,
          proofUrl: '/proofs/real-receipt.pdf',
          proofName: 'ใบเสร็จจริง.pdf',
          isConfirmed: true,
          confirmationStatement: 'ข้าพเจ้ายืนยันว่าได้ดำเนินการช่วยเหลือตามรายละเอียดนี้แล้ว และข้อมูลกับหลักฐานตรงกับการดำเนินงานจริง',
        },
        actor: { id: unauthorizedOfficerId, name: unauthorizedOfficerName, role: 'officer' },
      }),
    });
    assert(unauthRes.status === 403, '2.9 ปฏิเสธ HTTP 403 เมื่อผู้ดูแลไม่มีสิทธิ์ในคำร้องนี้');

    // =========================================================================
    // TEST SUITE 3: SUCCESSFUL COMPLETION CONFIRMATION (ยืนยันผลสำเร็จ)
    // =========================================================================
    console.log('\n--- TEST 3: FULL COMPLETION CONFIRMATION (ยืนยันผลสำเร็จ) ---');
    const confirmRes = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirm_completion',
        applicationId: appId1,
        input: {
          installmentNo: 1,
          totalInstallments: 1,
          executionDate: '2026-10-22',
          executionTime: '15:00',
          assistanceOutcome: 'ส่งมอบเงินสงเคราะห์เพื่อการยังชีพแก่ผู้รับความช่วยเหลือถึงมือเรียบร้อย',
          actualDisbursedAmount: 15000,
          actualAssistanceValue: 15000,
          details: 'ผู้รับมีสุขภาพแข็งแรงขึ้นและได้ลงลายมือชื่อรับเงินสงเคราะห์ตามระเบียบ',
          proofUrl: '/proofs/signed-receipt-15000.pdf',
          proofName: 'ใบสำคัญรับเงินสดพร้อมภาพถ่าย_APP-T3-001.pdf',
          proofSize: 245760,
          proofType: 'application/pdf',
          isConfirmed: true,
          confirmationStatement: 'ข้าพเจ้ายืนยันว่าได้ดำเนินการช่วยเหลือตามรายละเอียดนี้แล้ว และข้อมูลกับหลักฐานตรงกับการดำเนินงานจริง',
          status: 'completed',
        },
        actor: { id: officerId, name: officerName, role: 'officer' },
      }),
    });
    const confirmJson = await confirmRes.json();

    assert(confirmRes.status === 200, '3.1 ยืนยันผลสำเร็จ HTTP 200');
    assert(confirmJson.success === true, '3.2 confirmJson.success เป็น true');
    assert(confirmJson.data.outcomeStatus === 'completed', '3.3 outcomeStatus เป็น completed');
    assert(confirmJson.data.totalDisbursed === 15000, '3.4 totalDisbursed ครบ 15,000 บาท');
    assert(confirmJson.data.remainingBalance === 0, '3.5 remainingBalance เหลือ 0 บาท');

    // Verify DB Assistance Execution Record
    const execRecordDb = await client.execute({
      sql: 'SELECT * FROM assistance_execution_records WHERE id = ?',
      args: [confirmJson.data.recordId],
    });
    const r1 = execRecordDb.rows[0];
    assert(Number(r1.is_confirmed) === 1, '3.6 บันทึกถูกระบุ is_confirmed = 1');
    assert(r1.confirmed_by_id === officerId, '3.7 บันทึก confirmed_by_id ถูกต้อง');
    assert(r1.confirmed_by_name === officerName, '3.8 บันทึก confirmed_by_name ถูกต้อง');
    assert(Boolean(r1.confirmed_at), '3.9 บันทึก confirmed_at มีเวลาชัดเจน');
    assert(Number(r1.actual_disbursed_amount) === 15000, '3.10 ยอดส่งมอบจริง 15,000 บาท');
    assert(Number(r1.actual_assistance_value) === 15000, '3.11 มูลค่าความช่วยเหลือจริง 15,000 บาท');
    assert(r1.proof_name === 'ใบสำคัญรับเงินสดพร้อมภาพถ่าย_APP-T3-001.pdf', '3.12 ชื่อไฟล์หลักฐานจริงถูกบันทึก');

    // Verify Application Status Updated to Disbursed
    const appConfirmedDb = await client.execute({
      sql: 'SELECT status, disbursed_amount, assistance_result_status, execution_confirmed_by_name FROM assistance_applications WHERE id = ?',
      args: [appId1],
    });
    assert(appConfirmedDb.rows[0].status === 'disbursed', '3.13 สถานะคำร้องเปลี่ยนเป็น disbursed หลังยืนยันครบ');
    assert(appConfirmedDb.rows[0].assistance_result_status === 'completed', '3.14 assistance_result_status เป็น completed');
    assert(Number(appConfirmedDb.rows[0].disbursed_amount) === 15000, '3.15 disbursed_amount ของคำร้องปรับเป็น 15,000 บาท');
    assert(appConfirmedDb.rows[0].execution_confirmed_by_name === officerName, '3.16 ผู้ยืนยันในคำร้องตรงกับผู้ดูแลเคส');

    // =========================================================================
    // TEST SUITE 4: DUPLICATE CONFIRMATION PREVENTION (การป้องกันการยืนยันซ้ำ)
    // =========================================================================
    console.log('\n--- TEST 4: DUPLICATE CONFIRMATION PREVENTION (ป้องกันยืนยันซ้ำ) ---');
    const dupRes = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirm_completion',
        applicationId: appId1,
        input: {
          installmentNo: 1, // Repeat installment 1!
          totalInstallments: 1,
          executionDate: '2026-10-22',
          executionTime: '16:00',
          assistanceOutcome: 'พยายามยืนยันซ้ำ',
          actualDisbursedAmount: 15000,
          proofUrl: '/proofs/repeat.pdf',
          proofName: 'ใบเสร็จซ้ำ.pdf',
          isConfirmed: true,
          confirmationStatement: 'ข้าพเจ้ายืนยันว่าได้ดำเนินการช่วยเหลือตามรายละเอียดนี้แล้ว และข้อมูลกับหลักฐานตรงกับการดำเนินงานจริง',
        },
        actor: { id: officerId, name: officerName, role: 'officer' },
      }),
    });
    const dupJson = await dupRes.json();
    assert(dupRes.status === 400, '4.1 ปฏิเสธ HTTP 400 เมื่องวดนี้ได้รับการยืนยันไปแล้ว');
    assert(dupJson.error.includes('ได้รับการยืนยันผลการช่วยเหลือไปแล้ว หากต้องการแก้ไขข้อมูล กรุณาใช้กระบวนการแก้ไข'), '4.2 แสดงข้อความแนะให้ใช้กระบวนการแก้ไข');

    // =========================================================================
    // TEST SUITE 5: POST-CONFIRMATION EDITING (การแก้ไขผลที่ยืนยันแล้วพร้อมเหตุผล)
    // =========================================================================
    console.log('\n--- TEST 5: POST-CONFIRMATION EDITING (แก้ไขผลที่ยืนยันแล้ว) ---');

    // 5.1 Edit without reason -> Should FAIL
    const noReasonEditRes = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'edit_execution',
        applicationId: appId1,
        recordId: confirmJson.data.recordId,
        editReason: '', // Missing reason
        input: {
          assistanceOutcome: 'แก้ไขคำอธิบายโดยไม่ระบุเหตุผล',
        },
        actor: { id: officerId, name: officerName, role: 'officer' },
      }),
    });
    const noReasonEditJson = await noReasonEditRes.json();
    assert(noReasonEditRes.status === 400, '5.1 ปฏิเสธการแก้ไขเมื่อไม่ระบุเหตุผล');
    assert(noReasonEditJson.error.includes('ต้องระบุเหตุผลการแก้ไขเสมอ'), '5.2 แสดงข้อผิดพลาดเรื่องเหตุผลการแก้ไข');

    // 5.2 Edit with reason -> Should SUCCEED and snapshot previous values
    const editRes = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'edit_execution',
        applicationId: appId1,
        recordId: confirmJson.data.recordId,
        editReason: 'ปรับปรุงคำอธิบายผลการดำเนินงานและมูลค่าความช่วยเหลือให้ตรงกับหลักเกณฑ์ฉบับปรับปรุง',
        input: {
          assistanceOutcome: 'ส่งมอบเงินสงเคราะห์เพื่อการยังชีพครบถ้วนตามหลักเกณฑ์พร้อมมอบชุดยังชีพเสริม',
          actualAssistanceValue: 16500, // Value of aid increased due to goods
        },
        actor: { id: officerId, name: officerName, role: 'officer' },
      }),
    });
    const editJson = await editRes.json();
    assert(editRes.status === 200, '5.3 แก้ไขผลการช่วยเหลือสำเร็จ HTTP 200');
    assert(editJson.success === true, '5.4 editJson.success เป็น true');

    // Verify snapshot and history in DB
    const editedRecDb = await client.execute({
      sql: 'SELECT * FROM assistance_execution_records WHERE id = ?',
      args: [confirmJson.data.recordId],
    });
    const editedRec = editedRecDb.rows[0];
    assert(editedRec.edit_reason === 'ปรับปรุงคำอธิบายผลการดำเนินงานและมูลค่าความช่วยเหลือให้ตรงกับหลักเกณฑ์ฉบับปรับปรุง', '5.5 edit_reason ถูกบันทึก');
    assert(Boolean(editedRec.previous_values), '5.6 previous_values มี JSON snapshot ข้อมูลเดิม');

    const snapshots = JSON.parse(String(editedRec.previous_values));
    assert(Array.isArray(snapshots) && snapshots.length === 1, '5.7 snapshot เก็บประวัติการแก้ไข 1 ครั้ง');
    assert(snapshots[0].actualDisbursedAmount === 15000, '5.8 snapshot เก็บยอดเงินเดิม 15,000 บาท');
    assert(snapshots[0].editReason.includes('ปรับปรุงคำอธิบาย'), '5.9 snapshot เก็บเหตุผลการแก้ไข');

    // Verify Application History contains edit log
    const histDb = await client.execute({
      sql: 'SELECT * FROM application_history WHERE application_id = ? ORDER BY rowid DESC LIMIT 1',
      args: [appId1],
    });
    assert(histDb.rows[0].notes.includes('แก้ไขผลการช่วยเหลือที่ยืนยันแล้ว'), '5.10 application_history บันทึกประวัติการแก้ไข');

    // =========================================================================
    // TEST SUITE 6: INSTALLMENTS & PARTIAL ASSISTANCE (การช่วยเหลือจ่ายเป็นงวด)
    // =========================================================================
    console.log('\n--- TEST 6: INSTALLMENTS & PARTIAL ASSISTANCE (การจ่ายเป็นงวด) ---');

    // 6.1 Confirm Installment 1 of 2 (฿10,000 of ฿20,000)
    const inst1Res = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirm_completion',
        applicationId: appId2,
        input: {
          installmentNo: 1,
          totalInstallments: 2,
          executionDate: '2026-10-22',
          executionTime: '13:00',
          assistanceOutcome: 'ส่งมอบเงินสนับสนุนอาชีพงวดที่ 1 เพื่อจัดซื้ออุปกรณ์ตั้งต้น',
          actualDisbursedAmount: 10000,
          actualAssistanceValue: 10000,
          details: 'ผู้รับได้จัดซื้อเครื่องเย็บผ้าและอุปกรณ์เบื้องต้นเรียบร้อย',
          proofUrl: '/proofs/inst1-receipt.pdf',
          proofName: 'ใบเสร็จงวด1_เครื่องมือทำกิน.pdf',
          isConfirmed: true,
          confirmationStatement: 'ข้าพเจ้ายืนยันว่าได้ดำเนินการช่วยเหลือตามรายละเอียดนี้แล้ว และข้อมูลกับหลักฐานตรงกับการดำเนินงานจริง',
          status: 'completed', // requested completed but should be downgraded to partially_assisted because tranche 1 of 2
        },
        actor: { id: officerId, name: officerName, role: 'officer' },
      }),
    });
    const inst1Json = await inst1Res.json();

    assert(inst1Res.status === 200, '6.1 ยืนยันงวดที่ 1 สำเร็จ HTTP 200');
    // Rule: การช่วยเหลือที่จ่ายเป็นงวดต้องสามารถบันทึกผลแต่ละงวดได้ โดยไม่เปลี่ยนสถานะเป็นเสร็จสิ้นทั้งหมดจนกว่าจะครบเงื่อนไข
    assert(inst1Json.data.outcomeStatus === 'partially_assisted', '6.2 สถานะงวดที่ 1 เป็น partially_assisted (ช่วยเหลือบางส่วน)');
    assert(inst1Json.data.totalDisbursed === 10000, '6.3 ยอดส่งมอบสะสม 10,000 บาท');
    assert(inst1Json.data.remainingBalance === 10000, '6.4 ยอดคงเหลือรอจ่ายงวดต่อไป 10,000 บาท');

    const appInst1Db = await client.execute({
      sql: 'SELECT status, disbursed_amount, assistance_result_status, current_installment, installment_count FROM assistance_applications WHERE id = ?',
      args: [appId2],
    });
    assert(appInst1Db.rows[0].status === 'partially_disbursed', '6.5 สถานะคำร้องยังคงเป็น partially_disbursed (ไม่เปลี่ยนเป็นเสร็จสิ้นทั้งหมด)');
    assert(appInst1Db.rows[0].assistance_result_status === 'partially_assisted', '6.6 assistance_result_status เป็น partially_assisted');
    assert(Number(appInst1Db.rows[0].current_installment) === 1, '6.7 current_installment = 1');
    assert(Number(appInst1Db.rows[0].installment_count) === 2, '6.8 installment_count = 2');

    // 6.2 Confirm Installment 2 of 2 (Final tranche: ฿10,000)
    const inst2Res = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirm_completion',
        applicationId: appId2,
        input: {
          installmentNo: 2,
          totalInstallments: 2,
          executionDate: '2026-10-22',
          executionTime: '17:00',
          assistanceOutcome: 'ส่งมอบเงินสนับสนุนอาชีพงวดที่ 2 (งวดสุดท้าย) หลังตรวจประเมินผลการเปิดร้าน',
          actualDisbursedAmount: 10000,
          actualAssistanceValue: 10000,
          details: 'ร้านเปิดดำเนินกิจการมีรายได้ประจำวันเรียบร้อย',
          proofUrl: '/proofs/inst2-receipt.pdf',
          proofName: 'ใบเสร็จงวด2_เงินทุนหมุนเวียน.pdf',
          isConfirmed: true,
          confirmationStatement: 'ข้าพเจ้ายืนยันว่าได้ดำเนินการช่วยเหลือตามรายละเอียดนี้แล้ว และข้อมูลกับหลักฐานตรงกับการดำเนินงานจริง',
          status: 'completed',
        },
        actor: { id: officerId, name: officerName, role: 'officer' },
      }),
    });
    const inst2Json = await inst2Res.json();

    assert(inst2Res.status === 200, '6.9 ยืนยันงวดที่ 2 สำเร็จ HTTP 200');
    assert(inst2Json.data.outcomeStatus === 'completed', '6.10 งวดสุดท้ายเปลี่ยนสถานะเป็น completed (เสร็จสิ้น)');
    assert(inst2Json.data.totalDisbursed === 20000, '6.11 ยอดส่งมอบรวมครบ 20,000 บาท');
    assert(inst2Json.data.remainingBalance === 0, '6.12 ยอดคงเหลือเป็น 0 บาท');

    const appInst2Db = await client.execute({
      sql: 'SELECT status, disbursed_amount, assistance_result_status, current_installment FROM assistance_applications WHERE id = ?',
      args: [appId2],
    });
    assert(appInst2Db.rows[0].status === 'disbursed', '6.13 สถานะคำร้องเปลี่ยนเป็น disbursed เมื่อครบทุกงวด');
    assert(appInst2Db.rows[0].assistance_result_status === 'completed', '6.14 assistance_result_status ปรับเป็น completed');

    // =========================================================================
    // TEST SUITE 7: IDEMPOTENCY & LINKAGE INTEGRITY (ห้ามสร้างรายจ่ายซ้ำ)
    // =========================================================================
    console.log('\n--- TEST 7: IDEMPOTENCY & FINANCIAL LINKAGE (ห้ามสร้างรายจ่ายซ้ำ) ---');
    const finalTransRes = await client.execute('SELECT COUNT(*) as c FROM financial_transactions');
    const finalTransCount = Number(finalTransRes.rows[0].c);

    // Rule: ห้ามสร้างรายจ่ายซ้ำเมื่อเปิดหรือแก้ไขหน้าบันทึกการช่วยเหลือ
    assert(finalTransCount === initialTransCount, `7.1 กฎสำคัญ: ไม่มีธุรกรรมรายจ่ายซ้ำใน financial_transactions (${initialTransCount} == ${finalTransCount})`);

    // Fetch details through API and verify all 12 fields & executionRecords
    const detailRes = await fetch(`${BASE_URL}/api/finance/assistance-link?applicationId=${appId2}&actorId=${officerId}&actorName=${encodeURIComponent(officerName)}&actorRole=officer`);
    const detailJson = await detailRes.json();
    assert(detailRes.status === 200, '7.2 ดึงข้อมูลละเอียดผ่าน API สำเร็จ');
    const d = detailJson.data;

    assert(Array.isArray(d.executionRecords) && d.executionRecords.length === 2, '7.3 ได้รับประวัติการบันทึกผล 2 งวด');
    assert(d.executionRecords[0].installmentNo === 1 && d.executionRecords[0].status === 'partially_assisted', '7.4 ข้อมูลงวดที่ 1 ถูกต้อง');
    assert(d.executionRecords[1].installmentNo === 2 && d.executionRecords[1].status === 'completed', '7.5 ข้อมูลงวดที่ 2 ถูกต้อง');
    assert(d.outcomeStatus === 'completed', '7.6 outcomeStatus รวมของเคสเป็น completed');
    assert(d.outcomeStatusLabel === 'ช่วยเหลือเสร็จสิ้น', '7.7 outcomeStatusLabel เป็น ช่วยเหลือเสร็จสิ้น');
    assert(d.disbursedAmount === 20000, '7.8 disbursedAmount เชื่อมโยงกับรายการเดิมถูกต้อง');

  } catch (error) {
    console.error('Fatal Test Exception:', error);
    failed++;
  }

  console.log('\n=================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('=================================================================');
  if (failed > 0) process.exit(1);
}

run();
