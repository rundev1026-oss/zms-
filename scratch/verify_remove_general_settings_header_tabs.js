const fs = require('fs');
const path = require('path');

console.log('=== VERIFYING REMOVAL OF GENERAL SETTINGS HEADER & TABS ON DATABASE BACKUP ===\n');

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

// 1. Inspect DatabaseBackupTab.tsx
const backupTabPath = path.join(__dirname, '../src/components/views/admin/tabs/DatabaseBackupTab.tsx');
assert(fs.existsSync(backupTabPath), 'DatabaseBackupTab.tsx component exists');
const backupTabCode = fs.readFileSync(backupTabPath, 'utf8');

// Ensure NO General Settings Header or Tab Navigation inside DatabaseBackupTab
assert(!backupTabCode.includes('Master Configuration: General Settings'), 'DatabaseBackupTab does NOT contain "Master Configuration: General Settings"');
assert(!backupTabCode.includes('การตั้งค่าทั่วไป (General Settings)'), 'DatabaseBackupTab does NOT contain "การตั้งค่าทั่วไป (General Settings)"');
assert(!backupTabCode.includes('A. ข้อมูลองค์กร'), 'DatabaseBackupTab does NOT contain "A. ข้อมูลองค์กร" tab');
assert(!backupTabCode.includes('B. การตั้งค่าระบบ'), 'DatabaseBackupTab does NOT contain "B. การตั้งค่าระบบ" tab');
assert(!backupTabCode.includes('C. รูปแบบเอกสาร'), 'DatabaseBackupTab does NOT contain "C. รูปแบบเอกสาร" tab');
assert(!backupTabCode.includes('D. การแจ้งเตือน'), 'DatabaseBackupTab does NOT contain "D. การแจ้งเตือน" tab');
assert(!backupTabCode.includes('E. ความปลอดภัย'), 'DatabaseBackupTab does NOT contain "E. ความปลอดภัย" tab');
assert(!backupTabCode.includes('บันทึกการตั้งค่าทั้งหมด'), 'DatabaseBackupTab does NOT contain "บันทึกการตั้งค่าทั้งหมด" button');

// Ensure Backup Content IS preserved
assert(backupTabCode.includes('การสำรองข้อมูลและความปลอดภัย (Database Backup & Integrity)'), 'Contains "การสำรองข้อมูลและความปลอดภัย (Database Backup & Integrity)"');
assert(backupTabCode.includes('สำรองฐานข้อมูลทันที (Manual Database Backup)'), 'Contains manual backup section');
assert(backupTabCode.includes('สำรองฐานข้อมูลเดี๋ยวนี้'), 'Contains "สำรองฐานข้อมูลเดี๋ยวนี้" action button');
assert(backupTabCode.includes('SHA-256 Checksum'), 'Contains SHA-256 Checksum calculation and display');
assert(backupTabCode.includes('ประวัติการสำรองฐานข้อมูล (Backup History Log)'), 'Contains backup history log table');
assert(backupTabCode.includes('ระบบบันทึก Audit Log'), 'Contains Audit Log integration and notification');
assert(backupTabCode.includes('/api/system/backup'), 'Calls API endpoint /api/system/backup for snapshot and history');

// 2. Inspect SystemAdminCenterView.tsx
const adminCenterPath = path.join(__dirname, '../src/components/views/admin/SystemAdminCenterView.tsx');
const adminCenterCode = fs.readFileSync(adminCenterPath, 'utf8');

assert(adminCenterCode.includes("import { DatabaseBackupTab } from './tabs/DatabaseBackupTab';"), 'SystemAdminCenterView imports DatabaseBackupTab');
assert(adminCenterCode.includes("activeTab === 'backup'"), 'SystemAdminCenterView handles activeTab === "backup"');
assert(adminCenterCode.includes("<DatabaseBackupTab />"), 'SystemAdminCenterView renders <DatabaseBackupTab /> directly');
assert(adminCenterCode.includes("title: 'สำรองข้อมูล (Database Backup)'"), 'Breadcrumb shows title "สำรองข้อมูล (Database Backup)" for backup tab');

// 3. Inspect GeneralSettingsTab.tsx
const generalSettingsPath = path.join(__dirname, '../src/components/views/admin/tabs/GeneralSettingsTab.tsx');
const generalSettingsCode = fs.readFileSync(generalSettingsPath, 'utf8');

assert(!generalSettingsCode.includes('Master Configuration: General Settings'), 'GeneralSettingsTab does NOT have duplicate "Master Configuration: General Settings" header');
assert(!generalSettingsCode.includes('บันทึกการตั้งค่าทั้งหมด'), 'GeneralSettingsTab does NOT have duplicate "บันทึกการตั้งค่าทั้งหมด" button');
assert(generalSettingsCode.includes("if (initialSubSection === 'backup')"), 'GeneralSettingsTab redirects backup sub-section directly to DatabaseBackupTab');

// 4. Test Backup API execution
async function runApiTests() {
  try {
    const listRes = await fetch('http://localhost:3000/api/system/backup');
    const listJson = await listRes.json();
    assert(listRes.ok && listJson.success && Array.isArray(listJson.data), 'GET /api/system/backup returns backup history list');

    const postRes = await fetch('http://localhost:3000/api/system/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: 'Automated verification test' })
    });
    const postJson = await postRes.json();
    assert(postRes.ok && postJson.success && Boolean(postJson.data?.checksum), 'POST /api/system/backup generates database snapshot with valid SHA-256 checksum');

    console.log(`\n=== RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests/totalTests)*100)}%) ===`);
    if (passedTests === totalTests) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('API Verification error:', err);
    process.exit(1);
  }
}

runApiTests();

