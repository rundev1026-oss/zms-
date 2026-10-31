/**
 * Read-only audit of likely test/demo records.
 * Does not delete, truncate, or reset the database.
 */
import pkg from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { PrismaClient } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.resolve(__dirname, '../apps/api/.env'));

const prisma = new PrismaClient();

const SEED_EMAILS = [
  'admin@zms.local',
  'officer@zms.local',
  'finance@zms.local',
  'treasurer@zms.local',
  'approver@zms.local',
  'auditor@zms.local',
  'super-admin@zms.local',
  'registrar@zms.local',
  'reviewer@zms.local',
  'assessor@zms.local',
];

const SYNTHETIC_NATIONAL_IDS = ['0000000000001', '0000000000000'];
const MIGRATION_DUMMY_ID = '1940200890312';

function classifyEnv() {
  const url = process.env.DATABASE_URL || '';
  const nodeEnv = process.env.NODE_ENV || 'undefined';
  let host = '(unparsed)';
  let dbName = '(unparsed)';
  let user = '(unparsed)';
  let isExampleCreds = false;
  try {
    const parsed = new URL(url.replace(/^postgresql:\/\//, 'http://'));
    host = parsed.hostname;
    dbName = parsed.pathname.replace(/^\//, '').split('?')[0];
    user = decodeURIComponent(parsed.username);
    isExampleCreds = url.includes('://zms:zms@');
  } catch {
    isExampleCreds = url.includes('://zms:zms@');
  }
  const localHost = ['localhost', '127.0.0.1', 'postgres', '::1'].includes(host);
  let environment = 'REVIEW REQUIRED';
  if (nodeEnv === 'production' && !localHost && !isExampleCreds) environment = 'Production';
  else if (nodeEnv === 'test') environment = 'Testing';
  else if (nodeEnv === 'staging') environment = 'Staging';
  else if (nodeEnv === 'development' || localHost || isExampleCreds) environment = 'Development';

  return {
    environment,
    nodeEnv,
    host,
    dbName,
    user,
    localHost,
    isExampleCreds,
    productionBlocked: environment === 'Production',
  };
}

function maskId(value: string | null | undefined) {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length < 5) return '[redacted]';
  return `${digits.slice(0, 1)}•••••••••${digits.slice(-2)}`;
}

function reasonsForUser(u: {
  email: string;
  displayName: string;
  lastLoginAt: Date | null;
}) {
  const reasons: string[] = [];
  if (u.email.endsWith('@zms.local')) reasons.push('seed_email_domain');
  if (SEED_EMAILS.includes(u.email.toLowerCase())) reasons.push('seed_script_account');
  if (u.displayName.includes('ข้อมูลสมมติ')) reasons.push('seed_label_สมมติ');
  if (/\(.*Super Admin.*\)|\(.*Officer.*\)|\(.*Finance.*\)|\(.*Treasurer.*\)|\(.*Approver.*\)|\(.*Auditor.*\)/i.test(u.displayName)) {
    reasons.push('seed_display_name_pattern');
  }
  return reasons;
}

function reasonsForBeneficiary(b: {
  firstName: string;
  lastName: string;
  identityNumberNormalized: string | null;
  registryNumber: string;
  registrationNote: string | null;
}) {
  const reasons: string[] = [];
  const full = `${b.firstName} ${b.lastName}`;
  if (b.identityNumberNormalized && SYNTHETIC_NATIONAL_IDS.includes(b.identityNumberNormalized)) {
    reasons.push('synthetic_national_id_from_unit_tests');
  }
  if (b.identityNumberNormalized === MIGRATION_DUMMY_ID) {
    reasons.push('sqlite_migration_dummy_national_id');
  }
  if (/ทดสอบ|สมมติ|fixture|dummy|sample/i.test(full)) reasons.push('test_name_token');
  if (/ทดสอบ|สมมติ|demo|fixture/i.test(b.registryNumber)) reasons.push('test_registry_number');
  if (b.registrationNote && /ทดสอบ|สมมติ|demo fixture/i.test(b.registrationNote)) {
    reasons.push('test_note');
  }
  return reasons;
}

async function countOrZero(label: string, fn: () => Promise<number>) {
  try {
    return { label, count: await fn() };
  } catch (error) {
    return { label, count: -1, error: error instanceof Error ? error.message : String(error) };
  }
}

async function main() {
  const env = classifyEnv();
  console.log(JSON.stringify({ section: 'environment', ...env }, null, 2));
  if (env.productionBlocked) {
    console.log(JSON.stringify({ section: 'stop', message: 'Production detected. Dry-run queries only were planned; no deletes.' }));
  }

  const counts = await Promise.all([
    countOrZero('users', () => prisma.user.count()),
    countOrZero('roles', () => prisma.role.count()),
    countOrZero('permissions', () => prisma.permission.count()),
    countOrZero('beneficiaries', () => prisma.beneficiary.count()),
    countOrZero('beneficiaries_active', () => prisma.beneficiary.count({ where: { deletedAt: null } })),
    countOrZero('beneficiary_addresses', () => prisma.beneficiaryAddress.count()),
    countOrZero('households', () => prisma.household.count()),
    countOrZero('household_members', () => prisma.householdMember.count()),
    countOrZero('income_expense_profiles', () => prisma.incomeExpenseProfile.count()),
    countOrZero('asnaf_categories', () => prisma.asnafCategory.count()),
    countOrZero('asnaf_assessments', () => prisma.beneficiaryAsnafAssessment.count()),
    countOrZero('beneficiary_documents', () => prisma.beneficiaryDocument.count()),
    countOrZero('registry_status_history', () => prisma.registryStatusHistory.count()),
    countOrZero('consent_records', () => prisma.consentRecord.count()),
    countOrZero('audit_logs', () => prisma.auditLog.count()),
    countOrZero('branches', () => prisma.branch.count()),
    countOrZero('departments', () => prisma.department.count()),
    countOrZero('assistance_types', () => prisma.assistanceType.count()),
    countOrZero('assistance_applications', () => prisma.assistanceApplication.count()),
    countOrZero('application_documents', () => prisma.applicationDocument.count()),
    countOrZero('application_history', () => prisma.applicationHistory.count()),
    countOrZero('assistance_execution_records', () => prisma.assistanceExecutionRecord.count()),
    countOrZero('assistance_refund_records', () => prisma.assistanceRefundRecord.count()),
    countOrZero('follow_up_plans', () => prisma.followUpPlan.count()),
    countOrZero('follow_up_records', () => prisma.followUpRecord.count()),
    countOrZero('fund_accounts', () => prisma.fundAccount.count()),
    countOrZero('asnaf_allocations', () => prisma.asnafAllocation.count()),
    countOrZero('faqir_miskin_sub_funds', () => prisma.faqirMiskinSubFund.count()),
    countOrZero('bank_accounts', () => prisma.bankAccount.count()),
    countOrZero('bank_reconciliations', () => prisma.bankReconciliation.count()),
    countOrZero('cash_flow_workflows', () => prisma.cashFlowWorkflow.count()),
    countOrZero('financial_transactions', () => prisma.financialTransaction.count()),
    countOrZero('campaigns', () => prisma.campaign.count()),
    countOrZero('login_histories', () => prisma.loginHistory.count()),
    countOrZero('system_settings', () => prisma.systemSetting.count()),
  ]);
  console.log(JSON.stringify({ section: 'table_counts', counts }, null, 2));

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      displayName: true,
      username: true,
      lastLoginAt: true,
      createdAt: true,
      isActive: true,
      userRoles: { select: { role: { select: { code: true } } } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const userClass = users.map((u) => {
    const reasons = reasonsForUser(u);
    let bucket: 'TEST' | 'KEEP' | 'REVIEW' = 'REVIEW';
    if (reasons.includes('seed_email_domain') && reasons.length >= 2) bucket = 'TEST';
    else if (reasons.includes('seed_script_account') && reasons.includes('seed_email_domain')) bucket = 'TEST';
    else if (reasons.length === 0 && !u.email.endsWith('.local')) bucket = 'KEEP';
    else if (reasons.length === 1 && reasons[0] === 'seed_email_domain') bucket = 'TEST';
    return {
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      roles: u.userRoles.map((r) => r.role.code),
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      isActive: u.isActive,
      reasons,
      bucket,
    };
  });

  const beneficiaries = await prisma.beneficiary.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      registryNumber: true,
      firstName: true,
      lastName: true,
      identityNumberNormalized: true,
      registrationNote: true,
      status: true,
      createdAt: true,
      createdById: true,
      phone: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const testUserIds = new Set(userClass.filter((u) => u.bucket === 'TEST').map((u) => u.id));
  const benClass = beneficiaries.map((b) => {
    const reasons = reasonsForBeneficiary(b);
    if (b.createdById && testUserIds.has(b.createdById)) reasons.push('created_by_seed_user');
    let bucket: 'TEST' | 'KEEP' | 'REVIEW' = 'REVIEW';
    if (reasons.includes('synthetic_national_id_from_unit_tests')) bucket = 'TEST';
    else if (reasons.filter((r) => r !== 'created_by_seed_user').length >= 1 && reasons.includes('created_by_seed_user')) {
      bucket = 'TEST';
    } else if (reasons.includes('test_name_token') && reasons.length >= 2) bucket = 'TEST';
    else if (reasons.length === 0) bucket = 'KEEP';
    else bucket = 'REVIEW';
    return {
      id: b.id,
      registryNumber: b.registryNumber,
      name: `${b.firstName} ${b.lastName}`,
      identityMasked: maskId(b.identityNumberNormalized),
      status: b.status,
      createdAt: b.createdAt,
      reasons,
      bucket,
    };
  });

  const testBenIds = benClass.filter((b) => b.bucket === 'TEST').map((b) => b.id);
  const reviewBenIds = benClass.filter((b) => b.bucket === 'REVIEW').map((b) => b.id);
  const keepBenIds = benClass.filter((b) => b.bucket === 'KEEP').map((b) => b.id);

  const linked = {
    addresses_of_test_ben: testBenIds.length
      ? await prisma.beneficiaryAddress.count({ where: { beneficiaryId: { in: testBenIds } } })
      : 0,
    households_of_test_ben: testBenIds.length
      ? await prisma.household.count({ where: { beneficiaryId: { in: testBenIds } } })
      : 0,
    members_of_test_households: testBenIds.length
      ? await prisma.householdMember.count({
          where: { household: { beneficiaryId: { in: testBenIds } } },
        })
      : 0,
    income_of_test_ben: testBenIds.length
      ? await prisma.incomeExpenseProfile.count({ where: { beneficiaryId: { in: testBenIds } } })
      : 0,
    assessments_of_test_ben: testBenIds.length
      ? await prisma.beneficiaryAsnafAssessment.count({ where: { beneficiaryId: { in: testBenIds } } })
      : 0,
    documents_of_test_ben: testBenIds.length
      ? await prisma.beneficiaryDocument.count({ where: { beneficiaryId: { in: testBenIds } } })
      : 0,
    status_history_of_test_ben: testBenIds.length
      ? await prisma.registryStatusHistory.count({ where: { beneficiaryId: { in: testBenIds } } })
      : 0,
    consents_of_test_ben: testBenIds.length
      ? await prisma.consentRecord.count({ where: { beneficiaryId: { in: testBenIds } } })
      : 0,
    applications_of_test_ben: testBenIds.length
      ? await prisma.assistanceApplication.count({
          where: { OR: [{ beneficiaryId: { in: testBenIds } }, { registryId: { in: testBenIds } }] },
        })
      : 0,
  };

  const applications = await prisma.assistanceApplication.findMany({
    select: {
      id: true,
      applicationNo: true,
      fullName: true,
      beneficiaryId: true,
      registryId: true,
      status: true,
      createdAt: true,
    },
    take: 500,
  });
  const appClass = applications.map((a) => {
    const reasons: string[] = [];
    if (a.beneficiaryId && testBenIds.includes(a.beneficiaryId)) reasons.push('linked_test_beneficiary');
    if (a.registryId && testBenIds.includes(a.registryId)) reasons.push('linked_test_registry');
    if (/ทดสอบ|สมมติ|demo/i.test(a.fullName || '')) reasons.push('test_name_token');
    if (/TEST|DEMO/i.test(a.applicationNo || '')) reasons.push('test_application_no');
    let bucket: 'TEST' | 'KEEP' | 'REVIEW' = 'REVIEW';
    if (reasons.includes('linked_test_beneficiary') || reasons.includes('linked_test_registry')) bucket = 'TEST';
    else if (reasons.length === 0) bucket = 'KEEP';
    return {
      id: a.id,
      applicationNo: a.applicationNo,
      fullName: a.fullName,
      status: a.status,
      reasons,
      bucket,
    };
  });

  const funds = await prisma.fundAccount.findMany({
    select: { id: true, code: true, name: true, currentBalance: true, isActive: true },
  });
  const bankAccounts = await prisma.bankAccount.findMany({
    select: { id: true, bankName: true, accountName: true, currentBalance: true, isActive: true },
  });
  const txCount = await prisma.financialTransaction.count();
  const txSample = await prisma.financialTransaction.findMany({
    select: { id: true, documentNo: true, description: true, amount: true, fundCode: true, createdAt: true },
    take: 50,
    orderBy: { createdAt: 'desc' },
  });

  const branches = await prisma.branch.findMany({
    select: { id: true, code: true, name: true, isActive: true },
  });
  const departments = await prisma.department.findMany({
    select: { id: true, code: true, name: true, isActive: true },
  });

  const auditSample = await prisma.auditLog.findMany({
    select: { id: true, action: true, resourceType: true, createdAt: true, actorId: true },
    take: 20,
    orderBy: { createdAt: 'desc' },
  });

  function tally<T extends { bucket: string }>(rows: T[]) {
    return {
      total: rows.length,
      TEST: rows.filter((r) => r.bucket === 'TEST').length,
      KEEP: rows.filter((r) => r.bucket === 'KEEP').length,
      REVIEW: rows.filter((r) => r.bucket === 'REVIEW').length,
    };
  }

  console.log(
    JSON.stringify(
      {
        section: 'classification',
        users: tally(userClass),
        beneficiaries: tally(benClass),
        applications: tally(appClass),
        linked_test_beneficiary_children: linked,
        funds: funds.length,
        bankAccounts: bankAccounts.length,
        financialTransactions: txCount,
        branches: branches.length,
        departments: departments.length,
      },
      null,
      2,
    ),
  );

  console.log(
    JSON.stringify(
      {
        section: 'candidate_test_users',
        rows: userClass.filter((u) => u.bucket === 'TEST' || u.bucket === 'REVIEW'),
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      {
        section: 'keep_users',
        rows: userClass.filter((u) => u.bucket === 'KEEP').map((u) => ({
          id: u.id,
          email: u.email,
          displayName: u.displayName,
          roles: u.roles,
        })),
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      {
        section: 'candidate_test_beneficiaries',
        rows: benClass.filter((b) => b.bucket === 'TEST' || b.bucket === 'REVIEW'),
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      {
        section: 'keep_beneficiaries_sample',
        count: keepBenIds.length,
        rows: benClass
          .filter((b) => b.bucket === 'KEEP')
          .slice(0, 30)
          .map((b) => ({
            id: b.id,
            registryNumber: b.registryNumber,
            name: b.name,
            status: b.status,
            identityMasked: b.identityMasked,
          })),
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      {
        section: 'candidate_test_applications',
        rows: appClass.filter((a) => a.bucket === 'TEST' || a.bucket === 'REVIEW'),
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      {
        section: 'finance_reference',
        funds,
        bankAccounts: bankAccounts.map((b) => ({
          id: b.id,
          bankName: b.bankName,
          accountName: b.accountName,
          currentBalance: b.currentBalance,
          isActive: b.isActive,
        })),
        recentTransactions: txSample.map((t) => ({
          id: t.id,
          documentNo: t.documentNo,
          description: t.description,
          amount: t.amount,
          fundCode: t.fundCode,
          createdAt: t.createdAt,
        })),
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ section: 'org', branches, departments }, null, 2));
  console.log(
    JSON.stringify(
      {
        section: 'audit_sample',
        rows: auditSample,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
