const fs = require('fs');
let s = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');

// Normalize line endings to LF for replacement
const isCrlf = s.includes('\r\n');
let norm = s.replace(/\r\n/g, '\n');

const oldTarget = `    {
      title: 'กลุ่มที่ 2: ระบบงานและเครื่องมือสนับสนุน',
      items: [
        {
          id: 'users',
          label: 'จัดการผู้ใช้งาน',
          icon: ShieldAlert,
          allowedRoles: ['super_admin'],
        },
        {
          id: 'branches-depts',
          label: 'สาขาและแผนกองค์กร',
          icon: Building2,
          allowedRoles: ['super_admin', 'executive'],
        },
        {
          id: 'calculator',
          label: 'คำนวณซะกาต 5 หมวด',
          icon: Calculator,
          allowedRoles: ['super_admin', 'finance', 'officer', 'member'],
        },
        {
          id: 'payment',
          label: 'รับบริจาค / จ่ายซะกาต',
          icon: ArrowUpRight,
          allowedRoles: ['super_admin', 'finance', 'officer'],
        },
        {
          id: 'audit-logs',
          label: 'บันทึกประวัติการทำงาน (Audit)',
          icon: Clock,
          allowedRoles: ['super_admin', 'executive'],
        },
        {
          id: 'settings',
          label: 'การตั้งค่าระบบ & สำรองข้อมูล',
          icon: Settings,
          allowedRoles: ['super_admin'],
        },
      ],
    },`;

const newTarget = `    {
      title: 'กลุ่มที่ 2: ระบบงานและเครื่องมือสนับสนุน',
      items: [
        {
          id: 'admin-center',
          label: 'การตั้งค่าและบริหารระบบ',
          icon: Settings,
          allowedRoles: ['super_admin', 'executive', 'admin'],
        },
        {
          id: 'calculator',
          label: 'คำนวณซะกาต 5 หมวด',
          icon: Calculator,
          allowedRoles: ['super_admin', 'finance', 'officer', 'member'],
        },
        {
          id: 'payment',
          label: 'รับบริจาค / จ่ายซะกาต',
          icon: ArrowUpRight,
          allowedRoles: ['super_admin', 'finance', 'officer'],
        },
        {
          id: 'audit-logs',
          label: 'บันทึกประวัติการทำงาน (Audit)',
          icon: Clock,
          allowedRoles: ['super_admin', 'executive'],
        },
      ],
    },`;

const oldIsActive = `                    const isActive = currentView === item.id;`;
const newIsActive = `                    const isAdminView = ['admin-center', 'users', 'branches-depts', 'settings', 'roles-permissions', 'assistance-models', 'assistance-types', 'asnaf-categories'].includes(currentView);
                    const isActive = item.id === 'admin-center' ? isAdminView : currentView === item.id;`;

if (!norm.includes(oldTarget)) {
  console.error('Target not found in normalized content!');
  process.exit(1);
}

norm = norm.replace(oldTarget, newTarget);
norm = norm.replace(oldIsActive, newIsActive);

if (isCrlf) {
  norm = norm.replace(/\n/g, '\r\n');
}

fs.writeFileSync('src/components/layout/Sidebar.tsx', norm, 'utf8');
console.log('Sidebar updated successfully!');

