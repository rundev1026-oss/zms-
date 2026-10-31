/**
 * Read-only audit of likely test/demo records. Does not delete data.
 */
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.resolve(__dirname, '../.env'));

const prisma = new PrismaClient();
const SEED_EMAILS = new Set([
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
]);
const SYNTHETIC_IDS = new Set(['0000000000001', '0000000000000']);
const MIGRATION_DUMMY_ID = '1940200890312';

function classifyEnv() {
  const url = process.env.DATABASE_URL || '';
  const nodeEnv = process.env.NODE_ENV || 'undefined';
  let host = '(unparsed)';
  let dbName = '(unparsed)';
  let user = '(unparsed)';
  let isExampleCreds = url.includes('://zms:zms@');
  try {
    const parsed = new URL(url.replace(/^postgresql:\/\//, 'http://'));
    host = parsed.hostname;
    dbName = parsed.pathname.replace(/^\//, '').split('?')[0];
    user = decodeURIComponent(parsed.username);
  } catch {}
  const localHost = ['localhost', '127.0.0.1', 'postgres', '::1'].includes(host);
  let environment = 'REVIEW REQUIRED';
  if (nodeEnv === 'production' && !localHost && !isExampleCreds) environment = 'Production';
  else if (nodeEnv === 'test') environment = 'Testing';
  else if (nodeEnv === 'staging') environment = 'Staging';
  else if (nodeEnv === 'development' || localHost || isExampleCreds) environment = 'Development';
  return { environment, nodeEnv, host, dbName, user, localHost, isExampleCreds, productionBlocked: environment === 'Production' };
}

function maskId(value) {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, '');
  if (digits.length < 5) return '[redacted]';
  return `${digits.slice(0, 1)}•••••••••${digits.slice(-2)}`;
}

function tally(rows) {
  return {
    total: rows.length,
    TEST: rows.filter((r) => r.bucket === 'TEST').length,
    KEEP: rows.filter((r) => r.bucket === 'KEEP').length,
    REVIEW: rows.filter((r) => r.bucket === 'REVIEW').length,
  };
}

async function countLabel(label, fn) {
  try {
    return { label, count: await fn() };
  } catch (error) {
    return { label, count: -1, error: error instanceof Error ? error.message : String(error) };
  }
}

async function main() {
  const env = classifyEnv();
  console.log(JSON.stringify({ section: 'environment', ...env }, null, 2));

  const counts = await Promise.all([
    countLabel('users', () => prisma.user.count()),
    countLabel('roles', () => prisma.role.count()),
    countLabel('permissions', () => prisma.permission.count()),
    countLabel('beneficiaries', () => prisma.beneficiary.count()),
    countLabel('beneficiaries_active', () => prisma.beneficiary.count({ where: { deletedAt: null } })),
    countLabel('beneficiary_addresses', () => prisma.beneficiaryAddress.count()),
    countLabel('households', () => prisma.household.count()),
    countLabel('household_members', () => prisma.householdMember.count()),
    countLabel('income_expense_profiles', () => prisma.incomeExpenseProfile.count()),
    countLabel('asnaf_categories', () => prisma.asnafCategory.count()),
    countLabel('asnaf_assessments', () => prisma.beneficiaryAsnafAssessment.count()),
    countLabel('beneficiary_documents', () => prisma.beneficiaryDocument.count()),
    countLabel('registry_status_history', () => prisma.registryStatusHistory.count()),
    countLabel('consent_records', () => prisma.consentRecord.count()),
    countLabel('audit_logs', () => prisma.auditLog.count()),
    countLabel('branches', () => prisma.branch.count()),
    countLabel('departments', () => prisma.department.count()),
    countLabel('assistance_types', () => prisma.assistanceType.count()),
    countLabel('assistance_applications', () => prisma.assistanceApplication.count()),
    countLabel('application_documents', () => prisma.applicationDocument.count()),
    countLabel('application_history', () => prisma.applicationHistory.count()),
    countLabel('assistance_execution_records', () => prisma.assistanceExecutionRecord.count()),
    countLabel('assistance_refund_records', () => prisma.assistanceRefundRecord.count()),
    countLabel('follow_up_plans', () => prisma.followUpPlan.count()),
    countLabel('follow_up_records', () => prisma.followUpRecord.count()),
    countLabel('fund_accounts', () => prisma.fundAccount.count()),
    countLabel('asnaf_allocations', () => prisma.asnafAllocation.count()),
    countLabel('faqir_miskin_sub_funds', () => prisma.faqirMiskinSubFund.count()),
    countLabel('bank_accounts', () => prisma.bankAccount.count()),
    countLabel('bank_reconciliations', () => prisma.bankReconciliation.count()),
    countLabel('cash_flow_workflows', () => prisma.cashFlowWorkflow.count()),
    countLabel('financial_transactions', () => prisma.financialTransaction.count()),
    countLabel('campaigns', () => prisma.campaign.count()),
    countLabel('login_histories', () => prisma.loginHistory.count()),
    countLabel('system_settings', () => prisma.systemSetting.count()),
  ]);
  console.log(JSON.stringify({ section: 'table_counts', counts }, null, 2));

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      displayName: true,
      lastLoginAt: true,
      createdAt: true,
      isActive: true,
      userRoles: { select: { role: { select: { code: true } } } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const userClass = users.map((u) => {
    const reasons = [];
    if (u.email.endsWith('@zms.local')) reasons.push('seed_email_domain');
    if (SEED_EMAILS.has(u.email.toLowerCase())) reasons.push('seed_script_account');
    if (u.displayName.includes('ข้อมูลสมมติ')) reasons.push('seed_label');
    if (/\(.*Super Admin.*\)|\(.*Officer.*\)|\(.*Finance.*\)|\(.*Treasurer.*\)|\(.*Approver.*\)|\(.*Auditor.*\)/i.test(u.displayName)) {
      reasons.push('seed_display_name_pattern');
    }
    let bucket = 'REVIEW';
    if (u.email.endsWith('@zms.local')) bucket = 'TEST';
    else if (reasons.length === 0) bucket = 'KEEP';
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
    },
    orderBy: { createdAt: 'asc' },
  });

  const testUserIds = new Set(userClass.filter((u) => u.bucket === 'TEST').map((u) => u.id));
  const benClass = beneficiaries.map((b) => {
    const reasons = [];
    const full = `${b.firstName} ${b.lastName}`;
    if (b.identityNumberNormalized && SYNTHETIC_IDS.has(b.identityNumberNormalized)) reasons.push('synthetic_national_id_from_unit_tests');
    if (b.identityNumberNormalized === MIGRATION_DUMMY_ID) reasons.push('sqlite_migration_dummy_national_id');
    if (/ทดสอบ|สมมติ|fixture|dummy|sample/i.test(full)) reasons.push('test_name_token');
    if (b.registrationNote && /ทดสอบ|สมมติ|demo fixture/i.test(b.registrationNote)) reasons.push('test_note');
    if (b.createdById && testUserIds.has(b.createdById)) reasons.push('created_by_seed_user');
    let bucket = 'REVIEW';
    if (reasons.includes('synthetic_national_id_from_unit_tests')) bucket = 'TEST';
    else if (reasons.includes('test_name_token') && reasons.length >= 2) bucket = 'TEST';
    else if (reasons.length === 0) bucket = 'KEEP';
    else bucket = 'REVIEW';
    return {
      id: b.id,
      registryNumber: b.registryNumber,
      name: full,
      identityMasked: maskId(b.identityNumberNormalized),
      status: b.status,
      createdAt: b.createdAt,
      reasons,
      bucket,
    };
  });

  const testBenIds = benClass.filter((b) => b.bucket === 'TEST').map((b) => b.id);
  const keepBenIds = benClass.filter((b) => b.bucket === 'KEEP').map((b) => b.id);

  const linked = {
    addresses_of_test_ben: testBenIds.length ? await prisma.beneficiaryAddress.count({ where: { beneficiaryId: { in: testBenIds } } }) : 0,
    households_of_test_ben: testBenIds.length ? await prisma.household.count({ where: { beneficiaryId: { in: testBenIds } } }) : 0,
    members_of_test_households: testBenIds.length
      ? await prisma.householdMember.count({ where: { household: { beneficiaryId: { in: testBenIds } } } })
      : 0,
    income_of_test_ben: testBenIds.length ? await prisma.incomeExpenseProfile.count({ where: { beneficiaryId: { in: testBenIds } } }) : 0,
    assessments_of_test_ben: testBenIds.length ? await prisma.beneficiaryAsnafAssessment.count({ where: { beneficiaryId: { in: testBenIds } } }) : 0,
    documents_of_test_ben: testBenIds.length ? await prisma.beneficiaryDocument.count({ where: { beneficiaryId: { in: testBenIds } } }) : 0,
    status_history_of_test_ben: testBenIds.length ? await prisma.registryStatusHistory.count({ where: { beneficiaryId: { in: testBenIds } } }) : 0,
    consents_of_test_ben: testBenIds.length ? await prisma.consentRecord.count({ where: { beneficiaryId: { in: testBenIds } } }) : 0,
    applications_of_test_ben: testBenIds.length
      ? await prisma.assistanceApplication.count({
          where: { beneficiaryId: { in: testBenIds } },
        })
      : 0,
  };

  const applications = await prisma.assistanceApplication.findMany({
    select: {
      id: true,
      applicationNo: true,
      beneficiaryId: true,
      status: true,
      beneficiary: { select: { firstName: true, lastName: true } },
    },
    take: 500,
  });
  const appClass = applications.map((a) => {
    const fullName = `${a.beneficiary?.firstName || ''} ${a.beneficiary?.lastName || ''}`.trim();
    const reasons = [];
    if (a.beneficiaryId && testBenIds.includes(a.beneficiaryId)) reasons.push('linked_test_beneficiary');
    if (/ทดสอบ|สมมติ|demo/i.test(fullName)) reasons.push('test_name_token');
    if (/TEST|DEMO/i.test(a.applicationNo || '')) reasons.push('test_application_no');
    let bucket = 'REVIEW';
    if (reasons.includes('linked_test_beneficiary')) bucket = 'TEST';
    else if (reasons.length >= 2) bucket = 'TEST';
    else if (reasons.length === 0) bucket = 'KEEP';
    return { id: a.id, applicationNo: a.applicationNo, fullName, status: a.status, reasons, bucket };
  });

  const funds = await prisma.fundAccount.findMany({
    select: { id: true, code: true, name: true, availableAmount: true, totalReceived: true, disbursedAmount: true, isActive: true },
  });
  const bankAccounts = await prisma.bankAccount.findMany({
    select: { id: true, bankName: true, accountName: true, currentBalance: true, status: true },
  });
  const txCount = await prisma.financialTransaction.count();
  const txSample = await prisma.financialTransaction.findMany({
    select: { id: true, transactionNo: true, type: true, notes: true, amount: true, fundName: true, beneficiaryId: true, createdAt: true },
    take: 30,
    orderBy: { createdAt: 'desc' },
  });
  const txLinkedToTestBen = testBenIds.length
    ? await prisma.financialTransaction.count({ where: { beneficiaryId: { in: testBenIds } } })
    : 0;
  const branches = await prisma.branch.findMany({ select: { id: true, code: true, name: true, status: true } });
  const departments = await prisma.department.findMany({ select: { id: true, code: true, name: true, status: true } });
  const auditSample = await prisma.auditLog.findMany({
    select: { id: true, action: true, resourceType: true, createdAt: true, actorId: true },
    take: 20,
    orderBy: { createdAt: 'desc' },
  });

  const createdBySeedOnly = benClass.filter((b) => b.reasons.length === 1 && b.reasons[0] === 'created_by_seed_user');

  console.log(JSON.stringify({
    section: 'classification',
    users: tally(userClass),
    beneficiaries: tally(benClass),
    applications: tally(appClass),
    beneficiaries_created_only_by_seed_user: createdBySeedOnly.length,
    linked_test_beneficiary_children: linked,
    funds: funds.length,
    bankAccounts: bankAccounts.length,
    financialTransactions: txCount,
    financial_transactions_linked_to_test_beneficiaries: txLinkedToTestBen,
    branches: branches.length,
    departments: departments.length,
  }, null, 2));

  console.log(JSON.stringify({ section: 'candidate_test_users', rows: userClass.filter((u) => u.bucket !== 'KEEP') }, null, 2));
  console.log(JSON.stringify({
    section: 'keep_users',
    rows: userClass.filter((u) => u.bucket === 'KEEP').map((u) => ({ id: u.id, email: u.email, displayName: u.displayName, roles: u.roles })),
  }, null, 2));
  console.log(JSON.stringify({ section: 'candidate_test_beneficiaries', rows: benClass.filter((b) => b.bucket !== 'KEEP') }, null, 2));
  console.log(JSON.stringify({
    section: 'keep_beneficiaries_sample',
    count: keepBenIds.length,
    rows: benClass.filter((b) => b.bucket === 'KEEP').slice(0, 40).map((b) => ({
      id: b.id, registryNumber: b.registryNumber, name: b.name, status: b.status, identityMasked: b.identityMasked,
    })),
  }, null, 2));
  console.log(JSON.stringify({ section: 'candidate_test_applications', rows: appClass.filter((a) => a.bucket !== 'KEEP') }, null, 2));
  console.log(JSON.stringify({
    section: 'finance_reference',
    funds,
    bankAccounts,
        recentTransactions: txSample.map((t) => ({
          id: t.id,
          transactionNo: t.transactionNo,
          type: t.type,
          notes: t.notes,
          amount: t.amount,
          fundName: t.fundName,
          linkedTestBeneficiary: Boolean(t.beneficiaryId && testBenIds.includes(t.beneficiaryId)),
          createdAt: t.createdAt,
        })),
  }, null, 2));
  console.log(JSON.stringify({ section: 'org', branches, departments }, null, 2));
  console.log(JSON.stringify({ section: 'audit_sample', rows: auditSample }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
