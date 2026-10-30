import { PrismaClient } from '@prisma/client';
import { MODULE_PERMISSION_CATALOG, PERMISSION_CODES } from '@zms/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding comprehensive 15-module permission catalog...');

  // 1. Upsert all permissions from catalog and PERMISSION_CODES
  let permCount = 0;
  for (const module of MODULE_PERMISSION_CATALOG) {
    for (const act of module.actions) {
      await prisma.permission.upsert({
        where: { code: act.code },
        update: { description: `[${module.nameTh}] ${act.labelTh}` },
        create: {
          code: act.code,
          description: `[${module.nameTh}] ${act.labelTh}`,
        },
      });
      permCount++;
    }
  }

  // Also ensure legacy codes are upserted
  for (const code of PERMISSION_CODES) {
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: {
        code,
        description: `ระบบซะกาต (${code})`,
      },
    });
  }
  console.log(`Total permissions in catalog upserted: ${permCount}`);

  // 2. Ensure 7 Standard Roles exist with isSystem = true
  const standardRoles = [
    { code: 'SUPER_ADMIN', name: 'ผู้ดูแลระบบสูงสุด (Super Admin)', description: 'สิทธิ์สูงสุดในการจัดการระบบทั้งหมด', isSystem: true },
    { code: 'ADMIN', name: 'ผู้ดูแลระบบทั่วไป (Admin)', description: 'จัดการผู้ใช้ สาขา แผนก และการตั้งค่าระบบ', isSystem: true },
    { code: 'ASSISTANCE_OFFICER', name: 'เจ้าหน้าที่ฝ่ายสงเคราะห์ (Assistance Officer)', description: 'รับคำขอ ลงพื้นที่ ประเมินสิทธิ์ และส่งมอบการช่วยเหลือ', isSystem: true },
    { code: 'FINANCE_OFFICER', name: 'เจ้าหน้าที่ฝ่ายการเงิน (Finance Officer)', description: 'จัดการกองทุน บัญชีธนาคาร บันทึกรายรับ และจัดทำรายจ่าย', isSystem: true },
    { code: 'TREASURER', name: 'เหรัญญิกมูลนิธิ (Treasurer)', description: 'อนุมัติการจ่ายเงิน ตรวจสอบงบประมาณ และยืนยันการเบิกจ่าย', isSystem: true },
    { code: 'APPROVER', name: 'ผู้มีอำนาจอนุมัติ (Approver)', description: 'พิจารณาอนุมัติคำขอความช่วยเหลือตามเกณฑ์ชะรีอะฮ์', isSystem: true },
    { code: 'AUDITOR', name: 'ผู้ตรวจสอบภายใน (Auditor)', description: 'ตรวจสอบความถูกต้อง เรียกดูประวัติการทำงานและรายงาน (Read-only)', isSystem: true },
  ];

  for (const r of standardRoles) {
    await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, description: r.description, isSystem: true, status: 'ACTIVE' },
      create: { code: r.code, name: r.name, description: r.description, isSystem: true, isCustom: false, status: 'ACTIVE' },
    });
  }

  // 3. Map Default Role Permissions
  const allDbPerms = await prisma.permission.findMany();
  const permMap = new Map(allDbPerms.map((p) => [p.code, p.id]));

  // Helper to assign perms to role
  const assignRolePerms = async (roleCode: string, codes: string[]) => {
    const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
    for (const code of codes) {
      const pId = permMap.get(code);
      if (pId) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: pId } },
          update: {},
          create: { roleId: role.id, permissionId: pId },
        });
      }
    }
  };

  // SUPER_ADMIN: Gets EVERYTHING
  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { code: 'SUPER_ADMIN' } });
  for (const p of allDbPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: p.id },
    });
  }

  // ADMIN
  await assignRolePerms('ADMIN', [
    'dashboard.access', 'dashboard.view', 'dashboard.view.kpi.org',
    'beneficiaries.view', 'beneficiaries.export',
    'users.view', 'users.create', 'users.edit', 'users.suspend', 'roles.manage', 'permissions.manage', 'users.reset_password', 'users.manage_2fa',
    'branches.view', 'branches.create', 'branches.edit', 'departments.manage', 'branches.assign_staff',
    'zakat_calc.view', 'zakat_calc.use', 'zakat_calc.manage_rules', 'zakat_calc.history',
    'audit.view', 'audit.search', 'audit.export',
    'settings.view', 'settings.manage', 'backup.create', 'settings.config',
    'reports.view', 'reports.generate', 'reports.export_excel', 'reports.export_pdf'
  ]);

  // ASSISTANCE_OFFICER
  await assignRolePerms('ASSISTANCE_OFFICER', [
    'dashboard.access', 'dashboard.view',
    'beneficiaries.view', 'beneficiaries.create', 'beneficiaries.edit', 'beneficiaries.verify', 'beneficiaries.export',
    'requests.view', 'requests.create', 'requests.edit', 'requests.submit', 'requests.cancel',
    'assessment.view', 'assessment.perform', 'assessment.edit', 'assessment.submit', 'assessment.verify_docs',
    'assistance.view', 'assistance.create', 'assistance.edit_draft', 'assistance.upload_evidence',
    'followup.view', 'followup.create', 'followup.edit', 'followup.upload_evidence', 'followup.close',
    'reports.view', 'reports.export_excel', 'reports.export_pdf'
  ]);

  // FINANCE_OFFICER
  await assignRolePerms('FINANCE_OFFICER', [
    'dashboard.access', 'dashboard.view', 'dashboard.view.kpi.financial',
    'beneficiaries.view',
    'finance.dashboard.view', 'finance.income.view', 'finance.income.create',
    'finance.bank.view', 'finance.bank.manage', 'finance.txn.view', 'finance.txn.create',
    'finance.expense.record', 'finance.handover.record', 'finance.reconcile', 'finance.reports.export',
    'assistance.view', 'assistance.create', 'assistance.confirm_handover', 'assistance.upload_evidence',
    'donations.view', 'donations.create', 'donations.confirm_payment', 'donations.issue_receipt',
    'reports.view', 'reports.generate', 'reports.export_excel', 'reports.export_pdf'
  ]);

  // TREASURER
  await assignRolePerms('TREASURER', [
    'dashboard.access', 'dashboard.view', 'dashboard.view.kpi.financial',
    'finance.dashboard.view', 'finance.bank.view', 'finance.txn.view', 'finance.txn.approve', 'finance.reports.export',
    'assistance.view', 'assistance.confirm_actual',
    'reports.view', 'reports.export_excel', 'reports.export_pdf'
  ]);

  // APPROVER
  await assignRolePerms('APPROVER', [
    'dashboard.access', 'dashboard.view',
    'beneficiaries.view', 'requests.view', 'assessment.view',
    'approvals.view', 'approvals.approve', 'approvals.reject', 'approvals.return', 'approvals.delegate',
    'reports.view', 'reports.export_excel', 'reports.export_pdf'
  ]);

  // AUDITOR
  await assignRolePerms('AUDITOR', [
    'dashboard.access', 'dashboard.view', 'dashboard.view.kpi.financial', 'dashboard.view.kpi.org',
    'beneficiaries.view', 'beneficiaries.export',
    'requests.view', 'assessment.view', 'approvals.view', 'assistance.view', 'followup.view',
    'finance.dashboard.view', 'finance.income.view', 'finance.bank.view', 'finance.txn.view', 'finance.reports.export',
    'audit.view', 'audit.search', 'audit.export',
    'reports.view', 'reports.generate', 'reports.export_excel', 'reports.export_pdf', 'reports.view_sensitive'
  ]);

  console.log('Role permissions seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
