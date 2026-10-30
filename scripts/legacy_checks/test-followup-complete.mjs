import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

async function testFollowUpSystem() {
  console.log('====================================================');
  console.log('🚀 Starting Complete Follow-up & Monitoring System Test');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // TEST 1: GET /api/follow-ups returns real plans and stats
  console.log('--- TEST 1: GET /api/follow-ups ---');
  const res1 = await fetch(`${BASE_URL}/api/follow-ups`);
  const data1 = await res1.json();
  assert(data1.success === true, 'GET /api/follow-ups returns success: true');
  assert(Array.isArray(data1.data) && data1.data.length > 0, `Returned ${data1.data?.length} real follow-up plans`);
  assert(data1.stats !== undefined, 'Returned summary stats');
  assert(data1.stats.totalPlans === data1.data.length, `Stats totalPlans (${data1.stats.totalPlans}) matches data count (${data1.data.length})`);
  console.log(`   Stats: Total=${data1.stats.totalPlans}, Due=${data1.stats.dueCount}, Overdue=${data1.stats.overdueCount}, Completed=${data1.stats.completedCount}\n`);

  // TEST 2: Assistance Type Rules (Rule 2)
  console.log('--- TEST 2: Mandatory Minimum Visits Rules ---');
  const careerPlan = data1.data.find(p => p.assistanceTypeName.includes('อาชีพ'));
  assert(careerPlan !== undefined, 'Found at least 1 Career assistance plan');
  assert(careerPlan.minVisits >= 6, `Career plan strictly enforces minVisits >= 6 (got ${careerPlan.minVisits})`);

  const housingPlan = data1.data.find(p => p.assistanceTypeName.includes('ที่อยู่อาศัย') || p.assistanceTypeName.includes('ซ่อม'));
  assert(housingPlan !== undefined, 'Found at least 1 Housing assistance plan');
  assert(housingPlan.minVisits >= 1, `Housing plan strictly enforces minVisits >= 1 (got ${housingPlan.minVisits})`);

  // TEST 3: Server-side validation forbidding lowering below minimum visits
  console.log('\n--- TEST 3: Server-side Rule Enforcement on Plan Update ---');
  // Attempt to lower career plan min visits to 2 (must be rejected!)
  const putCareerFail = await fetch(`${BASE_URL}/api/follow-ups/${careerPlan.id}/plan`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ minVisits: 2 }),
  });
  const putCareerJson = await putCareerFail.json();
  assert(putCareerFail.status === 400 && putCareerJson.success === false, 'Server rejected lowering career minVisits < 6');
  console.log(`   Rejection message: "${putCareerJson.error}"`);

  // Attempt to opt-out of housing follow-up (must be rejected!)
  const putHousingFail = await fetch(`${BASE_URL}/api/follow-ups/${housingPlan.id}/plan`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requiresFollowup: false }),
  });
  const putHousingJson = await putHousingFail.json();
  assert(putHousingFail.status === 400 && putHousingJson.success === false, 'Server rejected opting out of housing follow-up');
  console.log(`   Rejection message: "${putHousingJson.error}"`);

  // TEST 4: Photo Evidence Upload (Rule 5)
  console.log('\n--- TEST 4: Real Photo Evidence Upload ---');
  // Create a real sample image buffer (tiny 1x1 valid PNG)
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const imgBuffer = Buffer.from(pngBase64, 'base64');
  const tempImgPath = path.resolve('public/uploads/follow-ups/test_evidence.png');
  fs.writeFileSync(tempImgPath, imgBuffer);

  const formData = new FormData();
  const fileBlob = new Blob([imgBuffer], { type: 'image/png' });
  formData.append('photo', fileBlob, 'inspection_roof_repair.png');
  formData.append('planId', housingPlan.id);

  const uploadRes = await fetch(`${BASE_URL}/api/follow-ups/upload`, {
    method: 'POST',
    body: formData,
  });
  const uploadJson = await uploadRes.json();
  assert(uploadJson.success === true, 'Upload API returned success: true');
  assert(uploadJson.data.filePath.startsWith('/uploads/follow-ups/'), `Uploaded file path is valid: ${uploadJson.data.filePath}`);
  const diskFileExists = fs.existsSync(path.resolve('public' + uploadJson.data.filePath));
  assert(diskFileExists === true, 'Uploaded photo physically exists in file storage');
  console.log(`   Stored image: ${uploadJson.data.storedFileName} (${uploadJson.data.fileSize} bytes)`);

  // TEST 5: Mandatory Photo Proof on Visit Record (Rule 5)
  console.log('\n--- TEST 5: Mandatory Photo Proof Enforcement ---');
  // A. Attempt to record visit WITHOUT photos (must fail!)
  const visitWithoutPhotoRes = await fetch(`${BASE_URL}/api/follow-ups/${housingPlan.id}/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      followupDate: '2026-10-20',
      visitFormat: 'field_visit',
      inspectionDetails: 'ตรวจเยี่ยมงานซ่อมหลังคา',
      visitResult: 'หลังคาเปลี่ยนกระเบื้องใหม่เสร็จสิ้น ไม่รั่วซึม',
      progressAssessment: 'ความคืบหน้า 100%',
      attachments: [], // Empty attachments!
    }),
  });
  const visitWithoutPhotoJson = await visitWithoutPhotoRes.json();
  assert(visitWithoutPhotoRes.status === 400 && visitWithoutPhotoJson.success === false, 'Server rejected visit record without photo proof');
  console.log(`   Rejection message: "${visitWithoutPhotoJson.error}"`);

  // B. Record visit WITH photo proof (must succeed!)
  const visitWithPhotoRes = await fetch(`${BASE_URL}/api/follow-ups/${housingPlan.id}/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      followupDate: '2026-10-20',
      visitFormat: 'field_visit',
      location: housingPlan.address || 'ที่อยู่ตามทะเบียน',
      inspectorName: 'อุสมาน เจริญสุข',
      inspectionDetails: 'ลงพื้นที่ตรวจสอบงานซ่อมแซมหลังคาและฝาผนังบ้านที่ได้รับเงินช่วยเหลือ',
      visitResult: 'ผู้รับเหมาดำเนินการซ่อมแซมเสร็จสิ้น ฝนตกไม่รั่วซึม ครอบครัวมีความปลอดภัย',
      progressAssessment: 'งานซ่อมแซมแล้วเสร็จ 100% ส่งมอบงานเรียบร้อย',
      problemsAndObstacles: 'ไม่มีปัญหาอุปสรรค',
      additionalSupportNeeded: 'ไม่มี',
      officerRecommendation: 'ปิดการติดตามสำหรับระยะนี้ได้ สภาพแวดล้อมปลอดภัย',
      attachments: [
        {
          fileName: uploadJson.data.fileName,
          filePath: uploadJson.data.filePath,
          fileType: uploadJson.data.fileType,
          fileSize: uploadJson.data.fileSize,
          caption: 'ภาพถ่ายงานซ่อมแซมหลังคาที่แล้วเสร็จจริง',
        },
      ],
    }),
  });
  const visitWithPhotoJson = await visitWithPhotoRes.json();
  assert(visitWithPhotoJson.success === true, 'Server saved visit record with photo proof successfully');
  assert(visitWithPhotoJson.data.updatedPlan.completedVisits >= 1, `Completed visits incremented to ${visitWithPhotoJson.data.updatedPlan.completedVisits}`);
  assert(visitWithPhotoJson.data.updatedPlan.status === 'completed', `Plan status transitioned to 'completed' (${visitWithPhotoJson.data.updatedPlan.statusTh})`);

  // TEST 6: Single Plan Detail API with timeline and photos
  console.log('\n--- TEST 6: GET /api/follow-ups/[id] Detail & Timeline ---');
  const planDetailRes = await fetch(`${BASE_URL}/api/follow-ups/${housingPlan.id}`);
  const planDetailJson = await planDetailRes.json();
  assert(planDetailJson.success === true, 'GET single plan returns success: true');
  assert(Array.isArray(planDetailJson.data.records) && planDetailJson.data.records.length > 0, 'Plan detail contains visit records');
  const latestRec = planDetailJson.data.records[0];
  assert(latestRec.attachments && latestRec.attachments.length > 0, 'Latest record contains photo attachments');
  console.log(`   Record ID: ${latestRec.id}, Photos: ${latestRec.attachments.length}, Status: ${planDetailJson.data.statusTh}`);

  // TEST 7: Beneficiary ID Filtering (Rule 7 for Section 5)
  console.log('\n--- TEST 7: Beneficiary ID Query for Section 5 Integration ---');
  const benRes = await fetch(`${BASE_URL}/api/follow-ups?beneficiaryId=${housingPlan.beneficiaryId}`);
  const benJson = await benRes.json();
  assert(benJson.success === true, 'Query by beneficiaryId returned success');
  assert(benJson.data.length > 0, `Found ${benJson.data.length} plans for beneficiary ${housingPlan.beneficiaryName}`);
  assert(benJson.data.every(p => p.beneficiaryId === housingPlan.beneficiaryId), 'All returned plans strictly match beneficiary ID');

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED PERFECTLY!`);
  console.log('====================================================');
}

testFollowUpSystem().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
