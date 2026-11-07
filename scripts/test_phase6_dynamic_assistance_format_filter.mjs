import { initDb, getDb } from '../src/lib/db.js';
import { BeneficiaryService } from '../src/services/beneficiaryService.js';
import {
  getSupportedFormatsByType,
  validateThreeTierRelationship,
  LEVEL_3_ASSISTANCE_FORMATS,
} from '../src/lib/constants/asnafRelationshipCatalog.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    console.error(`  [FAIL] ${testName} - ${details}`);
    process.exitCode = 1;
  }
}

async function runPhase6Tests() {
  console.log('================================================================');
  console.log('   PHASE 6 TEST SUITE: DYNAMIC ASSISTANCE FORMAT FILTER');
  console.log('================================================================\n');

  await initDb();
  const db = getDb();

  // -------------------------------------------------------------
  // Test 1: Dynamic Format Filter for HOUSING_REPAIR_BUILD
  // -------------------------------------------------------------
  console.log('--- Group 1: Format Filtering for Housing Repair & Build ---');
  const housingFormats = await BeneficiaryService.getAssistanceFormats({ assistanceTypeCode: 'HOUSING_REPAIR_BUILD' });
  assert(housingFormats.length === 3, 'HOUSING_REPAIR_BUILD returns exactly 3 supported formats', `Got ${housingFormats.length}`);
  const housingCodes = housingFormats.map(f => f.code);
  assert(housingCodes.includes('materials') && housingCodes.includes('contractor') && housingCodes.includes('vendor_direct'),
    'Housing repair formats include materials, contractor, vendor_direct');
  assert(!housingCodes.includes('cash') && !housingCodes.includes('bank_transfer'),
    'Strict rejection: Housing repair NEVER includes cash or bank_transfer');

  // -------------------------------------------------------------
  // Test 2: Dynamic Format Filter for LIVING_SUPPORT
  // -------------------------------------------------------------
  console.log('\n--- Group 2: Format Filtering for Living Support ---');
  const livingFormats = await BeneficiaryService.getAssistanceFormats({ assistanceTypeCode: 'LIVING_SUPPORT' });
  assert(livingFormats.length === 3, 'LIVING_SUPPORT returns 3 formats', `Got ${livingFormats.length}`);
  const livingCodes = livingFormats.map(f => f.code);
  assert(livingCodes.includes('bank_transfer') && livingCodes.includes('cash') && livingCodes.includes('in_kind'),
    'Living support formats include bank_transfer, cash, in_kind');
  const defaultLiving = livingFormats.find(f => f.isDefault);
  assert(defaultLiving?.code === 'bank_transfer', 'Living support default format is bank_transfer');

  // -------------------------------------------------------------
  // Test 3: Dynamic Format Filter for EDUCATION_GRANT
  // -------------------------------------------------------------
  console.log('\n--- Group 3: Format Filtering for Education Grant ---');
  const eduFormats = await BeneficiaryService.getAssistanceFormats({ assistanceTypeCode: 'EDUCATION_GRANT' });
  const eduCodes = eduFormats.map(f => f.code);
  assert(eduCodes.includes('scholarship') && eduCodes.includes('bank_transfer') && eduCodes.includes('materials'),
    'Education grant formats include scholarship, bank_transfer, materials');
  assert(!eduCodes.includes('cash'), 'Strict rejection: Education grant does not allow unverified direct cash delivery');

  // -------------------------------------------------------------
  // Test 4: Dynamic Format Filter for AMIL_REMUNERATION
  // -------------------------------------------------------------
  console.log('\n--- Group 4: Format Filtering for Amil Remuneration ---');
  const amilFormats = await BeneficiaryService.getAssistanceFormats({ assistanceTypeCode: 'AMIL_REMUNERATION' });
  assert(amilFormats.length === 1 && amilFormats[0].code === 'bank_transfer',
    'Amil remuneration strictly requires bank_transfer (salary/remuneration standard)');

  // -------------------------------------------------------------
  // Test 5: Multi-Format Extensibility for CAREER_SUPPORT
  // -------------------------------------------------------------
  console.log('\n--- Group 5: Multi-Format Support for Career Support ---');
  const careerFormats = await BeneficiaryService.getAssistanceFormats({ assistanceTypeCode: 'CAREER_SUPPORT' });
  assert(careerFormats.length === 5, 'CAREER_SUPPORT supports 5 delivery formats', `Got ${careerFormats.length}`);
  const careerCodes = careerFormats.map(f => f.code);
  assert(careerCodes.includes('career_equipment') && careerCodes.includes('training') && careerCodes.includes('vendor_direct'),
    'Career support includes career_equipment, training, vendor_direct');

  // -------------------------------------------------------------
  // Test 6: Backend Validation - Reject Unsupported Formats
  // -------------------------------------------------------------
  console.log('\n--- Group 6: Strict Backend Validation Engine ---');
  let rejectedError = null;
  try {
    await BeneficiaryService.validateAndResolveThreeTierSelection({
      primaryGroupCode: 'faqir_miskin',
      assistanceTypeCode: 'HOUSING_REPAIR_BUILD',
      assistanceFormatCode: 'cash', // Unsupported!
      requestedAmount: 25000,
    });
  } catch (err) {
    rejectedError = err;
  }
  assert(rejectedError !== null, 'Server rejects unsupported cash format for HOUSING_REPAIR_BUILD');
  assert(rejectedError?.message.includes('MISMATCH_FORMAT_TYPE') || rejectedError?.message.includes('ไม่รองรับรูปแบบ'),
    'Server returns descriptive MISMATCH_FORMAT_TYPE error message', rejectedError?.message);

  // Valid format passes
  const validHousing = await BeneficiaryService.validateAndResolveThreeTierSelection({
    primaryGroupCode: 'faqir_miskin',
    assistanceTypeCode: 'HOUSING_REPAIR_BUILD',
    assistanceFormatCode: 'materials',
    requestedAmount: 25000,
  });
  assert(validHousing.assistanceFormatCode === 'materials' && validHousing.deliveryMethod === 'vendor_payment',
    'Valid format (materials) resolves format details and deliveryMethod = vendor_payment');

  // -------------------------------------------------------------
  // Test 7: Default Format Auto-Resolution when Omitted
  // -------------------------------------------------------------
  console.log('\n--- Group 7: Default Format Auto-Resolution ---');
  const autoResolved = await BeneficiaryService.validateAndResolveThreeTierSelection({
    primaryGroupCode: 'faqir_miskin',
    assistanceTypeCode: 'HOUSING_REPAIR_BUILD',
    requestedAmount: 20000,
  });
  assert(autoResolved.assistanceFormatCode === 'materials',
    'Omitted format auto-resolves to default format (materials) for HOUSING_REPAIR_BUILD');

  // -------------------------------------------------------------
  // Test 8: Type Switch & Format Reset Simulation
  // -------------------------------------------------------------
  console.log('\n--- Group 8: Type Switch & Format Reset Simulation ---');
  // Scenario A: User had LIVING_SUPPORT with format 'cash'. Type changes to HOUSING_REPAIR_BUILD.
  const newTypeFormats = getSupportedFormatsByType('HOUSING_REPAIR_BUILD');
  const isCashSupportedInHousing = newTypeFormats.some(f => f.code === 'cash');
  assert(!isCashSupportedInHousing, 'Format "cash" is invalid in HOUSING_REPAIR_BUILD (triggers auto-reset in UI)');
  const defaultForHousing = newTypeFormats.find(f => f.isDefault) || newTypeFormats[0];
  assert(defaultForHousing.code === 'materials', 'Format auto-resets to "materials"');

  // Scenario B: User had LIVING_SUPPORT with format 'bank_transfer'. Type changes to EDUCATION_GRANT.
  const eduTypeFormats = getSupportedFormatsByType('EDUCATION_GRANT');
  const isBankTransferSupportedInEdu = eduTypeFormats.some(f => f.code === 'bank_transfer');
  assert(isBankTransferSupportedInEdu, 'Format "bank_transfer" is valid in EDUCATION_GRANT (preserved without false reset)');

  // -------------------------------------------------------------
  // Test 9: Catalog 3-Tier Validation Function
  // -------------------------------------------------------------
  console.log('\n--- Group 9: Catalog 3-Tier Validator Function ---');
  const checkInvalid = validateThreeTierRelationship('faqir_miskin', 'HOUSING_REPAIR_BUILD', 'cash');
  assert(!checkInvalid.isValid, 'validateThreeTierRelationship rejects HOUSING_REPAIR_BUILD + cash');

  const checkValid = validateThreeTierRelationship('faqir_miskin', 'HOUSING_REPAIR_BUILD', 'materials');
  assert(checkValid.isValid, 'validateThreeTierRelationship accepts HOUSING_REPAIR_BUILD + materials');

  // -------------------------------------------------------------
  // Test 10: All Master Formats Catalog Endpoint & DB Schema
  // -------------------------------------------------------------
  console.log('\n--- Group 10: Master Formats Catalog & Schema Verification ---');
  const allFormats = await BeneficiaryService.getAssistanceFormats();
  assert(allFormats.length === 9, 'All 9 master assistance formats exist in DB and API', `Got ${allFormats.length}`);

  const colInfo = await db.execute('PRAGMA table_info(assistance_applications)');
  const colNames = colInfo.rows.map(r => r.name);
  assert(colNames.includes('assistance_format_id') && colNames.includes('assistance_format_code') &&
         colNames.includes('assistance_format_name') && colNames.includes('delivery_method'),
    'assistance_applications table has all 4 Level 3 format columns');

  // -------------------------------------------------------------
  // Test 11: End-to-End Application Creation with Format Persistence
  // -------------------------------------------------------------
  console.log('\n--- Group 11: End-to-End Application Creation with Format ---');
  const dummyBenRes = await db.execute('SELECT id, household_id, asnaf_category FROM beneficiaries LIMIT 1');
  const testBenId = dummyBenRes.rows[0].id;
  const testHouseholdId = dummyBenRes.rows[0].household_id;

  const testAppId = `app-test-fmt-${Date.now()}`;
  const testAppNo = `APP-2569-FMT${Math.floor(Math.random() * 9000 + 1000)}`;

  const resolved = await BeneficiaryService.validateAndResolveThreeTierSelection({
    primaryGroupCode: 'faqir_miskin',
    assistanceTypeCode: 'CAREER_SUPPORT',
    assistanceFormatCode: 'career_equipment',
    requestedAmount: 15000,
  });

  await db.execute({
    sql: `INSERT INTO assistance_applications (
      id, application_no, beneficiary_id, asnaf_category, requested_amount,
      status, urgency_level, assigned_officer_id, assigned_officer_name, applied_date,
      assistance_type, assistance_type_id, assistance_group, primary_group_code,
      specific_fund_id, specific_fund_code, specific_fund_name, fiscal_year,
      assistance_format_id, assistance_format_code, assistance_format_name, delivery_method
    ) VALUES (?, ?, ?, ?, ?, 'submitted', 'normal', 'officer-1', 'Test Officer', '2026-11-07',
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      testAppId,
      testAppNo,
      testBenId,
      resolved.asnafCategory,
      15000,
      resolved.assistanceTypeName,
      resolved.assistanceTypeId,
      resolved.assistanceGroup,
      resolved.primaryGroupCode,
      resolved.specificFundId,
      resolved.specificFundCode,
      resolved.specificFundName,
      resolved.fiscalYear,
      resolved.assistanceFormatId,
      resolved.assistanceFormatCode,
      resolved.assistanceFormatName,
      resolved.deliveryMethod,
    ],
  });

  const inserted = await db.execute({
    sql: 'SELECT * FROM assistance_applications WHERE id = ?',
    args: [testAppId],
  });
  assert(inserted.rows.length === 1, 'Test application successfully created');
  assert(inserted.rows[0].assistance_format_code === 'career_equipment', 'Persisted assistance_format_code matches career_equipment');
  assert(inserted.rows[0].delivery_method === 'vendor_payment', 'Persisted delivery_method matches vendor_payment');

  // Clean up test application
  await db.execute({ sql: 'DELETE FROM assistance_applications WHERE id = ?', args: [testAppId] });

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`PHASE 6 TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
  if (passedTests === totalTests) {
    console.log('STATUS: ALL TESTS PASSED SUCCESSFULLY (100%)');
  } else {
    console.log(`STATUS: ${totalTests - passedTests} TESTS FAILED`);
  }
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPhase6Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

