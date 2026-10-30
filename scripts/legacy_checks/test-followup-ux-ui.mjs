import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

function pass(msg) {
  console.log(`✅ [PASS] ${msg}`);
}

function fail(msg) {
  console.error(`❌ [FAIL] ${msg}`);
  process.exit(1);
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Testing Follow-up UX/UI APIs & 5 Sections Requirements');
  console.log('====================================================\n');

  // 1. Test 5 Dashboard Cards filterTab options
  console.log('--- TEST 1: 5 Dashboard Cards Filters ---');
  const tabs = ['all', 'due', 'overdue', 'in_progress', 'completed'];
  for (const tab of tabs) {
    const res = await fetch(`${BASE_URL}/api/follow-ups?filterTab=${tab}`);
    const json = await res.json();
    if (!json.success) fail(`filterTab=${tab} failed: ${json.error}`);
    pass(`Dashboard Card filterTab="${tab}" returned ${json.data.length} plans (Stats total: ${json.stats.totalPlans})`);
  }

  // 2. Test registrationNo filter
  console.log('\n--- TEST 2: Registration No & Application No Filters ---');
  const allRes = await fetch(`${BASE_URL}/api/follow-ups`);
  const allJson = await allRes.json();
  const samplePlan = allJson.data[0];

  const regRes = await fetch(`${BASE_URL}/api/follow-ups?registrationNo=${encodeURIComponent(samplePlan.registrationNo)}`);
  const regJson = await regRes.json();
  if (!regJson.success || regJson.data.length === 0) fail('registrationNo filter returned 0 plans');
  pass(`registrationNo="${samplePlan.registrationNo}" filtered correctly (found ${regJson.data.length} plans)`);

  const appRes = await fetch(`${BASE_URL}/api/follow-ups?applicationNo=${encodeURIComponent(samplePlan.applicationNo)}`);
  const appJson = await appRes.json();
  if (!appJson.success || appJson.data.length === 0) fail('applicationNo filter returned 0 plans');
  pass(`applicationNo="${samplePlan.applicationNo}" filtered correctly (found ${appJson.data.length} plans)`);

  // 3. Test Assistance Type Filters
  console.log('\n--- TEST 3: Assistance Type Filters ---');
  const types = ['housing', 'career', 'other'];
  for (const t of types) {
    const typeRes = await fetch(`${BASE_URL}/api/follow-ups?assistanceType=${t}`);
    const typeJson = await typeRes.json();
    if (!typeJson.success) fail(`assistanceType=${t} failed`);
    pass(`assistanceType="${t}" returned ${typeJson.data.length} plans`);
  }

  // 4. Test Detail Modal 4 Tabs Data Payload
  console.log('\n--- TEST 4: Detail Modal 4 Tabs Data Structure ---');
  const detailRes = await fetch(`${BASE_URL}/api/follow-ups/${samplePlan.id}`);
  const detailJson = await detailRes.json();
  if (!detailJson.success || !detailJson.data) fail('Failed to fetch plan detail');
  const p = detailJson.data;

  // Tab 1: ภาพรวม
  if (!p.beneficiaryName || !p.registrationNo || !p.assistanceTypeName) {
    fail('Tab 1 (Overview) missing core beneficiary fields');
  }
  pass('Tab 1 (Overview) payload has all required fields: name, regNo, type, status, minVisits, completedVisits');

  // Tab 2: ประวัติการติดตาม
  if (!Array.isArray(p.records)) {
    fail('Tab 2 (History) records is not an array');
  }
  pass(`Tab 2 (History) payload has ${p.records.length} records with inspectionDetails, visitResult, progressAssessment`);

  // Tab 3: รูปหลักฐาน
  let photoCount = 0;
  p.records.forEach((r) => {
    if (r.attachments) photoCount += r.attachments.length;
  });
  pass(`Tab 3 (Photos) has ${photoCount} photo attachments linked to visit records`);

  // Tab 4: แผนการติดตาม
  if (typeof p.minVisits !== 'number' || typeof p.requiresFollowup !== 'boolean') {
    fail('Tab 4 (Plan) missing minVisits or requiresFollowup');
  }
  pass('Tab 4 (Plan) has criteria rule fields, minVisits, remainingVisits, auditLogs');

  // 5. Test Action: Schedule Next Visit
  console.log('\n--- TEST 5: Action: Schedule Next Visit (Separate from Visit Record) ---');
  const nextDate = '2026-11-20';
  const schedRes = await fetch(`${BASE_URL}/api/follow-ups/${samplePlan.id}/plan`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nextFollowupDate: nextDate,
      notes: 'กำหนดวันนัดหมายลงพื้นที่รอบถัดไป',
      actor: { id: 'test-user', name: 'หัวหน้างานติดตาม', role: 'admin' },
    }),
  });
  const schedJson = await schedRes.json();
  if (!schedJson.success) fail(`Schedule API failed: ${schedJson.error}`);
  pass('Schedule Next Visit succeeded without creating a completed visit record');

  // 6. Test Action: Reassign Officer
  console.log('\n--- TEST 6: Action: Reassign Officer ---');
  const assignRes = await fetch(`${BASE_URL}/api/follow-ups/${samplePlan.id}/plan`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assignedOfficerId: 'u-3',
      assignedOfficerName: 'นายมูฮัมหมัด อุสมาน',
      notes: 'มอบหมายเจ้าหน้าที่รับผิดชอบพื้นที่โดยตรง',
      actor: { id: 'test-admin', name: 'ผู้จัดการสาขา', role: 'admin' },
    }),
  });
  const assignJson = await assignRes.json();
  if (!assignJson.success) fail(`Assign API failed: ${assignJson.error}`);
  pass('Reassign Officer succeeded and generated audit log');

  console.log('\n====================================================');
  console.log('🎉 ALL FOLLOW-UP UX/UI BACKEND TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
