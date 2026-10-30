import { getDb, initDb } from '@/lib/db';
import { 
  ApplicationStatus, 
  AsnafCategory, 
  HousingType, 
  MaritalStatus, 
  LandTitleType, 
  HardshipReasons, 
  HouseholdIncomeBreakdown, 
  HouseholdExpenseBreakdown, 
  PastAssistanceRecord, 
  CoordinatorInfo, 
  CertifierInfo, 
  EvaluatorChecklist,
  HouseholdMember,
  BeneficiaryDocument
} from '@/types';
import { StorageService } from './storageService';
import { calculateAge } from '@/utils/ageCalculator';
import { validateAddress } from '@/lib/thaiAddress';
import { FinancialService } from './financialService';
import { normalizePrimaryGroupCode, getCentralAsnafByCode } from '@/lib/financeUtils';

export interface HouseholdMemberInput {
  id?: string;
  fullName: string;
  relation: string;
  age: number;
  educationStatus?: string;
  occupation: string;
  monthlyIncome: number;
  healthStatus?: string;
  healthNotes?: string;
  notes?: string;
}

export interface BeneficiaryRegistrationInput {
  // ส่วน A: ข้อมูลส่วนบุคคลและที่อยู่อาศัย
  titlePrefix?: string;
  fullName: string;
  nationalId: string; // 13 digits
  birthDate?: string;
  age?: number;
  phone: string;
  email?: string;
  occupation?: string;
  maritalStatus?: MaritalStatus;
  address: string;
  province: string;
  district: string;
  subdistrict?: string;
  postcode?: string;
  community: string;
  branchId?: string;
  branchName?: string;
  housingType?: HousingType;
  housingCondition?: string;
  housingNotes?: string;
  landTitleType?: LandTitleType;
  landTitleNotes?: string;

  // ส่วน B: เหตุผลและสภาพปัจจุบัน
  hardshipReasons?: HardshipReasons;
  asnafCategory?: AsnafCategory;
  urgencyLevel?: 'normal' | 'high' | 'urgent';
  debtAmount?: number;
  debtPurpose?: string;
  debtType?: string;
  otherHardshipDetail?: string;

  // ส่วน C: ประเภทความช่วยเหลือและโครงสร้างกองทุน 3 ระดับ
  primaryGroupCode?: string;
  specificFundId?: string;
  fiscalYear?: string;
  assistanceType?: string;
  assistanceTypeId?: string;
  assistanceTypeDetails?: string;
  requestedAmount?: number;
  requestedItemsDetail?: string;
  necessityDetails?: string;
  urgencyReason?: string;

  // ส่วน D: ประวัติการช่วยเหลือ
  pastAssistance?: PastAssistanceRecord[];

  // ส่วน E: รายรับและรายจ่ายครัวเรือน
  monthlyIncome?: number;
  monthlyExpense?: number;
  incomeBreakdown?: HouseholdIncomeBreakdown;
  expenseBreakdown?: HouseholdExpenseBreakdown;

  // ส่วน F: สมาชิกครอบครัว
  householdMembers?: HouseholdMemberInput[];

  // ส่วน G: สภาพครอบครัวโดยละเอียด
  familySituationSummary?: string;
  urgentNeeds?: string;
  dependentBurdens?: string;

  // ส่วน H: ผู้ประสานงานและผู้รับรอง
  coordinator?: CoordinatorInfo;
  certifier?: CertifierInfo;

  // ส่วน I: เอกสารแนบ
  documents?: {
    name?: string;
    fileName?: string;
    category?: string;
    documentType?: string;
    fileUrl: string;
  }[];

  title?: string;
  // Checklist เบื้องต้น (ถ้ามี)
  checklist?: EvaluatorChecklist;
  evaluatorChecklist?: EvaluatorChecklist;
  status?: ApplicationStatus;
}

export interface AssessmentInput {
  livingScore: number;
  housingCondition: string;
  housingNotes: string;
  debtBurdenSummary: string;
  primaryHardship: string;
  officerRecommendation: 'recommend_full' | 'recommend_partial' | 'recommend_decline';
  recommendedAmount: number;
  recommendedFundId: string;
  recommendedSpecificFundId?: string;
  generalNotes: string;
}

export interface ActorContext {
  id: string;
  name: string;
  role: string;
  nationalId?: string;
  beneficiaryId?: string;
}

// Helper to mask National ID according to PDPA
export function maskNationalId(id?: string | null): string {
  if (!id) return '';
  const clean = String(id).replace(/[^0-9]/g, '');
  if (clean.length < 13) return String(id);
  return `${clean[0]}-${clean.slice(1, 5)}-XXXXX-${clean.slice(10, 12)}-${clean[12]}`;
}

export class BeneficiaryService {
  /**
   * 0. Resolve AsnafCategory from Level-1 Primary Fund Group Code
   */
  static resolveAsnafCategoryFromPrimary(primaryGroupCode: string, explicitAsnaf?: string): AsnafCategory {
    const norm = normalizePrimaryGroupCode(primaryGroupCode);
    if (norm === 'faqir_miskin') {
      if (explicitAsnaf === 'faqir' || explicitAsnaf === 'miskin') return explicitAsnaf;
      return 'miskin';
    }
    if (norm === 'humanitarian') return 'riqab';
    if (norm === 'muallaf') return 'muallaf';
    if (norm === 'gharimin') return 'gharimin';
    if (norm === 'fisabilillah') return 'fisabilillah';
    if (norm === 'ibnsabil') return 'ibnsabil';
    if (norm === 'amil') return 'amil';
    return 'miskin';
  }

  /**
   * 0.1 Server-Side 3-Tier Fund & Assistance Type Validator
   * Verifies:
   *  - requestedAmount > 0
   *  - Level 3 (Assistance Type) exists and is active
   *  - Level 2 (Specific Fund) exists, is active, and owns Level 3
   *  - Level 1 (Primary Fund Group) exists, is active, and owns Level 2
   */
  static async validateAndResolveThreeTierSelection(params: {
    fiscalYear?: string;
    primaryGroupCode?: string;
    asnafCategory?: string;
    specificFundId?: string;
    assistanceTypeId?: string;
    assistanceType?: string;
    requestedAmount?: number;
    requireExplicitThreeTier?: boolean;
  }) {
    await initDb();
    const db = getDb();
    const fiscalYear = (params.fiscalYear || '2569').trim();

    // 1. Validate Requested Amount > 0
    const amount = Number(params.requestedAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('INVALID_AMOUNT: จำนวนเงินที่ขอรับความช่วยเหลือต้องมากกว่า 0 บาท');
    }

    if (params.requireExplicitThreeTier) {
      if ((!params.primaryGroupCode || !String(params.primaryGroupCode).trim()) && (!params.asnafCategory || !String(params.asnafCategory).trim())) {
        throw new Error('MISSING_PRIMARY_GROUP: กรุณาเลือกกลุ่มกองทุนหลัก (อัสนัฟ)');
      }
      if (!params.specificFundId || !String(params.specificFundId).trim()) {
        throw new Error('MISSING_SPECIFIC_FUND: กรุณาเลือกกองทุนเฉพาะ (Specific Fund)');
      }
      if (!params.assistanceTypeId || !String(params.assistanceTypeId).trim()) {
        throw new Error('MISSING_ASSISTANCE_TYPE: กรุณาเลือกประเภทความช่วยเหลือ');
      }
    } else {
      if (params.specificFundId !== undefined && String(params.specificFundId).trim() === '') {
        throw new Error('MISSING_SPECIFIC_FUND: กรุณาเลือกกองทุนเฉพาะ (Specific Fund)');
      }
      if (params.assistanceTypeId !== undefined && String(params.assistanceTypeId).trim() === '') {
        throw new Error('MISSING_ASSISTANCE_TYPE: กรุณาเลือกประเภทความช่วยเหลือ');
      }
    }

    // 2. Resolve & Validate Level 3: Assistance Type
    let astRow: any = null;
    const cleanAstId = params.assistanceTypeId ? String(params.assistanceTypeId).trim() : '';
    const cleanAstName = params.assistanceType ? String(params.assistanceType).trim() : '';

    if (cleanAstId) {
      const astRes = await db.execute({
        sql: 'SELECT * FROM assistance_types WHERE id = ? OR code = ? LIMIT 1',
        args: [cleanAstId, cleanAstId],
      });
      if (astRes.rows.length === 0) {
        throw new Error(`INVALID_ASSISTANCE_TYPE: ไม่พบประเภทความช่วยเหลือรหัส "${cleanAstId}" ในระบบ`);
      }
      astRow = astRes.rows[0];
    } else if (cleanAstName) {
      const legacyCodeMap: Record<string, string> = {
        cash: 'LIVING_SUPPORT',
        living: 'LIVING_SUPPORT',
        housing: 'HOUSING_REPAIR_BUILD',
        career: 'CAREER_SUPPORT',
        education: 'EDUCATION_GRANT',
        medical: 'MEDICAL_AID',
        emergency: 'EMERGENCY_AID',
        debt_relief: 'GHARIMUN_DEBT',
      };
      const mappedCode = legacyCodeMap[cleanAstName.toLowerCase()] || cleanAstName;
      const astRes = await db.execute({
        sql: 'SELECT * FROM assistance_types WHERE id = ? OR code = ? OR name = ? ORDER BY is_active DESC LIMIT 1',
        args: [cleanAstName, mappedCode, cleanAstName],
      });
      if (astRes.rows.length > 0) {
        astRow = astRes.rows[0];
      }
    }

    if (!astRow) {
      // Fallback only when legacy caller omitted assistanceTypeId: pick first active type in target fund/group
      const fallbackPrimary = normalizePrimaryGroupCode(params.primaryGroupCode || params.asnafCategory || 'faqir_miskin');
      const fallbackSf = params.specificFundId ? String(params.specificFundId).trim() : '';
      const fbRes = fallbackSf
        ? await db.execute({
            sql: 'SELECT * FROM assistance_types WHERE specific_fund_id = ? AND is_active = 1 ORDER BY order_index ASC LIMIT 1',
            args: [fallbackSf],
          })
        : await db.execute({
            sql: 'SELECT * FROM assistance_types WHERE primary_group_code = ? AND is_active = 1 ORDER BY order_index ASC LIMIT 1',
            args: [fallbackPrimary],
          });
      if (fbRes.rows.length === 0) {
        throw new Error('INVALID_ASSISTANCE_TYPE: ไม่พบประเภทความช่วยเหลือที่เปิดใช้งานสำหรับกองทุนที่เลือก');
      }
      astRow = fbRes.rows[0];
    }

    if (Number(astRow.is_active ?? 1) !== 1) {
      throw new Error(`INACTIVE_ASSISTANCE_TYPE: ประเภทความช่วยเหลือ "${String(astRow.name)}" ถูกปิดใช้งานแล้ว ไม่สามารถยื่นคำร้องได้`);
    }

    // 3. Resolve & Validate Level 2: Specific Fund
    const targetSfKey = (params.specificFundId && String(params.specificFundId).trim())
      ? String(params.specificFundId).trim()
      : String(astRow.specific_fund_id || '');

    if (!targetSfKey) {
      throw new Error('INVALID_SPECIFIC_FUND: ประเภทความช่วยเหลือนี้ไม่ได้เชื่อมโยงกับกองทุนเฉพาะใด');
    }

    let sfRes = await db.execute({
      sql: 'SELECT * FROM faqir_miskin_sub_funds WHERE (id = ? OR code = ? OR fund_code = ?) AND fiscal_year = ? LIMIT 1',
      args: [targetSfKey, targetSfKey, targetSfKey, fiscalYear],
    });
    if (sfRes.rows.length === 0) {
      sfRes = await db.execute({
        sql: 'SELECT * FROM faqir_miskin_sub_funds WHERE id = ? OR code = ? OR fund_code = ? LIMIT 1',
        args: [targetSfKey, targetSfKey, targetSfKey],
      });
    }
    if (sfRes.rows.length === 0) {
      throw new Error(`INVALID_SPECIFIC_FUND: ไม่พบกองทุนเฉพาะรหัส "${targetSfKey}" ในระบบ`);
    }

    const sfRow = sfRes.rows[0];
    if (Number(sfRow.is_active ?? 1) !== 1) {
      throw new Error(`INACTIVE_SPECIFIC_FUND: กองทุนเฉพาะ "${String(sfRow.name)}" ถูกปิดใช้งานแล้ว ไม่สามารถรับคำร้องใหม่ได้`);
    }

    if (String(astRow.specific_fund_id || '') !== String(sfRow.id)) {
      throw new Error(
        `MISMATCH_FUND_TYPE: ประเภทความช่วยเหลือ "${String(astRow.name)}" ไม่ได้สังกัดอยู่ในกองทุนเฉพาะ "${String(sfRow.name)}"`
      );
    }

    // 4. Resolve & Validate Level 1: Primary Fund Group
    const sfPrimaryCode = normalizePrimaryGroupCode(String(sfRow.primary_group_code || 'faqir_miskin'));
    const hasExplicitPrimary = Boolean(
      (params.primaryGroupCode && String(params.primaryGroupCode).trim()) ||
      (params.asnafCategory && String(params.asnafCategory).trim())
    );
    const requestedPrimaryCode = (params.primaryGroupCode && String(params.primaryGroupCode).trim())
      ? normalizePrimaryGroupCode(params.primaryGroupCode)
      : (params.asnafCategory && String(params.asnafCategory).trim())
      ? normalizePrimaryGroupCode(params.asnafCategory)
      : sfPrimaryCode;

    let pgRes = await db.execute({
      sql: 'SELECT * FROM asnaf_allocations WHERE asnaf_code = ? AND fiscal_year = ? LIMIT 1',
      args: [requestedPrimaryCode, fiscalYear],
    });
    if (pgRes.rows.length === 0) {
      pgRes = await db.execute({
        sql: 'SELECT * FROM asnaf_allocations WHERE asnaf_code = ? LIMIT 1',
        args: [requestedPrimaryCode],
      });
    }
    if (pgRes.rows.length === 0) {
      throw new Error(`INVALID_PRIMARY_GROUP: ไม่พบกลุ่มกองทุนหลักรหัส "${requestedPrimaryCode}" ในระบบ`);
    }

    const pgRow = pgRes.rows[0];
    if (Number(pgRow.is_active ?? 1) !== 1) {
      throw new Error(`INACTIVE_PRIMARY_GROUP: กลุ่มกองทุนหลัก "${String(pgRow.asnaf_name)}" ถูกปิดใช้งานแล้ว ไม่สามารถรับคำร้องใหม่ได้`);
    }

    if (hasExplicitPrimary && sfPrimaryCode !== requestedPrimaryCode) {
      throw new Error(
        `MISMATCH_PRIMARY_GROUP: กองทุนเฉพาะ "${String(sfRow.name)}" สังกัดกลุ่มหลัก "${sfPrimaryCode}" ไม่ตรงกับกลุ่มหลักที่เลือก ("${requestedPrimaryCode}")`
      );
    }

    const resolvedAsnafCategory = this.resolveAsnafCategoryFromPrimary(sfPrimaryCode, params.asnafCategory);
    const centralDef = getCentralAsnafByCode(sfPrimaryCode);

    return {
      fiscalYear,
      primaryGroupCode: sfPrimaryCode,
      primaryGroupName: String(pgRow.asnaf_name || centralDef?.nameTh || sfPrimaryCode),
      asnafCategory: resolvedAsnafCategory,
      specificFundId: String(sfRow.id),
      specificFundCode: String(sfRow.code),
      specificFundName: String(sfRow.name),
      fundAccountId: String(sfRow.fund_account_id || pgRow.fund_account_id || 'fund-1'),
      assistanceTypeId: String(astRow.id),
      assistanceTypeCode: String(astRow.code),
      assistanceTypeName: String(astRow.name),
      assistanceGroup: (astRow.type_group === 'specific' ? 'specific' : 'core') as 'core' | 'specific',
      defaultMinAmount: astRow.default_min_amount !== null && astRow.default_min_amount !== undefined ? Number(astRow.default_min_amount) : undefined,
      defaultMaxAmount: astRow.default_max_amount !== null && astRow.default_max_amount !== undefined ? Number(astRow.default_max_amount) : undefined,
      classificationSnapshot: JSON.stringify({
        fiscalYear,
        primaryGroupCode: sfPrimaryCode,
        primaryGroupName: String(pgRow.asnaf_name || centralDef?.nameTh || sfPrimaryCode),
        specificFundId: String(sfRow.id),
        specificFundCode: String(sfRow.code),
        specificFundName: String(sfRow.name),
        assistanceTypeId: String(astRow.id),
        assistanceTypeCode: String(astRow.code),
        assistanceTypeName: String(astRow.name),
        timestamp: new Date().toISOString(),
      }),
    };
  }

  /**
   * 1. Register Beneficiary with Duplicate Check & Full Survey Form (Sections A-I) Insertion
   */
  static async registerBeneficiary(
    rawInput: BeneficiaryRegistrationInput | any,
    rawActor?: ActorContext
  ) {
    await initDb();
    const db = getDb();

    const input: BeneficiaryRegistrationInput = (rawInput && (rawInput as any).input) ? (rawInput as any).input : (rawInput || {});
    const actor: ActorContext = rawActor || (rawInput && (rawInput as any).actor) || {
      id: 'officer-1',
      name: 'เจ้าหน้าที่ผู้รับผิดชอบ',
      role: 'officer',
    };

    // 1. Authorization check
    if (!['officer', 'super_admin', 'member', 'approver', 'executive'].includes(actor.role)) {
      throw new Error(`บทบาท ${actor.role} ไม่มีสิทธิ์ในการลงทะเบียนผู้ขอรับความช่วยเหลือ`);
    }

    // 2. DUPLICATE CHECK: Validate unique national_id safely
    const rawNationalId = input.nationalId || (rawInput as any)?.nationalId || '';
    const cleanNationalId = String(rawNationalId).replace(/[^0-9]/g, '');
    const existingBeneficiary = await db.execute({
      sql: 'SELECT id, full_name, national_id FROM beneficiaries WHERE national_id = ?',
      args: [cleanNationalId],
    });

    if (existingBeneficiary.rows.length > 0) {
      const existing = existingBeneficiary.rows[0];
      throw new Error(
        `ตรวจสอบพบข้อมูลซ้ำ! หมายเลขบัตรประชาชน ${maskNationalId(cleanNationalId)} เคยลงทะเบียนไว้แล้วในชื่อ "${existing.full_name}"`
      );
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const appliedDateStr = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

    // Server-side Birth Date & Age calculation (Prevents stale or forged age)
    let finalBirthDate: string | null = null;
    let finalAge = 0;
    if (input.birthDate) {
      const ageCalc = calculateAge(input.birthDate);
      if (ageCalc.isFuture) {
        throw new Error('วันเดือนปีเกิดต้องไม่อยู่ในอนาคต');
      }
      if (ageCalc.isValid) {
        finalBirthDate = ageCalc.isoDate;
        finalAge = ageCalc.years;
      } else {
        throw new Error(ageCalc.error || 'วันเดือนปีเกิดไม่ถูกต้อง');
      }
    } else if (input.age !== undefined && input.age !== null) {
      finalAge = Number(input.age) || 0;
    }

    // Server-side Address Validation & Consistency Check
    if (input.postcode || input.province || input.district || input.subdistrict) {
      const addrCheck = validateAddress(input.postcode, input.province, input.district, input.subdistrict);
      if (!addrCheck.isValid) {
        throw new Error(`ข้อมูลที่อยู่ไม่ถูกต้องหรือไม่สัมพันธ์กัน: ${addrCheck.message}`);
      }
    }

    // Server-side 3-Tier Fund & Assistance Type Validation
    const resolvedThreeTier = await this.validateAndResolveThreeTierSelection({
      fiscalYear: input.fiscalYear || '2569',
      primaryGroupCode: input.primaryGroupCode,
      asnafCategory: input.asnafCategory,
      specificFundId: input.specificFundId,
      assistanceTypeId: input.assistanceTypeId,
      assistanceType: input.assistanceType,
      requestedAmount: input.requestedAmount !== undefined ? input.requestedAmount : 3000,
      requireExplicitThreeTier: false,
    });

    // Generate unique IDs
    const householdId = `hh-${Date.now()}`;
    const householdNo = `HH-2569-${Date.now().toString().slice(-4)}`;
    const beneficiaryId = `ben-${Date.now()}`;
    
    // Count existing applications to generate serial application number
    const countRes = await db.execute('SELECT COUNT(*) as total FROM assistance_applications');
    const seq = Number(countRes.rows[0].total) + 1;
    const applicationNo = `APP-2569-${seq.toString().padStart(4, '0')}`;
    const applicationId = `app-${Date.now()}`;
    const initialStatus = input.status || 'submitted';

    // 3. Database Insertion
    // Insert Household with Survey Sections A, D, E, G, H
    await db.execute({
      sql: `INSERT INTO households (
        id, household_no, address, province, district, subdistrict, community,
        housing_condition, housing_notes, living_score, monthly_income, monthly_expense,
        debt_amount, debt_purpose, housing_type, land_title_type, land_title_notes,
        income_breakdown, expense_breakdown, past_assistance, family_situation_summary,
        urgent_needs, dependent_burdens, coordinator_info, certifier_info
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        householdId,
        householdNo,
        input.address,
        input.province,
        input.district,
        input.subdistrict || null,
        input.community || 'ชุมชนทั่วไป',
        input.housingCondition || 'dilapidated',
        input.housingNotes || '',
        0,
        input.monthlyIncome || 0,
        input.monthlyExpense || 0,
        input.debtAmount || 0,
        input.debtPurpose || '',
        input.housingType || 'own',
        input.landTitleType || 'title_deed',
        input.landTitleNotes || '',
        input.incomeBreakdown ? JSON.stringify(input.incomeBreakdown) : null,
        input.expenseBreakdown ? JSON.stringify(input.expenseBreakdown) : null,
        input.pastAssistance ? JSON.stringify(input.pastAssistance) : null,
        input.familySituationSummary || '',
        input.urgentNeeds || '',
        input.dependentBurdens || '',
        input.coordinator ? JSON.stringify(input.coordinator) : null,
        input.certifier ? JSON.stringify(input.certifier) : null,
      ],
    });

    // Insert Household Members (Section F)
    if (input.householdMembers && input.householdMembers.length > 0) {
      for (const m of input.householdMembers) {
        if (!m.fullName || !m.fullName.trim()) continue;
        await db.execute({
          sql: `INSERT INTO household_members (
            id, household_id, full_name, relation, age, occupation, monthly_income, health_status, health_notes, education_status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            `hm-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            householdId,
            m.fullName,
            m.relation,
            m.age || 0,
            m.occupation || 'ไม่มีอาชีพ',
            m.monthlyIncome || 0,
            m.healthStatus || 'healthy',
            m.healthNotes || '',
            m.educationStatus || '',
            m.notes || '',
          ],
        });
      }
    }

    // Insert Beneficiary (Section A)
    await db.execute({
      sql: `INSERT INTO beneficiaries (
        id, household_id, full_name, national_id, phone, email, asnaf_category,
        title_prefix, birth_date, age, occupation, marital_status, postcode, subdistrict, branch_id, branch_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        beneficiaryId,
        householdId,
        input.fullName || '',
        cleanNationalId,
        input.phone || '',
        input.email || null,
        input.asnafCategory || 'miskin',
        input.titlePrefix || input.title || 'นาย',
        finalBirthDate,
        finalAge,
        input.occupation || '',
        input.maritalStatus || 'single',
        input.postcode || '',
        input.subdistrict || '',
        input.branchId || 'br-hq',
        input.branchName || 'สำนักงานใหญ่ กรุงเทพมหานคร',
      ],
    });

    // Insert Assistance Application (Section B, C & 3-Tier Fund Workflow)
    await db.execute({
      sql: `INSERT INTO assistance_applications (
        id, application_no, beneficiary_id, asnaf_category, requested_amount,
        status, urgency_level, assigned_officer_id, assigned_officer_name, applied_date,
        branch_id, branch_name, hardship_reasons, assistance_type, assistance_type_id, assistance_group,
        primary_group_code, specific_fund_id, specific_fund_code, specific_fund_name, fiscal_year,
        assistance_type_details, necessity_details, evaluator_checklist
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        applicationId,
        applicationNo,
        beneficiaryId,
        resolvedThreeTier.asnafCategory,
        Number(input.requestedAmount !== undefined ? input.requestedAmount : 3000),
        initialStatus,
        input.urgencyLevel || 'normal',
        actor.id,
        actor.name,
        appliedDateStr,
        input.branchId || 'br-hq',
        input.branchName || 'สำนักงานใหญ่ กรุงเทพมหานคร',
        input.hardshipReasons ? JSON.stringify(input.hardshipReasons) : null,
        resolvedThreeTier.assistanceTypeName,
        resolvedThreeTier.assistanceTypeId,
        resolvedThreeTier.assistanceGroup,
        resolvedThreeTier.primaryGroupCode,
        resolvedThreeTier.specificFundId,
        resolvedThreeTier.specificFundCode,
        resolvedThreeTier.specificFundName,
        resolvedThreeTier.fiscalYear,
        input.assistanceTypeDetails || input.requestedItemsDetail || '',
        input.necessityDetails || input.urgencyReason || '',
        input.checklist ? JSON.stringify(input.checklist) : (input.evaluatorChecklist ? JSON.stringify(input.evaluatorChecklist) : null),
      ],
    });

    // Insert Application Documents (Section I)
    const defaultDocs = input.documents && input.documents.length > 0 
      ? input.documents 
      : [
          { name: 'สำเนาบัตรประชาชนผู้ขอรับ', category: 'id_card', fileUrl: '/docs/id-card.pdf' },
          { name: 'สำเนาทะเบียนบ้าน', category: 'house_reg', fileUrl: '/docs/house-reg.pdf' },
        ];

    for (const doc of defaultDocs) {
      const docName = (doc as any).name || (doc as any).fileName || 'เอกสารแนบ';
      const docCategory = (doc as any).category || (doc as any).documentType || 'other_doc';
      const docFileUrl = (doc as any).fileUrl || '/docs/file.pdf';
      await db.execute({
        sql: `INSERT INTO application_documents (
          id, application_id, name, category, file_url, status, upload_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          applicationId,
          docName,
          docCategory,
          docFileUrl,
          'pending',
          timestampNow,
        ],
      });
    }

    // Insert Application History
    await db.execute({
      sql: `INSERT INTO application_history (
        id, application_id, status, timestamp, changed_by_id, changed_by_name, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `hist-${Date.now()}`,
        applicationId,
        initialStatus,
        timestampNow,
        actor.id,
        actor.name,
        initialStatus === 'draft' ? 'บันทึกฉบับร่างคำร้องขอรับเงินซะกาต' : 'ลงทะเบียนคำร้องขอรับเงินซะกาตเข้าสู่ระบบเรียบร้อย',
      ],
    });

    // Insert Audit Log (Immutable)
    await db.execute({
      sql: `INSERT INTO audit_logs (
        id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'BENEFICIARY_REGISTERED',
        'application',
        applicationNo,
        `ลงทะเบียนผู้ขอรับซะกาตรายใหม่: ${input.fullName} (เลขที่ ${applicationNo}) หมวด ${input.asnafCategory}`,
      ],
    });

    return {
      applicationId,
      applicationNo,
      beneficiaryId,
      fullName: input.fullName,
      status: initialStatus,
    };
  }

  /**
   * 2. Review Documents
   */
  static async reviewDocument(
    applicationId: string,
    docId: string,
    status: 'verified' | 'rejected',
    rejectionReason: string | undefined,
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    if (!['officer', 'super_admin'].includes(actor.role)) {
      throw new Error(`บทบาท ${actor.role} ไม่มีสิทธิ์ในการตรวจรับรองเอกสาร`);
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    await db.execute({
      sql: `UPDATE application_documents 
            SET status = ?, verified_by_id = ?, verified_by_name = ?, verified_date = ?, rejection_reason = ?
            WHERE id = ? AND application_id = ?`,
      args: [status, actor.id, actor.name, timestampNow, rejectionReason || null, docId, applicationId],
    });

    // Check if all documents for this application are verified
    const docsRes = await db.execute({
      sql: 'SELECT status FROM application_documents WHERE application_id = ?',
      args: [applicationId],
    });

    const allVerified = docsRes.rows.every((d) => d.status === 'verified');
    const newStatus = allVerified ? 'assessment' : 'doc_review';

    await db.execute({
      sql: 'UPDATE assistance_applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [newStatus, applicationId],
    });

    // Record History & Audit
    await db.execute({
      sql: `INSERT INTO application_history (id, application_id, status, timestamp, changed_by_id, changed_by_name, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `hist-${Date.now()}`,
        applicationId,
        newStatus,
        timestampNow,
        actor.id,
        actor.name,
        `ตรวจสอบเอกสาร: ${status === 'verified' ? 'ผ่านการตรวจสอบ' : 'เอกสารไม่สมบูรณ์ (' + rejectionReason + ')'}`,
      ],
    });

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'DOCUMENT_REVIEWED',
        'application',
        applicationId,
        `ตรวจเอกสารคำร้อง ${applicationId}: ผลการตรวจ ${status}`,
      ],
    });

    return { applicationId, docId, status, applicationStatus: newStatus };
  }

  /**
   * 3. Submit Field Assessment & Living Score
   */
  static async submitAssessment(
    applicationId: string,
    assessment: AssessmentInput,
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    if (!['officer', 'super_admin'].includes(actor.role)) {
      throw new Error(`เฉพาะเจ้าหน้าที่ลงพื้นที่และผู้ดูแลระบบเท่านั้นที่มีสิทธิ์บันทึกผลการประเมิน`);
    }

    const appRes = await db.execute({
      sql: 'SELECT id, application_no, status, specific_fund_id FROM assistance_applications WHERE id = ?',
      args: [applicationId],
    });

    if (appRes.rows.length === 0) {
      throw new Error(`ไม่พบคำร้องหมายเลข ${applicationId}`);
    }

    const app = appRes.rows[0];
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const assessmentId = `ass-${Date.now()}`;

    // Upsert Assessment
    await db.execute({
      sql: `INSERT OR REPLACE INTO beneficiary_assessments (
        id, application_id, assessed_by_id, assessed_by_name, assessed_date,
        living_score, housing_condition, housing_notes, debt_burden_summary,
        primary_hardship, officer_recommendation, recommended_amount, recommended_fund_id, recommended_specific_fund_id, general_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        assessmentId,
        applicationId,
        actor.id,
        actor.name,
        timestampNow,
        assessment.livingScore,
        assessment.housingCondition || 'moderate',
        assessment.housingNotes || '',
        assessment.debtBurdenSummary || '',
        assessment.primaryHardship || '',
        assessment.officerRecommendation || 'recommend_full',
        assessment.recommendedAmount || 0,
        assessment.recommendedFundId || 'fund-1',
        assessment.recommendedSpecificFundId || null,
        assessment.generalNotes || '',
      ],
    });

    // Advance status to pending_approval
    await db.execute({
      sql: `UPDATE assistance_applications 
            SET status = 'pending_approval', updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?`,
      args: [applicationId],
    });

    // Record History & Audit
    await db.execute({
      sql: `INSERT INTO application_history (id, application_id, status, timestamp, changed_by_id, changed_by_name, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `hist-${Date.now()}`,
        applicationId,
        'pending_approval',
        timestampNow,
        actor.id,
        actor.name,
        `บันทึกผลการลงพื้นที่ คะแนนความจำเป็น ${assessment.livingScore}/100 และเสนอวงเงิน ฿${assessment.recommendedAmount.toLocaleString()}`,
      ],
    });

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'ASSESSMENT_SUBMITTED',
        'application',
        String(app.application_no),
        `บันทึกผลประเมิน ${assessment.livingScore} คะแนน และส่งเสนอคณะกรรมการพิจารณาอนุมัติ`,
      ],
    });

    return { applicationId, status: 'pending_approval', assessmentId };
  }

  /**
   * 4. Approve Application (Segregation of Duties & Fund Solvency Check)
   */
  static async approveApplication(
    applicationId: string,
    approvedAmount: number,
    fundId: string,
    notes: string,
    actor: ActorContext,
    specificFundId?: string
  ) {
    await initDb();
    const db = getDb();

    // 1. Check Role Authorization
    if (!['approver', 'executive', 'super_admin'].includes(actor.role)) {
      throw new Error(`บทบาท "${actor.role}" ไม่มีสิทธิ์พิจารณาอนุมัติคำร้องขอรับซะกาต`);
    }

    // 2. Fetch Application & Assessment details
    const appRes = await db.execute({
      sql: `SELECT a.id, a.application_no, a.assigned_officer_id, a.status, a.beneficiary_id,
                   a.specific_fund_id, a.primary_group_code, a.asnaf_category, a.fiscal_year,
                   ass.recommended_fund_id, ass.recommended_specific_fund_id
            FROM assistance_applications a
            LEFT JOIN beneficiary_assessments ass ON ass.application_id = a.id
            WHERE a.id = ?`,
      args: [applicationId],
    });

    if (appRes.rows.length === 0) {
      throw new Error(`ไม่พบคำร้อง ${applicationId}`);
    }

    const app = appRes.rows[0];

    // SEGREGATION OF DUTIES ENFORCEMENT:
    // Assigned Help Officer CANNOT approve their own application!
    if (app.assigned_officer_id === actor.id && actor.role !== 'super_admin') {
      throw new Error(
        `การละเมิดหลักการแบ่งแยกหน้าที่ (Segregation of Duties): เจ้าหน้าที่ผู้รับผิดชอบคำร้อง (${actor.name}) ไม่มีสิทธิ์อนุมัติคำร้องของตนเอง`
      );
    }

    // State Check: Must be in pending_approval (or pre-approval states)
    if (!['pending_approval', 'doc_review', 'assessment', 'submitted'].includes(String(app.status))) {
      throw new Error(`คำร้องนี้อยู่ในสถานะ "${app.status}" ไม่สามารถอนุมัติได้ (ต้องอยู่ในสถานะรออนุมัติเท่านั้น)`);
    }

    const fiscalYear = String(app.fiscal_year || '2569');

    // 3. Resolve Target Specific Fund (Level 2)
    const targetSpecificFundId = specificFundId ||
      (app.recommended_specific_fund_id ? String(app.recommended_specific_fund_id) : undefined) ||
      (app.specific_fund_id ? String(app.specific_fund_id) : undefined) ||
      'subf-1';

    const sfRes = await db.execute({
      sql: 'SELECT id, fund_code, code, name, primary_group_code, fund_account_id, is_active FROM faqir_miskin_sub_funds WHERE id = ?',
      args: [targetSpecificFundId],
    });

    if (sfRes.rows.length === 0) {
      throw new Error(`ไม่พบข้อมูลกองทุนเฉพาะเจาะจงรหัส ${targetSpecificFundId}`);
    }

    const sf = sfRes.rows[0];
    if (Number(sf.is_active ?? 1) === 0) {
      throw new Error(`กองทุนเฉพาะเจาะจง "${sf.name}" (${sf.fund_code || sf.code}) ถูกปิดใช้งาน ไม่สามารถจัดสรรงบประมาณได้`);
    }

    const primaryGroupCode = String(sf.primary_group_code || app.primary_group_code || 'faqir_miskin');
    const targetFundAccountId = fundId || String(sf.fund_account_id || 'fund-1');

    // 4. SOLVENCY CHECKS ACROSS 3 TIERS:
    // Tier 1: Check Fund Account
    const fundRes = await db.execute({
      sql: 'SELECT id, name, available_amount, committed_amount FROM fund_accounts WHERE id = ?',
      args: [targetFundAccountId],
    });

    if (fundRes.rows.length === 0) {
      throw new Error(`ไม่พบบัญชีกองทุนรหัส ${targetFundAccountId}`);
    }

    const fund = fundRes.rows[0];
    const availableAmount = Number(fund.available_amount);

    if (availableAmount < approvedAmount) {
      throw new Error(
        `ยอดเงินคงเหลือจัดสรรได้ในบัญชีกองทุน "${fund.name}" ไม่เพียงพอ! (คงเหลือ: ฿${availableAmount.toLocaleString()} บาท, ยอดที่ขออนุมัติ: ฿${approvedAmount.toLocaleString()} บาท)`
      );
    }

    // Tier 2: Check Specific Fund Solvency (get live dynamic metrics from FinancialService.getSpecificFunds)
    const sfList = await FinancialService.getSpecificFunds({
      fiscalYear,
      primaryGroupCode,
      status: 'all',
    });
    const liveSf = sfList.find((s) => s.id === targetSpecificFundId || s.code === sf.code);
    if (liveSf) {
      const sfRemaining = Number(liveSf.remainingAmount);
      if (sfRemaining < approvedAmount) {
        throw new Error(
          `ยอดงบประมาณคงเหลือในกองทุนเฉพาะเจาะจง "${sf.name}" (${liveSf.fundCode || sf.fund_code || sf.code}) ไม่เพียงพอ! (คงเหลือจัดสรรได้: ฿${sfRemaining.toLocaleString()} บาท, ยอดที่ขออนุมัติ: ฿${approvedAmount.toLocaleString()} บาท)`
        );
      }
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const approvedDateStr = new Date().toLocaleDateString('th-TH');

    // 5. Atomic Multi-Tier Commitment Updates
    // A) Fund Accounts
    await db.execute({
      sql: `UPDATE fund_accounts 
            SET committed_amount = committed_amount + ?, available_amount = available_amount - ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [approvedAmount, approvedAmount, targetFundAccountId],
    });

    // B) Specific Funds (faqir_miskin_sub_funds)
    await db.execute({
      sql: `UPDATE faqir_miskin_sub_funds
            SET committed_amount = committed_amount + ?, remaining_amount = MAX(0, remaining_amount - ?), updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [approvedAmount, approvedAmount, targetSpecificFundId],
    });

    // C) Primary Asnaf Allocation (asnaf_allocations)
    await db.execute({
      sql: `UPDATE asnaf_allocations
            SET committed_amount = committed_amount + ?, remaining_amount = MAX(0, remaining_amount - ?)
            WHERE asnaf_code = ? AND fiscal_year = ?`,
      args: [approvedAmount, approvedAmount, primaryGroupCode, fiscalYear],
    });

    // D) Assistance Applications
    await db.execute({
      sql: `UPDATE assistance_applications
            SET status = 'wait_disbursement',
                approved_amount = ?,
                approved_fund_id = ?,
                approved_specific_fund_id = ?,
                specific_fund_id = COALESCE(specific_fund_id, ?),
                approved_by_id = ?,
                approved_by_name = ?,
                approved_date = ?,
                approval_notes = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        approvedAmount,
        targetFundAccountId,
        targetSpecificFundId,
        targetSpecificFundId,
        actor.id,
        actor.name,
        approvedDateStr,
        notes,
        applicationId,
      ],
    });

    // E) History & Audit
    await db.execute({
      sql: `INSERT INTO application_history (id, application_id, status, timestamp, changed_by_id, changed_by_name, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `hist-${Date.now()}`,
        applicationId,
        'wait_disbursement',
        timestampNow,
        actor.id,
        actor.name,
        `อนุมัติวงเงิน ฿${approvedAmount.toLocaleString()} บาท จาก "${fund.name}" -> กองทุน "${sf.name}" (${notes}) และส่งต่อฝ่ายการเงิน`,
      ],
    });

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'APPLICATION_APPROVED',
        'application',
        String(app.application_no),
        `อนุมัติคำร้องวงเงิน ฿${approvedAmount.toLocaleString()} บาท (กันยอดผูกพันจาก ${fund.name} / ${sf.name}) โดย ${actor.name}`,
      ],
    });

    return {
      applicationId,
      status: 'wait_disbursement',
      approvedAmount,
      fundName: String(fund.name),
      specificFundId: targetSpecificFundId,
      specificFundName: String(sf.name),
    };
  }

  /**
   * 5. Reject Application
   */
  static async rejectApplication(
    applicationId: string,
    reason: string,
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    if (!['approver', 'executive', 'super_admin'].includes(actor.role)) {
      throw new Error(`บทบาท ${actor.role} ไม่มีสิทธิ์ปฏิเสธคำร้อง`);
    }

    const appRes = await db.execute({
      sql: 'SELECT id, application_no, assigned_officer_id, status FROM assistance_applications WHERE id = ?',
      args: [applicationId],
    });

    if (appRes.rows.length === 0) {
      throw new Error(`ไม่พบคำร้อง ${applicationId}`);
    }

    const app = appRes.rows[0];
    if (app.assigned_officer_id === actor.id && actor.role !== 'super_admin') {
      throw new Error(`เจ้าหน้าที่ผู้รับผิดชอบคำร้องไม่สามารถพิจารณาคำร้องของตนเองได้`);
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    await db.execute({
      sql: `UPDATE assistance_applications
            SET status = 'rejected', rejection_reason = ?, approval_notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [reason, reason, applicationId],
    });

    await db.execute({
      sql: `INSERT INTO application_history (id, application_id, status, timestamp, changed_by_id, changed_by_name, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `hist-${Date.now()}`,
        applicationId,
        'rejected',
        timestampNow,
        actor.id,
        actor.name,
        `ไม่อนุมัติคำร้อง: ${reason}`,
      ],
    });

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'APPLICATION_REJECTED',
        'application',
        String(app.application_no),
        `ปฏิเสธคำร้องขอรับซะกาต: ${reason}`,
      ],
    });

    return { applicationId, status: 'rejected', rejectionReason: reason };
  }

  /**
   * 6. Record Disbursement (Only Finance Role & Release Commitment)
   */
  static async recordDisbursement(
    applicationId: string,
    paymentRef: string,
    proofUrl: string,
    notes: string,
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    // 1. Segregation of Duties: Only Finance / Super Admin can disburse
    if (!['finance', 'super_admin'].includes(actor.role)) {
      throw new Error(`การละเมิดสิทธิ์: เฉพาะฝ่ายการเงิน (Finance) เท่านั้นที่มีสิทธิ์ดำเนินการจ่ายเงินสวัสดิการ`);
    }

    // 2. Fetch Application & Assessment for Fund linkage
    const appRes = await db.execute({
      sql: `SELECT a.id, a.application_no, a.approved_amount, a.requested_amount, a.status,
                   a.approved_by_id, a.approved_by_name, a.beneficiary_id,
                   a.approved_fund_id, a.approved_specific_fund_id, a.specific_fund_id,
                   a.primary_group_code, a.asnaf_category, a.assistance_type_id, a.assistance_type,
                   a.fiscal_year, b.full_name,
                   ass.recommended_fund_id, ass.recommended_specific_fund_id
            FROM assistance_applications a
            JOIN beneficiaries b ON a.beneficiary_id = b.id
            LEFT JOIN beneficiary_assessments ass ON ass.application_id = a.id
            WHERE a.id = ?`,
      args: [applicationId],
    });

    if (appRes.rows.length === 0) {
      throw new Error(`ไม่พบคำร้อง ${applicationId}`);
    }

    const app = appRes.rows[0];

    // SEGREGATION OF DUTIES: Approver CANNOT be the Disburser!
    if (app.approved_by_id && actor.id && String(app.approved_by_id) === String(actor.id) && actor.role !== 'super_admin') {
      throw new Error(
        `การละเมิดหลักการแบ่งแยกหน้าที่ (Segregation of Duties): ผู้อนุมัติคำร้อง (${actor.name}) ไม่มีสิทธิ์ทำรายการเบิกจ่ายเงินด้วยตนเอง กรุณาให้เจ้าหน้าที่การเงินท่านอื่นดำเนินการ`
      );
    }

    // State check: Must be wait_disbursement or approved
    if (!['wait_disbursement', 'approved'].includes(String(app.status))) {
      throw new Error(`คำร้องไม่อยู่ในสถานะรอจ่ายเงิน (สถานะปัจจุบัน: ${app.status})`);
    }

    // Duplicate Check on Payment Reference (Idempotency)
    const cleanPaymentRef = paymentRef.trim();
    if (!cleanPaymentRef) {
      throw new Error('กรุณาระบุหมายเลขอ้างอิงการโอนเงิน (Payment Reference / Transaction Ref)');
    }

    const dupCheck = await db.execute({
      sql: 'SELECT id, transaction_no FROM financial_transactions WHERE reference_no = ? AND status != ?',
      args: [cleanPaymentRef, 'reversed'],
    });

    if (dupCheck.rows.length > 0) {
      throw new Error(
        `ตรวจพบธุรกรรมซ้ำ! หมายเลขอ้างอิงการโอนเงิน "${cleanPaymentRef}" เคยถูกบันทึกไว้ในระบบแล้ว (รายการเลขที่ ${dupCheck.rows[0].transaction_no})`
      );
    }

    const amount = Number(app.approved_amount || app.requested_amount);
    const fiscalYear = String(app.fiscal_year || '2569');

    // Resolve Specific Fund & Level 1 Fund
    const targetSpecificFundId = (app.approved_specific_fund_id ? String(app.approved_specific_fund_id) : undefined) ||
      (app.specific_fund_id ? String(app.specific_fund_id) : undefined) ||
      (app.recommended_specific_fund_id ? String(app.recommended_specific_fund_id) : undefined) ||
      'subf-1';

    const sfRes = await db.execute({
      sql: 'SELECT id, fund_code, code, name, primary_group_code, fund_account_id FROM faqir_miskin_sub_funds WHERE id = ?',
      args: [targetSpecificFundId],
    });
    const sf = sfRes.rows.length > 0 ? sfRes.rows[0] : null;

    const primaryGroupCode = sf?.primary_group_code ? String(sf.primary_group_code) : (app.primary_group_code ? String(app.primary_group_code) : 'faqir_miskin');
    const targetFundId = (app.approved_fund_id ? String(app.approved_fund_id) : undefined) ||
      (sf?.fund_account_id ? String(sf.fund_account_id) : undefined) ||
      (app.recommended_fund_id ? String(app.recommended_fund_id) : undefined) ||
      'fund-1';

    // Look up actual fund name
    const fundInfo = await db.execute({
      sql: 'SELECT name FROM fund_accounts WHERE id = ?',
      args: [targetFundId],
    });
    const fundName = fundInfo.rows.length > 0 ? String(fundInfo.rows[0].name) : 'กองทุนซะกาต';

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const disbursementDateStr = new Date().toLocaleDateString('th-TH');

    // 3. Multi-Level Atomic Updates: Release commitment, increment disbursement
    // A) Fund Accounts
    await db.execute({
      sql: `UPDATE fund_accounts 
            SET committed_amount = MAX(0, committed_amount - ?),
                disbursed_amount = disbursed_amount + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [amount, amount, targetFundId],
    });

    // B) Specific Funds (faqir_miskin_sub_funds)
    await db.execute({
      sql: `UPDATE faqir_miskin_sub_funds
            SET committed_amount = MAX(0, committed_amount - ?),
                disbursed_amount = disbursed_amount + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [amount, amount, targetSpecificFundId],
    });

    // C) Primary Asnaf Allocations (asnaf_allocations)
    await db.execute({
      sql: `UPDATE asnaf_allocations
            SET committed_amount = MAX(0, committed_amount - ?),
                disbursed_amount = disbursed_amount + ?
            WHERE asnaf_code = ? AND fiscal_year = ?`,
      args: [amount, amount, primaryGroupCode, fiscalYear],
    });

    // D) Financial Transactions (Ledger Entry with 3-tier relations)
    const txnNo = `TXN-DISB-2569-${Date.now().toString().slice(-5)}`;
    const sfCode = sf?.code ? String(sf.code) : 'living';
    const astId = app.assistance_type_id ? String(app.assistance_type_id) : null;

    await db.execute({
      sql: `INSERT INTO financial_transactions (
        id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
        payer_or_payee, reference_no, slip_url, status, recorded_by_id, recorded_by_name, notes,
        specific_fund_id, sub_fund_category, asnaf_category, assistance_type_id, application_id, beneficiary_id, zakat_year
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `txn-${Date.now()}`,
        txnNo,
        timestampNow,
        'disbursement',
        targetFundId,
        fundName,
        `จ่ายเงินสวัสดิการผู้รับซะกาต (${app.application_no} - ${sf?.name || 'กองทุนเฉพาะเจาะจง'})`,
        amount,
        'bank_transfer',
        `${app.full_name} (ผู้รับซะกาต)`,
        cleanPaymentRef,
        proofUrl,
        'completed',
        actor.id,
        actor.name,
        notes,
        targetSpecificFundId,
        sfCode,
        primaryGroupCode,
        astId,
        applicationId,
        String(app.beneficiary_id),
        fiscalYear,
      ],
    });

    // E) Update Application to 'disbursed'
    await db.execute({
      sql: `UPDATE assistance_applications 
            SET status = 'disbursed',
                disbursed_amount = ?,
                disbursed_by_id = ?,
                disbursed_by_name = ?,
                disbursement_date = ?,
                disbursement_ref = ?,
                disbursement_proof_url = ?,
                disbursement_notes = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        amount,
        actor.id,
        actor.name,
        disbursementDateStr,
        cleanPaymentRef,
        proofUrl,
        notes,
        applicationId,
      ],
    });

    // F) History & Audit Logs
    await db.execute({
      sql: `INSERT INTO application_history (id, application_id, status, timestamp, changed_by_id, changed_by_name, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `hist-${Date.now()}`,
        applicationId,
        'disbursed',
        timestampNow,
        actor.id,
        actor.name,
        `ฝ่ายการเงินโอนเงินจำนวน ฿${amount.toLocaleString()} บาท เข้าบัญชีเรียบร้อย เลขอ้างอิง ${cleanPaymentRef}`,
      ],
    });

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'DISBURSEMENT_EXECUTED',
        'disbursement',
        String(app.application_no),
        `จ่ายเงินสวัสดิการ ฿${amount.toLocaleString()} บาท แก่ ${app.full_name} (กองทุน ${sf?.name || 'เฉพาะเจาะจง'}) อ้างอิง ${cleanPaymentRef}`,
      ],
    });

    return { applicationId, status: 'disbursed', amount, transactionNo: txnNo };
  }

  /**
   * 7. Record Post-Assistance Followup
   */
  static async recordFollowup(
    applicationId: string,
    statusSummary: string,
    isLivingImproved: boolean,
    notes: string,
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    if (!['officer', 'super_admin'].includes(actor.role)) {
      throw new Error(`เฉพาะเจ้าหน้าที่ช่วยเหลือสังคมและผู้ดูแลระบบเท่านั้นที่มีสิทธิ์บันทึกการติดตามผล`);
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    await db.execute({
      sql: `INSERT INTO assistance_followups (
        id, application_id, followup_date, officer_id, officer_name, status_summary, is_living_improved, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `fol-${Date.now()}`,
        applicationId,
        timestampNow,
        actor.id,
        actor.name,
        statusSummary,
        isLivingImproved ? 1 : 0,
        notes,
      ],
    });

    await db.execute({
      sql: `UPDATE assistance_applications SET status = 'followup', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [applicationId],
    });

    await db.execute({
      sql: `INSERT INTO application_history (id, application_id, status, timestamp, changed_by_id, changed_by_name, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `hist-${Date.now()}`,
        applicationId,
        'followup',
        timestampNow,
        actor.id,
        actor.name,
        `บันทึกผลการติดตามหลังการช่วยเหลือ: ${statusSummary}`,
      ],
    });

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'ASSISTANCE_FOLLOWUP_RECORDED',
        'application',
        applicationId,
        `บันทึกผลการติดตามครอบครัว: ความเป็นอยู่ดีขึ้น (${isLivingImproved ? 'ใช่' : 'ยังคงเดือดร้อน'})`,
      ],
    });

    return { applicationId, status: 'followup' };
  }

  /**
   * 8. Fetch Applications from Real Database with Full Survey Sections A-I, Search, Filters & Pagination
   */
  static async getAllApplications(filters?: {
    search?: string;
    status?: string;
    asnafCategory?: string;
    branchId?: string;
    page?: number;
    limit?: number;
  }) {
    await initDb();
    const db = getDb();

    let query = `
      SELECT 
        a.id, a.application_no, a.beneficiary_id, a.member_id, a.asnaf_category, a.requested_amount,
        a.approved_amount, a.disbursed_amount, a.status, a.urgency_level, a.assigned_officer_id,
        a.assigned_officer_name, a.approved_by_id, a.approved_by_name, a.approved_date,
        a.approval_notes, a.disbursement_date, a.disbursed_by_id, a.disbursed_by_name,
        a.disbursement_ref, a.disbursement_proof_url, a.disbursement_notes, a.applied_date,
        COALESCE(b.registration_no, a.registration_no) as registration_no,
        a.branch_id as app_branch_id, a.branch_name as app_branch_name,
        a.hardship_reasons, a.assistance_type, a.assistance_type_id, a.assistance_group,
        a.primary_group_code, a.specific_fund_id,
        COALESCE(sf_req.code, a.specific_fund_code) as resolved_sf_code,
        COALESCE(sf_req.name, a.specific_fund_name) as resolved_sf_name,
        ast.code as resolved_ast_code,
        ast.name as resolved_ast_name,
        a.approved_fund_id, a.approved_specific_fund_id,
        sf_app.name as resolved_approved_sf_name,
        a.classification_snapshot, a.fiscal_year,
        a.assistance_type_details, a.necessity_details,
        a.evaluator_checklist, a.rejection_reason,
        b.household_id, b.full_name, b.title_prefix, b.birth_date, b.age, b.national_id, b.phone, b.occupation,
        b.marital_status, b.postcode, b.subdistrict as ben_subdistrict, b.branch_id as ben_branch_id, b.branch_name as ben_branch_name,
        h.address, h.province, h.district, h.subdistrict, h.community, h.living_score,
        h.monthly_income, h.monthly_expense, h.debt_amount, h.debt_purpose,
        h.housing_type, h.housing_condition, h.housing_notes, h.land_title_type, h.land_title_notes,
        h.income_breakdown, h.expense_breakdown, h.past_assistance, h.family_situation_summary,
        h.urgent_needs, h.dependent_burdens, h.coordinator_info, h.certifier_info,
        ass.id as assessment_id, ass.living_score as ass_living_score, ass.housing_condition as ass_housing_condition,
        ass.housing_notes as ass_housing_notes, ass.debt_burden_summary, ass.primary_hardship, ass.officer_recommendation,
        ass.recommended_amount, ass.recommended_fund_id, ass.recommended_specific_fund_id,
        ass.general_notes, ass.assessed_by_name, ass.assessed_date
      FROM assistance_applications a
      JOIN beneficiaries b ON a.beneficiary_id = b.id
      JOIN households h ON b.household_id = h.id
      LEFT JOIN beneficiary_assessments ass ON ass.application_id = a.id
      LEFT JOIN faqir_miskin_sub_funds sf_req ON sf_req.id = a.specific_fund_id
      LEFT JOIN faqir_miskin_sub_funds sf_app ON sf_app.id = a.approved_specific_fund_id
      LEFT JOIN assistance_types ast ON ast.id = a.assistance_type_id
      WHERE a.id != 'REGISTRY-DOCS'
    `;

    const args: any[] = [];

    if (filters?.search && filters.search.trim() !== '') {
      const s = `%${filters.search.trim()}%`;
      query += ` AND (
        b.full_name LIKE ? OR 
        a.application_no LIKE ? OR 
        b.national_id LIKE ? OR 
        b.phone LIKE ? OR 
        h.province LIKE ? OR 
        h.district LIKE ? OR 
        h.subdistrict LIKE ? OR 
        h.community LIKE ?
      )`;
      args.push(s, s, s, s, s, s, s, s);
    }

    if (filters?.status && filters.status !== 'all') {
      query += ` AND a.status = ?`;
      args.push(filters.status);
    }

    if (filters?.asnafCategory && filters.asnafCategory !== 'all') {
      query += ` AND a.asnaf_category = ?`;
      args.push(filters.asnafCategory);
    }

    if (filters?.branchId && filters.branchId !== 'all') {
      query += ` AND (a.branch_id = ? OR b.branch_id = ?)`;
      args.push(filters.branchId, filters.branchId);
    }

    query += ` ORDER BY a.created_at DESC`;

    const res = await db.execute({ sql: query, args });

    // Fetch documents, household members, and history for each
    const applications = [];
    for (const row of res.rows) {
      const appId = String(row.id);
      const hhId = String(row.household_id);

      // Docs
      const docsRes = await db.execute({
        sql: 'SELECT id, name, category, file_url, status, upload_date, verified_by_name, storage_provider, storage_path, file_size, mime_type, checksum, uploaded_by_id, uploaded_by_name FROM application_documents WHERE application_id = ?',
        args: [appId],
      });

      // Household members
      const membersRes = await db.execute({
        sql: 'SELECT id, full_name, relation, age, occupation, monthly_income, health_status, health_notes, education_status, notes FROM household_members WHERE household_id = ?',
        args: [hhId],
      });

      // History
      const histRes = await db.execute({
        sql: 'SELECT status, timestamp, changed_by_name, notes FROM application_history WHERE application_id = ? ORDER BY created_at ASC',
        args: [appId],
      });

      // Safe JSON parsing helpers
      let parsedHardship: any = undefined;
      try { if (row.hardship_reasons) parsedHardship = JSON.parse(String(row.hardship_reasons)); } catch {}

      let parsedIncome: any = undefined;
      try { if (row.income_breakdown) parsedIncome = JSON.parse(String(row.income_breakdown)); } catch {}

      let parsedExpense: any = undefined;
      try { if (row.expense_breakdown) parsedExpense = JSON.parse(String(row.expense_breakdown)); } catch {}

      let parsedPast: any = undefined;
      try { if (row.past_assistance) parsedPast = JSON.parse(String(row.past_assistance)); } catch {}

      let parsedCoord: any = undefined;
      try { if (row.coordinator_info) parsedCoord = JSON.parse(String(row.coordinator_info)); } catch {}

      let parsedCert: any = undefined;
      try { if (row.certifier_info) parsedCert = JSON.parse(String(row.certifier_info)); } catch {}

      let parsedChecklist: any = undefined;
      try { if (row.evaluator_checklist) parsedChecklist = JSON.parse(String(row.evaluator_checklist)); } catch {}

      let parsedSnapshot: any = undefined;
      try { if (row.classification_snapshot) parsedSnapshot = JSON.parse(String(row.classification_snapshot)); } catch {}

      const resolvedPrimaryCode = row.primary_group_code
        ? normalizePrimaryGroupCode(String(row.primary_group_code))
        : normalizePrimaryGroupCode(String(row.asnaf_category || 'faqir_miskin'));
      const resolvedPrimaryName = getCentralAsnafByCode(resolvedPrimaryCode)?.nameTh || resolvedPrimaryCode;

      // Calculate Net Income if breakdowns exist
      let calculatedNetIncome: number | undefined = undefined;
      if (parsedIncome && parsedExpense) {
        const totalInc = (Number(parsedIncome.salary) || 0) + 
                         (Number(parsedIncome.familySupport) || 0) + 
                         (Number(parsedIncome.agriculture) || 0) + 
                         (Number(parsedIncome.trading) || 0) + 
                         (Number(parsedIncome.assetIncome) || 0) + 
                         (Number(parsedIncome.freelance) || 0) + 
                         (Number(parsedIncome.welfare) || 0) + 
                         (Number(parsedIncome.otherIncome) || 0);
        const totalExp = (Number(parsedExpense.living) || 0) + 
                         (Number(parsedExpense.education) || 0) + 
                         (Number(parsedExpense.healthcare) || 0) + 
                         (Number(parsedExpense.utilities) || 0) + 
                         (Number(parsedExpense.rent) || 0) + 
                         (Number(parsedExpense.debtPayment) || 0) + 
                         (Number(parsedExpense.otherExpense) || 0);
        calculatedNetIncome = totalInc - totalExp;
      }

      applications.push({
        id: appId,
        applicationNo: String(row.application_no),
        registrationNo: row.registration_no ? String(row.registration_no) : undefined,
        beneficiaryId: String(row.beneficiary_id),
        memberId: row.member_id ? String(row.member_id) : undefined,
        fullName: String(row.full_name),
        titlePrefix: row.title_prefix ? String(row.title_prefix) : 'นาย',
        birthDate: row.birth_date ? String(row.birth_date) : undefined,
        age: row.age ? Number(row.age) : undefined,
        maritalStatus: row.marital_status ? String(row.marital_status) as any : undefined,
        occupation: row.occupation ? String(row.occupation) : undefined,
        nationalIdMasked: maskNationalId(String(row.national_id)),
        phone: String(row.phone),
        address: String(row.address),
        province: String(row.province),
        district: String(row.district),
        subdistrict: row.subdistrict ? String(row.subdistrict) : (row.ben_subdistrict ? String(row.ben_subdistrict) : undefined),
        postcode: row.postcode ? String(row.postcode) : undefined,
        community: String(row.community),
        branchId: row.app_branch_id ? String(row.app_branch_id) : (row.ben_branch_id ? String(row.ben_branch_id) : 'br-hq'),
        branchName: row.app_branch_name ? String(row.app_branch_name) : (row.ben_branch_name ? String(row.ben_branch_name) : 'สำนักงานใหญ่ กรุงเทพมหานคร'),
        asnafCategory: String(row.asnaf_category) as AsnafCategory,
        primaryGroupCode: resolvedPrimaryCode,
        primaryGroupName: resolvedPrimaryName,
        specificFundId: row.specific_fund_id ? String(row.specific_fund_id) : undefined,
        specificFundCode: row.resolved_sf_code ? String(row.resolved_sf_code) : undefined,
        specificFundName: row.resolved_sf_name ? String(row.resolved_sf_name) : undefined,
        assistanceTypeId: row.assistance_type_id ? String(row.assistance_type_id) : undefined,
        assistanceTypeCode: row.resolved_ast_code ? String(row.resolved_ast_code) : undefined,
        assistanceTypeGroup: (row.assistance_group === 'specific' ? 'specific' : 'core'),
        approvedFundId: row.approved_fund_id ? String(row.approved_fund_id) : undefined,
        approvedSpecificFundId: row.approved_specific_fund_id ? String(row.approved_specific_fund_id) : undefined,
        approvedSpecificFundName: row.resolved_approved_sf_name ? String(row.resolved_approved_sf_name) : undefined,
        classificationSnapshot: parsedSnapshot,
        fiscalYear: row.fiscal_year ? String(row.fiscal_year) : '2569',
        appliedDate: String(row.applied_date),
        requestedAmount: Number(row.requested_amount),
        approvedAmount: row.approved_amount ? Number(row.approved_amount) : undefined,
        disbursedAmount: row.disbursed_amount ? Number(row.disbursed_amount) : undefined,
        status: String(row.status) as ApplicationStatus,
        urgencyLevel: String(row.urgency_level) as 'normal' | 'high' | 'urgent',
        assignedOfficerId: String(row.assigned_officer_id),
        assignedOfficerName: String(row.assigned_officer_name),
        approvedBy: row.approved_by_name ? String(row.approved_by_name) : undefined,
        approvedDate: row.approved_date ? String(row.approved_date) : undefined,
        approvalNotes: row.approval_notes ? String(row.approval_notes) : undefined,
        disbursementDate: row.disbursement_date ? String(row.disbursement_date) : undefined,
        disbursedBy: row.disbursed_by_name ? String(row.disbursed_by_name) : undefined,
        disbursementRef: row.disbursement_ref ? String(row.disbursement_ref) : undefined,
        disbursementProofUrl: row.disbursement_proof_url ? String(row.disbursement_proof_url) : undefined,
        disbursementNotes: row.disbursement_notes ? String(row.disbursement_notes) : undefined,
        rejectionReason: row.rejection_reason ? String(row.rejection_reason) : undefined,
        
        // Survey Form Sections A - I
        housingType: row.housing_type ? String(row.housing_type) as any : 'own',
        landTitleType: row.land_title_type ? String(row.land_title_type) as any : undefined,
        landTitleNotes: row.land_title_notes ? String(row.land_title_notes) : undefined,
        hardshipReasons: parsedHardship,
        assistanceType: row.resolved_ast_name ? String(row.resolved_ast_name) : (row.assistance_type ? String(row.assistance_type) : 'เงินสงเคราะห์ยังชีพ'),
        assistanceTypeDetails: row.assistance_type_details ? String(row.assistance_type_details) : undefined,
        necessityDetails: row.necessity_details ? String(row.necessity_details) : undefined,
        pastAssistance: parsedPast,
        monthlyIncome: Number(row.monthly_income || 0),
        monthlyExpense: Number(row.monthly_expense || 0),
        debtAmount: Number(row.debt_amount || 0),
        debtPurpose: row.debt_purpose ? String(row.debt_purpose) : undefined,
        incomeBreakdown: parsedIncome,
        expenseBreakdown: parsedExpense,
        netIncome: calculatedNetIncome,
        familySituationSummary: row.family_situation_summary ? String(row.family_situation_summary) : undefined,
        urgentNeeds: row.urgent_needs ? String(row.urgent_needs) : undefined,
        dependentBurdens: row.dependent_burdens ? String(row.dependent_burdens) : undefined,
        coordinator: parsedCoord,
        certifier: parsedCert,
        checklist: parsedChecklist,

        householdMembers: membersRes.rows.map((m) => ({
          id: String(m.id),
          fullName: String(m.full_name),
          relation: String(m.relation),
          age: Number(m.age),
          occupation: String(m.occupation),
          monthlyIncome: Number(m.monthly_income),
          healthStatus: String(m.health_status) as any,
          healthNotes: m.health_notes ? String(m.health_notes) : undefined,
          educationStatus: m.education_status ? String(m.education_status) : undefined,
          notes: m.notes ? String(m.notes) : undefined,
        })),

        documents: docsRes.rows.map((d) => ({
          id: String(d.id),
          name: String(d.name),
          category: String(d.category) as any,
          fileUrl: String(d.file_url),
          uploadDate: String(d.upload_date),
          status: String(d.status) as any,
          verifiedBy: d.verified_by_name ? String(d.verified_by_name) : undefined,
          storageProvider: (d.storage_provider ? String(d.storage_provider) : 'local') as any,
          storagePath: d.storage_path ? String(d.storage_path) : undefined,
          fileSize: d.file_size ? Number(d.file_size) : undefined,
          mimeType: d.mime_type ? String(d.mime_type) : undefined,
          checksum: d.checksum ? String(d.checksum) : undefined,
          uploadedById: d.uploaded_by_id ? String(d.uploaded_by_id) : undefined,
          uploadedByName: d.uploaded_by_name ? String(d.uploaded_by_name) : undefined,
          fileExists: StorageService.checkPhysicalFile(d as any).exists,
        })),

        assessment: row.assessment_id ? {
          id: String(row.assessment_id),
          assessedBy: String(row.assessed_by_name),
          assessedDate: String(row.assessed_date),
          housingCondition: String(row.ass_housing_condition || row.housing_condition) as any,
          housingNotes: String(row.ass_housing_notes || row.housing_notes),
          livingScore: Number(row.ass_living_score),
          debtBurdenSummary: String(row.debt_burden_summary),
          primaryHardship: String(row.primary_hardship),
          officerRecommendation: String(row.officer_recommendation) as any,
          recommendedAmount: Number(row.recommended_amount),
          recommendedFundId: String(row.recommended_fund_id),
          recommendedSpecificFundId: row.recommended_specific_fund_id ? String(row.recommended_specific_fund_id) : undefined,
          generalNotes: String(row.general_notes),
        } : undefined,

        statusHistory: histRes.rows.map((h) => ({
          status: String(h.status) as ApplicationStatus,
          timestamp: String(h.timestamp),
          changedBy: String(h.changed_by_name),
          notes: String(h.notes),
        })),
      });
    }

    // Support pagination if requested
    if (filters?.page && filters?.limit && filters.limit > 0) {
      const page = Math.max(1, filters.page);
      const limit = Math.max(1, filters.limit);
      const total = applications.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const paginatedItems = applications.slice(startIndex, startIndex + limit);

      const result: any = paginatedItems;
      result.pagination = { total, page, limit, totalPages };
      result.total = total;
      result.page = page;
      result.limit = limit;
      result.totalPages = totalPages;
      return result;
    }

    return applications;
  }

  /**
   * 9. Fetch Single Application by ID with full details & ledger history
   */
  static async getApplicationById(applicationId: string) {
    const list = await this.getAllApplications();
    const app = list.find((a: any) => a.id === applicationId || a.applicationNo === applicationId);
    if (!app) {
      throw new Error(`ไม่พบข้อมูลคำร้องรหัส ${applicationId}`);
    }

    // Fetch related financial transactions if any
    const db = getDb();
    const txnRes = await db.execute({
      sql: `SELECT * FROM financial_transactions 
            WHERE reference_no = ? OR notes LIKE ? OR category LIKE ? 
            ORDER BY created_at DESC`,
      args: [app.disbursementRef || '', `%${app.applicationNo}%`, `%${app.applicationNo}%`],
    });

    return {
      ...app,
      financialTransactions: txnRes.rows.map((t) => ({
        id: String(t.id),
        transactionNo: String(t.transaction_no),
        date: String(t.date),
        type: String(t.type),
        fundName: String(t.fund_name),
        amount: Number(t.amount),
        status: String(t.status),
        referenceNo: String(t.reference_no),
        slipUrl: t.slip_url ? String(t.slip_url) : undefined,
        notes: t.notes ? String(t.notes) : undefined,
      })),
    };
  }

  /**
   * 10. Update Existing Application (Edit Sections A - I)
   */
  static async updateApplication(
    applicationId: string,
    input: Partial<BeneficiaryRegistrationInput>,
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    // Check application exists along with current 3-tier fund classification
    const appRes = await db.execute({
      sql: `SELECT a.id, a.application_no, a.beneficiary_id, b.household_id, a.status,
                   a.asnaf_category, a.primary_group_code, a.specific_fund_id, a.specific_fund_code, a.specific_fund_name,
                   a.assistance_type_id, a.assistance_type, a.assistance_group, a.requested_amount, a.fiscal_year
            FROM assistance_applications a
            JOIN beneficiaries b ON a.beneficiary_id = b.id
            WHERE a.id = ?`,
      args: [applicationId],
    });

    if (appRes.rows.length === 0) {
      throw new Error(`ไม่พบคำร้องหมายเลข ${applicationId}`);
    }

    const app = appRes.rows[0];
    const currentStatus = String(app.status || 'submitted');
    const beneficiaryId = String(app.beneficiary_id);
    const householdId = String(app.household_id);
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    // Detect whether caller is attempting to modify 3-tier fund / assistance type classification or requested amount
    const isChangingClassification = Boolean(
      (input.primaryGroupCode !== undefined && normalizePrimaryGroupCode(input.primaryGroupCode) !== normalizePrimaryGroupCode(String(app.primary_group_code || app.asnaf_category || ''))) ||
      (input.specificFundId !== undefined && String(input.specificFundId) !== String(app.specific_fund_id || '')) ||
      (input.assistanceTypeId !== undefined && String(input.assistanceTypeId) !== String(app.assistance_type_id || '')) ||
      (input.assistanceType !== undefined && String(input.assistanceType) !== String(app.assistance_type || '')) ||
      (input.asnafCategory !== undefined && String(input.asnafCategory) !== String(app.asnaf_category || ''))
    );
    const isChangingRequestedAmount = input.requestedAmount !== undefined && Math.abs(Number(input.requestedAmount) - Number(app.requested_amount || 0)) > 0.001;

    // 1. Disbursed / Followup / Closed / Cancelled -> Strictly lock fund, type, and requested amount
    if (['disbursed', 'followup', 'closed', 'cancelled'].includes(currentStatus) && (isChangingClassification || isChangingRequestedAmount)) {
      throw new Error(
        `LOCKED_STATUS: คำร้อง ${app.application_no} อยู่ในสถานะ "${currentStatus}" ไม่สามารถแก้ไขกลุ่มกองทุน ประเภทความช่วยเหลือ หรือวงเงินคำร้องได้`
      );
    }

    // 2. Approved / Wait Disbursement -> Strictly lock silent fund/type edits on the request form
    if (['approved', 'wait_disbursement'].includes(currentStatus) && (isChangingClassification || isChangingRequestedAmount)) {
      throw new Error(
        `LOCKED_AFTER_APPROVAL: คำร้อง ${app.application_no} ได้รับการอนุมัติแล้ว ไม่สามารถแก้ไขกลุ่มกองทุน ประเภทความช่วยเหลือ หรือวงเงินคำร้องย้อนหลังโดยตรงได้`
      );
    }

    // 3. Member / Public Applicant -> Lock fund/type edits after submission (status !== 'draft')
    if (['member', 'public'].includes(actor.role) && currentStatus !== 'draft' && (isChangingClassification || isChangingRequestedAmount)) {
      throw new Error(
        `LOCKED_AFTER_SUBMIT: ผู้ยื่นคำร้องไม่สามารถแก้ไขกลุ่มกองทุน ประเภทความช่วยเหลือ หรือวงเงินหลังจากส่งคำร้องแล้ว กรุณาติดต่อเจ้าหน้าที่ผู้รับผิดชอบ`
      );
    }

    if (input.requestedAmount !== undefined) {
      const reqAmt = Number(input.requestedAmount);
      if (!Number.isFinite(reqAmt) || reqAmt <= 0) {
        throw new Error('INVALID_AMOUNT: จำนวนเงินที่ขอรับความช่วยเหลือต้องมากกว่า 0 บาท');
      }
    }

    // 4. Validate & resolve 3-tier classification if any classification field was supplied on an editable pre-approval request
    let resolvedClassification: Awaited<ReturnType<typeof BeneficiaryService.validateAndResolveThreeTierSelection>> | null = null;
    if (
      isChangingClassification ||
      input.primaryGroupCode !== undefined ||
      input.specificFundId !== undefined ||
      input.assistanceTypeId !== undefined
    ) {
      resolvedClassification = await this.validateAndResolveThreeTierSelection({
        fiscalYear: input.fiscalYear || (app.fiscal_year ? String(app.fiscal_year) : '2569'),
        primaryGroupCode: input.primaryGroupCode ?? (app.primary_group_code ? String(app.primary_group_code) : undefined),
        asnafCategory: input.asnafCategory ?? (input.primaryGroupCode ? undefined : (app.asnaf_category ? String(app.asnaf_category) : undefined)),
        specificFundId: input.specificFundId ?? (input.primaryGroupCode && !input.specificFundId ? '' : (app.specific_fund_id ? String(app.specific_fund_id) : undefined)),
        assistanceTypeId: input.assistanceTypeId ?? ((input.primaryGroupCode || input.specificFundId) && !input.assistanceTypeId && !input.assistanceType ? '' : (app.assistance_type_id ? String(app.assistance_type_id) : undefined)),
        assistanceType: input.assistanceType,
        requestedAmount: input.requestedAmount !== undefined ? Number(input.requestedAmount) : Number(app.requested_amount || 1),
        requireExplicitThreeTier: Boolean(input.primaryGroupCode !== undefined || input.specificFundId !== undefined || input.assistanceTypeId !== undefined),
      });
    }

    // Server-side Birth Date & Age recalculation
    let updateBirthDate: string | null = null;
    let updateAge: number | null = null;
    if (input.birthDate !== undefined) {
      if (input.birthDate) {
        const ageCalc = calculateAge(input.birthDate);
        if (ageCalc.isFuture) {
          throw new Error('วันเดือนปีเกิดต้องไม่อยู่ในอนาคต');
        }
        if (ageCalc.isValid) {
          updateBirthDate = ageCalc.isoDate;
          updateAge = ageCalc.years;
        } else {
          throw new Error(ageCalc.error || 'วันเดือนปีเกิดไม่ถูกต้อง');
        }
      }
    } else if (input.age !== undefined) {
      updateAge = input.age !== null ? Number(input.age) : null;
    }

    // Server-side Address Validation & Consistency Check
    if (input.postcode !== undefined && input.province !== undefined && input.district !== undefined && input.subdistrict !== undefined) {
      const addrCheck = validateAddress(input.postcode, input.province, input.district, input.subdistrict);
      if (!addrCheck.isValid) {
        throw new Error(`ข้อมูลที่อยู่ไม่ถูกต้องหรือไม่สัมพันธ์กัน: ${addrCheck.message}`);
      }
    }

    // Update Household
    await db.execute({
      sql: `UPDATE households SET 
        address = COALESCE(?, address),
        province = COALESCE(?, province),
        district = COALESCE(?, district),
        subdistrict = COALESCE(?, subdistrict),
        community = COALESCE(?, community),
        housing_condition = COALESCE(?, housing_condition),
        housing_notes = COALESCE(?, housing_notes),
        monthly_income = COALESCE(?, monthly_income),
        monthly_expense = COALESCE(?, monthly_expense),
        debt_amount = COALESCE(?, debt_amount),
        debt_purpose = COALESCE(?, debt_purpose),
        housing_type = COALESCE(?, housing_type),
        land_title_type = COALESCE(?, land_title_type),
        land_title_notes = COALESCE(?, land_title_notes),
        income_breakdown = COALESCE(?, income_breakdown),
        expense_breakdown = COALESCE(?, expense_breakdown),
        past_assistance = COALESCE(?, past_assistance),
        family_situation_summary = COALESCE(?, family_situation_summary),
        urgent_needs = COALESCE(?, urgent_needs),
        dependent_burdens = COALESCE(?, dependent_burdens),
        coordinator_info = COALESCE(?, coordinator_info),
        certifier_info = COALESCE(?, certifier_info),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      args: [
        input.address || null,
        input.province || null,
        input.district || null,
        input.subdistrict || null,
        input.community || null,
        input.housingCondition || null,
        input.housingNotes || null,
        input.monthlyIncome !== undefined ? input.monthlyIncome : null,
        input.monthlyExpense !== undefined ? input.monthlyExpense : null,
        input.debtAmount !== undefined ? input.debtAmount : null,
        input.debtPurpose || null,
        input.housingType || null,
        input.landTitleType || null,
        input.landTitleNotes || null,
        input.incomeBreakdown ? JSON.stringify(input.incomeBreakdown) : null,
        input.expenseBreakdown ? JSON.stringify(input.expenseBreakdown) : null,
        input.pastAssistance ? JSON.stringify(input.pastAssistance) : null,
        input.familySituationSummary || null,
        input.urgentNeeds || null,
        input.dependentBurdens || null,
        input.coordinator ? JSON.stringify(input.coordinator) : null,
        input.certifier ? JSON.stringify(input.certifier) : null,
        householdId,
      ],
    });

    // Update Beneficiary
    await db.execute({
      sql: `UPDATE beneficiaries SET 
        full_name = COALESCE(?, full_name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        asnaf_category = COALESCE(?, asnaf_category),
        title_prefix = COALESCE(?, title_prefix),
        birth_date = COALESCE(?, birth_date),
        age = COALESCE(?, age),
        occupation = COALESCE(?, occupation),
        marital_status = COALESCE(?, marital_status),
        postcode = COALESCE(?, postcode),
        subdistrict = COALESCE(?, subdistrict),
        branch_id = COALESCE(?, branch_id),
        branch_name = COALESCE(?, branch_name),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      args: [
        input.fullName || null,
        input.phone || null,
        input.email || null,
        input.asnafCategory || null,
        input.titlePrefix || null,
        input.birthDate !== undefined ? updateBirthDate : null,
        input.birthDate !== undefined ? updateAge : (input.age !== undefined ? (input.age !== null ? Number(input.age) : null) : null),
        input.occupation || null,
        input.maritalStatus || null,
        input.postcode || null,
        input.subdistrict || null,
        input.branchId || null,
        input.branchName || null,
        beneficiaryId,
      ],
    });

    // Update Assistance Application
    await db.execute({
      sql: `UPDATE assistance_applications SET 
        asnaf_category = COALESCE(?, asnaf_category),
        primary_group_code = COALESCE(?, primary_group_code),
        specific_fund_id = COALESCE(?, specific_fund_id),
        specific_fund_code = COALESCE(?, specific_fund_code),
        specific_fund_name = COALESCE(?, specific_fund_name),
        assistance_type_id = COALESCE(?, assistance_type_id),
        assistance_type = COALESCE(?, assistance_type),
        assistance_group = COALESCE(?, assistance_group),
        requested_amount = COALESCE(?, requested_amount),
        urgency_level = COALESCE(?, urgency_level),
        branch_id = COALESCE(?, branch_id),
        branch_name = COALESCE(?, branch_name),
        hardship_reasons = COALESCE(?, hardship_reasons),
        assistance_type_details = COALESCE(?, assistance_type_details),
        necessity_details = COALESCE(?, necessity_details),
        evaluator_checklist = COALESCE(?, evaluator_checklist),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      args: [
        resolvedClassification ? resolvedClassification.asnafCategory : (input.asnafCategory || null),
        resolvedClassification ? resolvedClassification.primaryGroupCode : null,
        resolvedClassification ? resolvedClassification.specificFundId : null,
        resolvedClassification ? resolvedClassification.specificFundCode : null,
        resolvedClassification ? resolvedClassification.specificFundName : null,
        resolvedClassification ? resolvedClassification.assistanceTypeId : null,
        resolvedClassification ? resolvedClassification.assistanceTypeName : (input.assistanceType || null),
        resolvedClassification ? resolvedClassification.assistanceGroup : null,
        input.requestedAmount !== undefined ? Number(input.requestedAmount) : null,
        input.urgencyLevel || null,
        input.branchId || null,
        input.branchName || null,
        input.hardshipReasons ? JSON.stringify(input.hardshipReasons) : null,
        input.assistanceTypeDetails || null,
        input.necessityDetails || null,
        input.checklist ? JSON.stringify(input.checklist) : null,
        applicationId,
      ],
    });

    // Replace household members if provided
    if (input.householdMembers && input.householdMembers.length > 0) {
      await db.execute({
        sql: 'DELETE FROM household_members WHERE household_id = ?',
        args: [householdId],
      });

      for (const m of input.householdMembers) {
        if (!m.fullName || !m.fullName.trim()) continue;
        await db.execute({
          sql: `INSERT INTO household_members (
            id, household_id, full_name, relation, age, occupation, monthly_income, health_status, health_notes, education_status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            `hm-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            householdId,
            m.fullName,
            m.relation,
            m.age || 0,
            m.occupation || 'ไม่มีอาชีพ',
            m.monthlyIncome || 0,
            m.healthStatus || 'healthy',
            m.healthNotes || '',
            m.educationStatus || '',
            m.notes || '',
          ],
        });
      }
    }

    const classificationChangeSummary = (resolvedClassification && isChangingClassification)
      ? ` (เปลี่ยนกองทุน/ประเภทเป็น: ${resolvedClassification.primaryGroupName} → ${resolvedClassification.specificFundName} → ${resolvedClassification.assistanceTypeName})`
      : '';

    // Add History & Audit Log
    await db.execute({
      sql: `INSERT INTO application_history (id, application_id, status, timestamp, changed_by_id, changed_by_name, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `hist-${Date.now()}`,
        applicationId,
        String(app.status),
        timestampNow,
        actor.id,
        actor.name,
        `แก้ไขปรับปรุงข้อมูลคำร้องโดย ${actor.name}${classificationChangeSummary}`,
      ],
    });

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, old_values, new_values)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        isChangingClassification ? 'UPDATE_CLASSIFICATION' : 'APPLICATION_UPDATED',
        'application',
        applicationId,
        `แก้ไขข้อมูลคำร้อง ${app.application_no} โดย ${actor.name}${classificationChangeSummary}`,
        JSON.stringify({
          primaryGroupCode: app.primary_group_code,
          specificFundId: app.specific_fund_id,
          specificFundName: app.specific_fund_name,
          assistanceTypeId: app.assistance_type_id,
          assistanceType: app.assistance_type,
          requestedAmount: Number(app.requested_amount || 0),
        }),
        JSON.stringify({
          primaryGroupCode: resolvedClassification ? resolvedClassification.primaryGroupCode : app.primary_group_code,
          specificFundId: resolvedClassification ? resolvedClassification.specificFundId : app.specific_fund_id,
          specificFundName: resolvedClassification ? resolvedClassification.specificFundName : app.specific_fund_name,
          assistanceTypeId: resolvedClassification ? resolvedClassification.assistanceTypeId : app.assistance_type_id,
          assistanceType: resolvedClassification ? resolvedClassification.assistanceTypeName : (input.assistanceType || app.assistance_type),
          requestedAmount: input.requestedAmount !== undefined ? Number(input.requestedAmount) : Number(app.requested_amount || 0),
        }),
      ],
    });

    return { applicationId, success: true };
  }

  /**
   * 11. Update Evaluator Checklist
   */
  static async updateChecklist(
    applicationId: string,
    checklist: EvaluatorChecklist,
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const fullChecklist = {
      ...checklist,
      checkedBy: actor.name,
      checkedAt: timestampNow,
    };

    await db.execute({
      sql: `UPDATE assistance_applications 
            SET evaluator_checklist = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?`,
      args: [JSON.stringify(fullChecklist), applicationId],
    });

    await db.execute({
      sql: `INSERT INTO application_history (id, application_id, status, timestamp, changed_by_id, changed_by_name, notes)
            SELECT ?, id, status, ?, ?, ?, 'บันทึก/อัปเดตแบบตรวจสอบหลักเกณฑ์การพิจารณา (Checklist)'
            FROM assistance_applications WHERE id = ?`,
      args: [`hist-${Date.now()}`, timestampNow, actor.id, actor.name, applicationId],
    });

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'CHECKLIST_EVALUATED',
        'application',
        applicationId,
        `เจ้าหน้าที่ ${actor.name} บันทึกผลการประเมิน Checklist สำหรับคำร้อง ${applicationId}`,
      ],
    });

    return { applicationId, checklist: fullChecklist };
  }

  /**
   * 12. Transition Application Status through 9 Workflow Stages
   */
  static async transitionApplicationStatus(
    applicationId: string,
    newStatus: ApplicationStatus,
    notes: string,
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    const appRes = await db.execute({
      sql: 'SELECT id, application_no, assigned_officer_id, status FROM assistance_applications WHERE id = ?',
      args: [applicationId],
    });

    if (appRes.rows.length === 0) {
      throw new Error(`ไม่พบคำร้อง ${applicationId}`);
    }

    const app = appRes.rows[0];
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    // Status transition safety checks
    if (newStatus === 'approved') {
      if (!['approver', 'executive', 'super_admin'].includes(actor.role)) {
        throw new Error(`บทบาท "${actor.role}" ไม่มีสิทธิ์พิจารณาอนุมัติคำร้องขอรับซะกาต`);
      }
      if (app.assigned_officer_id === actor.id && actor.role !== 'super_admin') {
        throw new Error(
          `การละเมิดหลักการแบ่งแยกหน้าที่ (Segregation of Duties): เจ้าหน้าที่ผู้รับผิดชอบคำร้อง (${actor.name}) ไม่มีสิทธิ์อนุมัติคำร้องของตนเอง`
        );
      }
    }

    if (newStatus === 'disbursed') {
      if (!['finance', 'super_admin'].includes(actor.role)) {
        throw new Error(`เฉพาะฝ่ายการเงิน (Finance) เท่านั้นที่มีสิทธิ์ดำเนินการจ่ายเงินสวัสดิการ`);
      }
    }

    await db.execute({
      sql: `UPDATE assistance_applications 
            SET status = ?, rejection_reason = CASE WHEN ? = 'rejected' THEN ? ELSE rejection_reason END, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?`,
      args: [newStatus, newStatus, notes, applicationId],
    });

    await db.execute({
      sql: `INSERT INTO application_history (id, application_id, status, timestamp, changed_by_id, changed_by_name, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `hist-${Date.now()}`,
        applicationId,
        newStatus,
        timestampNow,
        actor.id,
        actor.name,
        notes || `เปลี่ยนสถานะเป็น "${newStatus}"`,
      ],
    });

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'STATUS_TRANSITION',
        'application',
        String(app.application_no),
        `เปลี่ยนสถานะคำร้อง ${app.application_no} จาก ${app.status} เป็น ${newStatus} (${notes})`,
      ],
    });

    return { applicationId, oldStatus: app.status, newStatus };
  }

  static async updateApplicationStatus(
    applicationId: string,
    newStatus: ApplicationStatus,
    notes: string,
    actor: ActorContext
  ) {
    return this.transitionApplicationStatus(applicationId, newStatus, notes, actor);
  }

  /**
   * 13. Fetch Active Assistance Types (Extensible by Admin)
   */
  static async getAssistanceTypes(filters?: {
    includeInactive?: boolean;
    primaryGroupCode?: string;
    specificFundId?: string;
    activeFundOnly?: boolean;
    search?: string;
  }) {
    await initDb();
    const db = getDb();

    let sql = `
      SELECT ast.*,
             sf.code as sf_code,
             sf.fund_code as sf_fund_code,
             sf.name as sf_name,
             sf.is_active as sf_is_active,
             sf.primary_group_code as sf_primary_code,
             aa.asnaf_name as primary_name,
             aa.is_active as aa_is_active,
             (SELECT COUNT(*) FROM assistance_applications app WHERE app.id != 'REGISTRY-DOCS' AND (app.assistance_type_id = ast.id OR app.assistance_type = ast.code)) as app_ref_count
      FROM assistance_types ast
      LEFT JOIN faqir_miskin_sub_funds sf ON ast.specific_fund_id = sf.id
      LEFT JOIN asnaf_allocations aa ON COALESCE(ast.primary_group_code, sf.primary_group_code) = aa.asnaf_code AND aa.fiscal_year = '2569'
      WHERE 1=1
    `;
    const args: any[] = [];

    if (!filters?.includeInactive) {
      sql += ' AND ast.is_active = 1';
    }
    if (filters?.activeFundOnly) {
      sql += ' AND ast.is_active = 1 AND COALESCE(sf.is_active, 1) = 1 AND COALESCE(aa.is_active, 1) = 1';
    }
    if (filters?.primaryGroupCode && filters.primaryGroupCode !== 'all') {
      const normalizedPrimary = ['faqir', 'miskin'].includes(filters.primaryGroupCode)
        ? 'faqir_miskin'
        : filters.primaryGroupCode;
      sql += ' AND COALESCE(ast.primary_group_code, sf.primary_group_code) = ?';
      args.push(normalizedPrimary);
    }
    if (filters?.specificFundId && filters.specificFundId !== 'all') {
      sql += ' AND (ast.specific_fund_id = ? OR sf.code = ? OR sf.fund_code = ?)';
      args.push(filters.specificFundId, filters.specificFundId, filters.specificFundId);
    }
    if (filters?.search?.trim()) {
      const s = `%${filters.search.trim()}%`;
      sql += ' AND (ast.code LIKE ? OR ast.name LIKE ? OR COALESCE(ast.description, "") LIKE ?)';
      args.push(s, s, s);
    }

    sql += ' ORDER BY COALESCE(ast.order_index, 999) ASC, ast.code ASC';

    const res = await db.execute({ sql, args });
    return res.rows.map((r) => {
      let reqDocs: string[] = [];
      try { if (r.required_docs) reqDocs = JSON.parse(String(r.required_docs)); } catch {}
      const pCode = r.primary_group_code
        ? String(r.primary_group_code)
        : (r.sf_primary_code ? String(r.sf_primary_code) : undefined);

      return {
        id: String(r.id),
        code: String(r.code),
        name: String(r.name),
        group: (r.type_group ? String(r.type_group) : (pCode === 'faqir_miskin' ? 'core' : 'specific')) as 'core' | 'specific',
        groupLabelTh: pCode === 'faqir_miskin' ? 'กลุ่มหลัก (ฟากีร–มิสกีน)' : 'กลุ่มเฉพาะตามอัสนัฟ',
        category: String(r.category) as any,
        description: r.description ? String(r.description) : undefined,
        conditionsText: r.conditions_text ? String(r.conditions_text) : undefined,
        assistanceFormat: (r.assistance_format ? String(r.assistance_format) : 'one_time') as any,
        requiredDocuments: reqDocs,
        defaultMinAmount: r.default_min_amount !== null && r.default_min_amount !== undefined ? Number(r.default_min_amount) : undefined,
        defaultMaxAmount: r.default_max_amount !== null && r.default_max_amount !== undefined ? Number(r.default_max_amount) : undefined,
        canHardDelete: (Number(r.app_ref_count) || 0) === 0,
        specificFundId: r.specific_fund_id ? String(r.specific_fund_id) : undefined,
        specificFundCode: r.sf_fund_code ? String(r.sf_fund_code) : (r.sf_code ? String(r.sf_code) : undefined),
        specificFundName: r.sf_name ? String(r.sf_name) : undefined,
        primaryGroupCode: pCode,
        primaryGroupName: r.primary_name ? String(r.primary_name) : pCode,
        linkedApplicationCount: Number(r.app_ref_count) || 0,
        orderIndex: Number(r.order_index) || 0,
        isActive: Boolean(r.is_active),
        deactivatedReason: r.deactivated_reason ? String(r.deactivated_reason) : null,
      };
    });
  }

  private static async _legacyGetAssistanceTypesUnused() {
    await initDb();
    const db = getDb();
    const res = await db.execute('SELECT * FROM assistance_types WHERE is_active = 1 ORDER BY code ASC');
    return res.rows.map((r) => ({
      id: String(r.id),
      code: String(r.code),
      name: String(r.name),
      category: String(r.category),
      description: r.description ? String(r.description) : undefined,
      isActive: Boolean(r.is_active),
    }));
  }

  /**
   * 14. Add New Assistance Type (Admin Extensible)
   */
  static async addAssistanceType(
    nameOrInput:
      | string
      | {
          code?: string;
          name: string;
          category: 'cash' | 'in_kind' | 'service' | 'housing' | 'education' | 'medical' | 'other';
          specificFundId: string;
          description?: string;
          conditionsText?: string;
          assistanceFormat?: 'one_time' | 'monthly' | 'project' | 'emergency' | 'career_capital' | 'service';
          requiredDocuments?: string[];
          defaultMinAmount?: number;
          defaultMaxAmount?: number;
          orderIndex?: number;
        },
    categoryArg?: 'cash' | 'in_kind' | 'service' | 'housing' | 'education' | 'medical' | 'other',
    descriptionArg?: string,
    actorArg?: ActorContext
  ) {
    await initDb();
    const db = getDb();

    const actor = actorArg || { id: 'u-1', name: 'ผู้ดูแลระบบสูงสุด', role: 'super_admin' };
    if (!['super_admin', 'admin', 'executive', 'finance'].includes(actor.role)) {
      throw new Error('ไม่อนุญาต: เฉพาะผู้ดูแลระบบ ผู้บริหาร หรือฝ่ายการเงินเท่านั้นที่มีสิทธิ์เพิ่มประเภทความช่วยเหลือ');
    }

    const payload =
      typeof nameOrInput === 'string'
        ? {
            name: nameOrInput,
            category: categoryArg || 'cash',
            specificFundId: 'subf-1',
            description: descriptionArg || '',
          }
        : nameOrInput;

    const cleanName = (payload.name || '').trim();
    if (!cleanName) throw new Error('กรุณาระบุชื่อประเภทความช่วยเหลือ');
    if (!payload.specificFundId) throw new Error('กรุณาเลือกกองทุนเฉพาะที่ต้องการผูกประเภทความช่วยเหลือ');

    // Validate Specific Fund exists
    const sfRes = await db.execute({
      sql: 'SELECT id, code, fund_code, name, primary_group_code FROM faqir_miskin_sub_funds WHERE id = ? OR code = ? OR fund_code = ?',
      args: [payload.specificFundId, payload.specificFundId, payload.specificFundId],
    });
    if (sfRes.rows.length === 0) {
      throw new Error(`ไม่พบกองทุนเฉพาะรหัส ${payload.specificFundId}`);
    }
    const sf = sfRes.rows[0];
    const resolvedSfId = String(sf.id);
    const primaryGroupCode = String(sf.primary_group_code || 'faqir_miskin');

    const code = (payload.code?.trim() || `AST_${Date.now().toString().slice(-5)}`)
      .toUpperCase()
      .replace(/[^A-Z0-9_]+/g, '_');

    const dupCheck = await db.execute({
      sql: 'SELECT id FROM assistance_types WHERE LOWER(code) = LOWER(?) OR (specific_fund_id = ? AND LOWER(name) = LOWER(?))',
      args: [code, resolvedSfId, cleanName],
    });
    if (dupCheck.rows.length > 0) {
      throw new Error(`รหัส "${code}" หรือชื่อ "${cleanName}" มีอยู่ในกองทุนนี้แล้ว`);
    }

    const id = `ast-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const groupType = primaryGroupCode === 'faqir_miskin' ? 'core' : 'specific';
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    await db.execute({
      sql: `INSERT INTO assistance_types (
              id, code, name, category, description, type_group, specific_fund_id, primary_group_code,
              conditions_text, assistance_format, required_docs, default_min_amount, default_max_amount, order_index, is_active, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
      args: [
        id,
        code,
        cleanName,
        payload.category || 'cash',
        payload.description?.trim() || '',
        groupType,
        resolvedSfId,
        primaryGroupCode,
        payload.conditionsText?.trim() || '',
        ('assistanceFormat' in payload && payload.assistanceFormat) ? payload.assistanceFormat : 'one_time',
        JSON.stringify(('requiredDocuments' in payload ? payload.requiredDocuments : undefined) || []),
        ('defaultMinAmount' in payload && payload.defaultMinAmount !== undefined) ? Number(payload.defaultMinAmount) : null,
        ('defaultMaxAmount' in payload && payload.defaultMaxAmount !== undefined) ? Number(payload.defaultMaxAmount) : null,
        ('orderIndex' in payload && payload.orderIndex !== undefined) ? payload.orderIndex : 50,
      ],
    });

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, old_values, new_values)
            VALUES (?, ?, ?, ?, ?, 'ASSISTANCE_TYPE_CREATED', 'assistance_type', ?, ?, NULL, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        id,
        `เพิ่มประเภทความช่วยเหลือ "${cleanName}" (${code}) ผูกกับกองทุน "${sf.name}"`,
        JSON.stringify({ id, code, name: cleanName, specificFundId: resolvedSfId, primaryGroupCode }),
      ],
    });

    const list = await this.getAssistanceTypes({ includeInactive: true });
    return list.find((t) => t.id === id) || { id, code, name: cleanName, category: payload.category, specificFundId: resolvedSfId, primaryGroupCode };
  }

  static async updateAssistanceType(
    id: string,
    input: {
      code?: string;
      name?: string;
      category?: 'cash' | 'in_kind' | 'service' | 'housing' | 'education' | 'medical' | 'other';
      specificFundId?: string;
      description?: string;
      conditionsText?: string;
      assistanceFormat?: 'one_time' | 'monthly' | 'project' | 'emergency' | 'career_capital' | 'service';
      requiredDocuments?: string[];
      defaultMinAmount?: number | null;
      defaultMaxAmount?: number | null;
      orderIndex?: number;
      isActive?: boolean;
    },
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    if (!['super_admin', 'admin', 'executive', 'finance'].includes(actor.role)) {
      throw new Error('ไม่อนุญาต: เฉพาะผู้ดูแลระบบ ผู้บริหาร หรือฝ่ายการเงินเท่านั้นที่มีสิทธิ์แก้ไขประเภทความช่วยเหลือ');
    }

    const existingRes = await db.execute({
      sql: 'SELECT * FROM assistance_types WHERE id = ?',
      args: [id],
    });
    if (existingRes.rows.length === 0) {
      throw new Error(`ไม่พบประเภทความช่วยเหลือรหัส ${id}`);
    }
    const existing = existingRes.rows[0];

    const refRes = await db.execute({
      sql: "SELECT COUNT(*) as cnt FROM assistance_applications WHERE id != 'REGISTRY-DOCS' AND (assistance_type_id = ? OR assistance_type = ?)",
      args: [id, String(existing.code)],
    });
    const refCount = Number(refRes.rows[0]?.cnt) || 0;

    const nextCode = input.code !== undefined ? input.code.trim().toUpperCase() : String(existing.code);
    if (refCount > 0 && nextCode.toLowerCase() !== String(existing.code).toLowerCase()) {
      throw new Error(`ไม่สามารถเปลี่ยนรหัสประเภทความช่วยเหลือได้ เนื่องจากมีคำร้องอ้างอิงแล้ว ${refCount} รายการ`);
    }

    let nextSfId = existing.specific_fund_id ? String(existing.specific_fund_id) : 'subf-1';
    let nextPrimaryCode = existing.primary_group_code ? String(existing.primary_group_code) : 'faqir_miskin';

    if (input.specificFundId && input.specificFundId !== nextSfId) {
      const sfRes = await db.execute({
        sql: 'SELECT id, primary_group_code FROM faqir_miskin_sub_funds WHERE id = ?',
        args: [input.specificFundId],
      });
      if (sfRes.rows.length === 0) {
        throw new Error(`ไม่พบกองทุนเฉพาะรหัส ${input.specificFundId}`);
      }
      const targetPrimary = String(sfRes.rows[0].primary_group_code || 'faqir_miskin');
      if (refCount > 0 && targetPrimary !== nextPrimaryCode) {
        throw new Error(`ไม่สามารถย้ายประเภทความช่วยเหลือข้ามกลุ่มหลักได้ เนื่องจากมีคำร้องอ้างอิงแล้ว ${refCount} รายการ`);
      }
      nextSfId = String(sfRes.rows[0].id);
      nextPrimaryCode = targetPrimary;
    }

    const nextName = input.name !== undefined ? input.name.trim() : String(existing.name);
    if (!nextName) throw new Error('กรุณาระบุชื่อประเภทความช่วยเหลือ');

    const dupCheck = await db.execute({
      sql: 'SELECT id FROM assistance_types WHERE id != ? AND (LOWER(code) = LOWER(?) OR (specific_fund_id = ? AND LOWER(name) = LOWER(?)))',
      args: [id, nextCode, nextSfId, nextName],
    });
    if (dupCheck.rows.length > 0) {
      throw new Error(`รหัส "${nextCode}" หรือชื่อ "${nextName}" ซ้ำกับรายการอื่นในระบบ`);
    }

    const nextCategory = input.category || String(existing.category);
    const nextDesc = input.description !== undefined ? input.description.trim() : String(existing.description || '');
    const nextCond = input.conditionsText !== undefined ? input.conditionsText.trim() : String(existing.conditions_text || '');
    const nextFormat = input.assistanceFormat !== undefined ? input.assistanceFormat : String(existing.assistance_format || 'one_time');
    const nextDocs = input.requiredDocuments !== undefined ? JSON.stringify(input.requiredDocuments) : (existing.required_docs ? String(existing.required_docs) : '[]');
    const nextMin = input.defaultMinAmount !== undefined ? input.defaultMinAmount : (existing.default_min_amount !== null && existing.default_min_amount !== undefined ? Number(existing.default_min_amount) : null);
    const nextMax = input.defaultMaxAmount !== undefined ? input.defaultMaxAmount : (existing.default_max_amount !== null ? Number(existing.default_max_amount) : null);
    const nextOrder = input.orderIndex !== undefined ? Number(input.orderIndex) : Number(existing.order_index || 0);
    const nextActive = input.isActive !== undefined ? (input.isActive ? 1 : 0) : Number(existing.is_active ?? 1);
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    await db.execute({
      sql: `UPDATE assistance_types
            SET code = ?,
                name = ?,
                category = ?,
                description = ?,
                specific_fund_id = ?,
                primary_group_code = ?,
                type_group = ?,
                conditions_text = ?,
                assistance_format = ?,
                required_docs = ?,
                default_min_amount = ?,
                default_max_amount = ?,
                order_index = ?,
                is_active = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        nextCode,
        nextName,
        nextCategory,
        nextDesc,
        nextSfId,
        nextPrimaryCode,
        nextPrimaryCode === 'faqir_miskin' ? 'core' : 'specific',
        nextCond,
        nextFormat,
        nextDocs,
        nextMin,
        nextMax,
        nextOrder,
        nextActive,
        id,
      ],
    });

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, old_values, new_values)
            VALUES (?, ?, ?, ?, ?, 'ASSISTANCE_TYPE_UPDATED', 'assistance_type', ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        id,
        `แก้ไขประเภทความช่วยเหลือ "${nextName}" (${nextCode}) โดย ${actor.name}`,
        JSON.stringify({ code: existing.code, name: existing.name, specificFundId: existing.specific_fund_id }),
        JSON.stringify({ code: nextCode, name: nextName, specificFundId: nextSfId }),
      ],
    });

    const list = await this.getAssistanceTypes({ includeInactive: true });
    return list.find((t) => t.id === id);
  }

  static async deleteOrDeactivateAssistanceType(
    id: string,
    options: { mode: 'delete' | 'deactivate' | 'activate'; reason?: string },
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    if (!['super_admin', 'admin', 'executive', 'finance'].includes(actor.role)) {
      throw new Error('ไม่อนุญาต: เฉพาะผู้ดูแลระบบ ผู้บริหาร หรือฝ่ายการเงินเท่านั้นที่มีสิทธิ์ลบหรือปิดใช้งานประเภทความช่วยเหลือ');
    }

    const existingRes = await db.execute({
      sql: 'SELECT * FROM assistance_types WHERE id = ?',
      args: [id],
    });
    if (existingRes.rows.length === 0) {
      throw new Error(`ไม่พบประเภทความช่วยเหลือรหัส ${id}`);
    }
    const existing = existingRes.rows[0];
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    const refRes = await db.execute({
      sql: "SELECT COUNT(*) as cnt FROM assistance_applications WHERE id != 'REGISTRY-DOCS' AND (assistance_type_id = ? OR assistance_type = ?)",
      args: [id, String(existing.code)],
    });
    const refCount = Number(refRes.rows[0]?.cnt) || 0;

    if (options.mode === 'delete') {
      if (refCount > 0) {
        throw new Error(
          `CANNOT_HARD_DELETE: ประเภทความช่วยเหลือ "${existing.name}" มีคำร้องอ้างอิงอยู่แล้ว ${refCount} รายการ ระบบไม่อนุญาตให้ลบถาวร กรุณาใช้การปิดใช้งาน (Deactivate) แทน`
        );
      }
      await db.execute({ sql: 'DELETE FROM assistance_types WHERE id = ?', args: [id] });
      await db.execute({
        sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, old_values, new_values)
              VALUES (?, ?, ?, ?, ?, 'ASSISTANCE_TYPE_DELETED', 'assistance_type', ?, ?, ?, NULL)`,
        args: [
          `log-${Date.now()}`,
          timestampNow,
          actor.id,
          actor.name,
          actor.role,
          id,
          `ลบประเภทความช่วยเหลือ "${existing.name}" (${existing.code}) โดย ${actor.name}`,
          JSON.stringify(existing),
        ],
      });
      return { success: true, mode: 'delete', deletedId: id };
    }

    if (options.mode === 'deactivate') {
      const reason = (options.reason || '').trim();
      if (!reason) throw new Error('กรุณาระบุเหตุผลในการปิดใช้งานประเภทความช่วยเหลือ');

      await db.execute({
        sql: `UPDATE assistance_types
              SET is_active = 0, deactivated_at = ?, deactivated_by = ?, deactivated_reason = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [timestampNow, actor.name, reason, id],
      });
      await db.execute({
        sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, old_values, new_values)
              VALUES (?, ?, ?, ?, ?, 'ASSISTANCE_TYPE_DEACTIVATED', 'assistance_type', ?, ?, ?, ?)`,
        args: [
          `log-${Date.now()}`,
          timestampNow,
          actor.id,
          actor.name,
          actor.role,
          id,
          `ปิดใช้งานประเภทความช่วยเหลือ "${existing.name}" เหตุผล: ${reason}`,
          JSON.stringify({ isActive: true }),
          JSON.stringify({ isActive: false, reason }),
        ],
      });
      return { success: true, mode: 'deactivate', id };
    }

    await db.execute({
      sql: `UPDATE assistance_types
            SET is_active = 1, deactivated_at = NULL, deactivated_by = NULL, deactivated_reason = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [id],
    });
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, 'ASSISTANCE_TYPE_REACTIVATED', 'assistance_type', ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        id,
        `เปิดใช้งานประเภทความช่วยเหลือ "${existing.name}" อีกครั้งโดย ${actor.name}`,
      ],
    });
    return { success: true, mode: 'activate', id };
  }

  private static async _legacyAddAssistanceTypeUnused(
    name: string,
    category: 'cash' | 'in_kind' | 'service' | 'housing' | 'education' | 'medical' | 'other',
    description: string,
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    if (!['super_admin', 'executive'].includes(actor.role)) {
      throw new Error(`เฉพาะผู้ดูแลระบบหรือผู้บริหารเท่านั้นที่มีสิทธิ์เพิ่มประเภทความช่วยเหลือใหม่`);
    }

    const id = `ast-${Date.now()}`;
    const code = `AST-${Date.now().toString().slice(-4)}`;

    await db.execute({
      sql: `INSERT INTO assistance_types (id, code, name, category, description, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
      args: [id, code, name, category, description],
    });

    return { id, code, name, category, description };
  }

  /**
   * 15. Fetch Audit Logs from Real Database
   */
  static async getAuditLogs() {
    await initDb();
    const db = getDb();
    const res = await db.execute('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
    return res.rows.map((r) => ({
      id: String(r.id),
      timestamp: String(r.timestamp),
      userId: String(r.user_id),
      userName: String(r.user_name),
      userRole: String(r.user_role) as any,
      action: String(r.action),
      entityType: String(r.entity_type) as any,
      entityId: String(r.entity_id),
      description: String(r.description),
      ipAddress: String(r.ip_address),
    }));
  }

  /**
   * 16. Fetch Fund Accounts from Real Database
   * Harmonized with FinancialService.getFunds for Single Source of Truth (dynamic commitments & balances)
   */
  static async getFunds() {
    return FinancialService.getFunds();
  }
}

export { RegistryService } from './registryService';
