const fs = require('fs');
let s = fs.readFileSync('src/app/page.tsx', 'utf8');
const isCrlf = s.includes('\r\n');
let norm = s.replace(/\r\n/g, '\n');

// 1. Add import
const importTarget = `import { BranchesAndDepartmentsView, AdminSettingsView } from '@/components/views/AdminOrgAndSettingsViews';`;
const newImport = `import { BranchesAndDepartmentsView, AdminSettingsView } from '@/components/views/AdminOrgAndSettingsViews';
import { SystemAdminCenterView } from '@/components/views/admin/SystemAdminCenterView';`;

if (!norm.includes(importTarget)) {
  console.error('Import target not found!');
  process.exit(1);
}
norm = norm.replace(importTarget, newImport);

// 2. Add cases to getPageTitle
const titleTarget = `      case 'settings': return 'การตั้งค่าระบบ & สำรองข้อมูล (System Settings)';`;
const newTitles = `      case 'admin-center': return 'การตั้งค่าและบริหารระบบ (System Administration & Configuration)';
      case 'roles-permissions': return 'บทบาทและสิทธิ์การเข้าถึง (Roles & Permissions)';
      case 'assistance-models': return 'รูปแบบการช่วยเหลือ (Assistance Models)';
      case 'assistance-types': return 'ประเภทความช่วยเหลือ (Assistance Types)';
      case 'asnaf-categories': return 'หมวดหมู่อัสนัฟ (Asnaf Master Data)';
      case 'settings': return 'การตั้งค่าและบริหารระบบ (System Administration & Configuration)';`;

norm = norm.replace(titleTarget, newTitles);

// 3. Replace separate render blocks
// Replace users render
const usersRender = `          {currentView === 'users' && (
            <UserManagementView onNavigate={setCurrentView} />
          )}`;

const newAdminCenterRender = `          {[
            'admin-center',
            'users',
            'branches-depts',
            'settings',
            'roles-permissions',
            'assistance-models',
            'assistance-types',
            'asnaf-categories',
          ].includes(currentView) && (
            <SystemAdminCenterView
              initialTab={currentView}
              onNavigate={setCurrentView}
            />
          )}`;

norm = norm.replace(usersRender, newAdminCenterRender);

// Remove the old branches-depts and settings blocks
const branchesRender = `          {currentView === 'branches-depts' && (
            <BranchesAndDepartmentsView onNavigate={setCurrentView} />
          )}`;
norm = norm.replace(branchesRender, '');

const settingsRender = `          {currentView === 'settings' && (
            <AdminSettingsView />
          )}`;
norm = norm.replace(settingsRender, '');

if (isCrlf) {
  norm = norm.replace(/\n/g, '\r\n');
}

fs.writeFileSync('src/app/page.tsx', norm, 'utf8');
console.log('page.tsx updated successfully!');

