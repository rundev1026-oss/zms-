// scripts/test-registration-survey-improvements.mjs
import { createClient } from '@libsql/client';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const DB_PATH = path.resolve(process.cwd(), 'data', 'zms.db');

const db = createClient({
  url: `file:${DB_PATH.replace(/\\/g, '/')}`,
});

async function runTests() {
  console.log('======================================================================');
  console.log('  ZMS: REGISTRATION SURVEY IMPROVEMENTS TEST SUITE');
  console.log('  - Birth Date & Leap Year Age Calculation');
  console.log('  - Thailand Geography & 5-Digit Postal Code Lookup');
  console.log('  - Multi-match Selection & Cascading Address Filters');
  console.log('  - Bangkok vs Province Terminology (เขต/แขวง vs อำเภอ/ตำบล)');
  console.log('  - Real Database Persistence & Consistency Validation');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} -> ${details}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Test Group 1: Age Calculator Logic & Edge Cases
    // -------------------------------------------------------------
    console.log('\n--- Test Group 1: Age Calculator Logic & Leap Year Handling ---');
    const { calculateAge, getTodayISODate } = await import('../src/utils/ageCalculator.ts');

    const todayIso = getTodayISODate();
    assert(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(todayIso), 'getTodayISODate returns YYYY-MM-DD');

    // Standard age
    const refDate = new Date('2026-10-21');
    const adultAge = calculateAge('1972-05-12', refDate);
    assert(adultAge.isValid && adultAge.years === 54 && adultAge.displayText.includes('54 ปี'),
      'Adult age calculated correctly (54 ปี 5 เดือน)');

    // Infant under 1 year (e.g. 5 months)
    const babyAge = calculateAge('2026-05-10', refDate);
    assert(babyAge.isValid && babyAge.years === 0 && babyAge.isUnderOneYear && babyAge.displayText.includes('5 เดือน'),
      'Infant under 1 year calculates 0 years and displays months (5 เดือน)');

    // Newborn (10 days old)
    const newbornAge = calculateAge('2026-10-11', refDate);
    assert(newbornAge.isValid && newbornAge.years === 0 && newbornAge.displayText === '10 วัน',
      'Newborn under 1 month displays days (10 วัน)');

    // Leap year birth date (Feb 29) on non-leap year (e.g. 2024-02-29 tested on 2025-02-28 vs 2025-03-01)
    const leapBefore = calculateAge('2024-02-29', new Date('2025-02-28'));
    const leapAfter = calculateAge('2024-02-29', new Date('2025-03-01'));
    assert(leapBefore.years === 0 && leapAfter.years === 1,
      'Leap day (Feb 29) birthday reaches 1 year on March 1 of non-leap year');

    // Future birth date rejection
    const futureAge = calculateAge('2028-01-01', refDate);
    assert(!futureAge.isValid && futureAge.isFuture,
      'Future birth date is rejected with isFuture: true');

    // Buddhist Era normalization (2515 -> 1972)
    const beAge = calculateAge('2515-05-12', refDate);
    assert(beAge.isValid && beAge.years === 54 && beAge.isoDate === '1972-05-12',
      'Buddhist Era year (2515) correctly normalized to 1972 CE');

    // -------------------------------------------------------------
    // Test Group 2: Thailand Address Lookup API
    // -------------------------------------------------------------
    console.log('\n--- Test Group 2: Thailand Address & Postal Code API ---');

    // 2.1 Single district, multiple subdistricts postal code (10530 -> Nong Chok)
    const res10530 = await fetch(`${BASE_URL}/api/address/lookup?zipcode=10530`);
    const data10530 = await res10530.json();
    assert(data10530.success && data10530.count === 8 && data10530.matches.every(m => m.district === 'หนองจอก'),
      'Postal code 10530 returns all 8 subdistricts in Nong Chok');

    // 2.2 Multi-district postal code (10700 -> Bang Phlat & Bangkok Noi)
    const res10700 = await fetch(`${BASE_URL}/api/address/lookup?zipcode=10700`);
    const data10700 = await res10700.json();
    const districts10700 = new Set(data10700.matches.map(m => m.district));
    assert(data10700.success && districts10700.has('บางพลัด') && districts10700.has('บางกอกน้อย'),
      'Postal code 10700 returns multi-district options (บางพลัด & บางกอกน้อย)');

    // 2.3 Bangkok terminology (เขต / แขวง)
    const bkkMatch = data10530.matches[0];
    assert(bkkMatch.isBkk && bkkMatch.districtLabel === 'เขต' && bkkMatch.subdistrictLabel === 'แขวง',
      'Bangkok addresses properly use "เขต" and "แขวง" terminology');

    // 2.4 Province terminology (อำเภอ / ตำบล) for Chiang Mai
    const res50000 = await fetch(`${BASE_URL}/api/address/lookup?zipcode=50000`);
    const data50000 = await res50000.json();
    const cnxMatch = data50000.matches[0];
    assert(!cnxMatch.isBkk && cnxMatch.districtLabel === 'อำเภอ' && cnxMatch.subdistrictLabel === 'ตำบล',
      'Province addresses properly use "อำเภอ" and "ตำบล" terminology');

    // 2.5 Cascading: get districts for province
    const resBkkDistricts = await fetch(`${BASE_URL}/api/address/lookup?province=${encodeURIComponent('กรุงเทพมหานคร')}`);
    const dataBkkDistricts = await resBkkDistricts.json();
    assert(dataBkkDistricts.success && dataBkkDistricts.districts.length === 50,
      'Cascading lookup returns all 50 districts in Bangkok');

    // 2.6 Cascading: get subdistricts for province + district
    const resNongChokSubs = await fetch(`${BASE_URL}/api/address/lookup?province=${encodeURIComponent('กรุงเทพมหานคร')}&district=${encodeURIComponent('หนองจอก')}`);
    const dataNongChokSubs = await resNongChokSubs.json();
    assert(dataNongChokSubs.success && dataNongChokSubs.subdistricts.length === 8,
      'Cascading lookup returns subdistricts for province + district');

    // 2.7 Consistency Validation API
    const resValid = await fetch(`${BASE_URL}/api/address/lookup?action=validate&zipcode=10530&province=${encodeURIComponent('กรุงเทพมหานคร')}&district=${encodeURIComponent('หนองจอก')}&subdistrict=${encodeURIComponent('กระทุ่มราย')}`);
    const dataValid = await resValid.json();
    assert(dataValid.success && dataValid.validation.isValid,
      'Address consistency check passes for valid address');

    const resInvalid = await fetch(`${BASE_URL}/api/address/lookup?action=validate&zipcode=10530&province=${encodeURIComponent('เชียงใหม่')}&district=${encodeURIComponent('เมืองเชียงใหม่')}&subdistrict=${encodeURIComponent('สุเทพ')}`);
    const dataInvalid = await resInvalid.json();
    assert(dataInvalid.success && !dataInvalid.validation.isValid && dataInvalid.validation.suggestedZipCode === '50200',
      'Address consistency check detects mismatch and suggests correct zipcode 50200');

    // -------------------------------------------------------------
    // Test Group 3: Server-side Persistence & Data Validation
    // -------------------------------------------------------------
    console.log('\n--- Test Group 3: Real Database Persistence & Server Validation ---');

    // 3.1 Register new beneficiary with valid birth date and address
    const testNationalId = `1100200${Date.now().toString().slice(-6)}`;
    const regPayload = {
      fullName: 'นาย ซากีรีน หะยีเต๊ะ (ทดสอบแบบสำรวจ)',
      nationalId: testNationalId,
      birthDate: '1992-07-25',
      phone: '081-999-8877',
      postcode: '10530',
      province: 'กรุงเทพมหานคร',
      district: 'หนองจอก',
      subdistrict: 'คลองสิบ',
      address: '15/2 หมู่ 3 ถนนประชาสำราญ ซอยมัสยิด',
      community: 'ชุมชนนูรุลฮูดา',
      housingType: 'own',
      asnafCategory: 'miskin',
    };

    const regRes = await fetch(`${BASE_URL}/api/registry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regPayload),
    });
    const regResult = await regRes.json();
    assert(regRes.status === 200 && regResult.success,
      'Registration survey saved successfully via POST /api/registry');

    // Verify in database that birth_date, calculated age, and address were saved accurately
    const dbRecord = await db.execute({
      sql: `SELECT b.id, b.full_name, b.national_id, b.birth_date, b.age, b.postcode, b.subdistrict as ben_sub,
                   h.address, h.province, h.district, h.subdistrict, h.community
            FROM beneficiaries b
            JOIN households h ON b.household_id = h.id
            WHERE b.national_id = ?`,
      args: [testNationalId],
    });

    assert(dbRecord.rows.length > 0, 'Beneficiary record found in database');
    const row = dbRecord.rows[0];

    assert(row.birth_date === '1992-07-25', `Birth date saved in ISO format: ${row.birth_date}`);
    assert(Number(row.age) >= 34, `Age calculated server-side dynamically (${row.age} years)`);
    assert(row.postcode === '10530', `Postal code saved: ${row.postcode}`);
    assert(row.province === 'กรุงเทพมหานคร', `Province saved in household: ${row.province}`);
    assert(row.district === 'หนองจอก', `District saved in household: ${row.district}`);
    assert(row.subdistrict === 'คลองสิบ', `Subdistrict saved in household: ${row.subdistrict}`);

    // 3.2 Server-side rejection of future birth date
    const futureNationalId = `1100201${Date.now().toString().slice(-6)}`;
    const futureRes = await fetch(`${BASE_URL}/api/registry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...regPayload,
        nationalId: futureNationalId,
        birthDate: '2030-01-01', // Future date!
      }),
    });
    const futureResult = await futureRes.json();
    assert(futureRes.status === 400 && futureResult.error && futureResult.error.includes('อนาคต'),
      'Server rejects future birth date with informative 400 error message');

    // 3.3 Server-side rejection of mismatched address
    const mismatchNationalId = `1100202${Date.now().toString().slice(-6)}`;
    const mismatchRes = await fetch(`${BASE_URL}/api/registry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...regPayload,
        nationalId: mismatchNationalId,
        postcode: '10530',
        province: 'เชียงใหม่', // Mismatch!
        district: 'เมืองเชียงใหม่',
        subdistrict: 'สุเทพ',
      }),
    });
    const mismatchResult = await mismatchRes.json();
    assert(mismatchRes.status === 400 && mismatchResult.error && mismatchResult.error.includes('ไม่ถูกต้องหรือไม่สัมพันธ์กัน'),
      'Server rejects inconsistent address & postal code combination with informative 400 error message');

  } catch (err) {
    console.error('Unexpected error during testing:', err);
    failed++;
  }

  console.log('\n======================================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
