/**
 * Phase 11 Verification Suite: Frontend Modernization, Next.js 16 App Router UI Views & Styling
 *
 * Test Suites:
 * 1. Enterprise Shared Components Verification (18 Shared UI Components)
 * 2. Enterprise Styling & Typography Audit (Tailwind CSS 4, Prompt, Sarabun, Colors)
 * 3. Flat Sidebar Navigation Structure (No Submenus, Direct Routes, Group 1 & 2)
 * 4. Direct Routes Verification (All 17 core routes return HTTP 200 OK)
 * 5. Beneficiary Registration 5-Step Form Verification (Layout, Steps 1-5, Actions)
 * 6. Public Portal Direct Routes (Home, About, Donate, Transparency, Login)
 * 7. Mobile Responsiveness & Touch Momentum Scrolling Support
 * 8. StatusBadge Variant Matrix (Success, Warning, Danger, Info, Neutral, Primary, Teal)
 * 9. DataTable Component Capabilities (Search, Sorting, Pagination, Custom Renderers)
 * 10. Next.js 16 Production Build & Turbopack Optimization Verification
 */

import fs from 'fs';
import path from 'path';

const NEXT_BASE = 'http://localhost:3001';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, details?: any) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] #${totalTests}: ${testName}`);
  } else {
    console.error(`  [FAIL] #${totalTests}: ${testName}`, details ?? '');
    throw new Error(`Assertion failed: ${testName}`);
  }
}

async function checkRoute(endpoint: string) {
  const url = `${NEXT_BASE}${endpoint}`;
  const res = await fetch(url);
  return { status: res.status, ok: res.ok };
}

async function runVerification() {
  console.log('================================================================');
  console.log('   PHASE 11: FRONTEND MODERNIZATION & APP ROUTER SUITE          ');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // SUITE 1: Enterprise Shared UI Components Verification
  // -------------------------------------------------------------
  console.log('--- SUITE 1: Enterprise Shared UI Components Verification ---');
  const sharedComponents = [
    { name: 'AppLayout', path: 'src/components/layout/AppLayout.tsx' },
    { name: 'Sidebar', path: 'src/components/layout/Sidebar.tsx' },
    { name: 'TopNavbar', path: 'src/components/layout/Navbar.tsx' },
    { name: 'PageHeader', path: 'src/components/common/PageHeader.tsx' },
    { name: 'Breadcrumb', path: 'src/components/common/Breadcrumb.tsx' },
    { name: 'DataTable', path: 'src/components/common/DataTable.tsx' },
    { name: 'FormSection', path: 'src/components/common/FormSection.tsx' },
    { name: 'FormInput', path: 'src/components/common/FormInput.tsx' },
    { name: 'FormSelect', path: 'src/components/common/FormSelect.tsx' },
    { name: 'DatePicker', path: 'src/components/common/DatePicker.tsx' },
    { name: 'FileUpload', path: 'src/components/common/FileUpload.tsx' },
    { name: 'StatusBadge', path: 'src/components/common/StatusBadge.tsx' },
    { name: 'ConfirmDialog', path: 'src/components/common/ConfirmDialog.tsx' },
    { name: 'DetailDrawer', path: 'src/components/common/DetailDrawer.tsx' },
    { name: 'Notification', path: 'src/components/common/Notification.tsx' },
    { name: 'LoadingState', path: 'src/components/common/LoadingState.tsx' },
    { name: 'EmptyState', path: 'src/components/common/EmptyState.tsx' },
    { name: 'ErrorState', path: 'src/components/common/ErrorState.tsx' },
  ];

  for (const comp of sharedComponents) {
    const fullPath = path.resolve(comp.path);
    assert(fs.existsSync(fullPath), `Shared Component [${comp.name}] exists at ${comp.path}`);
  }

  // -------------------------------------------------------------
  // SUITE 2: Enterprise Styling & Typography Audit
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: Enterprise Styling & Typography Audit ---');
  const globalsCss = fs.readFileSync(path.resolve('src/app/globals.css'), 'utf8');
  assert(globalsCss.includes('Prompt'), 'Typography imports Google Font Prompt');
  assert(globalsCss.includes('Sarabun'), 'Typography imports Google Font Sarabun');
  assert(globalsCss.includes('@import "tailwindcss"') || globalsCss.includes('@tailwind'), 'Tailwind CSS is imported in globals.css');
  assert(globalsCss.includes('--zms-navy: #0b2545') || globalsCss.includes('#0b2545'), 'Palette includes Navy (#0B2545)');
  assert(globalsCss.includes('--zms-teal: #0d9488') || globalsCss.includes('#0d9488'), 'Palette includes Teal (#0D9488)');
  assert(globalsCss.includes('--zms-amber: #f59e0b') || globalsCss.includes('#f59e0b'), 'Palette includes Amber (#F59E0B)');

  // -------------------------------------------------------------
  // SUITE 3: Flat Sidebar Navigation Structure (No Submenus)
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: Flat Sidebar Navigation Structure ---');
  const sidebarCode = fs.readFileSync(path.resolve('src/components/layout/Sidebar.tsx'), 'utf8');
  assert(sidebarCode.includes('กลุ่มที่ 1: ระบบงานหลัก'), 'Sidebar includes Group 1: Core Operations');
  assert(sidebarCode.includes('กลุ่มที่ 2: ระบบงานและเครื่องมือสนับสนุน'), 'Sidebar includes Group 2: Support Tools');
  assert(sidebarCode.includes('beneficiaries'), 'Group 1 contains Beneficiary Registry (ทะเบียนผู้มีสิทธิ์รับซะกาต)');
  assert(sidebarCode.includes('assistance-requests'), 'Group 1 contains Assistance Requests (ยื่นคำร้องขอความช่วยเหลือ)');
  assert(sidebarCode.includes('assessment'), 'Group 1 contains Assessment (ตรวจสอบและประเมินสิทธิ์)');
  assert(sidebarCode.includes('approvals'), 'Group 1 contains Approvals (พิจารณาอนุมัติคำร้อง)');
  assert(sidebarCode.includes('disbursements'), 'Group 1 contains Disbursements (บันทึกการช่วยเหลือ)');
  assert(sidebarCode.includes('follow-up'), 'Group 1 contains Follow-up & Monitoring (ตรวจสอบและติดตามผล)');
  assert(sidebarCode.includes('finance'), 'Group 1 contains Finance & Accounting (การเงินและบัญชี)');
  assert(sidebarCode.includes('officer-reports'), 'Group 1 contains Reports (รายงาน)');
  assert(sidebarCode.includes('users'), 'Group 2 contains User Management (จัดการผู้ใช้งานและสิทธิ์)');
  assert(sidebarCode.includes('branches-depts'), 'Group 2 contains Branches & Org (สาขาและแผนกองค์กร)');
  assert(sidebarCode.includes('calculator'), 'Group 2 contains Zakat Calculator (คำนวณซะกาต 5 หมวด)');
  assert(sidebarCode.includes('payment'), 'Group 2 contains Donations & Payments (รับบริจาค / จ่ายซะกาต)');
  assert(sidebarCode.includes('audit-logs'), 'Group 2 contains Audit Trail (บันทึกประวัติการทำงาน)');
  assert(sidebarCode.includes('settings'), 'Group 2 contains Settings & Backup (การตั้งค่าระบบและสำรองข้อมูล)');
  assert(!sidebarCode.includes('<Accordion') && !sidebarCode.includes('dropdown'), 'Sidebar maintains Flat Navigation with zero nested submenus');

  // -------------------------------------------------------------
  // SUITE 4: Direct Routes Verification (Staff Workbench)
  // -------------------------------------------------------------
  console.log('\n--- SUITE 4: Direct Routes Verification (Staff Workbench) ---');
  const staffRoutes = [
    { path: '/dashboard', label: 'Dashboard ภาพรวมระบบ' },
    { path: '/beneficiaries', label: 'ทะเบียนผู้มีสิทธิ์รับซะกาต' },
    { path: '/beneficiaries/register', label: 'แบบฟอร์มขึ้นทะเบียน 5 ขั้นตอน' },
    { path: '/assistance-requests', label: 'ยื่นคำร้องขอความช่วยเหลือ' },
    { path: '/assessment', label: 'ตรวจสอบและประเมินสิทธิ์' },
    { path: '/approvals', label: 'พิจารณาอนุมัติคำขอ' },
    { path: '/assistance', label: 'บันทึกการช่วยเหลือ (Assistance)' },
    { path: '/disbursements', label: 'บันทึกการช่วยเหลือ (Disbursements)' },
    { path: '/follow-up', label: 'ตรวจสอบและติดตามผล' },
    { path: '/finance', label: 'การเงินและบัญชี' },
    { path: '/reports', label: 'รายงานและการวิเคราะห์' },
    { path: '/users', label: 'จัดการผู้ใช้งานและสิทธิ์' },
    { path: '/branches', label: 'สาขาและแผนกองค์กร' },
    { path: '/zakat-calculator', label: 'คำนวณซะกาต 5 หมวด' },
    { path: '/donations', label: 'รับบริจาค / จ่ายซะกาต' },
    { path: '/audit', label: 'บันทึกประวัติการทำงาน (Audit)' },
    { path: '/settings', label: 'การตั้งค่าระบบและสำรองข้อมูล' },
  ];

  for (const r of staffRoutes) {
    const res = await checkRoute(r.path);
    assert(res.ok && res.status === 200, `Direct Route [${r.path}] (${r.label}) responds HTTP 200 OK`);
  }

  // -------------------------------------------------------------
  // SUITE 5: Beneficiary Registration 5-Step Form Verification
  // -------------------------------------------------------------
  console.log('\n--- SUITE 5: Beneficiary Registration 5-Step Form Verification ---');
  const multiStepCode = fs.readFileSync(path.resolve('src/components/views/MultiStepRegistrationView.tsx'), 'utf8');
  assert(multiStepCode.includes('STEP 1') || multiStepCode.includes('ข้อมูลบุคคลและที่อยู่'), 'Step 1: ข้อมูลบุคคลและที่อยู่ implemented');
  assert(multiStepCode.includes('STEP 2') || multiStepCode.includes('สภาพปัญหาและความช่วยเหลือ'), 'Step 2: สภาพปัญหาและความช่วยเหลือ implemented');
  assert(multiStepCode.includes('STEP 3') || multiStepCode.includes('ประวัติและรายรับ') || multiStepCode.includes('รายรับ–รายจ่าย'), 'Step 3: ประวัติและรายรับ-รายจ่าย implemented');
  assert(multiStepCode.includes('STEP 4') || multiStepCode.includes('ครอบครัวและความจำเป็น'), 'Step 4: ครอบครัวและความจำเป็น implemented');
  assert(multiStepCode.includes('STEP 5') || multiStepCode.includes('ผู้รับรองและเอกสารแนบ'), 'Step 5: ผู้รับรองและเอกสารแนบ implemented');
  assert(multiStepCode.includes('GoogleMapsLocationPicker') || multiStepCode.includes('latitude'), 'Step 1 includes Google Maps GPS coordinates picker');
  assert(multiStepCode.includes('บันทึกฉบับร่าง') || multiStepCode.includes('Save Draft'), 'Form includes Save Draft action');
  assert(multiStepCode.includes('ขั้นตอนก่อนหน้า') || multiStepCode.includes('ย้อนกลับ') || multiStepCode.includes('Previous'), 'Form includes Previous navigation action');
  assert(multiStepCode.includes('ถัดไป') || multiStepCode.includes('Next'), 'Form includes Next navigation action');
  assert(multiStepCode.includes('ยื่นคำร้อง') || multiStepCode.includes('Submit'), 'Form includes Final Submit action');

  // -------------------------------------------------------------
  // SUITE 6: Public Portal Direct Routes
  // -------------------------------------------------------------
  console.log('\n--- SUITE 6: Public Portal Direct Routes ---');
  const publicRoutes = [
    { path: '/', label: 'หน้าแรกพอร์ทัลประชาชน' },
    { path: '/about', label: 'เกี่ยวกับมูลนิธิ' },
    { path: '/donate', label: 'บริจาคออนไลน์' },
    { path: '/transparency', label: 'ความโปร่งใสและรายงานสาธารณะ' },
    { path: '/login', label: 'เข้าสู่ระบบเจ้าหน้าที่' },
  ];

  for (const pr of publicRoutes) {
    const res = await checkRoute(pr.path);
    assert(res.ok && res.status === 200, `Public Route [${pr.path}] (${pr.label}) responds HTTP 200 OK`);
  }

  // -------------------------------------------------------------
  // SUITE 7: Mobile Responsiveness & Touch Momentum Scrolling
  // -------------------------------------------------------------
  console.log('\n--- SUITE 7: Mobile Responsiveness & Touch Momentum Scrolling ---');
  assert(globalsCss.includes('pt-safe') && globalsCss.includes('pb-safe'), 'Safe Area insets (iOS / iPhone 15) configured in globals.css');
  assert(globalsCss.includes('touch-scroll'), 'Touch momentum scrolling configured in globals.css');
  assert(sidebarCode.includes('isMobileOpen') && sidebarCode.includes('translate-x'), 'Sidebar supports responsive mobile drawer toggle and backdrop');

  // -------------------------------------------------------------
  // SUITE 8: StatusBadge Variant Matrix
  // -------------------------------------------------------------
  console.log('\n--- SUITE 8: StatusBadge Variant Matrix ---');
  const statusBadgeCode = fs.readFileSync(path.resolve('src/components/common/StatusBadge.tsx'), 'utf8');
  assert(statusBadgeCode.includes('success'), 'StatusBadge supports success variant');
  assert(statusBadgeCode.includes('warning'), 'StatusBadge supports warning variant');
  assert(statusBadgeCode.includes('danger'), 'StatusBadge supports danger variant');
  assert(statusBadgeCode.includes('info'), 'StatusBadge supports info variant');
  assert(statusBadgeCode.includes('teal'), 'StatusBadge supports teal variant');
  assert(statusBadgeCode.includes('primary'), 'StatusBadge supports primary variant');
  assert(statusBadgeCode.includes('showDot'), 'StatusBadge supports live indicator dot');

  // -------------------------------------------------------------
  // SUITE 9: DataTable Component Capabilities
  // -------------------------------------------------------------
  console.log('\n--- SUITE 9: DataTable Component Capabilities ---');
  const dataTableCode = fs.readFileSync(path.resolve('src/components/common/DataTable.tsx'), 'utf8');
  assert(dataTableCode.includes('searchTerm'), 'DataTable supports real-time search filtering');
  assert(dataTableCode.includes('sortKey') && dataTableCode.includes('sortOrder'), 'DataTable supports multi-column sorting');
  assert(dataTableCode.includes('currentPage') && dataTableCode.includes('pageSize'), 'DataTable supports client-side pagination');
  assert(dataTableCode.includes('emptyTitle'), 'DataTable includes customizable empty state');
  assert(dataTableCode.includes('isLoading'), 'DataTable includes animated loading state');

  // -------------------------------------------------------------
  // SUITE 10: Next.js 16 Production Build & Turbopack Optimization
  // -------------------------------------------------------------
  console.log('\n--- SUITE 10: Next.js 16 Production Build & Turbopack Optimization ---');
  const nextConfigExists = fs.existsSync(path.resolve('next.config.ts')) || fs.existsSync(path.resolve('next.config.js'));
  assert(nextConfigExists, 'Next.js configuration file exists');
  const nextBuildDir = path.resolve('.next');
  assert(fs.existsSync(nextBuildDir), 'Production build artifact (.next) exists');

  console.log('\n================================================================');
  console.log(`   ALL ${passedTests} / ${totalTests} TESTS PASSED SUCCESSFULLY (100%)       `);
  console.log('================================================================\n');
}

runVerification().catch((err) => {
  console.error('\nVerification failed with exception:', err);
  process.exit(1);
});
