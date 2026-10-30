import { createClient } from '@libsql/client';

const client = createClient({ url: 'file:data/zms.db' });

async function run() {
  console.log('--- TASK 2 COMPREHENSIVE AUTOMATED TEST SUITE ---');
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
    const officerId = 'u-test-officer-' + timestamp;
    const officerName = 'นายอุสมาน เจ้าหน้าที่เคส';
    const otherOfficerId = 'u-test-unauth-' + timestamp;
    const otherOfficerName = 'นางสาวอาอีชะห์ ผู้ดูแลอื่น';

    // Fetch a valid household_id
    const hhRes = await client.execute('SELECT id FROM households LIMIT 1');
    const householdId = String(hhRes.rows[0].id);

    // 1. Setup Test Beneficiaries
    const benId1 = `ben-t2-1-${timestamp}`;
    const benId2 = `ben-t2-2-${timestamp}`;
    const benId3 = `ben-t2-3-${timestamp}`;

    await client.execute({
      sql: `INSERT INTO beneficiaries (id, household_id, full_name, national_id, phone, asnaf_category, registration_no)
            VALUES (?, ?, 'นายรอซี มะแซ', ?, '0812345671', 'fakir', ?)`,
      args: [benId1, householdId, `19401${timestamp.toString().slice(-8)}1`, `REG-2569-0811`],
    });

    await client.execute({
      sql: `INSERT INTO beneficiaries (id, household_id, full_name, national_id, phone, asnaf_category, registration_no)
            VALUES (?, ?, 'นางมีนะห์ สาและ', ?, '0812345672', 'miskin', ?)`,
      args: [benId2, householdId, `19401${timestamp.toString().slice(-8)}2`, `REG-2569-0812`],
    });

    await client.execute({
      sql: `INSERT INTO beneficiaries (id, household_id, full_name, national_id, phone, asnaf_category, registration_no)
            VALUES (?, ?, 'นายอับดุลเลาะ ยูโซ๊ะ', ?, '0812345673', 'gharimin', ?)`,
      args: [benId3, householdId, `19401${timestamp.toString().slice(-8)}3`, `REG-2569-0813`],
    });

    // 2. Setup Test Applications
    const appIdFull = `app-full-${timestamp}`;
    const appIdPart = `app-part-${timestamp}`;
    const appIdNone = `app-none-${timestamp}`;

    await client.execute({
      sql: `INSERT INTO assistance_applications (
              id, application_no, beneficiary_id, asnaf_category, requested_amount, approved_amount, 
              disbursed_amount, status, assigned_officer_id, assigned_officer_name, applied_date, assistance_type
            ) VALUES (?, ?, ?, 'fakir', 20000, 20000, 0, 'wait_disbursement', ?, ?, '22 ต.ค. 2569', 'เงินสงเคราะห์เพื่อการยังชีพ')`,
      args: [appIdFull, `APP-T2-FULL-${timestamp.toString().slice(-4)}`, benId1, officerId, officerName],
    });

    await client.execute({
      sql: `INSERT INTO assistance_applications (
              id, application_no, beneficiary_id, asnaf_category, requested_amount, approved_amount, 
              disbursed_amount, status, assigned_officer_id, assigned_officer_name, applied_date, assistance_type
            ) VALUES (?, ?, ?, 'miskin', 30000, 30000, 0, 'wait_disbursement', ?, ?, '22 ต.ค. 2569', 'ทุนประกอบอาชีพ')`,
      args: [appIdPart, `APP-T2-PART-${timestamp.toString().slice(-4)}`, benId2, officerId, officerName],
    });

    await client.execute({
      sql: `INSERT INTO assistance_applications (
              id, application_no, beneficiary_id, asnaf_category, requested_amount, approved_amount, 
              disbursed_amount, status, assigned_officer_id, assigned_officer_name, applied_date, assistance_type
            ) VALUES (?, ?, ?, 'gharimin', 15000, 15000, 0, 'approved', ?, ?, '22 ต.ค. 2569', 'ช่วยเหลือผู้มีหนี้สิน')`,
      args: [appIdNone, `APP-T2-NONE-${timestamp.toString().slice(-4)}`, benId3, officerId, officerName],
    });

    // 3. Setup Withdrawals & Items for Full and Part
    const wIdFull = `cw-full-${timestamp}`;
    const vNoFull = `91/${timestamp.toString().slice(-4)}`;
    await client.execute({
      sql: `INSERT INTO cash_flow_withdrawals (
              id, workflow_id, withdrawal_no, amount, withdrawal_datetime, target_asnaf, purpose, 
              status, handover_status, total_handed_over_amount, remaining_handover_amount, recipient_case_worker_name, recipient_case_worker_id
            ) VALUES (?, 'cfw-demo-active-2569', ?, 20000, '2026-10-22 10:00:00', 'fakir', 'เบิกเงินสดสงเคราะห์ยังชีพ',
                      'disbursed', 'fully_handed_over', 20000, 0, ?, ?)`,
      args: [wIdFull, vNoFull, officerName, officerId],
    });

    await client.execute({
      sql: `INSERT INTO cash_flow_disbursement_items (
              id, withdrawal_id, workflow_id, application_id, beneficiary_id, beneficiary_name, 
              national_id, asnaf_category, assistance_type, approved_amount, this_disbursement_amount, remaining_balance, status
            ) VALUES (?, ?, 'cfw-demo-active-2569', ?, ?, 'นายรอซี มะแซ', '1940100000001', 'fakir', 'เงินสงเคราะห์เพื่อการยังชีพ', 20000, 20000, 0, 'confirmed')`,
      args: [`di-full-${timestamp}`, wIdFull, appIdFull, benId1],
    });

    await client.execute({
      sql: `INSERT INTO finance_handover_records (
              id, withdrawal_id, workflow_id, handover_no, handover_date, handover_time,
              handed_over_by_id, handed_over_by_name, received_by_id, received_by_name,
              amount, handover_method, proof_url, proof_name, status, recorded_by_id, recorded_by_name,
              confirmed_by_id, confirmed_by_name, confirmed_at
            ) VALUES (?, ?, 'cfw-demo-active-2569', ?, '2026-10-22', '10:30:00',
                      'u-fin-1', 'เจ้าหน้าที่ฝ่ายการเงิน', ?, ?,
                      20000, 'cash', 'https://zms.org/proof-full-handover.pdf', 'ใบส่งมอบเงินสด-full.pdf',
                      'fully_handed_over', 'u-fin-1', 'เจ้าหน้าที่ฝ่ายการเงิน', 'u-fin-1', 'เจ้าหน้าที่ฝ่ายการเงิน', '2026-10-22 10:30:00')`,
      args: [`fhr-full-${timestamp}`, wIdFull, `HO-FULL-${timestamp.toString().slice(-4)}`, officerId, officerName],
    });

    // Partial Handover Setup (30,000 withdrawn, 12,000 handed over)
    const wIdPart = `cw-part-${timestamp}`;
    const vNoPart = `92/${timestamp.toString().slice(-4)}`;
    await client.execute({
      sql: `INSERT INTO cash_flow_withdrawals (
              id, workflow_id, withdrawal_no, amount, withdrawal_datetime, target_asnaf, purpose, 
              status, handover_status, total_handed_over_amount, remaining_handover_amount, recipient_case_worker_name, recipient_case_worker_id
            ) VALUES (?, 'cfw-demo-active-2569', ?, 30000, '2026-10-22 11:00:00', 'miskin', 'เบิกเงินสดทุนประกอบอาชีพ',
                      'disbursed', 'partially_handed_over', 12000, 18000, ?, ?)`,
      args: [wIdPart, vNoPart, officerName, officerId],
    });

    await client.execute({
      sql: `INSERT INTO cash_flow_disbursement_items (
              id, withdrawal_id, workflow_id, application_id, beneficiary_id, beneficiary_name, 
              national_id, asnaf_category, assistance_type, approved_amount, this_disbursement_amount, remaining_balance, status
            ) VALUES (?, ?, 'cfw-demo-active-2569', ?, ?, 'นางมีนะห์ สาและ', '1940100000002', 'miskin', 'ทุนประกอบอาชีพ', 30000, 30000, 0, 'confirmed')`,
      args: [`di-part-${timestamp}`, wIdPart, appIdPart, benId2],
    });

    await client.execute({
      sql: `INSERT INTO finance_handover_records (
              id, withdrawal_id, workflow_id, handover_no, handover_date, handover_time,
              handed_over_by_id, handed_over_by_name, received_by_id, received_by_name,
              amount, handover_method, proof_url, proof_name, status, recorded_by_id, recorded_by_name,
              confirmed_by_id, confirmed_by_name, confirmed_at
            ) VALUES (?, ?, 'cfw-demo-active-2569', ?, '2026-10-22', '11:30:00',
                      'u-fin-1', 'เจ้าหน้าที่ฝ่ายการเงิน', ?, ?,
                      12000, 'cash', 'https://zms.org/proof-part-handover.pdf', 'ใบส่งมอบเงินสด-part.pdf',
                      'partially_handed_over', 'u-fin-1', 'เจ้าหน้าที่ฝ่ายการเงิน', 'u-fin-1', 'เจ้าหน้าที่ฝ่ายการเงิน', '2026-10-22 11:30:00')`,
      args: [`fhr-part-${timestamp}`, wIdPart, `HO-PART-${timestamp.toString().slice(-4)}`, officerId, officerName],
    });

    console.log('\n--- TEST CASE 1: FULL HANDOVER LINKAGE (ส่งมอบครบแล้ว) ---');
    // Fetch directly via API endpoint
    const resFull = await fetch(`http://localhost:3000/api/finance/assistance-link?applicationId=${appIdFull}&actorId=${officerId}&actorName=${encodeURIComponent(officerName)}&actorRole=officer`);
    const jsonFull = await resFull.json();

    assert(resFull.status === 200, 'API returns HTTP 200 for authorized caseworker');
    assert(jsonFull.success === true, 'Response success is true');
    const dFull = jsonFull.data;
    assert(dFull.applicationNo.includes('APP-T2-FULL'), '1. เลขที่คำร้องช่วยเหลือ ถูกต้อง');
    assert(dFull.registrationNo === 'REG-2569-0811', '2. รหัสทะเบียนผู้มีสิทธิ์รับซะกาต ถูกต้อง');
    assert(dFull.beneficiaryName === 'นายรอซี มะแซ', '3. ชื่อผู้รับความช่วยเหลือ ถูกต้อง');
    assert(dFull.asnafCategory === 'fakir', '4. อัสนัฟ ถูกต้อง');
    assert(dFull.assistanceType === 'เงินสงเคราะห์เพื่อการยังชีพ', '5. ประเภทการช่วยเหลือ ถูกต้อง');
    assert(dFull.approvedAmount === 20000, '6. ยอดอนุมัติ 20,000 บาท');
    assert(dFull.withdrawnAmount === 20000, '7. ยอดเบิกเงินสด 20,000 บาท');
    assert(dFull.handedOverAmount === 20000, '8. ยอดที่ฝ่ายการเงินส่งมอบแล้ว 20,000 บาท');
    assert(dFull.receivedAmount === 20000, '9. ยอดที่ผู้ดูแลรับจริง 20,000 บาท');
    assert(dFull.disbursedAmount === 0, '10. ยอดช่วยเหลือจริงยังเป็น 0 (ไม่ถูกบวกอัตโนมัติ)');
    assert(dFull.remainingBalance === 20000, '11. ยอดคงเหลือ 20,000 บาท');
    assert(dFull.withdrawalNo === vNoFull, '12. เลขที่ใบสำคัญการเบิกจ่าย ถูกต้อง');
    assert(dFull.handoverDatetime === '2026-10-22 10:30:00', '13. วันเวลาส่งมอบ ถูกต้อง');
    assert(dFull.proofUrl === 'https://zms.org/proof-full-handover.pdf', '13. หลักฐานการส่งมอบ ถูกต้อง');
    assert(dFull.financeStatus === 'fully_handed_over', 'สถานะการเงิน: ส่งมอบครบแล้ว');
    assert(dFull.financeStatusLabel === 'ส่งมอบครบแล้ว', 'ป้ายสถานะการเงิน: ส่งมอบครบแล้ว');
    assert(dFull.assistanceStatus === 'in_progress', 'สถานะการช่วยเหลือ: กำลังดำเนินการ (ผู้ดูแลมีเงินสดพร้อมลงพื้นที่)');

    console.log('\n--- TEST CASE 2: PARTIAL HANDOVER (ส่งมอบบางส่วน) ---');
    const resPart = await fetch(`http://localhost:3000/api/finance/assistance-link?applicationId=${appIdPart}&actorId=${officerId}&actorName=${encodeURIComponent(officerName)}&actorRole=officer`);
    const jsonPart = await resPart.json();

    assert(resPart.status === 200, 'API returns HTTP 200 for partial handover');
    const dPart = jsonPart.data;
    assert(dPart.approvedAmount === 30000, 'ยอดอนุมัติ 30,000 บาท');
    assert(dPart.withdrawnAmount === 30000, 'ยอดเบิกเงินสด 30,000 บาท');
    assert(dPart.handedOverAmount === 12000, 'ยอดส่งมอบแล้ว 12,000 บาท');
    assert(dPart.receivedAmount === 12000, 'ยอดที่ผู้ดูแลรับจริง 12,000 บาท');
    assert(dPart.financeStatus === 'partially_handed_over', 'สถานะการเงิน: ส่งมอบบางส่วน');
    assert(dPart.financeStatusLabel === 'ส่งมอบบางส่วน', 'ป้ายสถานะการเงิน: ส่งมอบบางส่วน');
    assert(dPart.withdrawalNo === vNoPart, 'เลขที่ใบสำคัญตรงกับ 92/xxxx');

    console.log('\n--- TEST CASE 3: NO HANDOVER FOUND (ไม่พบรายการส่งมอบ) ---');
    const resNone = await fetch(`http://localhost:3000/api/finance/assistance-link?applicationId=${appIdNone}&actorId=${officerId}&actorName=${encodeURIComponent(officerName)}&actorRole=officer`);
    const jsonNone = await resNone.json();

    assert(resNone.status === 200, 'API returns HTTP 200 for no handover found');
    const dNone = jsonNone.data;
    assert(dNone.handedOverAmount === 0, 'ยอดส่งมอบเป็น 0 บาท');
    assert(dNone.receivedAmount === 0, 'ยอดรับจริงเป็น 0 บาท');
    assert(dNone.disbursedAmount === 0, 'ยอดช่วยเหลือจริงเป็น 0 บาท');
    assert(dNone.remainingBalance === 15000, 'ยอดคงเหลือคงเดิม 15,000 บาท');
    assert(dNone.financeStatus === 'not_handed_over', 'สถานะการเงิน: ยังไม่ส่งมอบ');
    assert(dNone.financeStatusLabel === 'ยังไม่ส่งมอบ', 'ป้ายสถานะการเงิน: ยังไม่ส่งมอบ');
    assert(dNone.assistanceStatus === 'not_started', 'สถานะการช่วยเหลือ: ยังไม่เริ่ม');
    assert(dNone.assistanceStatusLabel === 'ยังไม่เริ่ม', 'ป้ายสถานะการช่วยเหลือ: ยังไม่เริ่ม');

    console.log('\n--- TEST CASE 4: UNAUTHORIZED ACCESS REJECTION (ผู้ดูแลไม่มีสิทธิ์เข้าถึง) ---');
    const resUnauth = await fetch(`http://localhost:3000/api/finance/assistance-link?applicationId=${appIdFull}&actorId=${otherOfficerId}&actorName=${encodeURIComponent(otherOfficerName)}&actorRole=officer`);
    const jsonUnauth = await resUnauth.json();

    assert(resUnauth.status === 403, 'ปฏิเสธคำขอด้วย HTTP 403 Forbidden เมื่อผู้ดูแลไม่มีสิทธิ์');
    assert(jsonUnauth.success === false, 'jsonUnauth.success is false');
    assert(jsonUnauth.error.includes('ไม่อนุญาต') && jsonUnauth.error.includes('ไม่ใช่ผู้ดูแลเคสที่ได้รับมอบหมาย'), 'แจ้งเตือนข้อผิดพลาดเรื่องการตรวจสอบสิทธิ์อย่างถูกต้อง');

    // Admin should have universal access
    const resAdmin = await fetch(`http://localhost:3000/api/finance/assistance-link?applicationId=${appIdFull}&actorId=u-admin&actorName=Admin&actorRole=super_admin`);
    assert(resAdmin.status === 200, 'Super Admin สามารถเข้าถึงได้ตามหลัก Segregation of Duties');

    console.log('\n--- TEST CASE 5: DISCREPANCY REPORTING WITHOUT ALTERING FINANCE TRANSACTIONS ---');
    const resDisc = await fetch('http://localhost:3000/api/finance/assistance-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'discrepancy',
        applicationId: appIdFull,
        withdrawalId: wIdFull,
        category: 'amount_mismatch',
        expectedAmount: 20000,
        actualAmount: 18000,
        notes: 'ตรวจนับซองเงินสดพบว่ามีเงิน 18,000 บาท ขาดไป 2,000 บาท',
        actor: {
          id: officerId,
          name: officerName,
          role: 'officer',
        },
      }),
    });
    const jsonDisc = await resDisc.json();
    assert(resDisc.status === 200, 'บันทึกรายงานปัญหาสำเร็จ HTTP 200');
    assert(jsonDisc.success === true, 'jsonDisc.success is true');
    assert(jsonDisc.data.discrepancyId.startsWith('discrepancy-'), 'สร้างรหัสอ้างอิง Discrepancy เรียบร้อย');

    // Check application details after discrepancy
    const resAfterDisc = await fetch(`http://localhost:3000/api/finance/assistance-link?applicationId=${appIdFull}&actorId=${officerId}&actorName=${encodeURIComponent(officerName)}&actorRole=officer`);
    const dAfterDisc = (await resAfterDisc.json()).data;
    assert(dAfterDisc.discrepancies.length === 1, 'พบรายการ Discrepancy ในระบบ 1 รายการ');
    assert(dAfterDisc.receivedAmount === 18000, 'ยอดรับจริงแสดง 18,000 บาทตามการรายงานปัญหา');
    assert(dAfterDisc.handedOverAmount === 20000, 'ยอดที่ฝ่ายการเงินส่งมอบยังคงเป็น 20,000 บาท (ไม่ถูกดัดแปลง)');

    // Verify raw DB finance record was NOT altered
    const dbVoucher = (await client.execute({ sql: 'SELECT amount, total_handed_over_amount FROM cash_flow_withdrawals WHERE id = ?', args: [wIdFull] })).rows[0];
    assert(Number(dbVoucher.amount) === 20000, 'ยอดเงินในใบสำคัญของฝ่ายการเงินไม่ถูกแก้ไข (คงเดิม 20,000 บาท)');

    console.log('\n--- TEST CASE 6: RECORD ACTUAL AID DISBURSEMENT (ส่งมอบจริงแก่ผู้รับซะกาต) ---');
    const resDisb = await fetch('http://localhost:3000/api/finance/assistance-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'disburse',
        applicationId: appIdFull,
        input: {
          actualAmount: 18000,
          receiptProofUrl: 'https://zms.org/beneficiary-received-18000.jpg',
          receiptProofName: 'ใบสำคัญรับเงินผู้รับซะกาต.jpg',
          notes: 'ส่งมอบเงินสดช่วยเหลือ 18,000 บาทถึงมือผู้มีสิทธิ์รับซะกาตเรียบร้อย',
        },
        actor: {
          id: officerId,
          name: officerName,
          role: 'officer',
        },
      }),
    });
    const jsonDisb = await resDisb.json();
    assert(resDisb.status === 200, 'บันทึกการส่งมอบจริงสำเร็จ HTTP 200');
    assert(jsonDisb.success === true, 'jsonDisb.success is true');

    const resAfterDisb = await fetch(`http://localhost:3000/api/finance/assistance-link?applicationId=${appIdFull}&actorId=${officerId}&actorName=${encodeURIComponent(officerName)}&actorRole=officer`);
    const dAfterDisb = (await resAfterDisb.json()).data;
    assert(dAfterDisb.disbursedAmount === 18000, 'ยอดช่วยเหลือจริงกลายเป็น 18,000 บาท');
    assert(dAfterDisb.remainingBalance === 2000, 'ยอดคงเหลือคำนวณถูกต้อง: 20,000 - 18,000 = 2,000 บาท');

    console.log('\n--- TEST CASE 7: IDEMPOTENCY & ZERO DUPLICATES ON INSPECTION ---');
    const beforeCount = (await client.execute('SELECT COUNT(*) as c FROM assistance_applications')).rows[0].c;
    // Inspect 5 times
    for (let i = 0; i < 5; i++) {
      await fetch(`http://localhost:3000/api/finance/assistance-link?applicationId=${appIdFull}&actorId=${officerId}&actorName=${encodeURIComponent(officerName)}&actorRole=officer`);
    }
    const afterCount = (await client.execute('SELECT COUNT(*) as c FROM assistance_applications')).rows[0].c;
    assert(beforeCount === afterCount, 'การเปิดดูข้อมูลการเงินไม่สร้างบันทึกคำร้องช่วยเหลือใหม่ซ้ำซ้อน (Idempotent GET)');

    console.log(`\n=================================================`);
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
    console.log(`=================================================`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

run();
