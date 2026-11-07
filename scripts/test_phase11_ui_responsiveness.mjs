import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { getDb, initDb } from '../src/lib/db.ts';
import { BeneficiaryService } from '../src/services/beneficiaryService.ts';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

console.log('========================================================');
console.log('🧪 PHASE 11 TEST SUITE: UI/UX RESPONSIVE POLISH & 8 SECTIONS');
console.log('========================================================\n');

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
    console.error(err.stack);
    failCount++;
  }
}

async function run() {
  await initDb();
  const db = getDb();

  console.log('📋 1. Verifying Mandated 8 Sections Architecture in Components...');

  const formViewPath = path.resolve('src/components/views/assistance/AssistanceRequestFormView.tsx');
  assert.ok(fs.existsSync(formViewPath), 'AssistanceRequestFormView.tsx must exist');
  const formContent = fs.readFileSync(formViewPath, 'utf8');

  it('AssistanceRequestFormView defines Section 1 (ข้อมูลผู้มีสิทธิ์)', () => {
    assert.ok(formContent.includes('ส่วนที่ 1: ข้อมูลผู้มีสิทธิ์'), 'Section 1 must be explicitly present');
    assert.ok(formContent.includes('Single Source of Truth'), 'Must protect registry single source of truth');
  });

  it('AssistanceRequestFormView defines Section 2 (อัสนัฟจากทะเบียน)', () => {
    assert.ok(formContent.includes('ส่วนที่ 2: อัสนัฟจากทะเบียน'), 'Section 2 must be explicitly present');
    assert.ok(formContent.includes('ไม่อนุญาตให้แก้ไขหมวดอัสนัฟในทะเบียนหลัก'), 'Must guard against modifying master registry Asnaf');
  });

  it('AssistanceRequestFormView defines Section 3 (ประเภทการช่วยเหลือ)', () => {
    assert.ok(formContent.includes('ส่วนที่ 3: ประเภทการช่วยเหลือ'), 'Section 3 must be explicitly present');
    assert.ok(formContent.includes('ห้ามแสดงประเภทที่ไม่สัมพันธ์กัน'), 'Must enforce strict dynamic relationship filter');
  });

  it('AssistanceRequestFormView defines Section 4 (รูปแบบการช่วยเหลือ)', () => {
    assert.ok(formContent.includes('ส่วนที่ 4: รูปแบบการช่วยเหลือ'), 'Section 4 must be explicitly present');
    assert.ok(formContent.includes('availableAssistanceFormats'), 'Must have assistance formats state');
  });

  it('AssistanceRequestFormView defines Section 5 (รายละเอียดความต้องการ)', () => {
    assert.ok(formContent.includes('ส่วนที่ 5: รายละเอียดความต้องการ'), 'Section 5 must be explicitly present');
    assert.ok(formContent.includes('necessityDetails'), 'Must capture necessity details');
  });

  it('AssistanceRequestFormView defines Section 6 (งบประมาณโดยประมาณ)', () => {
    assert.ok(formContent.includes('ส่วนที่ 6: งบประมาณโดยประมาณ'), 'Section 6 must be explicitly present');
    assert.ok(formContent.includes('solvencyCheck'), 'Must incorporate solvency pre-check');
  });

  it('AssistanceRequestFormView defines Section 7 (เอกสารประกอบคำร้อง)', () => {
    assert.ok(formContent.includes('ส่วนที่ 7: เอกสารประกอบคำร้อง'), 'Section 7 must be explicitly present');
    assert.ok(formContent.includes('DocumentUploader'), 'Must integrate DocumentUploader');
    assert.ok(formContent.includes('selectedExistingDocIds'), 'Must support referencing existing registry documents');
  });

  it('AssistanceRequestFormView defines Section 8 (สรุปก่อนส่งคำร้อง)', () => {
    assert.ok(formContent.includes('ส่วนที่ 8: สรุปก่อนส่งคำร้อง'), 'Section 8 must be explicitly present');
    assert.ok(formContent.includes('hasCertified'), 'Must require officer certification');
  });

  const wizardModalPath = path.resolve('src/components/views/assistance/AssistanceRequestWizardModal.tsx');
  const wizardContent = fs.readFileSync(wizardModalPath, 'utf8');

  it('AssistanceRequestWizardModal also incorporates all 8 distinct sections', () => {
    assert.ok(wizardContent.includes('ส่วนที่ 1: ข้อมูลผู้มีสิทธิ์'), 'Wizard must include Section 1');
    assert.ok(wizardContent.includes('ส่วนที่ 2: อัสนัฟจากทะเบียน'), 'Wizard must include Section 2');
    assert.ok(wizardContent.includes('ส่วนที่ 3: ประเภทความช่วยเหลือ'), 'Wizard must include Section 3');
    assert.ok(wizardContent.includes('ส่วนที่ 4: รูปแบบการช่วยเหลือ'), 'Wizard must include Section 4');
    assert.ok(wizardContent.includes('ส่วนที่ 5: วัตถุประสงค์'), 'Wizard must include Section 5');
    assert.ok(wizardContent.includes('ส่วนที่ 6: วงเงินงบประมาณ'), 'Wizard must include Section 6');
    assert.ok(wizardContent.includes('ส่วนที่ 7: เอกสารประกอบคำร้อง'), 'Wizard must include Section 7');
    assert.ok(wizardContent.includes('ส่วนที่ 8: สรุปก่อนส่งคำร้อง'), 'Wizard must include Section 8');
  });

  console.log('\n🔍 2. Verifying SearchableSelect Component & Beneficiary Autocomplete API...');

  const searchableSelectPath = path.resolve('src/components/common/SearchableSelect.tsx');
  assert.ok(fs.existsSync(searchableSelectPath), 'SearchableSelect.tsx component must exist');
  const searchableContent = fs.readFileSync(searchableSelectPath, 'utf8');

  it('SearchableSelect component exports SearchableSelect', () => {
    assert.ok(searchableContent.includes('export const SearchableSelect'), 'Must export SearchableSelect component');
    assert.ok(searchableContent.includes('aria-haspopup="listbox"'), 'Must have accessibility attributes');
  });

  it('SearchableSelect handles min-h-[44px] touch-friendly targets', () => {
    assert.ok(searchableContent.includes('min-h-[44px]'), 'Must support 44px touch targets for mobile accessibility');
  });

  await asyncIt('GET /api/assistance-requests/check-beneficiary returns candidates with details', async () => {
    const res = await fetch(`${BASE_URL}/api/assistance-requests/check-beneficiary?q=สุไลมาน`);
    assert.strictEqual(res.status, 200, 'Must return 200 OK');
    const json = await res.json();
    assert.strictEqual(json.success, true, 'success must be true');
    assert.ok(Array.isArray(json.candidates), 'candidates must be an array');
    assert.ok(json.candidates.length > 0, 'candidates array must have results');
    const first = json.candidates[0];
    assert.ok(first.id, 'Candidate must have id');
    assert.ok(first.fullName, 'Candidate must have fullName');
    assert.ok(first.nationalId, 'Candidate must have nationalId');
    assert.ok(first.asnafCode, 'Candidate must have asnafCode');
  });

  await asyncIt('GET /api/assistance-requests/check-beneficiary handles empty query', async () => {
    const res = await fetch(`${BASE_URL}/api/assistance-requests/check-beneficiary`);
    assert.strictEqual(res.status, 200, 'Must return 200 OK');
    const json = await res.json();
    assert.strictEqual(json.success, true, 'success must be true');
    assert.ok(Array.isArray(json.candidates), 'candidates must be an array');
  });

  console.log('\n📱 3. Verifying Mobile, Tablet, & Desktop Responsive Classes...');

  it('AssistanceRequestFormView has mobile sticky touch footer & responsive grid', () => {
    assert.ok(formContent.includes('min-h-[44px]'), 'Buttons must have min-h-[44px] for finger tap targets');
    assert.ok(formContent.includes('sm:hidden'), 'Must have mobile-specific layout classes');
    assert.ok(formContent.includes('grid-cols-1'), 'Must have single column layout for small screens');
    assert.ok(formContent.includes('lg:grid-cols-2') || formContent.includes('sm:grid-cols-2'), 'Must have 2-column layout for tablets and desktops');
  });

  const matrixTabPath = path.resolve('src/components/views/admin/tabs/RelationshipMatrixTab.tsx');
  const matrixContent = fs.readFileSync(matrixTabPath, 'utf8');

  it('RelationshipMatrixTab includes mobile swipe hint indicator', () => {
    assert.ok(matrixContent.includes('md:hidden'), 'Must have mobile swipe indicator');
    assert.ok(matrixContent.includes('Swipe ↔'), 'Must display clear mobile swipe hint');
    assert.ok(matrixContent.includes('overflow-x-auto'), 'Must support horizontal scroll');
  });

  const requestViewPath = path.resolve('src/components/views/AssistanceRequestsView.tsx');
  const requestViewContent = fs.readFileSync(requestViewPath, 'utf8');

  it('AssistanceRequestsView table includes mobile swipe hint indicator', () => {
    assert.ok(requestViewContent.includes('md:hidden text-[11px]'), 'Must have mobile swipe indicator');
    assert.ok(requestViewContent.includes('Swipe ↔'), 'Must display clear mobile swipe hint');
    assert.ok(requestViewContent.includes('touch-scroll') || requestViewContent.includes('overflow-x-auto'), 'Must support touch scroll');
  });

  console.log('\n📊 4. Verifying Double-Entry Chart of Accounts & Solvency in Form View...');

  it('AssistanceRequestFormView integrates getChartOfAccountsForDisbursement', () => {
    assert.ok(formContent.includes('getChartOfAccountsForDisbursement'), 'Must import getChartOfAccountsForDisbursement');
    assert.ok(formContent.includes('chartOfAccounts.debitAcc.code'), 'Must display debit account code');
    assert.ok(formContent.includes('chartOfAccounts.creditAcc.code'), 'Must display credit account code');
  });

  const officerActor = {
    id: 'u-officer-p11',
    name: 'สิทธิชัย เจ้าหน้าที่พัฒนาสังคม',
    role: 'officer',
  };

  const createTestApp = async (opts = {}) => {
    const timestamp = Date.now() + Math.floor(Math.random() * 1000);
    const reg = await BeneficiaryService.registerBeneficiary({
      nationalId: `1100088${timestamp.toString().slice(-6)}`,
      fullName: `นายมุฮัมมัด ทดสอบยูไอ ${timestamp.toString().slice(-4)}`,
      phone: '0812345678',
      address: '123 หมู่ 4 ซอยประชาอุทิศ',
      province: 'กรุงเทพมหานคร',
      district: 'หนองจอก',
      subdistrict: 'คู้ฝั่งเหนือ',
      community: 'ชุมชนเกาะแต้ว',
      postcode: '10530',
      primaryGroupCode: 'faqir_miskin',
      asnafCategory: 'faqir_miskin',
      assistanceTypeCode: 'LIVING_SUPPORT',
      assistanceFormatCode: 'bank_transfer',
      requestedAmount: 5000,
      ...opts,
    }, officerActor);

    const appRes = await db.execute({
      sql: 'SELECT id, application_no, beneficiary_id FROM assistance_applications WHERE beneficiary_id = ? ORDER BY created_at DESC LIMIT 1',
      args: [reg.beneficiaryId || reg.id],
    });

    return {
      beneficiaryId: reg.beneficiaryId || reg.id,
      applicationId: appRes.rows[0].id,
      applicationNo: appRes.rows[0].application_no,
    };
  };

  const testAppObj = await createTestApp();
  const testBeneficiaryId = testAppObj.beneficiaryId;
  const testApplicationId = testAppObj.applicationId;

  await asyncIt('Solvency Pre-check API validates budget and returns Chart of Accounts', async () => {
    const res = await fetch(`${BASE_URL}/api/assistance-requests/check-fund-solvency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId: testApplicationId,
        approvedAmount: 5000,
        fundId: 'fund-1',
        specificFundId: 'subf-1',
      }),
    });
    assert.strictEqual(res.status, 200, 'Must return 200 OK');
    const json = await res.json();
    assert.strictEqual(json.success, true, 'Solvency check must succeed');
    assert.ok(json.data.chartOfAccountsPreview, 'Must return chartOfAccountsPreview');
    assert.strictEqual(json.data.chartOfAccountsPreview.debit.code, '5101-FAQIR-MISKIN');
    assert.strictEqual(json.data.chartOfAccountsPreview.credit.code, '1102-BANK');
  });

  console.log('\n💾 5. Testing Full Request Submission with 8 Sections...');

  await asyncIt('BeneficiaryService creates request with all 8 relationship dimensions', async () => {
    const createdApp = await BeneficiaryService.createAssistanceRequest({
      beneficiaryId: testBeneficiaryId,
      asnafCode: 'faqir_miskin',
      primaryGroupCode: 'faqir_miskin',
      asnafCategory: 'faqir_miskin',
      specificFundId: 'subf-1',
      specificFundCode: 'SF-FM-01',
      specificFundName: 'ปัจจัยยังชีพพื้นฐาน',
      assistanceTypeId: 'ast-core-1',
      assistanceTypeCode: 'LIVING_SUPPORT',
      assistanceType: 'ปัจจัยยังชีพ',
      assistanceFormatId: 'fmt-bank-transfer',
      assistanceFormatCode: 'bank_transfer',
      assistanceFormatName: 'โอนเงินเข้าบัญชี',
      deliveryMethod: 'bank_transfer',
      requestedAmount: 6500,
      purpose: 'ยื่นคำร้องทดสอบ Phase 11 UI/UX Responsive',
      necessityDetails: 'ทดสอบความสมบูรณ์ของแบบฟอร์ม 8 ส่วนและความสัมพันธ์ของข้อมูล',
      hardshipReasons: 'ครอบครัวยากจนขาดแคลน',
      urgencyLevel: 'normal',
      fiscalYear: '2569',
      status: 'submitted',
      documents: [
        {
          name: 'ใบรับรองแพทย์_ทดสอบ.pdf',
          category: 'medical_cert',
          fileUrl: 'https://storage.zms.org/docs/med_cert_test.pdf',
        },
      ],
    }, { id: 'u-1', name: 'Super Admin', role: 'super_admin' });

    assert.ok(createdApp.applicationNo, 'Must return applicationNo');
    assert.ok(createdApp.applicationNo.startsWith('APP-2569-'), 'Application number must match APP-2569-XXXX');

    // Verify format and relationship fields persisted in SQLite database
    const dbRow = await db.execute({
      sql: `SELECT id, application_no, asnaf_category, primary_group_code, specific_fund_id,
                   assistance_type_id, assistance_format_code, delivery_method, requested_amount
            FROM assistance_applications
            WHERE id = ? OR application_no = ?`,
      args: [createdApp.applicationId || createdApp.id, createdApp.applicationNo],
    });

    assert.strictEqual(dbRow.rows.length, 1, 'Must find application in database');
    const app = dbRow.rows[0];
    assert.ok(app.asnaf_category === 'miskin' || app.asnaf_category === 'faqir_miskin', 'asnaf_category matches');
    assert.strictEqual(app.primary_group_code, 'faqir_miskin', 'primary_group_code is faqir_miskin');
    assert.strictEqual(app.specific_fund_id, 'subf-1');
    assert.strictEqual(app.assistance_format_code, 'bank_transfer');
    assert.strictEqual(app.delivery_method, 'direct_transfer');
    assert.strictEqual(Number(app.requested_amount), 6500);
  });

  console.log('\n========================================================');
  console.log(`🏁 Phase 11 Test Suite Completed: ${passCount} Passed, ${failCount} Failed`);
  console.log('========================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
