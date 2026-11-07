import { initDb, getDb } from '../src/lib/db.js';
import { BeneficiaryService } from '../src/services/beneficiaryService.js';
import { FinancialService } from '../src/services/financialService.js';
import { resolveAsnafGroupCode, validateThreeTierRelationship } from '../src/lib/constants/asnafRelationshipCatalog.js';

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

async function runPhase5Tests() {
  console.log('================================================================');
  console.log('   PHASE 5 TEST SUITE: DYNAMIC ASSISTANCE TYPE FILTER & ASNAF');
  console.log('================================================================\n');

  await initDb();
  const db = getDb();

  // -------------------------------------------------------------
  // Test 1: Dynamic Filter for Faqir-Miskin
  // -------------------------------------------------------------
  console.log('--- Group 1: Faqir-Miskin Dynamic Filtering ---');
  const faqirTypes = await BeneficiaryService.getAssistanceTypes({ primaryGroupCode: 'faqir_miskin' });
  assert(faqirTypes.length >= 7, 'Faqir-Miskin returns all required assistance types', `Got ${faqirTypes.length}`);
  const hasLiving = faqirTypes.some(t => t.code === 'LIVING_SUPPORT');
  const hasHousing = faqirTypes.some(t => t.code === 'HOUSING_REPAIR_BUILD');
  const hasCareer = faqirTypes.some(t => t.code === 'CAREER_SUPPORT');
  const hasEdu = faqirTypes.some(t => t.code === 'EDUCATION_GRANT');
  assert(hasLiving && hasHousing && hasCareer && hasEdu, 'Faqir-Miskin includes core living, housing, career, education types');

  // -------------------------------------------------------------
  // Test 2: Strictly Forbid Other Asnafs (Amil types in Faqir-Miskin)
  // -------------------------------------------------------------
  console.log('\n--- Group 2: Cross-Asnaf Leak Prevention (Amil types in Faqir-Miskin) ---');
  const amilInFaqir = faqirTypes.filter(t => t.code.startsWith('AMIL_'));
  assert(amilInFaqir.length === 0, 'Zero Amil assistance types leak into Faqir-Miskin filter', 
    `Found leaked Amil types: ${amilInFaqir.map(t => t.code).join(', ')}`);

  // -------------------------------------------------------------
  // Test 3: Dynamic Filter for Amil
  // -------------------------------------------------------------
  console.log('\n--- Group 3: Amil Dynamic Filtering ---');
  const amilTypes = await BeneficiaryService.getAssistanceTypes({ primaryGroupCode: 'amil' });
  assert(amilTypes.length === 10, 'Amil returns exactly 10 operational and administrative types', `Got ${amilTypes.length}`);
  const hasRemuneration = amilTypes.some(t => t.code === 'AMIL_REMUNERATION');
  const hasOffice = amilTypes.some(t => t.code === 'AMIL_OFFICE_EXPENSE');
  const hasFuel = amilTypes.some(t => t.code === 'AMIL_FUEL');
  assert(hasRemuneration && hasOffice && hasFuel, 'Amil includes remuneration, office, fuel types');

  // -------------------------------------------------------------
  // Test 4: Strictly Forbid Beneficiary Types in Amil
  // -------------------------------------------------------------
  console.log('\n--- Group 4: Cross-Asnaf Leak Prevention (Beneficiary types in Amil) ---');
  const beneficiaryInAmil = amilTypes.filter(t => ['LIVING_SUPPORT', 'HOUSING_REPAIR_BUILD', 'MEDICAL_AID'].includes(t.code));
  assert(beneficiaryInAmil.length === 0, 'Zero beneficiary welfare types leak into Amil operational filter',
    `Found leaked types: ${beneficiaryInAmil.map(t => t.code).join(', ')}`);

  // -------------------------------------------------------------
  // Test 5: Multi-Asnaf Shared Assistance Types (Muallaf)
  // -------------------------------------------------------------
  console.log('\n--- Group 5: Shared Types Across Multiple Asnafs (Muallaf) ---');
  const muallafTypes = await BeneficiaryService.getAssistanceTypes({ primaryGroupCode: 'muallaf' });
  assert(muallafTypes.length >= 8, 'Muallaf returns 8 assistance types (shared + specific)', `Got ${muallafTypes.length}`);
  const muallafHasLiving = muallafTypes.some(t => t.code === 'LIVING_SUPPORT');
  const muallafHasSpecific = muallafTypes.some(t => t.code === 'MUALLAF_SUPPORT');
  assert(muallafHasLiving && muallafHasSpecific, 'Muallaf contains shared LIVING_SUPPORT and specialized MUALLAF_SUPPORT');

  // -------------------------------------------------------------
  // Test 6: Multi-Asnaf Shared with Fisabilillah
  // -------------------------------------------------------------
  console.log('\n--- Group 6: Shared Education Grant with Fisabilillah ---');
  const fisaTypes = await BeneficiaryService.getAssistanceTypes({ primaryGroupCode: 'fisabilillah' });
  const fisaHasEdu = fisaTypes.some(t => t.code === 'EDUCATION_GRANT');
  const fisaHasGarage = fisaTypes.some(t => t.code === 'FISABILILLAH_GARAGE');
  const fisaHasVolunteer = fisaTypes.some(t => t.code === 'FISABILILLAH_VOLUNTEER');
  assert(fisaHasEdu && fisaHasGarage && fisaHasVolunteer, 'Fisabilillah has shared EDUCATION_GRANT and specific garage/volunteer');

  // -------------------------------------------------------------
  // Test 7: Single-Type Asnafs (Gharimin & Ibn Sabil)
  // -------------------------------------------------------------
  console.log('\n--- Group 7: Single-Type Asnafs (Gharimin & Ibn Sabil) ---');
  const ghariminTypes = await BeneficiaryService.getAssistanceTypes({ primaryGroupCode: 'gharimin' });
  assert(ghariminTypes.length === 1 && ghariminTypes[0].code === 'GHARIMUN_DEBT', 'Gharimin has exactly 1 type: GHARIMUN_DEBT');

  const ibnsabilTypes = await BeneficiaryService.getAssistanceTypes({ primaryGroupCode: 'ibnsabil' });
  assert(ibnsabilTypes.length === 1 && ibnsabilTypes[0].code === 'IBN_SABIL', 'Ibn Sabil has exactly 1 type: IBN_SABIL');

  // -------------------------------------------------------------
  // Test 8: Asnaf Switching & Type Reset Validation
  // -------------------------------------------------------------
  console.log('\n--- Group 8: Asnaf Switching & Type Reset Simulation ---');
  // Scenario A: Switching from Amil to Faqir-Miskin with AMIL_REMUNERATION
  const amilTypeId = amilTypes.find(t => t.code === 'AMIL_REMUNERATION')?.id;
  const isAmilValidInFaqir = faqirTypes.some(t => t.id === amilTypeId || t.code === 'AMIL_REMUNERATION');
  assert(!isAmilValidInFaqir, 'AMIL_REMUNERATION is INVALID in Faqir-Miskin (triggers auto-reset)');

  // Scenario B: Switching from Faqir-Miskin to Muallaf with LIVING_SUPPORT (Shared)
  const livingTypeId = faqirTypes.find(t => t.code === 'LIVING_SUPPORT')?.id;
  const isLivingValidInMuallaf = muallafTypes.some(t => t.id === livingTypeId || t.code === 'LIVING_SUPPORT');
  assert(isLivingValidInMuallaf, 'Shared LIVING_SUPPORT remains VALID when switching between Faqir-Miskin and Muallaf (no false reset)');

  // Scenario C: Switching from Muallaf to Faqir-Miskin with MUALLAF_SUPPORT
  const muallafSupportId = muallafTypes.find(t => t.code === 'MUALLAF_SUPPORT')?.id;
  const isMuallafSupportValidInFaqir = faqirTypes.some(t => t.id === muallafSupportId || t.code === 'MUALLAF_SUPPORT');
  assert(!isMuallafSupportValidInFaqir, 'MUALLAF_SUPPORT is INVALID in Faqir-Miskin (triggers auto-reset)');

  // -------------------------------------------------------------
  // Test 9: Catalog Validation Engine Test
  // -------------------------------------------------------------
  console.log('\n--- Group 9: Validation Engine Catalog Integration ---');
  const valFail = validateThreeTierRelationship('faqir_miskin', 'AMIL_REMUNERATION', 'bank_transfer');
  assert(!valFail.isValid, 'validateThreeTierRelationship rejects AMIL_REMUNERATION under faqir_miskin');

  const valSuccessShared = validateThreeTierRelationship('muallaf', 'LIVING_SUPPORT', 'bank_transfer');
  assert(valSuccessShared.isValid, 'validateThreeTierRelationship accepts LIVING_SUPPORT under muallaf');

  const valSuccessFaqir = validateThreeTierRelationship('faqir_miskin', 'HOUSING_REPAIR_BUILD', 'materials');
  assert(valSuccessFaqir.isValid, 'validateThreeTierRelationship accepts HOUSING_REPAIR_BUILD under faqir_miskin');

  // -------------------------------------------------------------
  // Test 10: 3-Tier Fund Hierarchy Integrity (FinancialService)
  // -------------------------------------------------------------
  console.log('\n--- Group 10: 3-Tier Fund Hierarchy Integration ---');
  const hierarchy = await FinancialService.getThreeTierFundHierarchy('2569', { activeOnly: true });
  const amilPrimary = hierarchy.primaryGroups.find(g => g.asnafCode === 'amil');
  assert(amilPrimary !== undefined, 'Amil primary group exists in fund hierarchy');
  const amilSf = amilPrimary?.specificFunds?.find(sf => sf.code === 'amil_operations');
  assert(amilSf !== undefined && (amilSf.assistanceTypes?.length || 0) === 10, 'Amil operations sub-fund has exactly 10 assistance types', `Got ${amilSf?.assistanceTypes?.length}`);

  const faqirPrimary = hierarchy.primaryGroups.find(g => g.asnafCode === 'faqir_miskin');
  assert(faqirPrimary !== undefined, 'Faqir-Miskin primary group exists in fund hierarchy');
  const faqirLivingSf = faqirPrimary?.specificFunds?.find(sf => sf.code === 'living');
  const amilInLivingSf = (faqirLivingSf?.assistanceTypes || []).filter(at => at.code.startsWith('AMIL_'));
  assert(amilInLivingSf.length === 0, 'Zero Amil types in Faqir-Miskin living sub-fund');

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`PHASE 5 TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
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

runPhase5Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

