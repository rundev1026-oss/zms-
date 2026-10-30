import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

function pass(msg) {
  console.log(`✅ [PASS] ${msg}`);
}

function fail(msg) {
  console.error(`❌ [FAIL] ${msg}`);
  process.exit(1);
}

async function runTest() {
  console.log('====================================================');
  console.log('🧪 Testing Section 5 "ประวัติการช่วยเหลือ" & Level 2 Follow-up History');
  console.log('====================================================\n');

  // 1. Fetch all follow-up plans to find a beneficiary with plans and visit records
  console.log('--- TEST 1: Query Plans and Disbursed Applications Linkage ---');
  const allRes = await fetch(`${BASE_URL}/api/follow-ups`);
  const allJson = await allRes.json();
  if (!allJson.success) fail(`Failed to fetch follow-ups: ${allJson.error}`);
  pass(`Retrieved ${allJson.data.length} total follow-up plans from database`);

  // Find a plan with at least 1 record (e.g. from previous tests)
  let planWithRecord = null;
  for (const p of allJson.data) {
    if (p.completedVisits > 0) {
      planWithRecord = p;
      break;
    }
  }

  if (!planWithRecord) {
    planWithRecord = allJson.data[0];
  }

  pass(`Selected target plan: ID=${planWithRecord.id}, Beneficiary=${planWithRecord.beneficiaryName}, RegNo=${planWithRecord.registrationNo}`);

  // 2. Test querying by beneficiaryId (Level 1 integration)
  console.log('\n--- TEST 2: Level 1 - Beneficiary Assistance & Follow-up Plans Linkage ---');
  const benRes = await fetch(`${BASE_URL}/api/follow-ups?beneficiaryId=${planWithRecord.beneficiaryId}`);
  const benJson = await benRes.json();
  if (!benJson.success) fail('Query by beneficiaryId failed');
  if (benJson.data.length === 0) fail('Expected at least 1 plan for beneficiary');
  pass(`Beneficiary ID ${planWithRecord.beneficiaryId} has ${benJson.data.length} linked follow-up plan(s)`);

  const linkedPlan = benJson.data.find((p) => p.id === planWithRecord.id);
  if (!linkedPlan) fail('Target plan not found in beneficiary plans list');

  // Check required Level 1 fields
  if (typeof linkedPlan.completedVisits !== 'number') fail('completedVisits missing');
  if (typeof linkedPlan.minVisits !== 'number') fail('minVisits missing');
  if (!linkedPlan.applicationNo) fail('applicationNo missing');
  pass(`Level 1 fields verified: completedVisits=${linkedPlan.completedVisits}, minVisits=${linkedPlan.minVisits}, nextDate=${linkedPlan.nextFollowupDate || 'ยังไม่ได้กำหนด'}`);

  // 3. Test Level 2 - Follow-up History Details & Timeline
  console.log('\n--- TEST 3: Level 2 - Detailed History Modal Data ---');
  const detailRes = await fetch(`${BASE_URL}/api/follow-ups/${linkedPlan.id}`);
  const detailJson = await detailRes.json();
  if (!detailJson.success || !detailJson.data) fail('Failed to fetch plan detail');
  const fullPlan = detailJson.data;

  pass(`Detail payload received: ${fullPlan.beneficiaryName} (${fullPlan.registrationNo})`);
  pass(`Assistance type: ${fullPlan.assistanceTypeName}, Status: ${fullPlan.status}`);

  // Check records ordering
  const records = fullPlan.records || [];
  pass(`Found ${records.length} visit record(s) for this assistance item`);

  if (records.length > 1) {
    for (let i = 0; i < records.length - 1; i++) {
      if (records[i].visitNumber < records[i + 1].visitNumber) {
        fail('Records are NOT ordered newest to oldest');
      }
    }
    pass('Records are strictly ordered from newest to oldest (visitNumber / date DESC)');
  }

  // 4. Test Record Fields & Evidence Photo Isolation
  console.log('\n--- TEST 4: Visit Record Fields & Photo Evidence Isolation ---');
  for (const rec of records) {
    if (!rec.visitNumber || !rec.followupDate || !rec.inspectorName || !rec.inspectionDetails || !rec.visitResult) {
      fail(`Record #${rec.visitNumber} missing mandatory inspection fields`);
    }
    pass(`Record #${rec.visitNumber}: Date=${rec.followupDate}, Inspector=${rec.inspectorName}, Format=${rec.visitFormat}`);

    // Check attachments
    const atts = rec.attachments || [];
    pass(`Record #${rec.visitNumber} has ${atts.length} photo attachment(s)`);
    for (const att of atts) {
      if (!att.filePath || !att.fileName) {
        fail('Attachment missing filePath or fileName');
      }
      if (att.recordId !== rec.id) {
        fail(`Attachment recordId ${att.recordId} does not match parent record ${rec.id}! Photos are bleeding across visits!`);
      }
    }
    if (atts.length > 0) {
      pass(`Photo isolation verified: All photos strictly map to record ${rec.id}`);
    }
  }

  // 5. Test Rule: Assistance Types minimum visits
  console.log('\n--- TEST 5: Criteria Enforcement by Assistance Type ---');
  const careerPlans = allJson.data.filter((p) => p.assistanceTypeName.includes('อาชีพ') || p.assistanceType === 'career');
  if (careerPlans.length > 0) {
    for (const cp of careerPlans) {
      if (cp.minVisits < 6) fail(`Career plan ${cp.id} has minVisits ${cp.minVisits} < 6`);
    }
    pass(`All ${careerPlans.length} Career assistance plan(s) strictly enforce minVisits >= 6`);
  }

  const housingPlans = allJson.data.filter((p) => p.assistanceTypeName.includes('ที่อยู่อาศัย') || p.assistanceTypeName.includes('ซ่อม') || p.assistanceType === 'housing');
  if (housingPlans.length > 0) {
    for (const hp of housingPlans) {
      if (hp.minVisits < 1) fail(`Housing plan ${hp.id} has minVisits ${hp.minVisits} < 1`);
    }
    pass(`All ${housingPlans.length} Housing assistance plan(s) strictly enforce minVisits >= 1`);
  }

  console.log('\n====================================================');
  console.log('🎉 ALL SECTION 5 LEVEL 1 & LEVEL 2 TESTS PASSED PERFECTLY!');
  console.log('====================================================');
}

runTest().catch((e) => {
  console.error(e);
  process.exit(1);
});
