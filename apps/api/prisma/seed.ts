import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/security/password-hash';
import { PERMISSION_CODES } from '@zms/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding enterprise database...');

  // 1. Roles
  const rolesData = [
    { code: 'SUPER_ADMIN', name: 'ผู้ดูแลระบบสูงสุด', description: 'สิทธิ์สูงสุดในการจัดการระบบทั้งหมด' },
    { code: 'ADMIN', name: 'เจ้าหน้าที่ผู้ดูแลระบบ', description: 'จัดการผู้ใช้ สาขา และการตั้งค่าระบบ' },
    { code: 'ASSISTANCE_OFFICER', name: 'เจ้าหน้าที่ฝ่ายสงเคราะห์', description: 'รับคำขอ ลงพื้นที่ ประเมินสิทธิ์ และติดตามผล' },
    { code: 'FINANCE_OFFICER', name: 'เจ้าหน้าที่ฝ่ายการเงิน', description: 'จัดการงบประมาณ บัญชี และเตรียมจ่ายเงิน' },
    { code: 'TREASURER', name: 'เหรัญญิก', description: 'อนุมัติการจ่ายเงินและเบิกจ่ายเงิน' },
    { code: 'APPROVER', name: 'ผู้มีอำนาจอนุมัติ', description: 'พิจารณาอนุมัติคำขอความช่วยเหลือตามลำดับขั้น' },
    { code: 'AUDITOR', name: 'ผู้ตรวจสอบภายใน', description: 'ตรวจสอบความถูกต้องและเรียกดูประวัติการทำงาน (Read-only)' },
  ];

  for (const r of rolesData) {
    await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, description: r.description },
      create: r,
    });
  }
  console.log('Roles seeded.');

  // 2. Permissions
  for (const code of PERMISSION_CODES) {
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, description: `สิทธิ์การเข้าถึง ${code}` },
    });
  }
  console.log('Permissions seeded.');

  // 3. Role Permissions mapping
  const allPerms = await prisma.permission.findMany();
  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { code: 'SUPER_ADMIN' } });
  
  // Super Admin gets all permissions
  for (const p of allPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: p.id },
    });
  }

  // Assistance Officer permissions
  const officerRole = await prisma.role.findUniqueOrThrow({ where: { code: 'ASSISTANCE_OFFICER' } });
  const officerPermCodes = ['beneficiaries.read', 'beneficiaries.write', 'beneficiaries.submit', 'beneficiaries.assess', 'documents.read', 'documents.write'];
  for (const code of officerPermCodes) {
    const p = allPerms.find((item) => item.code === code);
    if (p) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: officerRole.id, permissionId: p.id } },
        update: {},
        create: { roleId: officerRole.id, permissionId: p.id },
      });
    }
  }

  // Approver permissions
  const approverRole = await prisma.role.findUniqueOrThrow({ where: { code: 'APPROVER' } });
  const approverPermCodes = ['beneficiaries.read', 'beneficiaries.read.sensitive', 'beneficiaries.review', 'beneficiaries.decide', 'documents.read', 'documents.review'];
  for (const code of approverPermCodes) {
    const p = allPerms.find((item) => item.code === code);
    if (p) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: approverRole.id, permissionId: p.id } },
        update: {},
        create: { roleId: approverRole.id, permissionId: p.id },
      });
    }
  }

  // Finance Officer permissions
  const financeRole = await prisma.role.findUniqueOrThrow({ where: { code: 'FINANCE_OFFICER' } });
  const financePermCodes = ['beneficiaries.read', 'beneficiaries.aid.view', 'beneficiaries.write', 'reports.export', 'documents.read'];
  for (const code of financePermCodes) {
    const p = allPerms.find((item) => item.code === code);
    if (p) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: financeRole.id, permissionId: p.id } },
        update: {},
        create: { roleId: financeRole.id, permissionId: p.id },
      });
    }
  }

  // Treasurer permissions
  const treasurerRole = await prisma.role.findUniqueOrThrow({ where: { code: 'TREASURER' } });
  const treasurerPermCodes = ['beneficiaries.read', 'beneficiaries.aid.view', 'beneficiaries.write', 'reports.export', 'documents.read'];
  for (const code of treasurerPermCodes) {
    const p = allPerms.find((item) => item.code === code);
    if (p) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: treasurerRole.id, permissionId: p.id } },
        update: {},
        create: { roleId: treasurerRole.id, permissionId: p.id },
      });
    }
  }

  // Auditor permissions
  const auditorRole = await prisma.role.findUniqueOrThrow({ where: { code: 'AUDITOR' } });
  const auditorPermCodes = ['beneficiaries.read', 'beneficiaries.read.sensitive', 'documents.read', 'reports.export', 'audit.read'];
  for (const code of auditorPermCodes) {
    const p = allPerms.find((item) => item.code === code);
    if (p) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: auditorRole.id, permissionId: p.id } },
        update: {},
        create: { roleId: auditorRole.id, permissionId: p.id },
      });
    }
  }
  console.log('Role permissions mapped.');

  // 4. Default Users
  const defaultPasswordHash = hashPassword('ZmsEnterprise2026!');
  const usersData = [
    { email: 'admin@zms.local', displayName: 'ผู้ดูแลระบบสูงสุด (Super Admin)', roleCode: 'SUPER_ADMIN' },
    { email: 'officer@zms.local', displayName: 'เจ้าหน้าที่ฝ่ายสงเคราะห์ (Officer)', roleCode: 'ASSISTANCE_OFFICER' },
    { email: 'finance@zms.local', displayName: 'เจ้าหน้าที่ฝ่ายการเงิน (Finance)', roleCode: 'FINANCE_OFFICER' },
    { email: 'treasurer@zms.local', displayName: 'เหรัญญิกมูลนิธิ (Treasurer)', roleCode: 'TREASURER' },
    { email: 'approver@zms.local', displayName: 'ผู้มีอำนาจอนุมัติ (Approver)', roleCode: 'APPROVER' },
    { email: 'auditor@zms.local', displayName: 'ผู้ตรวจสอบภายใน (Auditor)', roleCode: 'AUDITOR' },
  ];

  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        displayName: u.displayName,
        passwordHash: defaultPasswordHash,
        isActive: true,
        mfaEnabled: false,
        mfaSecret: null,
        mfaRecoveryHash: null,
      },
      create: {
        email: u.email,
        displayName: u.displayName,
        passwordHash: defaultPasswordHash,
        isActive: true,
        mfaEnabled: false,
      },
    });

    const role = await prisma.role.findUniqueOrThrow({ where: { code: u.roleCode } });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
  }
  console.log('Default users created.');

  // 5. Asnaf Categories
  const asnafList = [
    { code: 'faqir', nameTh: 'ผู้ยากไร้ (ฟะกีร)', sortOrder: 1 },
    { code: 'miskin', nameTh: 'คนขัดสน (มิสเกน)', sortOrder: 2 },
    { code: 'amil', nameTh: 'เจ้าหน้าที่ซะกาต (อามิล)', sortOrder: 3 },
    { code: 'muallaf', nameTh: 'ผู้มีจิตโน้มสู่ความศรัทธา (มุอัลลัฟ)', sortOrder: 4 },
    { code: 'riqab', nameTh: 'การปลดปล่อยพันธนาการ (ริกอบ)', sortOrder: 5 },
    { code: 'gharimin', nameTh: 'ผู้มีหนี้สินล้นพ้นตัว (ฆอริมีน)', sortOrder: 6 },
    { code: 'fisabilillah', nameTh: 'งานเพื่อวิถีทางของอัลลอฮ์ (ฟีสะบีลิลลาฮ์)', sortOrder: 7 },
    { code: 'ibnsabil', nameTh: 'ผู้เดินทางตกยาก (อิบนุสสะบีล)', sortOrder: 8 },
  ];

  for (const a of asnafList) {
    await prisma.asnafCategory.upsert({
      where: { code: a.code },
      update: { nameTh: a.nameTh, sortOrder: a.sortOrder, isActive: true },
      create: { code: a.code, nameTh: a.nameTh, sortOrder: a.sortOrder, isActive: true },
    });
  }
  console.log('Asnaf categories seeded.');

  // 6. Registry Counter
  const currentYear = new Date().getFullYear();
  await prisma.registryCounter.upsert({
    where: { year: currentYear },
    update: {},
    create: { year: currentYear, lastValue: 0 },
  });
  console.log(`Registry counter initialized for year ${currentYear}.`);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
