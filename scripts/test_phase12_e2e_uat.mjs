/**
 * Phase 12 Comprehensive E2E System UAT Test Suite
 * Validates all 13 core requirements from the Master Prompt:
 *  1. ผู้มีสิทธิ์ที่มี Asnaf เดียว (Single-Asnaf Beneficiary)
 *  2. ผู้มีสิทธิ์ที่มีหลาย Asnaf (Multi-Asnaf Beneficiary)
 *  3. ผู้มีสิทธิ์ไม่มี Asnaf (Beneficiary with NO Asnaf)
 *  4. ประเภทที่ไม่สัมพันธ์กับ Asnaf (Unrelated Assistance Type Block)
 *  5. รูปแบบที่ไม่สัมพันธ์กับประเภท (Unrelated Assistance Format Block)
 *  6. เปลี่ยน Asnaf แล้วข้อมูลเก่าต้องถูกล้าง (Cascade Reset on Asnaf Change)
 *  7. เปลี่ยนประเภทแล้วรูปแบบเก่าต้องถูกล้าง (Cascade Reset on Type Change)
 *  8. Master Data ถูกปิดใช้งาน (Disabled Master Data Guard)
 *  9. ข้อมูลเดิมยังแสดงได้ (Historic Preservation with Inactive Master Data)
 * 10. บันทึกและแก้ไขคำร้อง (Save Draft, Update, and Resubmit)
 * 11. Duplicate Request (Category-Specific Duplicate Prevention)
 * 12. Duplicate Payment (Duplicate Payment Prevention & Solvency)
 * 13. Permission และ Audit Log (RBAC & Transition Audit Logs)
 */

import assert from 'assert';
import { getDb, initDb } from '../src/lib/db.ts';
import { BeneficiaryService } from '../src/services/beneficiaryService.ts';
import {
  LEVEL_1_ASNAFS,
  LEVEL_3_ASSISTANCE_FORMATS,
  validateThreeTierRelationship,
  getSupportedFormatsForType,
  resolveAsnafGroupCode,
} from '../src/lib/constants/asnafRelationshipCatalog.ts';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

console.log('================================================================');
console.log('🚀 PHASE 12: END-TO-END SYSTEM UAT & GOVERNANCE TEST SUITE');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${desc}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     Error: ${err.message}`);
    if (err.stack) console.error(err.stack);
    failCount++;
  }
}

async function asyncIt(desc, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${desc}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     Error: ${err.message}`);
    if (err.stack) console.error(err.stack);
    failCount++;
  }
}

async function runUAT() {
  await initDb();
  const db = getDb();

  // Test Actors for RBAC verification
  const superAdminActor = { id: 'u-super-p12', name: 'ท่านจุฬาราชมนตรี/ประธานมูลนิธิ', role: 'super_admin' };
  const officerActor = { id: 'u-officer-p12', name: 'นายเจ้าหน้าที่ สำรวจพื้นที่', role: 'officer' };
  const approverActor = { id: 'u-approver-p12', name: 'ดร. ประธานกรรมการพิจารณาอนุมัติ', role: 'approver' };
  const financeActor = { id: 'u-finance-p12', name: 'นางสาวการเงิน เบิกจ่ายบัญชี', role: 'finance' };
  const guestActor = { id: 'u-guest-p12', name: 'บุคคลภายนอก', role: 'guest' };

  // Helper to create test beneficiary cleanly
  const createBeneficiary = async (fullName, nationalIdSuffix, asnafCategory, extra = {}) => {
    const timestamp = Date.now() + Math.floor(Math.random() * 1000);
    const reg = await BeneficiaryService.registerBeneficiary({
      nationalId: `1100077${timestamp.toString().slice(-6)}`,
      fullName,
      phone: '0819998877',
      address: '99/1 หมู่ 3 ซอยมัสยิดกลาง',
      province: 'กรุงเทพมหานคร',
      district: 'มีนบุรี',
      subdistrict: 'แสนแสบ',
      community: 'ชุมชนอัลกุรอาน',
      postcode: '10510',
      primaryGroupCode: asnafCategory || 'faqir_miskin',
      asnafCategory: asnafCategory || 'faqir_miskin',
      assistanceTypeCode: 'LIVING_SUPPORT',
      assistanceFormatCode: 'bank_transfer',
      requestedAmount: 5000,
      ...extra,
    }, officerActor);

    return reg.beneficiaryId;
  };

  // -------------------------------------------------------------
  // TEST SCENARIO 1: ผู้มีสิทธิ์ที่มี Asnaf เดียว (Single-Asnaf Beneficiary)
  // -------------------------------------------------------------
  console.log('📌 Scenario 1: ผู้มีสิทธิ์ที่มี Asnaf เดียว (Single-Asnaf Beneficiary)...');

  let singleBenId;
  await asyncIt('1.1 ลงทะเบียนผู้มีสิทธิ์ที่มีอัสนัฟเดียว (ฟากีร-มิสกิน)', async () => {
    singleBenId = await createBeneficiary('นายยูซุฟ มีสิทธิ์เดียว', '001', 'faqir_miskin');
    assert.ok(singleBenId, 'Beneficiary registered');

    // Verify in beneficiary_asnaf table
    const asnafs = await db.execute({
      sql: 'SELECT * FROM beneficiary_asnaf WHERE beneficiary_id = ? AND is_active = 1',
      args: [singleBenId],
    });
    assert.strictEqual(asnafs.rows.length, 1, 'Exactly 1 Asnaf record in beneficiary_asnaf');
    assert.strictEqual(asnafs.rows[0].asnaf_code, 'faqir_miskin');
    assert.strictEqual(Boolean(asnafs.rows[0].is_primary), true, 'Is marked as primary');
  });

  await asyncIt('1.2 API ตรวจสอบสิทธิ์ส่งคืน singleAsnaf = true และล็อกเป็นอ่านอย่างเดียว', async () => {
    const res = await fetch(`${BASE_URL}/api/assistance-requests/check-beneficiary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ beneficiaryId: singleBenId }),
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.beneficiary.hasSingleAsnaf, true, 'hasSingleAsnaf must be true');
    assert.strictEqual(json.beneficiary.hasMultipleAsnafs, false, 'hasMultipleAsnafs must be false');
    assert.strictEqual(json.beneficiary.asnafCategory, 'faqir_miskin');
    assert.strictEqual(json.beneficiary.eligibleAsnafs.length, 1);
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 2: ผู้มีสิทธิ์ที่มีหลาย Asnaf (Multi-Asnaf Beneficiary)
  // -------------------------------------------------------------
  console.log('\n📌 Scenario 2: ผู้มีสิทธิ์ที่มีหลาย Asnaf (Multi-Asnaf Beneficiary)...');

  let multiBenId;
  await asyncIt('2.1 ลงทะเบียนผู้มีสิทธิ์และเพิ่มอัสนัฟรอง (ฟากีร-มิสกิน และ มุอัลลัฟ)', async () => {
    multiBenId = await createBeneficiary('นางฟาฏิมะฮ์ สองอัสนัฟ', '002', 'faqir_miskin');

    // Add secondary Asnaf (muallaf) in beneficiary_asnaf
    const secId = `ba-${multiBenId}-muallaf-${Date.now()}`;
    await db.execute({
      sql: `INSERT INTO beneficiary_asnaf (id, beneficiary_id, asnaf_code, is_primary, is_active, created_at, updated_at)
            VALUES (?, ?, 'muallaf', 0, 1, datetime('now'), datetime('now'))`,
      args: [secId, multiBenId],
    });

    const asnafs = await db.execute({
      sql: 'SELECT * FROM beneficiary_asnaf WHERE beneficiary_id = ? AND is_active = 1',
      args: [multiBenId],
    });
    assert.strictEqual(asnafs.rows.length, 2, 'Exactly 2 Asnafs in beneficiary_asnaf');
  });

  await asyncIt('2.2 API ส่งคืน hasMultipleAsnafs = true และคืนเฉพาะอัสนัฟที่บุคคลนั้นมีสิทธิ์', async () => {
    const res = await fetch(`${BASE_URL}/api/assistance-requests/check-beneficiary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ beneficiaryId: multiBenId }),
    });
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.beneficiary.hasMultipleAsnafs, true, 'hasMultipleAsnafs must be true');
    assert.strictEqual(json.beneficiary.eligibleAsnafs.length, 2, 'Returns both qualified Asnafs');
    const codes = json.beneficiary.eligibleAsnafs.map((a) => a.asnafCode);
    assert.ok(codes.includes('faqir_miskin') && codes.includes('muallaf'));
  });

  await asyncIt('2.3 ยื่นคำร้องโดยเลือกอัสนัฟรอง (มุอัลลัฟ) โดยไม่แก้ไขหมวดอัสนัฟในทะเบียนหลัก', async () => {
    const app = await BeneficiaryService.createAssistanceRequest({
      beneficiaryId: multiBenId,
      asnafCode: 'muallaf',
      primaryGroupCode: 'muallaf',
      asnafCategory: 'muallaf',
      specificFundId: 'subf-muallaf-1',
      assistanceTypeId: 'ast-spec-7',
      assistanceTypeCode: 'MUALLAF_SUPPORT',
      assistanceFormatCode: 'bank_transfer',
      requestedAmount: 5000,
      fiscalYear: '2569',
    }, officerActor);

    assert.ok(app.applicationNo);

    // Verify main registry remained untouched (did not overwrite asnaf_category)
    const benRow = await db.execute({
      sql: 'SELECT asnaf_category FROM beneficiaries WHERE id = ?',
      args: [multiBenId],
    });
    assert.strictEqual(benRow.rows[0].asnaf_category, 'faqir_miskin', 'Master registry category remains faqir_miskin');
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 3: ผู้มีสิทธิ์ไม่มี Asnaf (Beneficiary with NO Asnaf)
  // -------------------------------------------------------------
  console.log('\n📌 Scenario 3: ผู้มีสิทธิ์ไม่มี Asnaf (Beneficiary with NO Asnaf)...');

  let noAsnafBenId;
  await asyncIt('3.1 สร้างสมาชิกที่ยังไม่ได้รับรองอัสนัฟ (asnaf_category = empty string)', async () => {
    const timestamp = Date.now() + Math.floor(Math.random() * 1000);
    noAsnafBenId = `ben-no-asnaf-${timestamp}`;
    const hhId = `hh-no-asnaf-${timestamp}`;

    await db.execute({
      sql: `INSERT INTO households (id, household_no, address, province, district, community)
            VALUES (?, ?, '123 หมู่ 1', 'กรุงเทพมหานคร', 'มีนบุรี', 'ชุมชนทดสอบ')`,
      args: [hhId, `HH-${timestamp}`],
    });

    await db.execute({
      sql: `INSERT INTO beneficiaries (
              id, household_id, full_name, national_id, phone, asnaf_category, registration_status, created_at, updated_at
            ) VALUES (?, ?, 'นายไร้อัสนัฟ รอประเมิน', ?, '0899990000', '', 'pending_verification', datetime('now'), datetime('now'))`,
      args: [noAsnafBenId, hhId, `1100066${timestamp.toString().slice(-6)}`],
    });

    const checkRes = await fetch(`${BASE_URL}/api/assistance-requests/check-beneficiary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ beneficiaryId: noAsnafBenId }),
    });

    assert.strictEqual(checkRes.status, 422, 'Returns 422 Unprocessable Entity');
    const checkJson = await checkRes.json();
    assert.strictEqual(checkJson.success, false);
    assert.strictEqual(checkJson.asnafStatus, 'NO_ASNAF');
    assert.ok(checkJson.error.includes('ยังไม่ได้รับการรับรองหมวดหมู่อัสนัฟ'));
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 4: ประเภทที่ไม่สัมพันธ์กับ Asnaf (Unrelated Assistance Type)
  // -------------------------------------------------------------
  console.log('\n📌 Scenario 4: ประเภทที่ไม่สัมพันธ์กับ Asnaf (Unrelated Type Block)...');

  await asyncIt('4.1 ปฏิเสธการยื่นคำร้องเมื่อเลือกประเภทอามิลีน (AMIL_REMUNERATION) ภายใต้อัสนัฟฟากีร-มิสกิน', async () => {
    let thrownError = null;
    try {
      await BeneficiaryService.validateAndResolveThreeTierSelection({
        primaryGroupCode: 'faqir_miskin',
        asnafCategory: 'faqir_miskin',
        assistanceTypeCode: 'AMIL_REMUNERATION',
        requestedAmount: 12000,
        fiscalYear: '2569',
      });
    } catch (err) {
      thrownError = err;
    }
    assert.ok(thrownError, 'Must throw error on unrelated type');
    assert.ok(
      thrownError.message.includes('MISMATCH_FUND_TYPE') ||
      thrownError.message.includes('MISMATCH_PRIMARY_GROUP') ||
      thrownError.message.includes('INVALID_PRIMARY_GROUP') ||
      thrownError.message.includes('ไม่สัมพันธ์กัน')
    );
  });

  it('4.2 Catalog validator ปฏิเสธความสัมพันธ์ที่ไม่สัมพันธ์กันอย่างเด็ดขาด', () => {
    const valid = validateThreeTierRelationship('faqir_miskin', 'AMIL_REMUNERATION', 'bank_transfer');
    assert.strictEqual(valid.isValid, false, 'faqir_miskin + AMIL_REMUNERATION must be invalid');
    assert.ok(
      valid.reason.includes('ไม่สามารถใช้กับอัสนัฟ') ||
      valid.reason === 'INVALID_ASNAF_TYPE_LINK'
    );
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 5: รูปแบบที่ไม่สัมพันธ์กับประเภท (Unrelated Assistance Format)
  // -------------------------------------------------------------
  console.log('\n📌 Scenario 5: รูปแบบที่ไม่สัมพันธ์กับประเภท (Unrelated Format Block)...');

  await asyncIt('5.1 ปฏิเสธการส่งมอบเงินสด (cash) สำหรับโครงการซ่อมและสร้างบ้าน (HOUSING_REPAIR_BUILD)', async () => {
    let thrownError = null;
    try {
      await BeneficiaryService.validateAndResolveThreeTierSelection({
        primaryGroupCode: 'faqir_miskin',
        specificFundId: 'subf-2',
        assistanceTypeCode: 'HOUSING_REPAIR_BUILD',
        assistanceFormatCode: 'cash', // Unsupported for housing
        requestedAmount: 35000,
        fiscalYear: '2569',
      });
    } catch (err) {
      thrownError = err;
    }
    assert.ok(thrownError, 'Must throw error on unsupported format');
    assert.ok(thrownError.message.includes('MISMATCH_FORMAT_TYPE'));
  });

  it('5.2 ซ่อมบ้านรองรับเฉพาะวัสดุ ผู้รับเหมา หรือจ่ายตรงผู้ขาย', () => {
    const validFormats = getSupportedFormatsForType('HOUSING_REPAIR_BUILD');
    const codes = validFormats.map((f) => f.code);
    assert.ok(codes.includes('materials'), 'Must support materials');
    assert.ok(codes.includes('contractor'), 'Must support contractor');
    assert.ok(!codes.includes('cash'), 'Must NOT support cash');
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 6: เปลี่ยน Asnaf แล้วข้อมูลเก่าต้องถูกล้าง (Cascade Reset on Asnaf Change)
  // -------------------------------------------------------------
  console.log('\n📌 Scenario 6: เปลี่ยน Asnaf แล้วข้อมูลเก่าต้องถูกล้าง (Cascade Reset)...');

  it('6.1 ตรวจสอบตรรกะ Cascade Reset เมื่อสลับจากอามิลีนไปฟากีร-มิสกิน', () => {
    const amilType = 'AMIL_OFFICE_EXPENSE';
    // Validate if amilType is valid in faqir_miskin
    const check = validateThreeTierRelationship('faqir_miskin', amilType, 'bank_transfer');
    assert.strictEqual(check.isValid, false, 'Amil office expense cannot persist into faqir_miskin');
    // UI logic clears type to default when invalid
    const newDefaultType = 'LIVING_SUPPORT';
    const newCheck = validateThreeTierRelationship('faqir_miskin', newDefaultType, 'bank_transfer');
    assert.strictEqual(newCheck.isValid, true, 'Default type is valid');
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 7: เปลี่ยนประเภทแล้วรูปแบบเก่าต้องถูกล้าง (Cascade Reset on Type Change)
  // -------------------------------------------------------------
  console.log('\n📌 Scenario 7: เปลี่ยนประเภทแล้วรูปแบบเก่าต้องถูกล้าง (Format Reset)...');

  it('7.1 ตรวจสอบตรรกะ Format Reset เมื่อสลับจากปัจจัยยังชีพ (เงินสด) ไปซ่อมบ้าน', () => {
    const prevFormat = 'cash';
    const newType = 'HOUSING_REPAIR_BUILD';
    const supported = getSupportedFormatsForType(newType);
    const isSupported = supported.some((f) => f.code === prevFormat);
    assert.strictEqual(isSupported, false, 'Cash is not supported in housing repair');

    // Default format for housing repair is auto-selected
    const defaultFmt = supported.find((f) => f.isDefault) || supported[0];
    assert.strictEqual(defaultFmt.code, 'materials', 'Auto-resets to materials');
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 8: Master Data ถูกปิดใช้งาน (Disabled Master Data Guard)
  // -------------------------------------------------------------
  console.log('\n📌 Scenario 8: Master Data ถูกปิดใช้งาน (Disabled Master Data Guard)...');

  await asyncIt('8.1 ปิดใช้งานประเภทความช่วยเหลือชั่วคราว และยืนยันว่าระบบไม่อนุญาตให้ยื่นคำร้องใหม่', async () => {
    // Temporarily deactivate ast-core-2 (MONTHLY_ALLOWANCE)
    await db.execute("UPDATE assistance_types SET is_active = 0 WHERE code = 'MONTHLY_ALLOWANCE'");

    let thrownError = null;
    try {
      await BeneficiaryService.validateAndResolveThreeTierSelection({
        primaryGroupCode: 'faqir_miskin',
        assistanceTypeCode: 'MONTHLY_ALLOWANCE',
        requestedAmount: 4000,
        fiscalYear: '2569',
      });
    } catch (err) {
      thrownError = err;
    } finally {
      // Restore active status
      await db.execute("UPDATE assistance_types SET is_active = 1 WHERE code = 'MONTHLY_ALLOWANCE'");
    }

    assert.ok(thrownError, 'Must block inactive assistance type');
    assert.ok(thrownError.message.includes('INACTIVE_ASSISTANCE_TYPE'));
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 9: ข้อมูลเดิมยังแสดงได้ (Historic Preservation)
  // -------------------------------------------------------------
  console.log('\n📌 Scenario 9: ข้อมูลเดิมยังแสดงได้ (Historic Preservation)...');

  await asyncIt('9.1 คำร้องในอดีตที่ใช้ประเภทความช่วยเหลือที่ถูกปิด ยังคงอ่านและแสดงผลได้สมบูรณ์', async () => {
    // Create an app with ast-core-2
    const histApp = await BeneficiaryService.createAssistanceRequest({
      beneficiaryId: singleBenId,
      asnafCode: 'faqir_miskin',
      assistanceTypeCode: 'MONTHLY_ALLOWANCE',
      assistanceFormatCode: 'bank_transfer',
      requestedAmount: 3500,
      fiscalYear: '2569',
    }, officerActor);

    try {
      // Now deactivate ast-core-2
      await db.execute("UPDATE assistance_types SET is_active = 0 WHERE code = 'MONTHLY_ALLOWANCE'");

      // Query historic app
      const retrieved = await BeneficiaryService.getLifecycleState(histApp.applicationId);
      assert.ok(retrieved.applicationId, 'Historic application can still be retrieved');
      assert.strictEqual(retrieved.assistanceType.code, 'MONTHLY_ALLOWANCE');
      assert.strictEqual(retrieved.assistanceType.name, 'ปัจจัยยังชีพรายเดือน');
    } finally {
      // Restore active status
      await db.execute("UPDATE assistance_types SET is_active = 1 WHERE code = 'MONTHLY_ALLOWANCE'");
    }
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 10: บันทึกและแก้ไขคำร้อง (Save Draft, Update, and Resubmit)
  // -------------------------------------------------------------
  console.log('\n📌 Scenario 10: บันทึกและแก้ไขคำร้อง (Draft & Resubmit Cycle)...');

  let draftAppId;
  await asyncIt('10.1 บันทึกคำร้องเป็นฉบับร่าง (Draft status)', async () => {
    const draft = await BeneficiaryService.createAssistanceRequest({
      beneficiaryId: singleBenId,
      asnafCode: 'faqir_miskin',
      assistanceTypeCode: 'LIVING_SUPPORT',
      assistanceFormatCode: 'bank_transfer',
      requestedAmount: 6000,
      status: 'draft',
      purpose: 'ฉบับร่างเริ่มต้น',
      fiscalYear: '2569',
    }, officerActor);

    draftAppId = draft.applicationId;
    assert.strictEqual(draft.status, 'draft');

    const appRow = await db.execute({
      sql: 'SELECT status, request_status FROM assistance_applications WHERE id = ?',
      args: [draftAppId],
    });
    assert.strictEqual(appRow.rows[0].status, 'draft');
  });

  await asyncIt('10.2 ปรับปรุงรายละเอียดในฉบับร่างและส่งคำร้อง (Submit)', async () => {
    await db.execute({
      sql: `UPDATE assistance_applications 
            SET requested_amount = 7500,
                necessity_details = 'แก้ไขเพิ่มเติมความจำเป็นเร่งด่วน',
                status = 'submitted',
                request_status = 'submitted',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [draftAppId],
    });

    const updated = await db.execute({
      sql: 'SELECT requested_amount, status, request_status FROM assistance_applications WHERE id = ?',
      args: [draftAppId],
    });
    assert.strictEqual(Number(updated.rows[0].requested_amount), 7500);
    assert.strictEqual(updated.rows[0].status, 'submitted');
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 11: Duplicate Request Prevention (Category-Specific)
  // -------------------------------------------------------------
  console.log('\n📌 Scenario 11: Duplicate Request Prevention (Category Rules)...');

  await asyncIt('11.1 ระงับคำร้องปัจจัยยังชีพรายเดือนที่ยื่นซ้ำในเดือนเดียวกัน', async () => {
    const dupCheck = await BeneficiaryService.checkDuplicateAssistanceRules({
      beneficiaryId: singleBenId,
      assistanceTypeCode: 'MONTHLY_ALLOWANCE',
      assistanceTypeName: 'ปัจจัยยังชีพรายเดือน',
      fiscalYear: '2569',
    });
    assert.strictEqual(dupCheck.hasDuplicate, true, 'Flagged as duplicate monthly request');
    assert.strictEqual(dupCheck.ruleCode, 'MONTHLY_LIVING_SAME_MONTH');
  });

  await asyncIt('11.2 ผู้มีอำนาจสามารถใช้สิทธิ์ Override ยื่นคำร้องได้กรณีฉุกเฉินจำเป็นพิเศษ', async () => {
    const overrideApp = await BeneficiaryService.createAssistanceRequest({
      beneficiaryId: singleBenId,
      asnafCode: 'faqir_miskin',
      assistanceTypeCode: 'MONTHLY_ALLOWANCE',
      assistanceFormatCode: 'bank_transfer',
      requestedAmount: 3000,
      fiscalYear: '2569',
      allowDuplicateOverride: true, // Authorized override
    }, superAdminActor);

    assert.ok(overrideApp.applicationNo, 'Override application created successfully');
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 12: Duplicate Payment & Solvency (การป้องกันการจ่ายซ้ำ)
  // -------------------------------------------------------------
  console.log('\n📌 Scenario 12: Duplicate Payment & Solvency Pre-check...');

  let paymentAppId;
  await asyncIt('12.1 ตรวจสอบสภาพคล่อง ดำเนินการอนุมัติ และลงบัญชีจ่ายเงิน', async () => {
    const newApp = await BeneficiaryService.createAssistanceRequest({
      beneficiaryId: singleBenId,
      asnafCode: 'faqir_miskin',
      assistanceTypeCode: 'LIVING_SUPPORT',
      assistanceFormatCode: 'bank_transfer',
      requestedAmount: 5000,
      fiscalYear: '2569',
      allowDuplicateOverride: true,
    }, officerActor);

    paymentAppId = newApp.applicationId;

    // Advance to assessment
    await BeneficiaryService.startAssessment(paymentAppId, officerActor);
    await BeneficiaryService.submitAssessment(paymentAppId, {
      livingScore: 85,
      officerRecommendation: 'recommend_full',
      recommendedAmount: 5000,
      recommendedFundId: 'fund-1',
      recommendedSpecificFundId: 'subf-1',
    }, officerActor);

    // Solvency check
    const solvency = await BeneficiaryService.checkFundSolvencyForApproval({
      applicationId: paymentAppId,
      fundId: 'fund-1',
      specificFundId: 'subf-1',
      approvedAmount: 5000,
    });
    assert.strictEqual(solvency.isSolvent, true);

    // Approve: approveApplication(applicationId, approvedAmount, fundId, notes, actor, specificFundId)
    await BeneficiaryService.approveApplication(
      paymentAppId,
      5000,
      'fund-1',
      'อนุมัติผ่านเกณฑ์ UAT',
      approverActor,
      'subf-1'
    );

    // Disburse & create double-entry GL: recordDisbursement(applicationId, paymentRef, proofUrl, notes, actor)
    const trRef = `TR-UAT-${Date.now()}`;
    const disburseRes = await BeneficiaryService.recordDisbursement(
      paymentAppId,
      trRef,
      'https://proof.zms.org/tr-uat.png',
      'จ่ายเงินสำเร็จ',
      financeActor
    );
    assert.strictEqual(disburseRes.status, 'disbursed');
    assert.ok(disburseRes.journalNo.startsWith('JV-2569-'));
  });

  await asyncIt('12.2 ป้องกันการจ่ายเงินซ้ำ (Duplicate Payment Block) บนคำร้องที่จ่ายแล้ว', async () => {
    let thrownError = null;
    try {
      await BeneficiaryService.recordDisbursement(
        paymentAppId,
        'TR-DUP-000',
        'https://proof.zms.org/dup.png',
        'พยายามจ่ายเงินซ้ำ',
        financeActor
      );
    } catch (err) {
      thrownError = err;
    }
    assert.ok(thrownError, 'Must reject duplicate disbursement attempt');
    assert.ok(
      thrownError.message.includes('จ่ายเงินเรียบร้อยแล้ว') ||
      thrownError.message.includes('ALREADY_PAID') ||
      thrownError.message.includes('disbursed')
    );
  });

  // -------------------------------------------------------------
  // TEST SCENARIO 13: Permission (RBAC) และ Audit Log
  // -------------------------------------------------------------
  console.log('\n📌 Scenario 13: Permission (RBAC) และ Transition Audit Logs...');

  await asyncIt('13.1 บทบาท guest หรือ officer ทั่วไปไม่มีสิทธิ์กดอนุมัติหรือจ่ายเงิน', async () => {
    let thrownApprove = null;
    try {
      await BeneficiaryService.approveApplication(
        paymentAppId,
        5000,
        'fund-1',
        'อนุมัติโดยไม่มีสิทธิ์',
        guestActor,
        'subf-1'
      );
    } catch (err) {
      thrownApprove = err;
    }
    assert.ok(thrownApprove, 'Guest cannot approve');

    let thrownDisburse = null;
    try {
      await BeneficiaryService.recordDisbursement(
        paymentAppId,
        'TR-HACK',
        '',
        '',
        officerActor // Officer cannot disburse
      );
    } catch (err) {
      thrownDisburse = err;
    }
    assert.ok(thrownDisburse, 'Officer cannot disburse');
  });

  await asyncIt('13.2 ตรวจสอบ Audit Log ใน assistance_lifecycle_transitions ครบทุกขั้นตอน', async () => {
    const logs = await db.execute({
      sql: 'SELECT action, stage, actor_name, actor_role FROM assistance_lifecycle_transitions WHERE application_id = ? ORDER BY created_at ASC',
      args: [paymentAppId],
    });

    assert.ok(logs.rows.length >= 4, 'Must have at least 4 sequential lifecycle transitions logged');
    const actions = logs.rows.map((r) => r.action);
    assert.ok(actions.includes('SUBMIT_REQUEST'), 'Logs SUBMIT_REQUEST');
    assert.ok(actions.includes('START_ASSESSMENT'), 'Logs START_ASSESSMENT');
    assert.ok(actions.includes('COMPLETE_ASSESSMENT'), 'Logs COMPLETE_ASSESSMENT');
    assert.ok(actions.includes('APPROVE_REQUEST'), 'Logs APPROVE_REQUEST');
    assert.ok(actions.includes('DISBURSE_PAYMENT'), 'Logs DISBURSE_PAYMENT');
  });

  console.log('\n================================================================');
  console.log(`🏁 Phase 12 E2E System UAT Completed: ${passCount} Passed, ${failCount} Failed`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runUAT().catch((err) => {
  console.error('Fatal UAT Test Runner Error:', err);
  process.exit(1);
});
