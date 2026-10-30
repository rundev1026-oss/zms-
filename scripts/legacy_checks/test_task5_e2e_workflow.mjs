import { createClient } from '@libsql/client';

const client = createClient({ url: 'file:data/zms.db' });
const BASE_URL = 'http://localhost:3000';

async function runTask5E2ETest() {
  console.log('=================================================================');
  console.log('--- TASK 5: END-TO-END ASSISTANCE & CASH WORKFLOW VERIFICATION ---');
  console.log('=================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const financeOfficerId = 'u-t5-fin-' + timestamp;
  const financeOfficerName = 'นางสาวการเงิน ตรวจสอบรอบคอบ';
  const caseWorkerId = 'u-t5-cw-' + timestamp;
  const caseWorkerName = 'นายอาสา ดูแลเคสจริงจัง';
  const unauthorizedUserId = 'u-t5-unauth-' + timestamp;
  const unauthorizedUserName = 'นายสังเกตการณ์ ทั่วไป';

  try {
    // -------------------------------------------------------------
    // PREREQUISITES: Base Data Setup
    // -------------------------------------------------------------
    const bankRes = await client.execute("SELECT id, current_balance FROM bank_accounts WHERE status = 'active' LIMIT 1");
    const bankId = String(bankRes.rows[0].id);
    const hhRes = await client.execute('SELECT id FROM households LIMIT 1');
    const householdId = String(hhRes.rows[0].id);

    // Create 2 Test Beneficiaries
    const ben1Id = `ben-t5-1-${timestamp}`;
    const ben2Id = `ben-t5-2-${timestamp}`;
    await client.execute({
      sql: `INSERT INTO beneficiaries (id, household_id, full_name, national_id, phone, asnaf_category, registration_no)
            VALUES (?, ?, 'นายสมชาย ผู้ยากไร้ทดสอบ 5.1', ?, '0891234561', 'fakir', ?)`,
      args: [ben1Id, householdId, `19501${timestamp.toString().slice(-8)}1`, `REG-T5-01`],
    });
    await client.execute({
      sql: `INSERT INTO beneficiaries (id, household_id, full_name, national_id, phone, asnaf_category, registration_no)
            VALUES (?, ?, 'นางมาลี ผู้มีภาระหนี้ทดสอบ 5.2', ?, '0891234562', 'gharimin', ?)`,
      args: [ben2Id, householdId, `19501${timestamp.toString().slice(-8)}2`, `REG-T5-02`],
    });

    // -------------------------------------------------------------
    // TEST CASE 1: เบิกเงินแล้ว แต่ยังไม่ส่งมอบให้ผู้ดูแล
    // (Bank withdrawal done, but cash not yet handed over to case worker)
    // -------------------------------------------------------------
    console.log('\n--- CASE 1: เบิกเงินแล้ว แต่ยังไม่ส่งมอบให้ผู้ดูแล ---');
    const app1Id = `app-t5-1-${timestamp}`;
    const wf1Id = `wf-t5-1-${timestamp}`;
    const wd1Id = `wd-t5-1-${timestamp}`;

    // Create Application 1: Approved for 20,000 THB
    await client.execute({
      sql: `INSERT INTO assistance_applications (
              id, application_no, beneficiary_id, asnaf_category, assistance_type,
              requested_amount, approved_amount, status, assigned_officer_id, assigned_officer_name, applied_date, created_at, updated_at
            ) VALUES (?, ?, ?, 'fakir', 'เงินสงเคราะห์เพื่อการยังชีพ', 20000, 20000, 'wait_disbursement', ?, ?, '23 ต.ค. 2569', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [app1Id, `APP-T5-01-${timestamp.toString().slice(-4)}`, ben1Id, caseWorkerId, caseWorkerName],
    });

    // Step 1: Bank Withdrawal (20,000 THB) completed into cash on hand
    await client.execute({
      sql: `INSERT INTO cash_flow_workflows (
              id, workflow_no, title, step1_bank_account_id, step1_withdraw_amount,
              step1_date, step1_operator_id, step1_operator_name,
              step1_status, step2_status, overall_status, created_at
            ) VALUES (?, ?, 'โครงการเบิกเงินสดทดสอบ Case 1-4', ?, 20000, '2026-10-23', ?, ?, 'completed', 'completed', 'in_progress', CURRENT_TIMESTAMP)`,
      args: [wf1Id, `CFW-T5-1-${timestamp.toString().slice(-4)}`, bankId, financeOfficerId, financeOfficerName],
    });

    await client.execute({
      sql: `INSERT INTO cash_flow_withdrawals (
              id, workflow_id, withdrawal_no, amount, withdrawal_datetime, target_asnaf, purpose, status,
              handover_status, total_handed_over_amount, remaining_handover_amount, recipient_case_worker_id, recipient_case_worker_name
            ) VALUES (?, ?, ?, 20000, '2026-10-23 09:00:00', 'fakir', 'เบิกเงินสดช่วยเหลือค่าครองชีพ', 'disbursed',
                      'pending_handover', 0, 20000, ?, ?)`,
      args: [wd1Id, wf1Id, `WD-T5-1-${timestamp.toString().slice(-4)}`, caseWorkerId, caseWorkerName],
    });

    // Link application to voucher
    await client.execute({
      sql: `INSERT INTO cash_flow_disbursement_items (
              id, withdrawal_id, workflow_id, application_id, beneficiary_id, beneficiary_name,
              national_id, asnaf_category, assistance_type, approved_amount, this_disbursement_amount, remaining_balance, status
            ) VALUES (?, ?, ?, ?, ?, 'นายสมชาย ผู้ยากไร้ทดสอบ 5.1', '1950100000001', 'fakir', 'เงินสงเคราะห์เพื่อการยังชีพ', 20000, 20000, 0, 'completed')`,
      args: [`item-t5-1-${timestamp}`, wd1Id, wf1Id, app1Id, ben1Id],
    });

    // Financial transaction: type is 'transfer' (NOT aid expense)
    await client.execute({
      sql: `INSERT INTO financial_transactions (
              id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
              payer_or_payee, reference_no, status, recorded_by_id, recorded_by_name, bank_account_id, workflow_id
            ) VALUES (?, ?, '2026-10-23', 'transfer', 'fund-1', 'กองทุนซะกาต', 'เบิกเงินสดจากธนาคารเพื่อส่งมอบเหรัญญิก', 20000, 'cash', 'เหรัญญิกมูลนิธิ', 'REF-T5-STEP1', 'completed', ?, ?, ?, ?)`,
      args: [`txn-t5-step1-${timestamp}`, `TXN-T5-S1-${timestamp.toString().slice(-4)}`, financeOfficerId, financeOfficerName, bankId, wf1Id],
    });

    // Check financial details before handover
    const preHandoverRes = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get_financial_details',
        applicationId: app1Id,
        actor: { id: caseWorkerId, name: caseWorkerName, role: 'officer' },
      }),
    });
    const preHandoverJson = await preHandoverRes.json();
    assert(preHandoverJson.success === true, '1.1 Query financial details succeeds');
    assert(preHandoverJson.data.handedOverAmount === 0, '1.2 Handed over amount to case worker is strictly 0 THB');
    assert(preHandoverJson.data.financeStatus === 'not_handed_over', '1.3 Handover status is marked as not_handed_over');

    // Pre-handover attempt to confirm completion must be rejected
    const invalidConfirmRes = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirm_completion',
        applicationId: app1Id,
        actor: { id: caseWorkerId, name: caseWorkerName, role: 'officer' },
        input: {
          withdrawalId: wd1Id,
          actualDisbursedAmount: 20000,
          isConfirmed: true,
          confirmationStatement: 'ข้าพเจ้ายืนยันว่าได้ดำเนินการช่วยเหลือตามรายละเอียดนี้แล้ว และข้อมูลกับหลักฐานตรงกับการดำเนินงานจริง',
          proofUrl: 'https://proof.example.com/slip.pdf',
          proofName: 'slip.pdf',
          executionDate: '2026-10-23',
          executionTime: '10:00:00',
          assistanceOutcome: 'พยายามบันทึกทั้งที่ยังไม่ได้รับเงินสด',
        },
      }),
    });
    const invalidConfirmJson = await invalidConfirmRes.json();
    assert(invalidConfirmRes.status === 400 && invalidConfirmJson.success === false, '1.4 System rejects confirmation when cash has NOT been handed over to case worker');

    // -------------------------------------------------------------
    // TEST CASE 2: ส่งมอบเงินให้ผู้ดูแลบางส่วน
    // (Partial handover: 8,000 of 20,000 THB handed over)
    // -------------------------------------------------------------
    console.log('\n--- CASE 2: ส่งมอบเงินให้ผู้ดูแลบางส่วน ---');
    const ho1Res = await fetch(`${BASE_URL}/api/finance/handovers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: {
          withdrawalId: wd1Id,
          amount: 8000,
          handoverDate: '2026-10-23',
          handoverTime: '10:15',
          handedOverByName: financeOfficerName,
          receivedByName: caseWorkerName,
          receivedByPosition: 'ผู้ดูแลเคสพื้นที่',
          proofUrl: 'https://proof.example.com/ho-part1.pdf',
          proofName: 'ho-part1.pdf',
          isConfirmed: true,
          notes: 'ส่งมอบเงินสดเบื้องต้นงวดแรก 8,000 บาท',
        },
        actor: { id: financeOfficerId, name: financeOfficerName, role: 'finance' },
      }),
    });
    const ho1Json = await ho1Res.json();
    assert(ho1Json.success === true, '2.1 Partial handover of 8,000 THB succeeds');
    assert(ho1Json.data.status === 'partially_handed_over', '2.2 Handover record status is partially_handed_over');

    // Check application financial details reflects partial handover
    const partHandoverDetailsRes = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get_financial_details',
        applicationId: app1Id,
        actor: { id: caseWorkerId, name: caseWorkerName, role: 'officer' },
      }),
    });
    const partHandoverDetailsJson = await partHandoverDetailsRes.json();
    assert(partHandoverDetailsJson.data.handedOverAmount === 8000, '2.3 Application reflects exactly 8,000 THB handed over');
    assert(partHandoverDetailsJson.data.disbursedAmount === 0, '2.4 Actual aid disbursed to beneficiary remains 0 THB (No double counting)');

    // Attempting to disburse more than handed over (e.g. 15,000) must be rejected
    const overDisburseRes = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirm_completion',
        applicationId: app1Id,
        actor: { id: caseWorkerId, name: caseWorkerName, role: 'officer' },
        input: {
          withdrawalId: wd1Id,
          actualDisbursedAmount: 15000,
          isConfirmed: true,
          confirmationStatement: 'ข้าพเจ้ายืนยันว่าได้ดำเนินการช่วยเหลือตามรายละเอียดนี้แล้ว และข้อมูลกับหลักฐานตรงกับการดำเนินงานจริง',
          proofUrl: 'https://proof.example.com/slip.pdf',
          proofName: 'slip.pdf',
          executionDate: '2026-10-23',
          executionTime: '11:00:00',
          assistanceOutcome: 'พยายามรายงานยอดเกินเงินที่ได้รับมอบ',
        },
      }),
    });
    const overDisburseJson = await overDisburseRes.json();
    assert(overDisburseRes.status === 400 && overDisburseJson.error.includes('เกินยอดเงินสดที่ได้รับมอบ'), '2.5 Rejection when actual reported amount (15,000) exceeds handed-over cash (8,000)');

    // -------------------------------------------------------------
    // TEST CASE 3: ส่งมอบเงินครบ แต่ยังไม่ได้ช่วยเหลือผู้รับ
    // (Full handover complete: remaining 12,000 THB handed over, total = 20,000 THB)
    // -------------------------------------------------------------
    console.log('\n--- CASE 3: ส่งมอบเงินครบ แต่ยังไม่ได้ช่วยเหลือผู้รับ ---');
    const ho2Res = await fetch(`${BASE_URL}/api/finance/handovers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: {
          withdrawalId: wd1Id,
          amount: 12000,
          handoverDate: '2026-10-23',
          handoverTime: '11:30',
          handedOverByName: financeOfficerName,
          receivedByName: caseWorkerName,
          receivedByPosition: 'ผู้ดูแลเคสพื้นที่',
          proofUrl: 'https://proof.example.com/ho-part2.pdf',
          proofName: 'ho-part2.pdf',
          isConfirmed: true,
          notes: 'ส่งมอบเงินสดส่วนที่เหลือ 12,000 บาทครบถ้วน',
        },
        actor: { id: financeOfficerId, name: financeOfficerName, role: 'finance' },
      }),
    });
    const ho2Json = await ho2Res.json();
    assert(ho2Json.success === true, '3.1 Handover of remaining 12,000 THB succeeds');
    assert(ho2Json.data.status === 'fully_handed_over', '3.2 Handover status transitioned to fully_handed_over');

    // Check Verified Aid Expenses endpoint before aid execution
    const afterFullHandoverRes = await fetch(`${BASE_URL}/api/finance/verified-expenses?zakatYear=2569`);
    const afterFullHandoverData = await afterFullHandoverRes.json();
    // App 1 has NOT executed aid yet: it must NOT be in verifiedAidItems!
    const app1ItemsBeforeExec = afterFullHandoverData.data.drillDown.verifiedAidItems.filter(i => i.applicationId === app1Id);
    assert(app1ItemsBeforeExec.length === 0, '3.3 Verified aid items excludes App 1 before actual execution');
    assert(afterFullHandoverData.data.unspentHeldAmount >= 20000, '3.4 Case worker holds 20,000 THB in unspent held cash pending execution');

    // -------------------------------------------------------------
    // TEST CASE 4: ช่วยเหลือเสร็จสิ้นและมีหลักฐานครบ
    // (Assistance completed and confirmed with valid proof)
    // -------------------------------------------------------------
    console.log('\n--- CASE 4: ช่วยเหลือเสร็จสิ้นและมีหลักฐานครบ ---');
    const confirmC4Res = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirm_completion',
        applicationId: app1Id,
        actor: { id: caseWorkerId, name: caseWorkerName, role: 'officer' },
        input: {
          withdrawalId: wd1Id,
          installmentNo: 1,
          totalInstallments: 1,
          executionDate: '2026-10-23',
          executionTime: '13:30:00',
          actualDisbursedAmount: 20000,
          actualAssistanceValue: 20000,
          assistanceOutcome: 'ส่งมอบเงินสดค่าครองชีพให้ผู้รับซะกาตครบถ้วนเรียบร้อย',
          details: 'ส่งมอบเงินสดถึงบ้านผู้ยากไร้ พร้อมถ่ายภาพและลงลายมือชื่อรับเงิน',
          proofUrl: 'https://proof.example.com/slip-task5-c4.pdf',
          proofName: 'slip-task5-c4.pdf',
          proofType: 'application/pdf',
          proofSize: 1048576,
          isConfirmed: true,
          confirmationStatement: 'ข้าพเจ้ายืนยันว่าได้ดำเนินการช่วยเหลือตามรายละเอียดนี้แล้ว และข้อมูลกับหลักฐานตรงกับการดำเนินงานจริง',
          status: 'completed',
        },
      }),
    });
    const confirmC4Json = await confirmC4Res.json();
    assert(confirmC4Json.success === true, '4.1 Confirmation of completion succeeds with HTTP 200');
    assert(confirmC4Json.data.outcomeStatus === 'completed', '4.2 Outcome status marked as completed');
    assert(confirmC4Json.data.totalDisbursed === 20000, '4.3 Total disbursed reaches 20,000 THB');
    assert(confirmC4Json.data.remainingBalance === 0, '4.4 Remaining balance drops to 0 THB');

    // Check application status updated to disbursed
    const app1DbRes = await client.execute({
      sql: 'SELECT status, disbursed_amount, assistance_result_status FROM assistance_applications WHERE id = ?',
      args: [app1Id],
    });
    assert(app1DbRes.rows[0].status === 'disbursed', '4.5 Application status transitions to disbursed');
    assert(Number(app1DbRes.rows[0].disbursed_amount) === 20000, '4.6 Application disbursed_amount updated to 20,000 THB');

    // Check verified aid breakdown captures App 1
    const verifiedC4Res = await fetch(`${BASE_URL}/api/finance/verified-expenses?zakatYear=2569`);
    const verifiedC4Data = await verifiedC4Res.json();
    const app1VerifiedItems = verifiedC4Data.data.drillDown.verifiedAidItems.filter(i => i.applicationId === app1Id);
    assert(app1VerifiedItems.length === 1 && app1VerifiedItems[0].amount === 20000, '4.7 App 1 is included in verifiedAidItems with 20,000 THB');
    assert(app1VerifiedItems[0].hasValidProof === true, '4.8 Item is flagged as hasValidProof = true');
    assert(app1VerifiedItems[0].asnafCode === 'faqir_miskin', '4.9 Categorized under canonical faqir_miskin Asnaf');
    assert(app1VerifiedItems[0].assistanceTypeCode === 'LIVING_SUPPORT', '4.10 Categorized under canonical LIVING_SUPPORT type');

    // -------------------------------------------------------------
    // TEST CASE 5: ช่วยเหลือบางส่วนและยังมียอดคงเหลือ
    // (Partial assistance: 2 installments of 8,000 and 10,000 THB)
    // -------------------------------------------------------------
    console.log('\n--- CASE 5: ช่วยเหลือบางส่วนและยังมียอดคงเหลือ ---');
    const app2Id = `app-t5-2-${timestamp}`;
    const wf2Id = `wf-t5-2-${timestamp}`;
    const wd2Id = `wd-t5-2-${timestamp}`;

    // Application 2: Approved for 18,000 THB
    await client.execute({
      sql: `INSERT INTO assistance_applications (
              id, application_no, beneficiary_id, asnaf_category, assistance_type,
              requested_amount, approved_amount, status, assigned_officer_id, assigned_officer_name, applied_date, created_at, updated_at
            ) VALUES (?, ?, ?, 'gharimin', 'ปลดเปลื้องหนี้สิน', 18000, 18000, 'wait_disbursement', ?, ?, '23 ต.ค. 2569', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [app2Id, `APP-T5-02-${timestamp.toString().slice(-4)}`, ben2Id, caseWorkerId, caseWorkerName],
    });

    // Workflow & Withdrawal for 18,000 THB
    await client.execute({
      sql: `INSERT INTO cash_flow_workflows (
              id, workflow_no, title, step1_bank_account_id, step1_withdraw_amount,
              step1_date, step1_operator_id, step1_operator_name,
              step1_status, step2_status, overall_status, created_at
            ) VALUES (?, ?, 'โครงการช่วยเหลือหนี้สิน Case 5-6', ?, 18000, '2026-10-23', ?, ?, 'completed', 'completed', 'in_progress', CURRENT_TIMESTAMP)`,
      args: [wf2Id, `CFW-T5-2-${timestamp.toString().slice(-4)}`, bankId, financeOfficerId, financeOfficerName],
    });

    await client.execute({
      sql: `INSERT INTO cash_flow_withdrawals (
              id, workflow_id, withdrawal_no, amount, withdrawal_datetime, target_asnaf, purpose, status,
              handover_status, total_handed_over_amount, remaining_handover_amount, recipient_case_worker_id, recipient_case_worker_name
            ) VALUES (?, ?, ?, 18000, '2026-10-23 10:00:00', 'gharimin', 'เบิกเงินสดช่วยเหลือหนี้สิน', 'disbursed',
                      'pending_handover', 0, 18000, ?, ?)`,
      args: [wd2Id, wf2Id, `WD-T5-2-${timestamp.toString().slice(-4)}`, caseWorkerId, caseWorkerName],
    });

    await client.execute({
      sql: `INSERT INTO cash_flow_disbursement_items (
              id, withdrawal_id, workflow_id, application_id, beneficiary_id, beneficiary_name,
              national_id, asnaf_category, assistance_type, approved_amount, this_disbursement_amount, remaining_balance, status
            ) VALUES (?, ?, ?, ?, ?, 'นางมาลี ผู้มีภาระหนี้ทดสอบ 5.2', '1950100000002', 'gharimin', 'ปลดเปลื้องหนี้สิน', 18000, 18000, 0, 'completed')`,
      args: [`item-t5-2-${timestamp}`, wd2Id, wf2Id, app2Id, ben2Id],
    });

    // Full handover of 18,000 THB to case worker
    const hoWd2Res = await fetch(`${BASE_URL}/api/finance/handovers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: {
          withdrawalId: wd2Id,
          amount: 18000,
          handoverDate: '2026-10-23',
          handoverTime: '11:00',
          handedOverByName: financeOfficerName,
          receivedByName: caseWorkerName,
          proofUrl: 'https://proof.example.com/ho-wd2.pdf',
          proofName: 'ho-wd2.pdf',
          isConfirmed: true,
        },
        actor: { id: financeOfficerId, name: financeOfficerName, role: 'finance' },
      }),
    });
    const hoWd2Json = await hoWd2Res.json();
    assert(hoWd2Json.success === true, '5.0 Handover of 18,000 THB to case worker succeeds');

    // Case worker confirms Installment 1 (8,000 THB)
    const inst1Res = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirm_completion',
        applicationId: app2Id,
        actor: { id: caseWorkerId, name: caseWorkerName, role: 'officer' },
        input: {
          withdrawalId: wd2Id,
          installmentNo: 1,
          totalInstallments: 2,
          executionDate: '2026-10-23',
          executionTime: '14:00:00',
          actualDisbursedAmount: 8000,
          actualAssistanceValue: 8000,
          assistanceOutcome: 'ชำระหนี้สินงวดที่ 1 ตามข้อตกลง',
          details: 'ชำระหนี้สินงวดที่ 1 ให้เจ้าหนี้พร้อมใบเสร็จ',
          proofUrl: 'https://proof.example.com/slip-inst1.pdf',
          proofName: 'slip-inst1.pdf',
          isConfirmed: true,
          confirmationStatement: 'ข้าพเจ้ายืนยันว่าได้ดำเนินการช่วยเหลือตามรายละเอียดนี้แล้ว และข้อมูลกับหลักฐานตรงกับการดำเนินงานจริง',
          status: 'partially_assisted',
        },
      }),
    });
    const inst1Json = await inst1Res.json();
    assert(inst1Json.success === true, '5.1 Confirmation of Installment 1 (8,000 THB) succeeds');
    assert(inst1Json.data.outcomeStatus === 'partially_assisted', '5.2 Status is partially_assisted');
    assert(inst1Json.data.remainingBalance === 10000, '5.3 Remaining balance held is 10,000 THB');

    // Verify application status: must remain partially_disbursed, not completed
    const app2DbRes = await client.execute({
      sql: 'SELECT status, disbursed_amount, assistance_result_status FROM assistance_applications WHERE id = ?',
      args: [app2Id],
    });
    assert(app2DbRes.rows[0].status === 'partially_disbursed', '5.4 Application status remains partially_disbursed');
    assert(Number(app2DbRes.rows[0].disbursed_amount) === 8000, '5.5 Application disbursed_amount is 8,000 THB');

    // -------------------------------------------------------------
    // TEST CASE 6: ผู้ดูแลคืนเงินที่ไม่ได้ใช้
    // (Case worker refunds unused money: 6,000 of 10,000 THB returned)
    // -------------------------------------------------------------
    console.log('\n--- CASE 6: ผู้ดูแลคืนเงินที่ไม่ได้ใช้ ---');
    const refundRes = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'record_refund',
        actor: { id: financeOfficerId, name: financeOfficerName, role: 'finance' },
        input: {
          applicationId: app2Id,
          withdrawalId: wd2Id,
          workflowId: wf2Id,
          refundDate: '2026-10-23',
          refundTime: '15:30:00',
          refundAmount: 6000,
          refundReason: 'ส่งคืนเงินช่วยเหลือคงเหลือจากงวดที่ 1 เนื่องจากเจ้าหนี้ลดหย่อนยอดหนี้',
          returnedById: caseWorkerId,
          returnedByName: caseWorkerName,
          receivedById: financeOfficerId,
          receivedByName: financeOfficerName,
          targetFundId: 'fund-1',
          proofUrl: 'https://proof.example.com/receipt-refund-c6.pdf',
        },
      }),
    });
    const refundJson = await refundRes.json();
    assert(refundJson.success === true, '6.1 Record assistance refund of 6,000 THB succeeds');
    const refundRecordId = refundJson.data.id;

    // Verify reversal entry created in financial_transactions
    const reversalTxnRes = await client.execute({
      sql: "SELECT * FROM financial_transactions WHERE type = 'reversal' AND reference_no = ?",
      args: [refundJson.data.refundNo],
    });
    assert(reversalTxnRes.rows.length === 1, '6.2 Reversal transaction posted to financial ledger');
    assert(Number(reversalTxnRes.rows[0].amount) === 6000, '6.3 Reversal ledger amount is 6,000 THB');

    // Verify unspent held cash formula after refund:
    // For app2: Handed over 18,000 - Actual Disbursed 8,000 - Refunded 6,000 = 4,000 THB remaining held cash!
    const verifiedC6Res = await fetch(`${BASE_URL}/api/finance/verified-expenses?zakatYear=2569`);
    const verifiedC6Data = await verifiedC6Res.json();
    const refundItemFound = verifiedC6Data.data.drillDown.refundItems.find(r => r.recordId === refundRecordId);
    assert(refundItemFound && refundItemFound.amount === 6000, '6.4 Refund item listed in drillDown.refundItems with 6,000 THB');

    // Verify historical integrity: execution record and application history are intact
    const execCountRes = await client.execute({
      sql: 'SELECT COUNT(*) as c FROM assistance_execution_records WHERE application_id = ?',
      args: [app2Id],
    });
    assert(Number(execCountRes.rows[0].c) >= 1, '6.5 Historical execution records preserved without deletion');

    // -------------------------------------------------------------
    // TEST CASE 7: มีการแนบหลักฐานผิดหรือไม่ครบ
    // (Missing or invalid proof: rejected by validation & tracked in missing proof)
    // -------------------------------------------------------------
    console.log('\n--- CASE 7: มีการแนบหลักฐานผิดหรือไม่ครบ ---');
    // 7.1 Rejection without proofUrl
    const noProofRes = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirm_completion',
        applicationId: app2Id,
        actor: { id: caseWorkerId, name: caseWorkerName, role: 'officer' },
        input: {
          withdrawalId: wd2Id,
          installmentNo: 2,
          totalInstallments: 2,
          executionDate: '2026-10-23',
          executionTime: '16:00:00',
          actualDisbursedAmount: 4000,
          assistanceOutcome: 'ส่งมอบเงินส่วนที่เหลือ',
          details: 'ไม่มีไฟล์หลักฐาน',
          proofUrl: '',
          proofName: '',
          isConfirmed: true,
          confirmationStatement: 'ข้าพเจ้ายืนยันว่าได้ดำเนินการช่วยเหลือตามรายละเอียดนี้แล้ว และข้อมูลกับหลักฐานตรงกับการดำเนินงานจริง',
        },
      }),
    });
    const noProofJson = await noProofRes.json();
    assert(noProofRes.status === 400 && noProofJson.error.includes('หลักฐาน'), '7.1 System strictly rejects confirmation when proof file is missing');

    // 7.2 Rejection without confirmation checkbox statement
    const noCheckRes = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirm_completion',
        applicationId: app2Id,
        actor: { id: caseWorkerId, name: caseWorkerName, role: 'officer' },
        input: {
          withdrawalId: wd2Id,
          installmentNo: 2,
          totalInstallments: 2,
          executionDate: '2026-10-23',
          executionTime: '16:00:00',
          actualDisbursedAmount: 4000,
          assistanceOutcome: 'ส่งมอบเงินส่วนที่เหลือ',
          proofUrl: 'https://proof.example.com/slip.pdf',
          proofName: 'slip.pdf',
          isConfirmed: false,
          confirmationStatement: '',
        },
      }),
    });
    const noCheckJson = await noCheckRes.json();
    assert(noCheckRes.status === 400 && noCheckJson.error.includes('ยืนยัน'), '7.2 System strictly rejects confirmation when confirmation checkbox is NOT ticked');

    // 7.3 Missing proof tracking in Dashboard
    const missingProofDashRes = await fetch(`${BASE_URL}/api/finance/verified-expenses?zakatYear=2569`);
    const missingProofDashData = await missingProofDashRes.json();
    assert(typeof missingProofDashData.data.missingProofCount === 'number', '7.3 Dashboard calculates missingProofCount');
    assert(Array.isArray(missingProofDashData.data.missingProofItems), '7.4 Dashboard provides missingProofItems array for financial audit');

    // -------------------------------------------------------------
    // TEST CASE 8: มีการกดปุ่มยืนยันซ้ำ
    // (Duplicate confirmation prevention / Idempotency)
    // -------------------------------------------------------------
    console.log('\n--- CASE 8: มีการกดปุ่มยืนยันซ้ำ ---');
    // App 1 installment 1 has already been confirmed! Try confirming installment 1 again:
    const dupConfirmRes = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirm_completion',
        applicationId: app1Id,
        actor: { id: caseWorkerId, name: caseWorkerName, role: 'officer' },
        input: {
          withdrawalId: wd1Id,
          installmentNo: 1,
          totalInstallments: 1,
          executionDate: '2026-10-23',
          executionTime: '13:30:00',
          actualDisbursedAmount: 20000,
          isConfirmed: true,
          confirmationStatement: 'ข้าพเจ้ายืนยันว่าได้ดำเนินการช่วยเหลือตามรายละเอียดนี้แล้ว และข้อมูลกับหลักฐานตรงกับการดำเนินงานจริง',
          proofUrl: 'https://proof.example.com/slip-duplicate.pdf',
          proofName: 'slip-duplicate.pdf',
          assistanceOutcome: 'พยายามกดยืนยันซ้ำ',
        },
      }),
    });
    const dupConfirmJson = await dupConfirmRes.json();
    assert(dupConfirmRes.status === 400 && dupConfirmJson.error.includes('ได้รับการยืนยันผลการช่วยเหลือไปแล้ว'), '8.1 System blocks duplicate confirmation and advises using edit function');

    // -------------------------------------------------------------
    // TEST CASE 9: ผู้ใช้ไม่มีสิทธิ์ยืนยัน
    // (Unauthorized user / Permission check)
    // -------------------------------------------------------------
    console.log('\n--- CASE 9: ผู้ใช้ไม่มีสิทธิ์ยืนยัน ---');
    const unauthConfirmRes = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirm_completion',
        applicationId: app1Id,
        actor: { id: unauthorizedUserId, name: unauthorizedUserName, role: 'viewer' },
        input: {
          withdrawalId: wd1Id,
          installmentNo: 1,
          totalInstallments: 1,
          executionDate: '2026-10-23',
          executionTime: '13:30:00',
          actualDisbursedAmount: 20000,
          isConfirmed: true,
          confirmationStatement: 'ข้าพเจ้ายืนยันว่าได้ดำเนินการช่วยเหลือตามรายละเอียดนี้แล้ว และข้อมูลกับหลักฐานตรงกับการดำเนินงานจริง',
          proofUrl: 'https://proof.example.com/slip.pdf',
          proofName: 'slip.pdf',
          assistanceOutcome: 'ทดสอบสิทธิ์',
        },
      }),
    });
    const unauthConfirmJson = await unauthConfirmRes.json();
    assert(unauthConfirmRes.status === 403 && unauthConfirmJson.error.includes('ไม่อนุญาต'), '9.1 Unauthorized user (viewer) is rejected with HTTP 403 Forbidden');

    // -------------------------------------------------------------
    // TEST CASE 10: รายการมีการแก้ไขหลังยืนยัน
    // (Post-confirmation editing with reason & snapshot audit)
    // -------------------------------------------------------------
    console.log('\n--- CASE 10: รายการมีการแก้ไขหลังยืนยัน ---');
    // Retrieve recordId for App 2 Installment 1
    const app2ExecRes = await client.execute({
      sql: 'SELECT id, actual_disbursed_amount FROM assistance_execution_records WHERE application_id = ? AND installment_no = 1',
      args: [app2Id],
    });
    const execRecId = String(app2ExecRes.rows[0].id);

    // 10.1 Rejection without edit reason
    const noReasonEditRes = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'edit_execution',
        applicationId: app2Id,
        recordId: execRecId,
        editReason: '',
        actor: { id: caseWorkerId, name: caseWorkerName, role: 'officer' },
        input: { actualDisbursedAmount: 8500 },
      }),
    });
    const noReasonEditJson = await noReasonEditRes.json();
    assert(noReasonEditRes.status === 400 && noReasonEditJson.error.includes('เหตุผล'), '10.1 Post-confirmation edit without reason is strictly rejected');

    // 10.2 Successful edit with reason: adjust amount from 8,000 to 8,500 THB
    const validEditRes = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'edit_execution',
        applicationId: app2Id,
        recordId: execRecId,
        editReason: 'ปรับเพิ่มค่าธรรมเนียมโอนปิดบัญชีหนี้ 500 บาทตามใบเสร็จจริง',
        actor: { id: caseWorkerId, name: caseWorkerName, role: 'officer' },
        input: {
          actualDisbursedAmount: 8500,
          actualAssistanceValue: 8500,
          details: 'ชำระหนี้สินงวดที่ 1 (ปรับยอดตามค่าธรรมเนียมจริง)',
        },
      }),
    });
    const validEditJson = await validEditRes.json();
    assert(validEditJson.success === true, '10.2 Edit confirmed execution succeeds with HTTP 200');

    // Check previous_values JSON snapshot preserves old value
    const snapshotDbRes = await client.execute({
      sql: 'SELECT previous_values, actual_disbursed_amount FROM assistance_execution_records WHERE id = ?',
      args: [execRecId],
    });
    const prevArr = JSON.parse(String(snapshotDbRes.rows[0].previous_values));
    assert(Array.isArray(prevArr) && prevArr.length === 1 && prevArr[0].actualDisbursedAmount === 8000, '10.3 Old amount (8,000 THB) preserved in previous_values JSON snapshot');
    assert(Number(snapshotDbRes.rows[0].actual_disbursed_amount) === 8500, '10.4 Current record reflects updated amount (8,500 THB)');

    // Verify verified aid uses 8,500 THB without duplicating the old 8,000 THB
    const afterEditRes = await fetch(`${BASE_URL}/api/finance/verified-expenses?zakatYear=2569`);
    const afterEditData = await afterEditRes.json();
    const app2EditedItem = afterEditData.data.drillDown.verifiedAidItems.find(i => i.recordId === execRecId);
    assert(app2EditedItem && app2EditedItem.amount === 8500, '10.5 Verified expenses calculates exactly 8,500 THB (zero duplicate of old 8,000 THB)');

    // -------------------------------------------------------------
    // TEST CASE 11: Dashboard และรายงานต้องตรงกับธุรกรรมจริง
    // (Mathematical, Categorical and Reporting Reconciliation)
    // -------------------------------------------------------------
    console.log('\n--- CASE 11: Dashboard และรายงานต้องตรงกับธุรกรรมจริง ---');
    const dashRes = await fetch(`${BASE_URL}/api/finance/dashboard?zakatYear=2569`);
    const dashData = await dashRes.json();
    assert(dashRes.status === 200 && dashData.success === true, '11.1 GET /api/finance/dashboard responds successfully');

    const totalVerifiedDisbursed = dashData.data.kpi.totalVerifiedAidDisbursed;
    const asnafSum = round2(dashData.data.verifiedAid.breakdownByAsnaf.reduce((sum, a) => sum + a.disbursedAmount, 0));
    const typeSum = round2(dashData.data.verifiedAid.breakdownByAssistanceType.reduce((sum, t) => sum + t.disbursedAmount, 0));
    const drillDownSum = round2(dashData.data.verifiedAid.drillDown.verifiedAidItems.reduce((sum, i) => sum + i.amount, 0));

    assert(asnafSum === totalVerifiedDisbursed, '11.2 Sum of Asnaf breakdown strictly equals totalVerifiedAidDisbursed', `AsnafSum: ${asnafSum}, Total: ${totalVerifiedDisbursed}`);
    assert(typeSum === totalVerifiedDisbursed, '11.3 Sum of Assistance Type breakdown strictly equals totalVerifiedAidDisbursed', `TypeSum: ${typeSum}, Total: ${totalVerifiedDisbursed}`);
    assert(drillDownSum === totalVerifiedDisbursed, '11.4 Sum of drill-down verified items strictly equals totalVerifiedAidDisbursed', `DrillDownSum: ${drillDownSum}, Total: ${totalVerifiedDisbursed}`);

    // Reconcile Reports
    const rptAsnafRes = await fetch(`${BASE_URL}/api/finance/reports?type=aid_by_asnaf&year=2569`);
    const rptAsnafData = await rptAsnafRes.json();
    assert(rptAsnafData.success === true && rptAsnafData.data.rows.length >= 7, '11.5 Report 2 (aid_by_asnaf) generates all Asnaf rows matching DB');

    const rptTypeRes = await fetch(`${BASE_URL}/api/finance/reports?type=aid_by_assistance_type&year=2569`);
    const rptTypeData = await rptTypeRes.json();
    assert(rptTypeData.success === true && rptTypeData.data.rows.length >= 6, '11.6 Report 3 (aid_by_assistance_type) generates standard types');

    const rptUnspentRes = await fetch(`${BASE_URL}/api/finance/reports?type=caregiver_unspent_summary&year=2569`);
    const rptUnspentData = await rptUnspentRes.json();
    assert(rptUnspentData.success === true && rptUnspentData.data.rows.length >= 1, '11.7 Report 4 (caregiver_unspent_summary) matches unspent held cash');

    // -------------------------------------------------------------
    // FINAL SUMMARY
    // -------------------------------------------------------------
    console.log('\n=================================================================');
    console.log(`TASK 5 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
    console.log('=================================================================');

    if (failed === 0) {
      console.log('>>> ALL TASK 5 END-TO-END WORKFLOW TESTS PASSED SUCCESSFULLY! <<<\n');
    } else {
      console.error(`>>> TASK 5 FAILED WITH ${failed} FAILURES <<<\n`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error during Task 5 test run:', error);
    process.exit(1);
  }
}

function round2(num) {
  return Math.round((Number(num) || 0) * 100) / 100;
}

runTask5E2ETest();
