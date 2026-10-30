import { createClient } from '@libsql/client';
import pkg from '@prisma/client';
const { PrismaClient, Prisma } = pkg;
import * as path from 'path';
import * as crypto from 'crypto';

const RegistryStatus = {
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  ELIGIBLE: 'ELIGIBLE',
  INELIGIBLE: 'INELIGIBLE',
} as const;

const IdentityType = {
  THAI_NATIONAL_ID: 'THAI_NATIONAL_ID',
  OTHER: 'OTHER',
} as const;

const prisma = new PrismaClient();
const dbPath = path.resolve(__dirname, '../../../data/zms.db');
const sqlite = createClient({
  url: `file:${dbPath.replace(/\\/g, '/')}`,
});

// Deterministic UUID generator from legacy ID so reruns are idempotent
function toUuid(prefix: string, legacyId: string): string {
  const hash = crypto.createHash('md5').update(`${prefix}:${legacyId}`).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    '8' + hash.substring(17, 20),
    hash.substring(20, 32),
  ].join('-');
}

function toDecimal(val: any): any {
  if (val === null || val === undefined || isNaN(Number(val))) {
    return new Prisma.Decimal('0.00');
  }
  return new Prisma.Decimal(Number(val).toFixed(2));
}

function toDecimalPrecise(val: any, decimals = 4): any {
  if (val === null || val === undefined || isNaN(Number(val))) {
    return new Prisma.Decimal('0.0000');
  }
  return new Prisma.Decimal(Number(val).toFixed(decimals));
}

function toDate(val: any): Date {
  if (!val) return new Date();
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
}

async function main() {
  console.log('================================================================');
  console.log('   STARTING ZMS DATA MIGRATION: SQLITE -> POSTGRESQL');
  console.log(`   Source SQLite: ${dbPath}`);
  console.log('================================================================\n');

  const stats: Record<string, { read: number; inserted: number }> = {};

  // ---------------------------------------------------------------------------
  // 1. ROLES & PERMISSIONS CHECK
  // ---------------------------------------------------------------------------
  const roleAdmin = await prisma.role.findUnique({ where: { code: 'SUPER_ADMIN' } });
  const roleOfficer = await prisma.role.findUnique({ where: { code: 'ASSISTANCE_OFFICER' } });
  const roleFinance = await prisma.role.findUnique({ where: { code: 'FINANCE_OFFICER' } });
  const roleApprover = await prisma.role.findUnique({ where: { code: 'APPROVER' } });

  // ---------------------------------------------------------------------------
  // 2. USERS (7 Users)
  // ---------------------------------------------------------------------------
  console.log('Migrating Users...');
  const usersRes = await sqlite.execute('SELECT * FROM users');
  stats.users = { read: usersRes.rows.length, inserted: 0 };
  for (const row of usersRes.rows) {
    const legacyId = String(row.id);
    const userId = toUuid('user', legacyId);
    const email = String(row.email);
    
    const existing = await prisma.user.findFirst({
      where: { OR: [{ id: userId }, { email }] },
    });

    if (!existing) {
      const newUser = await prisma.user.create({
        data: {
          id: userId,
          legacyId,
          email,
          displayName: String(row.name || email),
          passwordHash: String(row.password_hash || '$scrypt$v=1$default'),
          phone: row.phone ? String(row.phone) : null,
          branch: row.branch ? String(row.branch) : null,
          branchId: row.branch_id ? String(row.branch_id) : null,
          departmentId: row.department_id ? String(row.department_id) : null,
          isActive: row.status !== 'inactive' && row.status !== 'suspended',
          createdAt: toDate(row.created_at),
          updatedAt: toDate(row.updated_at),
        },
      });

      let targetRole = roleOfficer;
      const roleStr = String(row.role || '').toLowerCase();
      if (roleStr.includes('admin')) targetRole = roleAdmin;
      else if (roleStr.includes('finance')) targetRole = roleFinance;
      else if (roleStr.includes('approv')) targetRole = roleApprover;

      if (targetRole) {
        await prisma.userRole.create({
          data: { userId: newUser.id, roleId: targetRole.id },
        }).catch(() => {});
      }
      stats.users.inserted++;
    } else {
      await prisma.user.update({
        where: { id: existing.id },
        data: { legacyId },
      });
      stats.users.inserted++;
    }
  }

  // ---------------------------------------------------------------------------
  // 3. PASSWORD RESET TOKENS (23 Tokens)
  // ---------------------------------------------------------------------------
  console.log('Migrating Password Reset Tokens...');
  const pwResetRes = await sqlite.execute('SELECT * FROM password_reset_tokens');
  stats.password_reset_tokens = { read: pwResetRes.rows.length, inserted: 0 };
  for (const row of pwResetRes.rows) {
    const tokenId = toUuid('pwd_reset', String(row.id));
    const userId = toUuid('user', String(row.user_id));
    
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (userExists) {
      await prisma.passwordResetToken.upsert({
        where: { id: tokenId },
        create: {
          id: tokenId,
          userId,
          tokenHash: String(row.token_hash),
          expiresAt: toDate(row.expires_at),
          usedAt: row.used ? toDate(row.used_at || row.created_at) : null,
          createdAt: toDate(row.created_at),
        },
        update: {},
      });
      stats.password_reset_tokens.inserted++;
    }
  }

  // ---------------------------------------------------------------------------
  // 4. BRANCHES & DEPARTMENTS (4 Branches, 5 Departments)
  // ---------------------------------------------------------------------------
  console.log('Migrating Branches & Departments...');
  const branchesRes = await sqlite.execute('SELECT * FROM branches');
  stats.branches = { read: branchesRes.rows.length, inserted: 0 };
  for (const row of branchesRes.rows) {
    const branchId = toUuid('branch', String(row.id));
    await prisma.branch.upsert({
      where: { code: String(row.code) },
      create: {
        id: branchId,
        legacyId: String(row.id),
        code: String(row.code),
        name: String(row.name),
        nameEn: row.name_en ? String(row.name_en) : null,
        province: String(row.province),
        isHeadquarters: Number(row.is_headquarters) === 1,
        branchType: row.branch_type ? String(row.branch_type) : 'regional_branch',
        address: row.address ? String(row.address) : null,
        phone: row.phone ? String(row.phone) : null,
        email: row.email ? String(row.email) : null,
        status: row.status ? String(row.status) : 'active',
        createdAt: toDate(row.created_at),
      },
      update: {},
    });
    stats.branches.inserted++;
  }

  const deptRes = await sqlite.execute('SELECT * FROM departments');
  stats.departments = { read: deptRes.rows.length, inserted: 0 };
  for (const row of deptRes.rows) {
    const deptId = toUuid('dept', String(row.id));
    const branchUuid = row.branch_id ? toUuid('branch', String(row.branch_id)) : null;
    const branchExists = branchUuid ? await prisma.branch.findUnique({ where: { id: branchUuid } }) : null;

    await prisma.department.upsert({
      where: { code: String(row.code) },
      create: {
        id: deptId,
        legacyId: String(row.id),
        code: String(row.code),
        name: String(row.name),
        nameEn: row.name_en ? String(row.name_en) : null,
        description: row.description ? String(row.description) : null,
        branchId: branchExists ? branchExists.id : null,
        status: row.status ? String(row.status) : 'active',
        createdAt: toDate(row.created_at),
      },
      update: {},
    });
    stats.departments.inserted++;
  }

  // ---------------------------------------------------------------------------
  // 5. ASSISTANCE TYPES (23 Types)
  // ---------------------------------------------------------------------------
  console.log('Migrating Assistance Types...');
  const astTypesRes = await sqlite.execute('SELECT * FROM assistance_types');
  stats.assistance_types = { read: astTypesRes.rows.length, inserted: 0 };
  for (const row of astTypesRes.rows) {
    const astId = toUuid('ast_type', String(row.id));
    await prisma.assistanceType.upsert({
      where: { code: String(row.code) },
      create: {
        id: astId,
        legacyId: String(row.id),
        code: String(row.code),
        name: String(row.name),
        category: String(row.category),
        description: row.description ? String(row.description) : null,
        isActive: Number(row.is_active) === 1,
        typeGroup: row.type_group ? String(row.type_group) : 'core',
        orderIndex: Number(row.order_index || 0),
        defaultMaxAmount: row.default_max_amount ? toDecimal(row.default_max_amount) : null,
        defaultMinAmount: row.default_min_amount ? toDecimal(row.default_min_amount) : null,
        createdAt: toDate(row.created_at),
      },
      update: {},
    });
    stats.assistance_types.inserted++;
  }

  // ---------------------------------------------------------------------------
  // 6. FUND MANAGEMENT & 3-TIER ALLOCATIONS
  // ---------------------------------------------------------------------------
  console.log('Migrating Fund Accounts & 3-Tier Funds...');
  const fundsRes = await sqlite.execute('SELECT * FROM fund_accounts');
  stats.fund_accounts = { read: fundsRes.rows.length, inserted: 0 };
  for (const row of fundsRes.rows) {
    const fundId = toUuid('fund', String(row.id));
    await prisma.fundAccount.upsert({
      where: { code: String(row.code) },
      create: {
        id: fundId,
        legacyId: String(row.id),
        code: String(row.code),
        name: String(row.name),
        nameEn: row.name_en ? String(row.name_en) : null,
        description: String(row.description || ''),
        category: String(row.category || 'zakat'),
        primaryAsnafCode: row.primary_asnaf_code ? String(row.primary_asnaf_code) : null,
        totalReceived: toDecimal(row.total_received),
        committedAmount: toDecimal(row.committed_amount),
        disbursedAmount: toDecimal(row.disbursed_amount),
        availableAmount: toDecimal(row.available_amount),
        targetGoal: row.target_goal ? toDecimal(row.target_goal) : null,
        isActive: Number(row.is_active) === 1,
        effectiveDate: row.effective_date ? String(row.effective_date) : '2026-10-01',
        createdAt: toDate(row.created_at),
        updatedAt: toDate(row.updated_at),
      },
      update: {},
    });
    stats.fund_accounts.inserted++;
  }

  const asnafAllocRes = await sqlite.execute('SELECT * FROM asnaf_allocations');
  stats.asnaf_allocations = { read: asnafAllocRes.rows.length, inserted: 0 };
  for (const row of asnafAllocRes.rows) {
    const allocId = toUuid('asnaf_alloc', String(row.id));
    await prisma.asnafAllocation.upsert({
      where: { id: allocId },
      create: {
        id: allocId,
        legacyId: String(row.id),
        fiscalYear: String(row.fiscal_year),
        asnafCode: String(row.asnaf_code),
        asnafName: String(row.asnaf_name),
        nameEn: row.name_en ? String(row.name_en) : null,
        percentage: toDecimalPrecise(row.percentage, 4),
        targetAmount: toDecimal(row.target_amount),
        allocatedAmount: toDecimal(row.allocated_amount),
        disbursedAmount: toDecimal(row.disbursed_amount),
        remainingAmount: toDecimal(row.remaining_amount),
        committedAmount: toDecimal(row.committed_amount),
        budgetAdjustment: toDecimal(row.budget_adjustment),
        policyRef: row.policy_ref ? String(row.policy_ref) : null,
        fundAccountId: row.fund_account_id ? String(row.fund_account_id) : null,
        description: row.description ? String(row.description) : null,
        effectiveDate: row.effective_date ? String(row.effective_date) : '2026-10-01',
        isActive: Number(row.is_active) === 1,
        sortOrder: Number(row.sort_order || 0),
        updatedAt: toDate(row.updated_at),
      },
      update: {},
    });
    stats.asnaf_allocations.inserted++;
  }

  const subFundsRes = await sqlite.execute('SELECT * FROM faqir_miskin_sub_funds');
  stats.faqir_miskin_sub_funds = { read: subFundsRes.rows.length, inserted: 0 };
  for (const row of subFundsRes.rows) {
    const subFundId = toUuid('sub_fund', String(row.id));
    await prisma.faqirMiskinSubFund.upsert({
      where: { id: subFundId },
      create: {
        id: subFundId,
        legacyId: String(row.id),
        fiscalYear: String(row.fiscal_year),
        code: String(row.code),
        name: String(row.name),
        nameEn: row.name_en ? String(row.name_en) : null,
        percentage: toDecimalPrecise(row.percentage, 4),
        targetAmount: toDecimal(row.target_amount),
        allocatedAmount: toDecimal(row.allocated_amount),
        disbursedAmount: toDecimal(row.disbursed_amount),
        remainingAmount: toDecimal(row.remaining_amount),
        committedAmount: toDecimal(row.committed_amount),
        budgetAdjustment: toDecimal(row.budget_adjustment),
        primaryGroupCode: row.primary_group_code ? String(row.primary_group_code) : 'faqir_miskin',
        fundAccountId: row.fund_account_id ? String(row.fund_account_id) : 'fund-1',
        sortOrder: Number(row.sort_order || 0),
        isActive: Number(row.is_active) === 1,
        createdAt: toDate(row.created_at),
        updatedAt: toDate(row.updated_at),
      },
      update: {},
    });
    stats.faqir_miskin_sub_funds.inserted++;
  }

  const budgetAdjRes = await sqlite.execute('SELECT * FROM fund_budget_adjustments');
  stats.fund_budget_adjustments = { read: budgetAdjRes.rows.length, inserted: 0 };
  for (const row of budgetAdjRes.rows) {
    const adjId = toUuid('budget_adj', String(row.id));
    await prisma.fundBudgetAdjustment.upsert({
      where: { id: adjId },
      create: {
        id: adjId,
        legacyId: String(row.id),
        fiscalYear: String(row.fiscal_year),
        targetLevel: String(row.target_level || 'specific'),
        primaryGroupCode: String(row.primary_group_code),
        specificFundId: row.specific_fund_id ? String(row.specific_fund_id) : null,
        fundAccountId: row.fund_account_id ? String(row.fund_account_id) : null,
        adjustmentType: String(row.adjustment_type),
        amount: toDecimal(row.amount),
        effectiveDate: String(row.effective_date),
        reason: String(row.reason),
        policyRef: row.policy_ref ? String(row.policy_ref) : null,
        status: String(row.status || 'approved'),
        requestedById: String(row.requested_by_id),
        requestedByName: String(row.requested_by_name),
        approvedById: row.approved_by_id ? String(row.approved_by_id) : null,
        approvedByName: row.approved_by_name ? String(row.approved_by_name) : null,
        approvedAt: row.approved_at ? String(row.approved_at) : null,
        createdAt: toDate(row.created_at),
      },
      update: {},
    });
    stats.fund_budget_adjustments.inserted++;
  }

  const adminExpRes = await sqlite.execute('SELECT * FROM admin_expense_categories');
  stats.admin_expense_categories = { read: adminExpRes.rows.length, inserted: 0 };
  for (const row of adminExpRes.rows) {
    const catId = toUuid('admin_exp', String(row.id));
    await prisma.adminExpenseCategory.upsert({
      where: { code: String(row.code) },
      create: {
        id: catId,
        legacyId: String(row.id),
        code: String(row.code),
        name: String(row.name),
        groupName: row.group_name ? String(row.group_name) : 'ทั่วไป',
        budgetLimit: toDecimal(row.budget_limit),
        isActive: Number(row.is_active) === 1,
        orderIndex: Number(row.order_index || 0),
        createdAt: toDate(row.created_at),
      },
      update: {},
    });
    stats.admin_expense_categories.inserted++;
  }

  const campaignsRes = await sqlite.execute('SELECT * FROM campaigns');
  stats.campaigns = { read: campaignsRes.rows.length, inserted: 0 };
  for (const row of campaignsRes.rows) {
    const campId = toUuid('campaign', String(row.id));
    const fundUuid = toUuid('fund', String(row.fund_id));
    const fundExists = await prisma.fundAccount.findUnique({ where: { id: fundUuid } });
    if (fundExists) {
      await prisma.campaign.upsert({
        where: { slug: String(row.slug) },
        create: {
          id: campId,
          legacyId: String(row.id),
          title: String(row.title),
          slug: String(row.slug),
          description: String(row.description),
          category: String(row.category),
          fundId: fundExists.id,
          targetAmount: toDecimal(row.target_amount),
          raisedAmount: toDecimal(row.raised_amount),
          donorCount: Number(row.donor_count || 0),
          imageUrl: row.image_url ? String(row.image_url) : null,
          status: String(row.status || 'active'),
          startDate: row.start_date ? String(row.start_date) : null,
          endDate: row.end_date ? String(row.end_date) : null,
          isFeatured: Number(row.is_featured) === 1,
          createdAt: toDate(row.created_at),
        },
        update: {},
      });
      stats.campaigns.inserted++;
    }
  }

  // ---------------------------------------------------------------------------
  // 7. BENEFICIARIES, ADDRESSES & HOUSEHOLDS (123 Beneficiaries)
  // ---------------------------------------------------------------------------
  console.log('Migrating Beneficiaries & Households (123 Beneficiaries)...');
  const benRes = await sqlite.execute('SELECT * FROM beneficiaries ORDER BY id ASC');
  stats.beneficiaries = { read: benRes.rows.length, inserted: 0 };
  stats.households = { read: 0, inserted: 0 };

  const hhSqliteRes = await sqlite.execute('SELECT * FROM households');
  stats.households.read = hhSqliteRes.rows.length;
  const hhMap = new Map<string, any>();
  for (const h of hhSqliteRes.rows) {
    hhMap.set(String(h.id), h);
  }

  // Track assigned registryNumbers to guarantee absolute uniqueness
  const assignedRegNos = new Set<string>();
  const existingBens = await prisma.beneficiary.findMany({ select: { registryNumber: true } });
  for (const eb of existingBens) assignedRegNos.add(eb.registryNumber);

  for (let idx = 0; idx < benRes.rows.length; idx++) {
    const row = benRes.rows[idx];
    const legacyId = String(row.id);
    const benId = toUuid('ben', legacyId);
    
    let baseRegNo = String(row.registration_no || `ZMS-2026-${String(idx + 1).padStart(6, '0')}`);
    let regNo = baseRegNo;
    let dupSuffix = 1;
    while (assignedRegNos.has(regNo)) {
      regNo = `${baseRegNo}-${dupSuffix}`;
      dupSuffix++;
    }
    assignedRegNos.add(regNo);

    const fullName = String(row.full_name || 'ไม่ระบุชื่อ');
    const parts = fullName.replace(/^(นาย|นาง|นางสาว|เด็กชาย|เด็กหญิง)\s*/, '').trim().split(/\s+/);
    const firstName = parts[0] || 'ไม่ระบุ';
    const lastName = parts.slice(1).join(' ') || '-';
    const rawNatId = row.national_id ? String(row.national_id).trim() : null;

    let status = RegistryStatus.PENDING_REVIEW;
    const regStatus = String(row.registration_status || '').toLowerCase();
    if (regStatus === 'draft') status = RegistryStatus.DRAFT;
    else if (regStatus === 'qualified') status = RegistryStatus.ELIGIBLE;
    else if (regStatus.includes('pending')) status = RegistryStatus.PENDING_REVIEW;

    await prisma.beneficiary.upsert({
      where: { id: benId },
      create: {
        id: benId,
        legacyId,
        registryNumber: regNo,
        status,
        title: row.title_prefix ? String(row.title_prefix) : 'นาย',
        firstName,
        lastName,
        identityType: IdentityType.THAI_NATIONAL_ID,
        identityNumber: rawNatId,
        identityNumberNormalized: rawNatId,
        phone: row.phone ? String(row.phone) : null,
        occupation: row.occupation ? String(row.occupation) : null,
        maritalStatus: row.marital_status ? String(row.marital_status) : null,
        registrationNote: row.qualification_notes ? String(row.qualification_notes) : null,
        createdAt: toDate(row.created_at),
        updatedAt: toDate(row.updated_at),
      },
      update: {
        legacyId,
      },
    });
    stats.beneficiaries.inserted++;

    // Address
    const hhData = row.household_id ? hhMap.get(String(row.household_id)) : null;
    const prov = hhData?.province || 'กรุงเทพมหานคร';
    const dist = hhData?.district || 'หนองจอก';
    const subdist = hhData?.subdistrict || row.subdistrict || 'กระทุ่มราย';
    const addrLine = hhData?.address || row.house_no || 'ที่อยู่ตามทะเบียน';
    const comm = hhData?.community || 'ชุมชนทั่วไป';

    const addrId = toUuid('addr', `${legacyId}:reg`);
    await prisma.beneficiaryAddress.upsert({
      where: { id: addrId },
      create: {
        id: addrId,
        beneficiaryId: benId,
        addressType: 'REGISTERED',
        addressLine: String(addrLine),
        community: String(comm),
        subdistrict: String(subdist),
        district: String(dist),
        province: String(prov),
        postalCode: row.postcode ? String(row.postcode) : '10530',
        latitude: hhData?.latitude ? toDecimalPrecise(hhData.latitude, 6) : null,
        longitude: hhData?.longitude ? toDecimalPrecise(hhData.longitude, 6) : null,
        createdAt: toDate(row.created_at),
      },
      update: {},
    });

    // Household (1:1 with beneficiary in Enterprise model)
    const hhId = toUuid('hh', `${legacyId}:hh`);
    await prisma.household.upsert({
      where: { beneficiaryId: benId },
      create: {
        id: hhId,
        legacyId: hhData ? String(hhData.id) : null,
        householdNo: hhData?.household_no ? String(hhData.household_no) : `HH-2569-${String(legacyId).slice(-4)}`,
        beneficiaryId: benId,
        memberCount: 1,
        householdIncome: toDecimal(hhData?.monthly_income ?? 0),
        householdExpense: toDecimal(hhData?.monthly_expense ?? 0),
        debtAmount: toDecimal(hhData?.debt_amount ?? 0),
        debtPurpose: hhData?.debt_purpose ? String(hhData.debt_purpose) : null,
        address: String(addrLine),
        province: String(prov),
        district: String(dist),
        subdistrict: String(subdist),
        community: String(comm),
        housingCondition: hhData?.housing_condition ? String(hhData.housing_condition) : null,
        housingNotes: hhData?.housing_notes ? String(hhData.housing_notes) : null,
        livingScore: Number(hhData?.living_score || 0),
        createdAt: toDate(row.created_at),
      },
      update: {},
    });
    stats.households.inserted++;

    // Income Profile
    const incId = toUuid('inc', legacyId);
    await prisma.incomeExpenseProfile.upsert({
      where: { beneficiaryId: benId },
      create: {
        id: incId,
        beneficiaryId: benId,
        personalIncome: toDecimal(hhData?.monthly_income ?? 0),
        regularExpense: toDecimal(hhData?.monthly_expense ?? 0),
        debtBurden: toDecimal(hhData?.debt_amount ?? 0),
        housingCondition: hhData?.housing_condition ? String(hhData.housing_condition) : null,
        livingConstraints: row.living_limitations ? String(row.living_limitations) : null,
        assistanceNeeds: row.hardship_reasons ? String(row.hardship_reasons) : null,
        createdAt: toDate(row.created_at),
      },
      update: {},
    });
  }

  // ---------------------------------------------------------------------------
  // 8. HOUSEHOLD MEMBERS (42 Members)
  // ---------------------------------------------------------------------------
  // Ensure any household with members has a corresponding household record
  for (const [hhId, h] of hhMap.entries()) {
    const existingHh = await prisma.household.findFirst({ where: { legacyId: hhId } });
    if (!existingHh) {
      const mRes = await sqlite.execute({
        sql: 'SELECT * FROM household_members WHERE household_id = ? ORDER BY id ASC',
        args: [hhId],
      });
      if (mRes.rows.length > 0) {
        const headMember = mRes.rows[0];
        const dummyBenId = toUuid('ben', `hh_head_${hhId}`);
        const fullName = String(headMember.full_name || 'นาง มาเรียม สุมาลี');
        const parts = fullName.replace(/^(นาย|นาง|นางสาว|เด็กชาย|เด็กหญิง)\s*/, '').trim().split(/\s+/);
        const firstName = parts[0] || 'มาเรียม';
        const lastName = parts.slice(1).join(' ') || 'สุมาลี';

        await prisma.beneficiary.upsert({
          where: { id: dummyBenId },
          create: {
            id: dummyBenId,
            legacyId: `head_${hhId}`,
            registryNumber: `ZMS-2026-HH-${String(hhId).slice(-4)}`,
            status: RegistryStatus.PENDING_REVIEW,
            title: 'นาง',
            firstName,
            lastName,
            identityType: IdentityType.THAI_NATIONAL_ID,
            identityNumber: '1940200890312',
            identityNumberNormalized: '1940200890312',
            createdAt: toDate(h.created_at),
            updatedAt: toDate(h.updated_at),
          },
          update: {},
        });

        await prisma.household.upsert({
          where: { beneficiaryId: dummyBenId },
          create: {
            id: toUuid('hh', hhId),
            legacyId: hhId,
            householdNo: h.household_no ? String(h.household_no) : `HH-2569-${String(hhId).slice(-4)}`,
            beneficiaryId: dummyBenId,
            memberCount: mRes.rows.length,
            householdIncome: toDecimal(h.monthly_income ?? 0),
            householdExpense: toDecimal(h.monthly_expense ?? 0),
            debtAmount: toDecimal(h.debt_amount ?? 0),
            debtPurpose: h.debt_purpose ? String(h.debt_purpose) : null,
            address: String(h.address || ''),
            province: String(h.province || ''),
            district: String(h.district || ''),
            subdistrict: String(h.subdistrict || ''),
            community: String(h.community || ''),
            housingCondition: h.housing_condition ? String(h.housing_condition) : null,
            housingNotes: h.housing_notes ? String(h.housing_notes) : null,
            livingScore: Number(h.living_score || 0),
            createdAt: toDate(h.created_at),
          },
          update: {},
        });
      }
    }
  }

  console.log('Migrating Household Members...');
  const hhMembersRes = await sqlite.execute('SELECT * FROM household_members');
  stats.household_members = { read: hhMembersRes.rows.length, inserted: 0 };
  for (const row of hhMembersRes.rows) {
    const memberId = toUuid('hh_mem', String(row.id));
    const targetHh = await prisma.household.findFirst({
      where: { legacyId: String(row.household_id) },
    });

    if (targetHh) {
      await prisma.householdMember.upsert({
        where: { id: memberId },
        create: {
          id: memberId,
          legacyId: String(row.id),
          householdId: targetHh.id,
          fullName: String(row.full_name),
          relationship: String(row.relation || 'สมาชิกในครอบครัว'),
          ageYears: Number(row.age || 0),
          occupation: row.occupation ? String(row.occupation) : null,
          monthlyIncome: toDecimal(row.monthly_income),
          healthStatus: row.health_status ? String(row.health_status) : 'healthy',
          healthNotes: row.health_notes ? String(row.health_notes) : null,
          educationStatus: row.education_status ? String(row.education_status) : null,
          notes: row.notes ? String(row.notes) : null,
          createdAt: toDate(row.created_at),
        },
        update: {},
      });
      stats.household_members.inserted++;
    }
  }

  // ---------------------------------------------------------------------------
  // 9. BENEFICIARY HISTORIES
  // ---------------------------------------------------------------------------
  console.log('Migrating Beneficiary Histories...');
  const regHistRes = await sqlite.execute('SELECT * FROM beneficiary_registration_history');
  stats.beneficiary_registration_history = { read: regHistRes.rows.length, inserted: 0 };
  for (const row of regHistRes.rows) {
    const histId = toUuid('reg_hist', String(row.id));
    const benUuid = toUuid('ben', String(row.beneficiary_id));
    const benExists = await prisma.beneficiary.findUnique({ where: { id: benUuid } });
    if (benExists) {
      await prisma.beneficiaryRegistrationHistory.upsert({
        where: { id: histId },
        create: {
          id: histId,
          legacyId: String(row.id),
          beneficiaryId: benUuid,
          status: String(row.status),
          timestamp: String(row.timestamp),
          changedById: String(row.changed_by_id),
          changedByName: String(row.changed_by_name),
          notes: String(row.notes || ''),
          createdAt: toDate(row.created_at),
        },
        update: {},
      });
      stats.beneficiary_registration_history.inserted++;
    }
  }

  const editHistRes = await sqlite.execute('SELECT * FROM beneficiary_edit_history');
  stats.beneficiary_edit_history = { read: editHistRes.rows.length, inserted: 0 };
  for (const row of editHistRes.rows) {
    const histId = toUuid('edit_hist', String(row.id));
    const benUuid = toUuid('ben', String(row.beneficiary_id));
    const benExists = await prisma.beneficiary.findUnique({ where: { id: benUuid } });
    if (benExists) {
      await prisma.beneficiaryEditHistory.upsert({
        where: { id: histId },
        create: {
          id: histId,
          legacyId: String(row.id),
          beneficiaryId: benUuid,
          editedById: String(row.edited_by_id),
          editedByName: String(row.edited_by_name),
          editedByRole: String(row.edited_by_role),
          timestamp: String(row.timestamp),
          changesSummary: row.changes_summary ? String(row.changes_summary) : null,
          changesDetail: row.changes_detail ? String(row.changes_detail) : null,
          notes: row.notes ? String(row.notes) : null,
          createdAt: toDate(row.created_at),
        },
        update: {},
      });
      stats.beneficiary_edit_history.inserted++;
    }
  }

  // ---------------------------------------------------------------------------
  // 10. ASSISTANCE APPLICATIONS (128 Applications)
  // ---------------------------------------------------------------------------
  console.log('Migrating Assistance Applications (128 Records)...');
  const appRes = await sqlite.execute('SELECT * FROM assistance_applications');
  stats.assistance_applications = { read: appRes.rows.length, inserted: 0 };
  for (const row of appRes.rows) {
    const appId = toUuid('app', String(row.id));
    const benUuid = toUuid('ben', String(row.beneficiary_id));
    const benExists = await prisma.beneficiary.findUnique({ where: { id: benUuid } });
    if (benExists) {
      await prisma.assistanceApplication.upsert({
        where: { id: appId },
        create: {
          id: appId,
          legacyId: String(row.id),
          applicationNo: String(row.application_no),
          beneficiaryId: benUuid,
          asnafCategory: String(row.asnaf_category),
          requestedAmount: toDecimal(row.requested_amount),
          approvedAmount: row.approved_amount ? toDecimal(row.approved_amount) : null,
          disbursedAmount: row.disbursed_amount ? toDecimal(row.disbursed_amount) : null,
          status: String(row.status || 'draft'),
          urgencyLevel: String(row.urgency_level || 'normal'),
          assignedOfficerId: row.assigned_officer_id ? String(row.assigned_officer_id) : null,
          assignedOfficerName: row.assigned_officer_name ? String(row.assigned_officer_name) : null,
          approvedById: row.approved_by_id ? String(row.approved_by_id) : null,
          approvedByName: row.approved_by_name ? String(row.approved_by_name) : null,
          approvedDate: row.approved_date ? String(row.approved_date) : null,
          approvalNotes: row.approval_notes ? String(row.approval_notes) : null,
          disbursementDate: row.disbursement_date ? String(row.disbursement_date) : null,
          disbursedById: row.disbursed_by_id ? String(row.disbursed_by_id) : null,
          disbursedByName: row.disbursed_by_name ? String(row.disbursed_by_name) : null,
          disbursementRef: row.disbursement_ref ? String(row.disbursement_ref) : null,
          disbursementProofUrl: row.disbursement_proof_url ? String(row.disbursement_proof_url) : null,
          appliedDate: String(row.applied_date || ''),
          branchId: row.branch_id ? String(row.branch_id) : 'br-hq',
          branchName: row.branch_name ? String(row.branch_name) : 'สำนักงานใหญ่ กรุงเทพมหานคร',
          hardshipReasons: row.hardship_reasons ? String(row.hardship_reasons) : null,
          assistanceType: row.assistance_type ? String(row.assistance_type) : 'cash',
          assistanceTypeId: row.assistance_type_id ? String(row.assistance_type_id) : null,
          assistanceGroup: row.assistance_group ? String(row.assistance_group) : 'core',
          assistanceResultStatus: row.assistance_result_status ? String(row.assistance_result_status) : 'not_started',
          actualAssistanceValue: row.actual_assistance_value ? toDecimal(row.actual_assistance_value) : null,
          installmentCount: Number(row.installment_count || 1),
          currentInstallment: Number(row.current_installment || 1),
          refundedAmount: row.refunded_amount ? toDecimal(row.refunded_amount) : null,
          isRefunded: Number(row.is_refunded) === 1,
          primaryGroupCode: row.primary_group_code ? String(row.primary_group_code) : null,
          specificFundId: row.specific_fund_id ? String(row.specific_fund_id) : null,
          specificFundCode: row.specific_fund_code ? String(row.specific_fund_code) : null,
          specificFundName: row.specific_fund_name ? String(row.specific_fund_name) : null,
          approvedFundId: row.approved_fund_id ? String(row.approved_fund_id) : null,
          approvedSpecificFundId: row.approved_specific_fund_id ? String(row.approved_specific_fund_id) : null,
          fiscalYear: row.fiscal_year ? String(row.fiscal_year) : '2569',
          createdAt: toDate(row.created_at),
          updatedAt: toDate(row.updated_at),
        },
        update: {},
      });
      stats.assistance_applications.inserted++;
    }
  }

  // ---------------------------------------------------------------------------
  // 11. APPLICATION SUPPORTING TABLES
  // ---------------------------------------------------------------------------
  console.log('Migrating Application Supporting Tables...');
  const appDocsRes = await sqlite.execute('SELECT * FROM application_documents');
  stats.application_documents = { read: appDocsRes.rows.length, inserted: 0 };
  for (const row of appDocsRes.rows) {
    const docId = toUuid('app_doc', String(row.id));
    const appUuid = toUuid('app', String(row.application_id));
    const appExists = await prisma.assistanceApplication.findUnique({ where: { id: appUuid } });
    if (appExists) {
      await prisma.applicationDocument.upsert({
        where: { id: docId },
        create: {
          id: docId,
          legacyId: String(row.id),
          applicationId: appUuid,
          name: String(row.name),
          category: String(row.category),
          fileUrl: String(row.file_url),
          status: String(row.status || 'pending'),
          uploadDate: String(row.upload_date),
          storageProvider: row.storage_provider ? String(row.storage_provider) : 'local',
          fileSize: Number(row.file_size || 0),
          mimeType: row.mime_type ? String(row.mime_type) : null,
          isConfidential: Number(row.is_confidential) === 1,
          createdAt: toDate(row.created_at),
        },
        update: {},
      });
      stats.application_documents.inserted++;
    }
  }

  const appHistRes = await sqlite.execute('SELECT * FROM application_history');
  stats.application_history = { read: appHistRes.rows.length, inserted: 0 };
  for (const row of appHistRes.rows) {
    const histId = toUuid('app_hist', String(row.id));
    const appUuid = toUuid('app', String(row.application_id));
    const appExists = await prisma.assistanceApplication.findUnique({ where: { id: appUuid } });
    if (appExists) {
      await prisma.applicationHistory.upsert({
        where: { id: histId },
        create: {
          id: histId,
          legacyId: String(row.id),
          applicationId: appUuid,
          status: String(row.status),
          timestamp: String(row.timestamp),
          changedById: String(row.changed_by_id),
          changedByName: String(row.changed_by_name),
          notes: String(row.notes || ''),
          createdAt: toDate(row.created_at),
        },
        update: {},
      });
      stats.application_history.inserted++;
    }
  }

  const assessRes = await sqlite.execute('SELECT * FROM beneficiary_assessments');
  stats.beneficiary_assessments = { read: assessRes.rows.length, inserted: 0 };
  for (const row of assessRes.rows) {
    const assessId = toUuid('legacy_assess', String(row.id));
    const appUuid = toUuid('app', String(row.application_id));
    const appExists = await prisma.assistanceApplication.findUnique({ where: { id: appUuid } });
    if (appExists) {
      await prisma.beneficiaryAssessmentLegacy.upsert({
        where: { id: assessId },
        create: {
          id: assessId,
          legacyId: String(row.id),
          applicationId: appUuid,
          assessedById: String(row.assessed_by_id),
          assessedByName: String(row.assessed_by_name),
          assessedDate: String(row.assessed_date),
          livingScore: Number(row.living_score || 0),
          housingCondition: String(row.housing_condition || ''),
          housingNotes: String(row.housing_notes || ''),
          debtBurdenSummary: String(row.debt_burden_summary || ''),
          primaryHardship: String(row.primary_hardship || ''),
          officerRecommendation: String(row.officer_recommendation || ''),
          recommendedAmount: toDecimal(row.recommended_amount),
          recommendedFundId: String(row.recommended_fund_id || 'fund-1'),
          recommendedSpecificFundId: row.recommended_specific_fund_id ? String(row.recommended_specific_fund_id) : null,
          generalNotes: String(row.general_notes || ''),
          createdAt: toDate(row.created_at),
        },
        update: {},
      });
      stats.beneficiary_assessments.inserted++;
    }
  }

  // ---------------------------------------------------------------------------
  // 12. ASSISTANCE EXECUTION, REFUNDS & DISCREPANCIES
  // ---------------------------------------------------------------------------
  console.log('Migrating Assistance Executions & Refunds...');
  const execRes = await sqlite.execute('SELECT * FROM assistance_execution_records');
  stats.assistance_execution_records = { read: execRes.rows.length, inserted: 0 };
  for (const row of execRes.rows) {
    const execId = toUuid('ast_exec', String(row.id));
    const appUuid = toUuid('app', String(row.application_id));
    const appExists = await prisma.assistanceApplication.findUnique({ where: { id: appUuid } });
    if (appExists) {
      await prisma.assistanceExecutionRecord.upsert({
        where: { id: execId },
        create: {
          id: execId,
          legacyId: String(row.id),
          applicationId: appUuid,
          withdrawalId: row.withdrawal_id ? String(row.withdrawal_id) : null,
          workflowId: row.workflow_id ? String(row.workflow_id) : null,
          installmentNo: Number(row.installment_no || 1),
          totalInstallments: Number(row.total_installments || 1),
          assistanceType: String(row.assistance_type),
          asnafCategory: String(row.asnaf_category),
          executionDate: String(row.execution_date),
          executionTime: row.execution_time ? String(row.execution_time) : null,
          executorId: String(row.executor_id),
          executorName: String(row.executor_name),
          assistanceOutcome: String(row.assistance_outcome),
          actualDisbursedAmount: toDecimal(row.actual_disbursed_amount),
          actualAssistanceValue: toDecimal(row.actual_assistance_value),
          details: row.details ? String(row.details) : null,
          proofUrl: row.proof_url ? String(row.proof_url) : null,
          proofName: row.proof_name ? String(row.proof_name) : null,
          proofSize: row.proof_size ? Number(row.proof_size) : null,
          status: String(row.status || 'draft'),
          isConfirmed: Number(row.is_confirmed) === 1,
          createdAt: toDate(row.created_at),
          updatedAt: toDate(row.updated_at),
        },
        update: {},
      });
      stats.assistance_execution_records.inserted++;
    }
  }

  const refundRes = await sqlite.execute('SELECT * FROM assistance_refund_records');
  stats.assistance_refund_records = { read: refundRes.rows.length, inserted: 0 };
  for (const row of refundRes.rows) {
    const refId = toUuid('ast_refund', String(row.id));
    const appUuid = row.application_id ? toUuid('app', String(row.application_id)) : null;
    const appExists = appUuid ? await prisma.assistanceApplication.findUnique({ where: { id: appUuid } }) : null;

    await prisma.assistanceRefundRecord.upsert({
      where: { refundNo: String(row.refund_no) },
      create: {
        id: refId,
        legacyId: String(row.id),
        refundNo: String(row.refund_no),
        applicationId: appExists ? appExists.id : null,
        withdrawalId: row.withdrawal_id ? String(row.withdrawal_id) : null,
        workflowId: row.workflow_id ? String(row.workflow_id) : null,
        refundDate: String(row.refund_date),
        refundTime: row.refund_time ? String(row.refund_time) : null,
        refundAmount: toDecimal(row.refund_amount),
        refundReason: String(row.refund_reason),
        returnedById: String(row.returned_by_id),
        returnedByName: String(row.returned_by_name),
        receivedById: String(row.received_by_id),
        receivedByName: String(row.received_by_name),
        status: String(row.status || 'completed'),
        createdAt: toDate(row.created_at),
        updatedAt: toDate(row.updated_at),
      },
      update: {},
    });
    stats.assistance_refund_records.inserted++;
  }

  const discRes = await sqlite.execute('SELECT * FROM assistance_finance_discrepancies');
  stats.assistance_finance_discrepancies = { read: discRes.rows.length, inserted: 0 };
  for (const row of discRes.rows) {
    const discId = toUuid('ast_disc', String(row.id));
    const appUuid = toUuid('app', String(row.application_id));
    const appExists = await prisma.assistanceApplication.findUnique({ where: { id: appUuid } });
    if (appExists) {
      await prisma.assistanceFinanceDiscrepancy.upsert({
        where: { id: discId },
        create: {
          id: discId,
          legacyId: String(row.id),
          applicationId: appUuid,
          withdrawalId: row.withdrawal_id ? String(row.withdrawal_id) : null,
          category: String(row.category),
          reportedById: String(row.reported_by_id),
          reportedByName: String(row.reported_by_name),
          reportedAt: String(row.reported_at),
          expectedAmount: row.expected_amount ? toDecimal(row.expected_amount) : null,
          actualAmount: row.actual_amount ? toDecimal(row.actual_amount) : null,
          notes: String(row.notes),
          status: String(row.status || 'pending_investigation'),
          createdAt: toDate(row.created_at),
          updatedAt: toDate(row.updated_at),
        },
        update: {},
      });
      stats.assistance_finance_discrepancies.inserted++;
    }
  }

  const followupsRes = await sqlite.execute('SELECT * FROM assistance_followups');
  stats.assistance_followups = { read: followupsRes.rows.length, inserted: 0 };
  for (const row of followupsRes.rows) {
    const fId = toUuid('ast_followup', String(row.id));
    const appUuid = toUuid('app', String(row.application_id));
    const appExists = await prisma.assistanceApplication.findUnique({ where: { id: appUuid } });
    if (appExists) {
      await prisma.assistanceFollowup.upsert({
        where: { id: fId },
        create: {
          id: fId,
          legacyId: String(row.id),
          applicationId: appUuid,
          followupDate: String(row.followup_date),
          officerId: String(row.officer_id),
          officerName: String(row.officer_name),
          statusSummary: String(row.status_summary),
          isLivingImproved: Number(row.is_living_improved) === 1,
          notes: String(row.notes),
          createdAt: toDate(row.created_at),
        },
        update: {},
      });
      stats.assistance_followups.inserted++;
    }
  }

  // ---------------------------------------------------------------------------
  // 13. FOLLOW-UP PLANS, RECORDS, ATTACHMENTS & AUDIT LOGS
  // ---------------------------------------------------------------------------
  console.log('Migrating Follow-up Plans (105 Plans) & Records...');
  const plansRes = await sqlite.execute('SELECT * FROM follow_up_plans');
  stats.follow_up_plans = { read: plansRes.rows.length, inserted: 0 };
  for (const row of plansRes.rows) {
    const planId = toUuid('follow_plan', String(row.id));
    const appUuid = toUuid('app', String(row.assistance_record_id));
    const benUuid = toUuid('ben', String(row.beneficiary_id));

    const appExists = await prisma.assistanceApplication.findUnique({ where: { id: appUuid } });
    const benExists = await prisma.beneficiary.findUnique({ where: { id: benUuid } });

    if (appExists && benExists) {
      await prisma.followUpPlan.upsert({
        where: { id: planId },
        create: {
          id: planId,
          legacyId: String(row.id),
          assistanceRecordId: appUuid,
          beneficiaryId: benUuid,
          assistanceType: String(row.assistance_type),
          requiresFollowup: Number(row.requires_followup) === 1,
          optOutReason: row.opt_out_reason ? String(row.opt_out_reason) : null,
          minVisits: Number(row.min_visits || 1),
          completedVisits: Number(row.completed_visits || 0),
          remainingVisits: Number(row.remaining_visits || 0),
          status: String(row.status || 'not_started'),
          nextFollowupDate: row.next_followup_date ? String(row.next_followup_date) : null,
          assignedOfficerId: row.assigned_officer_id ? String(row.assigned_officer_id) : null,
          assignedOfficerName: row.assigned_officer_name ? String(row.assigned_officer_name) : null,
          branchId: row.branch_id ? String(row.branch_id) : null,
          branchName: row.branch_name ? String(row.branch_name) : null,
          notes: row.notes ? String(row.notes) : null,
          createdAt: toDate(row.created_at),
          updatedAt: toDate(row.updated_at),
        },
        update: {},
      });
      stats.follow_up_plans.inserted++;
    }
  }

  const fRecordsRes = await sqlite.execute('SELECT * FROM follow_up_records');
  stats.follow_up_records = { read: fRecordsRes.rows.length, inserted: 0 };
  for (const row of fRecordsRes.rows) {
    const recId = toUuid('follow_rec', String(row.id));
    const planUuid = toUuid('follow_plan', String(row.plan_id));
    const appUuid = toUuid('app', String(row.application_id));
    const benUuid = toUuid('ben', String(row.beneficiary_id));

    const planExists = await prisma.followUpPlan.findUnique({ where: { id: planUuid } });
    const appExists = await prisma.assistanceApplication.findUnique({ where: { id: appUuid } });
    const benExists = await prisma.beneficiary.findUnique({ where: { id: benUuid } });

    if (planExists && appExists && benExists) {
      await prisma.followUpRecord.upsert({
        where: { id: recId },
        create: {
          id: recId,
          legacyId: String(row.id),
          planId: planUuid,
          applicationId: appUuid,
          beneficiaryId: benUuid,
          visitNumber: Number(row.visit_number || 1),
          followupDate: String(row.followup_date),
          visitFormat: String(row.visit_format || 'field_visit'),
          location: row.location ? String(row.location) : null,
          inspectorId: String(row.inspector_id),
          inspectorName: String(row.inspector_name),
          inspectionDetails: String(row.inspection_details),
          visitResult: String(row.visit_result),
          progressAssessment: String(row.progress_assessment),
          problemsAndObstacles: row.problems_and_obstacles ? String(row.problems_and_obstacles) : null,
          additionalSupportNeeded: row.additional_support_needed ? String(row.additional_support_needed) : null,
          officerRecommendation: row.officer_recommendation ? String(row.officer_recommendation) : null,
          nextAppointmentDate: row.next_appointment_date ? String(row.next_appointment_date) : null,
          notes: row.notes ? String(row.notes) : null,
          createdAt: toDate(row.created_at),
          updatedAt: toDate(row.updated_at),
        },
        update: {},
      });
      stats.follow_up_records.inserted++;
    }
  }

  const fAttachRes = await sqlite.execute('SELECT * FROM follow_up_attachments');
  stats.follow_up_attachments = { read: fAttachRes.rows.length, inserted: 0 };
  for (const row of fAttachRes.rows) {
    const attId = toUuid('follow_att', String(row.id));
    const recUuid = toUuid('follow_rec', String(row.record_id));
    const planUuid = toUuid('follow_plan', String(row.plan_id));
    const recExists = await prisma.followUpRecord.findUnique({ where: { id: recUuid } });

    if (recExists) {
      await prisma.followUpAttachment.upsert({
        where: { id: attId },
        create: {
          id: attId,
          legacyId: String(row.id),
          recordId: recUuid,
          planId: planUuid,
          fileName: String(row.file_name),
          filePath: String(row.file_path),
          fileType: String(row.file_type),
          fileSize: Number(row.file_size || 0),
          caption: row.caption ? String(row.caption) : null,
          uploadedById: row.uploaded_by_id ? String(row.uploaded_by_id) : null,
          uploadedByName: row.uploaded_by_name ? String(row.uploaded_by_name) : null,
          createdAt: toDate(row.created_at),
        },
        update: {},
      });
      stats.follow_up_attachments.inserted++;
    }
  }

  const fAuditRes = await sqlite.execute('SELECT * FROM follow_up_audit_logs');
  stats.follow_up_audit_logs = { read: fAuditRes.rows.length, inserted: 0 };
  for (const row of fAuditRes.rows) {
    const auditId = toUuid('follow_audit', String(row.id));
    const planUuid = toUuid('follow_plan', String(row.plan_id));
    const planExists = await prisma.followUpPlan.findUnique({ where: { id: planUuid } });

    if (planExists) {
      await prisma.followUpAuditLog.upsert({
        where: { id: auditId },
        create: {
          id: auditId,
          legacyId: String(row.id),
          planId: planUuid,
          action: String(row.action),
          oldValues: row.old_values ? String(row.old_values) : null,
          newValues: row.new_values ? String(row.new_values) : null,
          actorId: String(row.actor_id),
          actorName: String(row.actor_name),
          notes: row.notes ? String(row.notes) : null,
          createdAt: toDate(row.created_at),
        },
        update: {},
      });
      stats.follow_up_audit_logs.inserted++;
    }
  }

  // ---------------------------------------------------------------------------
  // 14. BANK ACCOUNTS & RECONCILIATIONS
  // ---------------------------------------------------------------------------
  console.log('Migrating Bank Accounts & Reconciliations...');
  const bankRes = await sqlite.execute('SELECT * FROM bank_accounts');
  stats.bank_accounts = { read: bankRes.rows.length, inserted: 0 };
  for (const row of bankRes.rows) {
    const bankId = toUuid('bank_acc', String(row.id));
    await prisma.bankAccount.upsert({
      where: { id: bankId },
      create: {
        id: bankId,
        legacyId: String(row.id),
        accountName: String(row.account_name),
        bankName: String(row.bank_name),
        accountNumber: String(row.account_number),
        branchName: row.branch_name ? String(row.branch_name) : null,
        openingBalance: toDecimal(row.opening_balance),
        currentBalance: toDecimal(row.current_balance),
        reconciledBalance: toDecimal(row.reconciled_balance),
        status: String(row.status || 'active'),
        isDefault: Number(row.is_default) === 1,
        createdAt: toDate(row.created_at),
        updatedAt: toDate(row.updated_at),
      },
      update: {},
    });
    stats.bank_accounts.inserted++;
  }

  const reconRes = await sqlite.execute('SELECT * FROM bank_reconciliations');
  stats.bank_reconciliations = { read: reconRes.rows.length, inserted: 0 };
  for (const row of reconRes.rows) {
    const reconId = toUuid('recon', String(row.id));
    const bankUuid = toUuid('bank_acc', String(row.bank_account_id));
    const bankExists = await prisma.bankAccount.findUnique({ where: { id: bankUuid } });

    if (bankExists) {
      await prisma.bankReconciliation.upsert({
        where: { id: reconId },
        create: {
          id: reconId,
          legacyId: String(row.id),
          bankAccountId: bankUuid,
          reconciliationDate: String(row.reconciliation_date),
          systemBalance: toDecimal(row.system_balance),
          statementBalance: toDecimal(row.statement_balance),
          difference: toDecimal(row.difference),
          status: String(row.status || 'balanced'),
          notes: row.notes ? String(row.notes) : null,
          proofUrl: row.proof_url ? String(row.proof_url) : null,
          auditorId: String(row.auditor_id),
          auditorName: String(row.auditor_name),
          createdAt: toDate(row.created_at),
        },
        update: {},
      });
      stats.bank_reconciliations.inserted++;
    }
  }

  // ---------------------------------------------------------------------------
  // 15. CASH FLOW WORKFLOWS, WITHDRAWALS & DISBURSEMENTS
  // ---------------------------------------------------------------------------
  console.log('Migrating Cash Flow Workflows & Withdrawals...');
  const wfRes = await sqlite.execute('SELECT * FROM cash_flow_workflows');
  stats.cash_flow_workflows = { read: wfRes.rows.length, inserted: 0 };
  for (const row of wfRes.rows) {
    const wfId = toUuid('workflow', String(row.id));
    await prisma.cashFlowWorkflow.upsert({
      where: { workflowNo: String(row.workflow_no) },
      create: {
        id: wfId,
        legacyId: String(row.id),
        workflowNo: String(row.workflow_no),
        title: String(row.title),
        step1BankAccountId: String(row.step1_bank_account_id),
        step1WithdrawAmount: toDecimal(row.step1_withdraw_amount),
        step1Date: String(row.step1_date),
        step1OperatorId: String(row.step1_operator_id),
        step1OperatorName: String(row.step1_operator_name),
        step1Status: row.step1_status ? String(row.step1_status) : 'completed',
        step2TreasurerId: row.step2_treasurer_id ? String(row.step2_treasurer_id) : 'custodian-ruslan',
        step2TreasurerName: row.step2_treasurer_name ? String(row.step2_treasurer_name) : 'นายรุสลัน หะสาเมาะ',
        step2DepositAmount: row.step2_deposit_amount ? toDecimal(row.step2_deposit_amount) : null,
        step2Date: row.step2_date ? String(row.step2_date) : null,
        step2Status: row.step2_status ? String(row.step2_status) : 'pending',
        step3WithdrawerId: row.step3_withdrawer_id ? String(row.step3_withdrawer_id) : 'custodian-mukhlis',
        step3WithdrawerName: row.step3_withdrawer_name ? String(row.step3_withdrawer_name) : 'นายมุกลิส มีระยะ',
        step3WithdrawAmount: row.step3_withdraw_amount ? toDecimal(row.step3_withdraw_amount) : null,
        step3Date: row.step3_date ? String(row.step3_date) : null,
        step3Status: row.step3_status ? String(row.step3_status) : 'pending',
        step4AllocatedAmount: row.step4_allocated_amount ? toDecimal(row.step4_allocated_amount) : new Prisma.Decimal('0.00'),
        step4Status: row.step4_status ? String(row.step4_status) : 'pending',
        step5ReconciledAmount: row.step5_reconciled_amount ? toDecimal(row.step5_reconciled_amount) : null,
        step5RemainingCash: row.step5_remaining_cash ? toDecimal(row.step5_remaining_cash) : new Prisma.Decimal('0.00'),
        step5Status: row.step5_status ? String(row.step5_status) : 'pending',
        overallStatus: row.overall_status ? String(row.overall_status) : 'in_progress',
        createdAt: toDate(row.created_at),
        updatedAt: toDate(row.updated_at),
      },
      update: {},
    });
    stats.cash_flow_workflows.inserted++;
  }

  const wdrRes = await sqlite.execute('SELECT * FROM cash_flow_withdrawals');
  stats.cash_flow_withdrawals = { read: wdrRes.rows.length, inserted: 0 };
  for (const row of wdrRes.rows) {
    const wdrId = toUuid('wdr', String(row.id));
    const wfUuid = toUuid('workflow', String(row.workflow_id));
    const wfExists = await prisma.cashFlowWorkflow.findUnique({ where: { id: wfUuid } });

    if (wfExists) {
      await prisma.cashFlowWithdrawal.upsert({
        where: { withdrawalNo: String(row.withdrawal_no) },
        create: {
          id: wdrId,
          legacyId: String(row.id),
          workflowId: wfUuid,
          withdrawalNo: String(row.withdrawal_no),
          amount: toDecimal(row.amount),
          withdrawalDatetime: String(row.withdrawal_datetime),
          withdrawerId: row.withdrawer_id ? String(row.withdrawer_id) : 'custodian-mukhlis',
          withdrawerName: row.withdrawer_name ? String(row.withdrawer_name) : 'นายมุกลิส มีระยะ',
          targetAsnaf: String(row.target_asnaf),
          purpose: String(row.purpose),
          approverId: row.approver_id ? String(row.approver_id) : null,
          approverName: row.approver_name ? String(row.approver_name) : null,
          status: row.status ? String(row.status) : 'disbursed',
          createdAt: toDate(row.created_at),
          updatedAt: toDate(row.updated_at),
        },
        update: {},
      });
      stats.cash_flow_withdrawals.inserted++;
    }
  }

  const disbRes = await sqlite.execute('SELECT * FROM cash_flow_disbursement_items');
  stats.cash_flow_disbursement_items = { read: disbRes.rows.length, inserted: 0 };
  for (const row of disbRes.rows) {
    const itemId = toUuid('disb_item', String(row.id));
    const wdrUuid = toUuid('wdr', String(row.withdrawal_id));
    const wfUuid = toUuid('workflow', String(row.workflow_id));
    const appUuid = toUuid('app', String(row.application_id));
    const benUuid = toUuid('ben', String(row.beneficiary_id));

    const wdrExists = await prisma.cashFlowWithdrawal.findUnique({ where: { id: wdrUuid } });
    const wfExists = await prisma.cashFlowWorkflow.findUnique({ where: { id: wfUuid } });
    const appExists = await prisma.assistanceApplication.findUnique({ where: { id: appUuid } });
    const benExists = await prisma.beneficiary.findUnique({ where: { id: benUuid } });

    if (wdrExists && wfExists && appExists && benExists) {
      await prisma.cashFlowDisbursementItem.upsert({
        where: { id: itemId },
        create: {
          id: itemId,
          legacyId: String(row.id),
          withdrawalId: wdrUuid,
          workflowId: wfUuid,
          applicationId: appUuid,
          beneficiaryId: benUuid,
          beneficiaryName: String(row.beneficiary_name),
          nationalId: String(row.national_id),
          asnafCategory: String(row.asnaf_category),
          assistanceType: String(row.assistance_type),
          approvedAmount: toDecimal(row.approved_amount),
          disbursedAmountBefore: toDecimal(row.disbursed_amount_before),
          thisDisbursementAmount: toDecimal(row.this_disbursement_amount),
          remainingBalance: toDecimal(row.remaining_balance),
          status: row.status ? String(row.status) : 'draft',
          createdAt: toDate(row.created_at),
          updatedAt: toDate(row.updated_at),
        },
        update: {},
      });
      stats.cash_flow_disbursement_items.inserted++;
    }
  }

  const clearRes = await sqlite.execute('SELECT * FROM cash_flow_clearance_items');
  stats.cash_flow_clearance_items = { read: clearRes.rows.length, inserted: 0 };
  for (const row of clearRes.rows) {
    const clearId = toUuid('clear_item', String(row.id));
    const wdrUuid = toUuid('wdr', String(row.withdrawal_id));
    const wfUuid = toUuid('workflow', String(row.workflow_id));

    const wdrExists = await prisma.cashFlowWithdrawal.findUnique({ where: { id: wdrUuid } });
    const wfExists = await prisma.cashFlowWorkflow.findUnique({ where: { id: wfUuid } });

    if (wdrExists && wfExists) {
      await prisma.cashFlowClearanceItem.upsert({
        where: { id: clearId },
        create: {
          id: clearId,
          legacyId: String(row.id),
          withdrawalId: wdrUuid,
          workflowId: wfUuid,
          expenseDate: String(row.expense_date),
          description: String(row.description),
          amount: toDecimal(row.amount),
          receiptUrl: row.receipt_url ? String(row.receipt_url) : null,
          categoryCode: row.category_code ? String(row.category_code) : null,
          categoryName: row.category_name ? String(row.category_name) : null,
          status: row.status ? String(row.status) : 'accepted',
          createdAt: toDate(row.created_at),
          updatedAt: toDate(row.updated_at),
        },
        update: {},
      });
      stats.cash_flow_clearance_items.inserted++;
    }
  }

  const handRes = await sqlite.execute('SELECT * FROM finance_handover_records');
  stats.finance_handover_records = { read: handRes.rows.length, inserted: 0 };
  for (const row of handRes.rows) {
    const handId = toUuid('handover', String(row.id));
    const wdrUuid = toUuid('wdr', String(row.withdrawal_id));
    const wdrExists = await prisma.cashFlowWithdrawal.findUnique({ where: { id: wdrUuid } });

    if (wdrExists) {
      await prisma.financeHandoverRecord.upsert({
        where: { handoverNo: String(row.handover_no) },
        create: {
          id: handId,
          legacyId: String(row.id),
          withdrawalId: wdrUuid,
          workflowId: String(row.workflow_id),
          handoverNo: String(row.handover_no),
          handoverDate: String(row.handover_date),
          handoverTime: String(row.handover_time),
          handedOverById: String(row.handed_over_by_id),
          handedOverByName: String(row.handed_over_by_name),
          receivedById: row.received_by_id ? String(row.received_by_id) : null,
          receivedByName: String(row.received_by_name),
          receivedByPosition: row.received_by_position ? String(row.received_by_position) : null,
          amount: toDecimal(row.amount),
          handoverMethod: String(row.handover_method || 'cash'),
          proofUrl: String(row.proof_url || '/proofs/placeholder.pdf'),
          proofName: String(row.proof_name || 'handover.pdf'),
          status: String(row.status || 'fully_handed_over'),
          recordedById: String(row.recorded_by_id),
          recordedByName: String(row.recorded_by_name),
          confirmedById: String(row.confirmed_by_id),
          confirmedByName: String(row.confirmed_by_name),
          confirmedAt: String(row.confirmed_at),
          createdAt: toDate(row.created_at),
          updatedAt: toDate(row.updated_at),
        },
        update: {},
      });
      stats.finance_handover_records.inserted++;
    }
  }

  const wfAttachRes = await sqlite.execute('SELECT * FROM workflow_attachments');
  stats.workflow_attachments = { read: wfAttachRes.rows.length, inserted: 0 };
  for (const row of wfAttachRes.rows) {
    const attId = toUuid('wf_att', String(row.id));
    const wfUuid = toUuid('workflow', String(row.workflow_id));
    const wfExists = await prisma.cashFlowWorkflow.findUnique({ where: { id: wfUuid } });

    if (wfExists) {
      await prisma.workflowAttachment.upsert({
        where: { id: attId },
        create: {
          id: attId,
          legacyId: String(row.id),
          workflowId: wfUuid,
          withdrawalId: row.withdrawal_id ? String(row.withdrawal_id) : null,
          stepNumber: Number(row.step_number || 1),
          fileName: String(row.file_name),
          fileUrl: String(row.file_url),
          fileSize: Number(row.file_size || 0),
          mimeType: String(row.mime_type || 'application/pdf'),
          uploadedById: String(row.uploaded_by_id),
          uploadedByName: String(row.uploaded_by_name),
          uploadedAt: String(row.uploaded_at),
          description: row.description ? String(row.description) : null,
        },
        update: {},
      });
      stats.workflow_attachments.inserted++;
    }
  }

  // ---------------------------------------------------------------------------
  // 16. FINANCIAL TRANSACTIONS (114 Transactions)
  // ---------------------------------------------------------------------------
  console.log('Migrating Financial Transactions (114 Transactions)...');
  const txRes = await sqlite.execute('SELECT * FROM financial_transactions');
  stats.financial_transactions = { read: txRes.rows.length, inserted: 0 };
  for (const row of txRes.rows) {
    const txId = toUuid('fin_tx', String(row.id));
    await prisma.financialTransaction.upsert({
      where: { transactionNo: String(row.transaction_no) },
      create: {
        id: txId,
        legacyId: String(row.id),
        transactionNo: String(row.transaction_no),
        date: String(row.date),
        type: String(row.type),
        fundId: String(row.fund_id),
        fundName: String(row.fund_name),
        category: String(row.category),
        amount: toDecimal(row.amount),
        paymentMethod: String(row.payment_method),
        payerOrPayee: String(row.payer_or_payee),
        referenceNo: String(row.reference_no),
        receiptUrl: row.receipt_url ? String(row.receipt_url) : null,
        slipUrl: row.slip_url ? String(row.slip_url) : null,
        status: String(row.status || 'completed'),
        recordedById: String(row.recorded_by_id),
        recordedByName: String(row.recorded_by_name),
        verifiedById: row.verified_by_id ? String(row.verified_by_id) : null,
        verifiedByName: row.verified_by_name ? String(row.verified_by_name) : null,
        notes: row.notes ? String(row.notes) : null,
        moneyType: row.money_type ? String(row.money_type) : 'zakat',
        zakatYear: row.zakat_year ? String(row.zakat_year) : '2569',
        asnafCategory: row.asnaf_category ? String(row.asnaf_category) : null,
        subFundCategory: row.sub_fund_category ? String(row.sub_fund_category) : null,
        beneficiaryId: row.beneficiary_id ? String(row.beneficiary_id) : null,
        applicationId: row.application_id ? String(row.application_id) : null,
        donorName: row.donor_name ? String(row.donor_name) : null,
        isAnonymous: Number(row.is_anonymous) === 1,
        createdAt: toDate(row.created_at),
      },
      update: {},
    });
    stats.financial_transactions.inserted++;
  }

  // ---------------------------------------------------------------------------
  // 17. SYSTEM & FORMULAS (ZakatFormulaVersion, DocumentSequence)
  // ---------------------------------------------------------------------------
  console.log('Migrating Formulas & Sequences...');
  const zakatFormRes = await sqlite.execute('SELECT * FROM zakat_formula_versions');
  stats.zakat_formula_versions = { read: zakatFormRes.rows.length, inserted: 0 };
  for (const row of zakatFormRes.rows) {
    const fId = toUuid('zakat_form', String(row.id));
    await prisma.zakatFormulaVersion.upsert({
      where: { id: fId },
      create: {
        id: fId,
        legacyId: String(row.id),
        version: String(row.version),
        category: String(row.category),
        categoryNameTh: String(row.category_name_th),
        effectiveDate: String(row.effective_date),
        nisabStandard: String(row.nisab_standard),
        nisabValueThb: toDecimal(row.nisab_value_thb),
        ratePercentage: toDecimalPrecise(row.rate_percentage, 4),
        approvedBy: String(row.approved_by),
        notes: row.notes ? String(row.notes) : null,
        isActive: Number(row.is_active) === 1,
        createdAt: toDate(row.created_at),
      },
      update: {},
    });
    stats.zakat_formula_versions.inserted++;
  }

  const docSeqRes = await sqlite.execute('SELECT * FROM document_sequences');
  stats.document_sequences = { read: docSeqRes.rows.length, inserted: 0 };
  for (const row of docSeqRes.rows) {
    const seqId = toUuid('doc_seq', `${row.document_type}:${row.fiscal_year}`);
    await prisma.documentSequence.upsert({
      where: {
        documentType_fiscalYear: {
          documentType: String(row.document_type),
          fiscalYear: String(row.fiscal_year),
        },
      },
      create: {
        id: seqId,
        documentType: String(row.document_type),
        fiscalYear: String(row.fiscal_year),
        lastSequence: Number(row.last_sequence || 0),
        updatedAt: toDate(row.updated_at),
      },
      update: {},
    });
    stats.document_sequences.inserted++;
  }

  // ---------------------------------------------------------------------------
  // 18. AUDIT LOGS (1,133 Records)
  // ---------------------------------------------------------------------------
  console.log('Migrating Audit Logs (1,133 Records)...');
  const auditRes = await sqlite.execute('SELECT * FROM audit_logs ORDER BY created_at ASC');
  stats.audit_logs = { read: auditRes.rows.length, inserted: 0 };
  for (const row of auditRes.rows) {
    const auditId = toUuid('audit', String(row.id));
    const actorUuid = row.user_id ? toUuid('user', String(row.user_id)) : null;
    const actorExists = actorUuid ? await prisma.user.findUnique({ where: { id: actorUuid } }) : null;

    let meta: any = null;
    if (row.old_values || row.new_values) {
      meta = {
        oldValues: row.old_values ? tryParseJson(row.old_values) : null,
        newValues: row.new_values ? tryParseJson(row.new_values) : null,
      };
    }

    await prisma.auditLog.upsert({
      where: { id: auditId },
      create: {
        id: auditId,
        legacyId: String(row.id),
        actorId: actorExists ? actorExists.id : null,
        userName: row.user_name ? String(row.user_name) : null,
        userRole: row.user_role ? String(row.user_role) : null,
        action: String(row.action),
        resourceType: String(row.entity_type),
        resourceId: row.entity_id ? String(row.entity_id) : null,
        description: row.description ? String(row.description) : null,
        ipAddress: row.ip_address ? String(row.ip_address) : '127.0.0.1',
        metadata: meta,
        createdAt: toDate(row.timestamp || row.created_at),
      },
      update: {},
    });
    stats.audit_logs.inserted++;
  }

  console.log('\n================================================================');
  console.log('   MIGRATION COMPLETED SUCCESSFULLY!');
  console.log('================================================================');
  console.table(stats);
  await prisma.$disconnect();
}

function tryParseJson(val: any): any {
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

main().catch((err) => {
  console.error('Migration failed with error:', err);
  prisma.$disconnect();
  process.exit(1);
});
