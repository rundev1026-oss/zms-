/**
 * Development-only full data reset.
 * Keeps schema, indexes, and foreign keys. Does not drop the database.
 * Refuses to run unless ZMS_CONFIRM_FULL_RESET=reset-development-database
 * and the database is the local development instance.
 */
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, scryptSync } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');

const CONFIRM = 'reset-development-database';
const ROOT = path.resolve(__dirname, '../../..');
const BACKUP_DIR = path.join(ROOT, 'backups');
const STORAGE_ROOTS = [
  path.resolve(ROOT, 'apps/api/storage'),
  path.resolve(ROOT, 'storage'),
].map((dir) => path.normalize(dir).toLowerCase());

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const hash = scryptSync(password, salt, 64).toString('base64url');
  return `scrypt$${salt}$${hash}`;
}

function dec(value) {
  if (value === null || value === undefined) return null;
  return value.toString();
}

function quoteIdent(name) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) {
    throw new Error(`Unexpected table name: ${name}`);
  }
  return `"${name}"`;
}

function assertSafeEnvironment() {
  if (process.env.ZMS_CONFIRM_FULL_RESET !== CONFIRM) {
    throw new Error('Refusing reset: confirmation flag is missing.');
  }
  const url = process.env.DATABASE_URL || '';
  const parsed = new URL(url.replace(/^postgresql:\/\//, 'http://'));
  const host = parsed.hostname;
  const database = parsed.pathname.replace(/^\//, '').split('?')[0];
  const local = ['localhost', '127.0.0.1', '::1'].includes(host);
  if (process.env.NODE_ENV === 'production' || !local || database !== 'zms') {
    throw new Error('Refusing reset: this is not the local development database.');
  }
  return { host, database, user: decodeURIComponent(parsed.username) };
}

function newestBackup() {
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((name) => name.endsWith('.dump'))
    .map((name) => {
      const full = path.join(BACKUP_DIR, name);
      return { full, size: fs.statSync(full).size };
    })
    .filter((file) => file.size > 100000)
    .sort((a, b) => fs.statSync(b.full).mtimeMs - fs.statSync(a.full).mtimeMs);
  if (files.length === 0) throw new Error('Refusing reset: no verified backup file was found.');
  return files[0];
}

function safeUnlink(candidate) {
  if (!candidate || /^https?:/i.test(candidate) || candidate.startsWith('/docs/') || candidate.startsWith('/images/')) {
    return false;
  }
  const resolved = path.resolve(ROOT, candidate.replace(/^[/\\]+/, ''));
  const normalized = path.normalize(resolved).toLowerCase();
  const allowed = STORAGE_ROOTS.some((root) => normalized.startsWith(root + path.sep) || normalized === root);
  if (!allowed || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return false;
  fs.unlinkSync(resolved);
  return true;
}

loadEnvFile(path.resolve(__dirname, '../.env'));
const prisma = new PrismaClient();

const SYSTEM_ROLES = [
  { code: 'SUPER_ADMIN', name: 'ผู้ดูแลระบบสูงสุด', description: 'สิทธิ์สูงสุดในการจัดการระบบทั้งหมด' },
  { code: 'ADMIN', name: 'เจ้าหน้าที่ผู้ดูแลระบบ', description: 'จัดการผู้ใช้ สาขา และการตั้งค่าระบบ' },
  { code: 'ASSISTANCE_OFFICER', name: 'เจ้าหน้าที่ฝ่ายสงเคราะห์', description: 'รับคำขอ ลงพื้นที่ ประเมินสิทธิ์ และติดตามผล' },
  { code: 'FINANCE_OFFICER', name: 'เจ้าหน้าที่ฝ่ายการเงิน', description: 'จัดการงบประมาณ บัญชี และเตรียมจ่ายเงิน' },
  { code: 'TREASURER', name: 'เหรัญญิก', description: 'อนุมัติการจ่ายเงินและเบิกจ่ายเงิน' },
  { code: 'APPROVER', name: 'ผู้มีอำนาจอนุมัติ', description: 'พิจารณาอนุมัติคำขอความช่วยเหลือตามลำดับขั้น' },
  { code: 'AUDITOR', name: 'ผู้ตรวจสอบภายใน', description: 'ตรวจสอบความถูกต้องและเรียกดูประวัติการทำงาน' },
];

const ROLE_PERMISSIONS = {
  ASSISTANCE_OFFICER: ['beneficiaries.read', 'beneficiaries.write', 'beneficiaries.submit', 'beneficiaries.assess', 'documents.read', 'documents.write'],
  APPROVER: ['beneficiaries.read', 'beneficiaries.read.sensitive', 'beneficiaries.review', 'beneficiaries.decide', 'documents.read', 'documents.review'],
  FINANCE_OFFICER: ['beneficiaries.read', 'beneficiaries.aid.view', 'beneficiaries.write', 'reports.export', 'documents.read'],
  TREASURER: ['beneficiaries.read', 'beneficiaries.aid.view', 'beneficiaries.write', 'reports.export', 'documents.read'],
  AUDITOR: ['beneficiaries.read', 'beneficiaries.read.sensitive', 'documents.read', 'reports.export', 'audit.read'],
};

async function main() {
  const env = assertSafeEnvironment();
  const backup = newestBackup();
  const beforeConstraints = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_type = 'FOREIGN KEY'
  `;

  const [permissions, asnaf, funds, assistanceTypes, allocations, subFunds, expenseCategories, formulas, settings, documents, followFiles, workflowFiles] =
    await Promise.all([
      prisma.permission.findMany({ select: { code: true, description: true } }),
      prisma.asnafCategory.findMany(),
      prisma.fundAccount.findMany(),
      prisma.assistanceType.findMany(),
      prisma.asnafAllocation.findMany(),
      prisma.faqirMiskinSubFund.findMany(),
      prisma.adminExpenseCategory.findMany(),
      prisma.zakatFormulaVersion.findMany(),
      prisma.systemSetting.findMany(),
      prisma.applicationDocument.findMany({ select: { storagePath: true, fileUrl: true } }),
      prisma.followUpAttachment.findMany({ select: { filePath: true } }),
      prisma.workflowAttachment.findMany({ select: { fileUrl: true } }),
    ]);

  const tables = await prisma.$queryRaw`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  `;
  if (tables.length !== 61) {
    throw new Error(`Refusing reset: expected 61 application tables, found ${tables.length}.`);
  }
  const sql = `TRUNCATE TABLE ${tables.map((row) => quoteIdent(row.tablename)).join(', ')} RESTART IDENTITY CASCADE`;
  const fundIdMap = new Map();
  const password = process.env.ZMS_BOOTSTRAP_PASSWORD || randomBytes(18).toString('base64url');
  const email = process.env.ZMS_BOOTSTRAP_EMAIL || 'superadmin@zms.local';
  const displayName = process.env.ZMS_BOOTSTRAP_NAME || 'ผู้ดูแลระบบ';
  const orgName = settings.find((item) => item.key === 'organizationNameTh')?.value || 'สำนักงานใหญ่';

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(sql);
    for (const permission of permissions) {
      await tx.permission.create({ data: { code: permission.code, description: permission.description } });
    }
    for (const role of SYSTEM_ROLES) {
      await tx.role.create({ data: { ...role, isSystem: true, status: 'ACTIVE' } });
    }
    const roleRows = await tx.role.findMany();
    const permissionRows = await tx.permission.findMany();
    const roleByCode = new Map(roleRows.map((role) => [role.code, role.id]));
    const permissionByCode = new Map(permissionRows.map((permission) => [permission.code, permission.id]));
    const superAdminId = roleByCode.get('SUPER_ADMIN');
    for (const permission of permissionRows) {
      await tx.rolePermission.create({ data: { roleId: superAdminId, permissionId: permission.id } });
    }
    for (const [roleCode, codes] of Object.entries(ROLE_PERMISSIONS)) {
      for (const code of codes) {
        const permissionId = permissionByCode.get(code);
        if (!permissionId) continue;
        await tx.rolePermission.create({ data: { roleId: roleByCode.get(roleCode), permissionId } });
      }
    }

    for (const category of asnaf) {
      await tx.asnafCategory.create({
        data: {
          code: category.code,
          nameTh: category.nameTh,
          sortOrder: category.sortOrder,
          isActive: category.isActive,
        },
      });
    }

    for (const fund of funds) {
      const created = await tx.fundAccount.create({
        data: {
          code: fund.code,
          name: fund.name,
          nameEn: fund.nameEn,
          description: fund.description,
          category: fund.category,
          primaryAsnafCode: fund.primaryAsnafCode,
          totalReceived: '0.00',
          committedAmount: '0.00',
          disbursedAmount: '0.00',
          availableAmount: '0.00',
          targetGoal: null,
          isActive: fund.isActive,
        },
      });
      fundIdMap.set(fund.id, created.id);
    }

    for (const type of assistanceTypes) {
      await tx.assistanceType.create({
        data: {
          code: type.code,
          name: type.name,
          category: type.category,
          description: type.description,
          isActive: type.isActive,
          typeGroup: type.typeGroup,
          requiredDocs: type.requiredDocs,
          orderIndex: type.orderIndex,
          specificFundId: fundIdMap.get(type.specificFundId) || null,
          primaryGroupCode: type.primaryGroupCode,
          conditionsText: type.conditionsText,
          defaultMaxAmount: dec(type.defaultMaxAmount),
          defaultMinAmount: dec(type.defaultMinAmount),
          assistanceFormat: type.assistanceFormat,
        },
      });
    }

    for (const allocation of allocations) {
      await tx.asnafAllocation.create({
        data: {
          fiscalYear: allocation.fiscalYear,
          asnafCode: allocation.asnafCode,
          asnafName: allocation.asnafName,
          nameEn: allocation.nameEn,
          percentage: dec(allocation.percentage),
          targetAmount: '0.00',
          allocatedAmount: '0.00',
          disbursedAmount: '0.00',
          remainingAmount: '0.00',
          committedAmount: '0.00',
          budgetAdjustment: '0.00',
          policyRef: allocation.policyRef,
          fundAccountId: fundIdMap.get(allocation.fundAccountId) || null,
          description: allocation.description,
          effectiveDate: allocation.effectiveDate,
          isActive: allocation.isActive,
          sortOrder: allocation.sortOrder,
        },
      });
    }

    for (const subFund of subFunds) {
      await tx.faqirMiskinSubFund.create({
        data: {
          fiscalYear: subFund.fiscalYear,
          code: subFund.code,
          name: subFund.name,
          nameEn: subFund.nameEn,
          fundCode: subFund.fundCode,
          percentage: dec(subFund.percentage),
          targetAmount: '0.00',
          allocatedAmount: '0.00',
          disbursedAmount: '0.00',
          remainingAmount: '0.00',
          committedAmount: '0.00',
          budgetAdjustment: '0.00',
          primaryGroupCode: subFund.primaryGroupCode,
          fundAccountId: fundIdMap.get(subFund.fundAccountId) || null,
          parentFundId: fundIdMap.get(subFund.parentFundId) || null,
          fundType: subFund.fundType,
          description: subFund.description,
          effectiveDate: subFund.effectiveDate,
          sortOrder: subFund.sortOrder,
          isActive: subFund.isActive,
        },
      });
    }

    for (const category of expenseCategories) {
      await tx.adminExpenseCategory.create({
        data: {
          code: category.code,
          name: category.name,
          groupName: category.groupName,
          budgetLimit: '0.00',
          isActive: category.isActive,
          orderIndex: category.orderIndex,
        },
      });
    }

    for (const formula of formulas) {
      await tx.zakatFormulaVersion.create({
        data: {
          version: formula.version,
          category: formula.category,
          categoryNameTh: formula.categoryNameTh,
          effectiveDate: formula.effectiveDate,
          nisabStandard: formula.nisabStandard,
          nisabValueThb: dec(formula.nisabValueThb),
          ratePercentage: dec(formula.ratePercentage),
          approvedBy: formula.approvedBy,
          notes: formula.notes,
          isActive: formula.isActive,
        },
      });
    }

    for (const setting of settings) {
      await tx.systemSetting.create({
        data: { key: setting.key, value: setting.value, category: setting.category, notes: setting.notes },
      });
    }
    await tx.systemSetting.create({
      data: {
        key: 'bootstrap.passwordChangeRequired',
        value: 'true',
        category: 'security',
        notes: 'บัญชีผู้ดูแลเริ่มต้นต้องเปลี่ยนรหัสผ่านก่อนใช้งานจริง',
      },
    });

    await tx.branch.create({
      data: {
        code: 'HQ',
        name: orgName,
        province: 'รอระบุ',
        isHeadquarters: true,
        status: 'active',
      },
    });
    await tx.registryCounter.create({ data: { year: new Date().getFullYear(), lastValue: 0 } });

    const admin = await tx.user.create({
      data: {
        email,
        username: 'superadmin',
        displayName,
        passwordHash: hashPassword(password),
        isActive: true,
        mfaEnabled: false,
      },
    });
    await tx.userRole.create({ data: { userId: admin.id, roleId: superAdminId } });
  }, { timeout: 120000 });

  let removedFiles = 0;
  for (const row of [...documents.flatMap((row) => [row.storagePath, row.fileUrl]), ...followFiles.map((row) => row.filePath), ...workflowFiles.map((row) => row.fileUrl)]) {
    if (safeUnlink(row)) removedFiles += 1;
  }

  const after = {};
  for (const table of ['users', 'beneficiaries', 'assistance_applications', 'financial_transactions', 'audit_logs', 'bank_accounts', 'roles', 'permissions']) {
    const rows = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM ${quoteIdent(table)}`);
    after[table] = rows[0].count;
  }
  const afterConstraints = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_type = 'FOREIGN KEY'
  `;
  const credentialPath = path.join(BACKUP_DIR, 'bootstrap-super-admin.txt');
  fs.writeFileSync(
    credentialPath,
    `email=${email}\nusername=superadmin\npassword=${password}\nmfa=not-enrolled\nchange_password_before_real_use=true\n`,
    { encoding: 'utf8', flag: 'w' },
  );

  console.log(JSON.stringify({
    environment: 'Development',
    host: env.host,
    database: env.database,
    backup: path.basename(backup.full),
    backupBytes: backup.size,
    tablesTruncated: tables.length,
    foreignKeysBefore: beforeConstraints[0].count,
    foreignKeysAfter: afterConstraints[0].count,
    removedAttachmentFiles: removedFiles,
    remaining: after,
    bootstrapEmail: email,
    bootstrapUsername: 'superadmin',
    mfaEnabled: false,
    passwordFile: path.basename(credentialPath),
  }, null, 2));
  console.log(`BOOTSTRAP_PASSWORD=${password}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
