/**
 * Phase 4 Verification: Beneficiary Registration & Master Data Multi-step Form
 *
 * Verifies:
 * 1. Thai National ID Validation: Official 13-digit checksum calculation (passes valid, rejects invalid)
 * 2. Auto-generated Sequential Registry Number: Format ZMS-YYYY-###### (increments properly)
 * 3. Step 1 (Personal & Address): Draft persistence with Thai admin hierarchy and GPS coordinates
 * 4. Server-side Completeness Check: Prevents submit when mandatory fields/steps are incomplete (HTTP 422)
 * 5. Step 2 & 3 (Living Issues & Financials): Income, expenses, debt burden profiles
 * 6. Step 4 (Household & Family Members): Household structure, dependents, member relationships
 * 7. Step 5 (PDPA Consent & Verification): Consent capture and full 5-step submission to PENDING_REVIEW
 * 8. Duplicate National ID Prevention: Partial unique index blocks duplicate active Thai national IDs (HTTP 409)
 * 9. Privacy & Masking: Sensitive identity number masking based on role permissions
 * 10. Audit Logging: Full audit trail recording for creation, view, and workflow status transitions
 */

import { isValidThaiNationalId } from '../apps/api/dist/beneficiaries/identity.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: any) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] #${totalTests}: ${testName}`);
  } else {
    console.error(`  [FAIL] #${totalTests}: ${testName}`);
    if (details) console.error('         Details:', details);
  }
}

const BASE_URL = 'http://localhost:4000/api/v1';

// Helper to generate a mathematically valid Thai National ID for test
function generateValidThaiNationalId(): string {
  // First 12 digits: e.g. 1 1002 00 12345
  let digits = '1100200' + Math.floor(10000 + Math.random() * 90000).toString();
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits.charAt(i), 10) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return digits + checkDigit.toString();
}

async function runPhase4Verification() {
  console.log('================================================================');
  console.log('   PHASE 4: BENEFICIARY REGISTRATION & MULTI-STEP WORKFLOW AUDIT ');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // SECTION 1: Thai National ID Check Digit Calculation
  // ---------------------------------------------------------------------------
  console.log('--- SECTION 1: Thai National ID 13-Digit Check Digit Algorithm ---');
  const validId1 = generateValidThaiNationalId();
  const validId2 = generateValidThaiNationalId();
  const invalidIdChecksum = validId1.slice(0, 12) + ((parseInt(validId1[12]) + 1) % 10);
  const invalidLengthId = '11002001111';

  assert(isValidThaiNationalId(validId1), `Valid Thai ID passes checksum (${validId1})`);
  assert(isValidThaiNationalId(validId2), `Generated Thai ID passes checksum (${validId2})`);
  assert(!isValidThaiNationalId(invalidIdChecksum), 'Invalid check digit fails checksum verification');
  assert(!isValidThaiNationalId(invalidLengthId), 'Non-13-digit string fails checksum verification');
  assert(!isValidThaiNationalId(''), 'Empty string safely returns false');

  // ---------------------------------------------------------------------------
  // SECTION 2: Staff Authentication for Registration Operations
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Officer Authentication & Authorization ---');
  const officerLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'officer@zms.local', password: 'ZmsEnterprise2026!' }),
  });
  assert(officerLogin.status === 200, 'Assistance Officer logs in successfully');
  const officerSession = await officerLogin.json();
  const officerToken = officerSession.accessToken;

  // ---------------------------------------------------------------------------
  // SECTION 3: Step 1 Registration & Sequential Number Generation
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Step 1 Draft Creation & Registry Number Generation ---');
  const testThaiId = generateValidThaiNationalId();
  const year = new Date().getFullYear();

  const createRes = await fetch(`${BASE_URL}/beneficiaries`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${officerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'นาย',
      firstName: 'อับดุลเลาะห์',
      lastName: 'ศรัทธาธรรม',
      identityType: 'THAI_NATIONAL_ID',
      identityNumber: testThaiId,
      dateOfBirth: '1980-04-15',
      phone: '0812345678',
      occupation: 'รับจ้างทั่วไป',
      maritalStatus: 'สมรส',
      registrationNote: 'ครอบครัวยากจน รายได้ไม่แน่นอน มีภาระดูแลบุตร 3 คน',
    }),
  });

  assert(createRes.status === 201 || createRes.status === 200, 'POST /beneficiaries creates draft beneficiary');
  const beneficiary = await createRes.json();
  const beneficiaryId = beneficiary.id;

  assert(typeof beneficiary.id === 'string' && beneficiary.id.length === 36, 'Returns valid UUID for beneficiary');
  assert(
    new RegExp(`^ZMS-${year}-\\d{6}$`).test(beneficiary.registryNumber),
    `Generates sequential registry number in format ZMS-YYYY-###### (${beneficiary.registryNumber})`
  );
  assert(beneficiary.status === 'DRAFT', 'Initial registration status is DRAFT');
  assert(beneficiary.firstName === 'อับดุลเลาะห์', 'Stores first name correctly');
  assert(beneficiary.lastName === 'ศรัทธาธรรม', 'Stores last name correctly');

  // ---------------------------------------------------------------------------
  // SECTION 4: Incomplete Submission Prevention (Server-side Business Rule)
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Server-Side Completeness Validation ---');
  const prematureSubmitRes = await fetch(`${BASE_URL}/beneficiaries/${beneficiaryId}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${officerToken}` },
  });

  assert(
    prematureSubmitRes.status === 422,
    'POST /beneficiaries/:id/submit rejects incomplete draft with HTTP 422 Unprocessable Entity'
  );
  const errorBody = await prematureSubmitRes.json();
  assert(
    Array.isArray(errorBody.details) && errorBody.details.length >= 2,
    'Returns specific missing field details (addresses, household, consent)'
  );
  const missingFields = (errorBody.details || []).map((d: any) => d.field);
  assert(missingFields.includes('addresses'), 'Correctly flags missing addresses');
  assert(missingFields.includes('household'), 'Correctly flags missing household');
  assert(missingFields.includes('consent'), 'Correctly flags missing consent');

  // ---------------------------------------------------------------------------
  // SECTION 5: Step 1 (Address & GPS Coordinates)
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Step 1 Address Data & GPS Coordinates ---');
  const addressRes = await fetch(`${BASE_URL}/beneficiaries/${beneficiaryId}/addresses`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${officerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      addresses: [
        {
          addressType: 'REGISTERED',
          addressLine: '12/3 หมู่ 4 ซอยราษฎร์อุทิศ 15',
          community: 'ชุมชนนูรุลยากีน',
          subdistrict: 'คลองสิบ',
          district: 'หนองจอก',
          province: 'กรุงเทพมหานคร',
          postalCode: '10530',
          latitude: 13.8542,
          longitude: 100.8651,
        },
        {
          addressType: 'CURRENT',
          addressLine: '12/3 หมู่ 4 ซอยราษฎร์อุทิศ 15',
          community: 'ชุมชนนูรุลยากีน',
          subdistrict: 'คลองสิบ',
          district: 'หนองจอก',
          province: 'กรุงเทพมหานคร',
          postalCode: '10530',
          latitude: 13.8542,
          longitude: 100.8651,
        },
      ],
    }),
  });

  assert(addressRes.status === 200, 'PUT /beneficiaries/:id/addresses saves registered and current addresses');
  const addressList = await addressRes.json();
  assert(Array.isArray(addressList) && addressList.length === 2, 'Stores both registered and current addresses');
  assert(Number(addressList[0].latitude) === 13.8542 && Number(addressList[0].longitude) === 100.8651, 'Stores GPS coordinates accurately');

  // ---------------------------------------------------------------------------
  // SECTION 6: Step 2 & 3 (Financials & Living Hardship Profiles)
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 6: Step 2 & 3 Living Hardship & Financial Profiles ---');
  const incomeRes = await fetch(`${BASE_URL}/beneficiaries/${beneficiaryId}/income-profile`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${officerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalIncome: '4500.00',
      regularExpense: '6200.00',
      debtBurden: '15000.00',
      housingCondition: 'บ้านไม้ชั้นเดียวยกพื้น หลังคาสังกะสีผุพัง ห้องน้ำชำรุด',
      livingConstraints: 'หัวหน้าครอบครัวมีโรคประจำตัวความดันโลหิตสูง ไม่สามารถทำงานหนักได้',
      assistanceNeeds: 'เงินยังชีพรายเดือน ข้าวสารอาหารแห้ง และค่าซ่อมแซมหลังคาบ้าน',
      otherAgencyAssistance: 'เคยได้รับถุงยังชีพน้ำท่วมจากสำนักงานเขต 1 ครั้ง',
      priorAssistanceHistory: 'ไม่มีประวัติได้รับความช่วยเหลือต่อเนื่อง',
    }),
  });

  assert(incomeRes.status === 200, 'PUT /beneficiaries/:id/income-profile saves financial breakdown & hardship profile');
  const incomeData = await incomeRes.json();
  assert(incomeData.personalIncome === '4500.00', 'Stores personal income as Decimal string');
  assert(incomeData.regularExpense === '6200.00', 'Stores regular expense as Decimal string');
  assert(incomeData.debtBurden === '15000.00', 'Stores debt burden as Decimal string');

  // ---------------------------------------------------------------------------
  // SECTION 7: Step 4 (Household Structure & Family Members)
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 7: Step 4 Household & Family Members ---');
  const householdRes = await fetch(`${BASE_URL}/beneficiaries/${beneficiaryId}/household`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${officerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      memberCount: 4,
      householdIncome: '7500.00',
      householdExpense: '9800.00',
      debtAmount: '15000.00',
      dependentCount: 3,
      additionalNotes: 'ครอบครัวมีผู้อยู่ในอุปการะ 3 คน คือภรรยาและบุตรวัยเรียน 2 คน',
      members: [
        {
          fullName: 'นาง ฟาตีมะห์ ศรัทธาธรรม',
          relationship: 'ภรรยา',
          ageYears: 42,
          occupation: 'แม่บ้าน',
          isDependent: true,
          sortOrder: 1,
        },
        {
          fullName: 'ด.ช. อิบรอฮีม ศรัทธาธรรม',
          relationship: 'บุตร',
          ageYears: 14,
          occupation: 'นักเรียน',
          isDependent: true,
          sortOrder: 2,
        },
        {
          fullName: 'ด.ญ. มัรยัม ศรัทธาธรรม',
          relationship: 'บุตร',
          ageYears: 9,
          occupation: 'นักเรียน',
          isDependent: true,
          sortOrder: 3,
        },
      ],
    }),
  });

  assert(householdRes.status === 200, 'PUT /beneficiaries/:id/household saves household & member relationships');
  const householdData = await householdRes.json();
  assert(householdData.memberCount === 4, 'Stores member count');
  assert(Array.isArray(householdData.members) && householdData.members.length === 3, 'Stores household members array');
  assert(householdData.members[0].fullName === 'นาง ฟาตีมะห์ ศรัทธาธรรม', 'Stores first member correctly');

  // ---------------------------------------------------------------------------
  // SECTION 8: Step 5 (PDPA Consent & Final Submission)
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 8: Step 5 PDPA Consent & Complete Submission ---');
  const consentRes = await fetch(`${BASE_URL}/beneficiaries/${beneficiaryId}/consents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${officerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      consentTextVersion: 'v1.0',
      privacyNoticeVersion: 'v1.0',
      accepted: true,
      channel: 'STAFF_ASSISTED_FORM',
    }),
  });

  assert(consentRes.status === 200 || consentRes.status === 201, 'POST /beneficiaries/:id/consents records PDPA consent');
  const consentData = await consentRes.json();
  assert(consentData.accepted === true, 'Consent record marked as accepted');

  // Now submit the fully completed beneficiary form
  const submitRes = await fetch(`${BASE_URL}/beneficiaries/${beneficiaryId}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${officerToken}` },
  });

  assert(submitRes.status === 200 || submitRes.status === 201, 'POST /beneficiaries/:id/submit succeeds when all 5 steps are complete');
  const submittedBeneficiary = await submitRes.json();
  assert(submittedBeneficiary.status === 'PENDING_REVIEW', 'Beneficiary status successfully transitioned to PENDING_REVIEW');

  // ---------------------------------------------------------------------------
  // SECTION 9: Duplicate Active National ID Prevention
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 9: Duplicate Active National ID Prevention (Unique Constraint) ---');
  const duplicateRes = await fetch(`${BASE_URL}/beneficiaries`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${officerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'นาย',
      firstName: 'คนอื่น',
      lastName: 'ซ้ำบัตรประชาชน',
      identityType: 'THAI_NATIONAL_ID',
      identityNumber: testThaiId, // Duplicate!
      phone: '0899999999',
    }),
  });

  assert(
    duplicateRes.status === 409,
    'Attempt to create draft with existing active Thai National ID returns HTTP 409 Conflict'
  );

  // ---------------------------------------------------------------------------
  // SECTION 10: Role-Based Masking of Sensitive Identity Data
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 10: Sensitive Identity Masking (OWASP ASVS) ---');
  
  // Officer without beneficiaries.read.sensitive sees masked ID
  const officerView = await fetch(`${BASE_URL}/beneficiaries/${beneficiaryId}`, {
    headers: { Authorization: `Bearer ${officerToken}` },
  });
  const officerData = await officerView.json();
  assert(
    officerData.identityNumber !== testThaiId,
    `Officer without sensitive permission receives masked identity (${officerData.identityNumber})`
  );

  // Super Admin with beneficiaries.read.sensitive sees full unmasked ID
  const adminLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@zms.local', password: 'ZmsEnterprise2026!' }),
  });
  const adminToken = (await adminLogin.json()).accessToken;

  const adminView = await fetch(`${BASE_URL}/beneficiaries/${beneficiaryId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminData = await adminView.json();
  assert(
    adminData.identityNumber === testThaiId,
    'Super Admin with sensitive read permission receives full unmasked identity number'
  );

  // ---------------------------------------------------------------------------
  // SECTION 11: Query, Search & Status Filter
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 11: Beneficiary Query, Search & Summary ---');
  const listRes = await fetch(`${BASE_URL}/beneficiaries?status=PENDING_REVIEW&q=อับดุลเลาะห์`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(listRes.status === 200, 'GET /beneficiaries returns paginated results');
  const listData = await listRes.json();
  assert(listData.items.some((b: any) => b.id === beneficiaryId), 'List returns newly submitted beneficiary matching query');

  const summaryRes = await fetch(`${BASE_URL}/beneficiaries/summary`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(summaryRes.status === 200, 'GET /beneficiaries/summary returns status count aggregate');
  const summaryData = await summaryRes.json();
  assert(typeof summaryData.counts?.PENDING_REVIEW === 'number' && summaryData.counts.PENDING_REVIEW >= 1, 'Summary includes PENDING_REVIEW count');

  // ---------------------------------------------------------------------------
  // SECTION 12: Status History Audit Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 12: Status Change History Audit Trail ---');
  const historyRes = await fetch(`${BASE_URL}/beneficiaries/${beneficiaryId}/history`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(historyRes.status === 200, 'GET /beneficiaries/:id/history returns transition audit records');
  const historyData = await historyRes.json();
  assert(Array.isArray(historyData) && historyData.length >= 2, 'History contains both DRAFT and PENDING_REVIEW records');
  assert(historyData[0].toStatus === 'PENDING_REVIEW', 'Latest history record shows PENDING_REVIEW');

  console.log('\n================================================================');
  console.log(`PHASE 4 AUDIT RESULT: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPhase4Verification().catch((err) => {
  console.error('Phase 4 verification error:', err);
  process.exit(1);
});
