const fs = require('fs');
const path = require('path');

const sidebarPath = path.join(__dirname, '../src/components/layout/Sidebar.tsx');
const sidebarCode = fs.readFileSync(sidebarPath, 'utf8');

const pagePath = path.join(__dirname, '../src/app/page.tsx');
const pageCode = fs.readFileSync(pagePath, 'utf8');

console.log('=== VERIFYING ZMS SIDEBAR CANONICAL STRUCTURE ===\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${message}`);
  }
}

// 1. Group 1: 9 canonical items in exact order and labels
const expectedGroup1 = [
  { id: 'dashboard', label: 'Dashboard (ภาพรวมระบบ)' },
  { id: 'beneficiaries', label: 'ขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต' },
  { id: 'assistance-requests', label: 'ยื่นคำร้องขอความช่วยเหลือ' },
  { id: 'assessment', label: 'ตรวจสอบ & ประเมินสิทธิ์' },
  { id: 'approvals', label: 'พิจารณาอนุมัติคำร้อง' },
  { id: 'disbursements', label: 'บันทึกการช่วยเหลือ' },
  { id: 'follow-up', label: 'ตรวจสอบและติดตามผล' },
  { id: 'finance', label: 'การเงินและบัญชี' },
  { id: 'officer-reports', label: 'รายงาน' },
];

expectedGroup1.forEach((item, idx) => {
  const hasItem = sidebarCode.includes(`id: '${item.id}'`) && sidebarCode.includes(`label: '${item.label}'`);
  assert(hasItem, `Group 1, Item ${idx + 1}: ${item.label} (${item.id}) exists`);
});

// Verify Group 1 order in code
const g1Order = expectedGroup1.every((item, idx) => {
  if (idx === 0) return true;
  const prevIdx = sidebarCode.indexOf(`id: '${expectedGroup1[idx - 1].id}'`);
  const currIdx = sidebarCode.indexOf(`id: '${item.id}'`);
  return prevIdx !== -1 && currIdx !== -1 && currIdx > prevIdx;
});
assert(g1Order, 'Group 1 items are ordered sequentially in code');

// 2. Group 2: Canonical items
// 2.1 Parent: การตั้งค่าและบริหารระบบ
assert(sidebarCode.includes('การตั้งค่าและบริหารระบบ'), 'Group 2, Item 1: การตั้งค่าและบริหารระบบ exists');

// Sub-Group A: การบริหารระบบ
const expectedSubGroupA = [
  { id: 'admin-users', label: 'จัดการผู้ใช้งาน' },
  { id: 'admin-roles', label: 'บทบาทและสิทธิ์การเข้าถึง' },
  { id: 'admin-org', label: 'โครงสร้างองค์กรและหน่วยงาน' },
];
expectedSubGroupA.forEach((item, idx) => {
  const hasItem = sidebarCode.includes(`id: '${item.id}'`) && sidebarCode.includes(`label: '${item.label}'`);
  assert(hasItem, `Sub-Group A, Item ${idx + 1}: ${item.label} (${item.id}) exists`);
});

// Sub-Group B: การตั้งค่าข้อมูลพื้นฐาน
const expectedSubGroupB = [
  { id: 'admin-models', label: 'รูปแบบการช่วยเหลือ' },
  { id: 'admin-types', label: 'ประเภทความช่วยเหลือ' },
  { id: 'admin-asnaf', label: 'หมวดหมู่ผู้มีสิทธิ์รับซะกาต (อัสนัฟ)' },
  { id: 'admin-settings', label: 'การตั้งค่าทั่วไป' },
];
expectedSubGroupB.forEach((item, idx) => {
  const hasItem = sidebarCode.includes(`id: '${item.id}'`) && sidebarCode.includes(`label: '${item.label}'`);
  assert(hasItem, `Sub-Group B, Item ${idx + 1}: ${item.label} (${item.id}) exists`);
});

// 2.2 - 2.5 Standalone items in Group 2
const expectedGroup2Standalone = [
  { id: 'calculator', label: 'คำนวณซะกาต 5 หมวด' },
  { id: 'payment', label: 'รับบริจาค / จ่ายซะกาต' },
  { id: 'audit-logs', label: 'บันทึกประวัติการทำงาน (Audit)' },
  { id: 'backup', label: 'สำรองข้อมูล' },
];
expectedGroup2Standalone.forEach((item, idx) => {
  const hasItem = sidebarCode.includes(`handleNavigate('${item.id}')`) && sidebarCode.includes(item.label);
  assert(hasItem, `Group 2 Standalone Item ${idx + 2}: ${item.label} (${item.id}) exists as independent menu`);
});

// Verify Group 2 standalone order
const g2Order = expectedGroup2Standalone.every((item, idx) => {
  if (idx === 0) return true;
  const prevIdx = sidebarCode.indexOf(`handleNavigate('${expectedGroup2Standalone[idx - 1].id}')`);
  const currIdx = sidebarCode.indexOf(`handleNavigate('${item.id}')`);
  return prevIdx !== -1 && currIdx !== -1 && currIdx > prevIdx;
});
assert(g2Order, 'Group 2 standalone items are ordered sequentially in code');

// 3. UI/UX Features: Expand/collapse chevron
assert(sidebarCode.includes('isAdminExpanded') && sidebarCode.includes('ChevronDown') && sidebarCode.includes('ChevronRight'), 'Chevron toggle expand/collapse state implemented');

// 4. Role-based permission filtering for admin menu & hide parent if no items
assert(sidebarCode.includes('allowedAdminSubGroups') && sidebarCode.includes('canAccessAdmin'), 'RBAC filtering for admin sub-items & hide parent if empty implemented');

// 5. Routing in page.tsx for backup and all admin sub-items
assert(pageCode.includes("case 'backup':"), "page.tsx handles 'backup' view");
assert(pageCode.includes("case 'admin-center':") && pageCode.includes("case 'admin-users':"), "page.tsx handles admin-center and admin sub-views");
assert(/<SystemAdminCenterView\s+initialTab=/.test(pageCode), "SystemAdminCenterView is rendered with appropriate initial tab");

console.log(`\n=== RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests/totalTests)*100)}%) ===`);
if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
