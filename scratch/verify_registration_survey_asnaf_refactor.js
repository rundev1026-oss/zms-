const fs = require('fs');
const assert = require('assert');

console.log('--- TEST 1: Check MultiStepRegistrationView.tsx Source Code ---');
const content = fs.readFileSync('src/components/views/MultiStepRegistrationView.tsx', 'utf8');

// Check deleted UI fields
assert.ok(
  !content.includes('สาขาผู้รับผิดชอบ (เฉพาะสาขาที่เปิดใช้งาน)'),
  'FAIL: branchId UI label must be removed'
);
assert.ok(
  !content.includes('เอกสารสิทธิ์ที่ดิน (หากเกี่ยวข้องกับคำร้อง)'),
  'FAIL: landTitleType UI label must be removed'
);
console.log('PASS: Red-marked fields (branchId, landTitleType) removed from form UI.');

// Check relocation of housingType after religion
const religionIdx = content.indexOf('value={religion}');
const housingTypeIdx = content.indexOf('value={housingType}');
const asnafSectionIdx = content.indexOf('หมวดหมู่ผู้มีสิทธิ์รับซะกาต (Asnaf Categories)');
const addressFieldsIdx = content.indexOf('<ThaiAddressFields');

assert.ok(religionIdx !== -1, 'FAIL: religion field not found');
assert.ok(housingTypeIdx !== -1, 'FAIL: housingType field not found');
assert.ok(asnafSectionIdx !== -1, 'FAIL: Asnaf section not found');
assert.ok(addressFieldsIdx !== -1, 'FAIL: ThaiAddressFields not found');

assert.ok(
  religionIdx < housingTypeIdx,
  'FAIL: housingType must be located AFTER religion'
);
assert.ok(
  housingTypeIdx < asnafSectionIdx,
  'FAIL: Asnaf section must be located AFTER housingType'
);
assert.ok(
  asnafSectionIdx < addressFieldsIdx,
  'FAIL: Asnaf section must be located BEFORE ThaiAddressFields'
);
console.log('PASS: Field sequence verified: religion -> housingType -> Asnaf Categories -> ThaiAddressFields');

// Check responsive grid columns for Asnaf cards
assert.ok(
  content.includes('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'),
  'FAIL: Asnaf cards must use grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
);
console.log('PASS: Responsive grid (1 col mobile, 2 col tablet, 4 col desktop) verified.');

// Check API fetch for Asnaf master data
assert.ok(
  content.includes("fetch('/api/admin/asnaf')"),
  'FAIL: Must fetch from /api/admin/asnaf'
);
console.log('PASS: Asnaf Master Data API fetch verified.');

// Check maximum 2 options logic in toggleAsnaf
assert.ok(
  content.includes('prev.length >= 2') && content.includes('สามารถเลือกหมวดหมู่อัสนัฟได้ไม่เกิน 2 ตัวเลือก'),
  'FAIL: Must restrict selection to maximum 2 choices in toggleAsnaf'
);
console.log('PASS: toggleAsnaf restricts to max 2 choices.');

// Check validation warning on empty and on > 2
assert.ok(
  content.includes('selectedAsnafs.length === 0'),
  'FAIL: Must check selectedAsnafs.length === 0 for validation'
);
assert.ok(
  content.includes('selectedAsnafs.length > 2'),
  'FAIL: Must check selectedAsnafs.length > 2 for validation'
);
console.log('PASS: Validation warning for 0 choices and > 2 choices verified.');

// Check UI badge text for max 2 choices
assert.ok(
  content.includes('สามารถเลือกได้ไม่เกิน 2 ตัวเลือก'),
  'FAIL: Subtitle must specify max 2 choices'
);
assert.ok(
  content.includes('เลือกแล้ว 2/2 หมวดหมู่'),
  'FAIL: Badge must indicate 2/2 choices'
);
console.log('PASS: UI badge and subtitle for max 2 choices verified.');

// Check draft persistence
assert.ok(
  content.includes('asnafCategories: selectedAsnafs') && content.includes('selectedAsnafs,'),
  'FAIL: Draft save must include selectedAsnafs'
);
console.log('PASS: Draft persistence verified.');

console.log('\n--- ALL REGISTRATION FORM SOURCE TESTS PASSED! ---');
