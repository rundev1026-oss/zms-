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
  BeneficiaryDocument,
  DuplicateCheckParams,
  DuplicateCheckResult,
  ExistingApplicationSummary,
  DuplicateRuleCode,
  FundSolvencyCheckResult,
  GeneralLedgerEntry,
  FinancialLedgerDetails
} from '@/types';
import { StorageService } from './storageService';
import { calculateAge } from '@/utils/ageCalculator';
import { validateAddress } from '@/lib/thaiAddress';
import { FinancialService } from './financialService';
import { normalizePrimaryGroupCode, getCentralAsnafByCode } from '@/lib/financeUtils';
import { 
  resolveAsnafGroupCode,
  getChartOfAccountsForDisbursement 
} from '@/lib/constants/asnafRelationshipCatalog';
import {
  matchCanonicalSubKey,
  matchCanonicalMainFundCode,
  CANONICAL_SUB_FUNDS,
  CANONICAL_MAIN_FUNDS,
  UNMAPPED_FUND_WARNING,
} from '@/lib/fundResolution';

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
  assistanceFormat?: string;
  assistanceFormatId?: string;
  assistanceFormatCode?: string;
  assistanceFormatName?: string;
  deliveryMethod?: string;
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
  id?: string;
  beneficiaryId?: string;
  applicationId?: string;
  applicationNo?: string;
  householdId?: string;
  householdNo?: string;
  assistanceTypeCode?: string;
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
  recommendedFundId?: string;
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

const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export function parseDateToJsDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date();
  const s = String(dateStr).trim();
  if (!s) return new Date();

  // 1. Thai format DD/MM/YYYY or D/M/YYYY
  const thaiMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (thaiMatch) {
    const day = parseInt(thaiMatch[1], 10);
    const month = parseInt(thaiMatch[2], 10) - 1;
    let year = parseInt(thaiMatch[3], 10);
    if (year > 2400) {
      year -= 543;
    }
    return new Date(year, month, day);
  }

  // 2. ISO YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    let year = parseInt(isoMatch[1], 10);
    if (year > 2400) {
      year -= 543;
    }
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    return new Date(year, month, day);
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
}

export function formatThaiDate(d: Date): string {
  const day = d.getDate();
  const month = THAI_MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `${day} ${month} ${year}`;
}

export function getStatusLabelTh(app: any): string {
  const st = String(app.status || app.request_status || 'submitted');
  const map: Record<string, string> = {
    submitted: 'ยื่นคำร้องแล้ว',
    in_assessment: 'อยู่ระหว่างลงพื้นที่ประเมิน',
    field_inspection: 'รอลงพื้นที่สำรวจ',
    assessment: 'อยู่ระหว่างประเมิน',
    pending_approval: 'รอคณะกรรมการพิจารณา',
    approved: 'อนุมัติแล้ว',
    wait_disbursement: 'รอเบิกจ่ายเงิน',
    disbursed: 'จ่ายเงินเรียบร้อยแล้ว',
    paid: 'จ่ายเงินเรียบร้อยแล้ว',
    delivered: 'ส่งมอบสิ่งของ/บริการแล้ว',
    closed: 'ปิดคำร้องสมบูรณ์',
    rejected: 'ไม่อนุมัติ',
    cancelled: 'ยกเลิกคำร้อง',
  };
  return map[st] || st;
}

function buildDuplicateSummary(row: any, rowDate: Date, targetDate: Date, customDays?: number): ExistingApplicationSummary {
  const diffDays = customDays !== undefined ? customDays : Math.floor(Math.abs(targetDate.getTime() - rowDate.getTime()) / (1000 * 60 * 60 * 24));
  return {
    id: String(row.id),
    applicationNo: String(row.application_no),
    appliedDate: formatThaiDate(rowDate),
    requestedAmount: Number(row.requested_amount || 0),
    approvedAmount: Number(row.approved_amount || 0),
    disbursedAmount: Number(row.disbursed_amount || 0),
    currentStatus: String(row.status || 'submitted'),
    statusLabelTh: getStatusLabelTh(row),
    assistanceTypeName: String(row.matched_type_name || row.assistance_type || 'ความช่วยเหลือ'),
    assistanceTypeCode: String(row.assistance_type_code || ''),
    specificFundName: row.specific_fund_name ? String(row.specific_fund_name) : undefined,
    daysElapsed: diffDays,
    fiscalYear: row.fiscal_year ? String(row.fiscal_year) : undefined,
    completionStatus: row.completion_status ? String(row.completion_status) : undefined,
    approvalStatus: row.approval_status ? String(row.approval_status) : undefined,
    paymentStatus: row.payment_status ? String(row.payment_status) : undefined,
    deliveryStatus: row.delivery_status ? String(row.delivery_status) : undefined,
  };
}

export class BeneficiaryService {
  /**
   * 0.2 Category-Specific Duplicate Prevention Rules (Phase 8)
   *
   * 1. ปัจจัยยังชีพรายเดือน (MONTHLY_ALLOWANCE / LIVING_SUPPORT_MONTHLY):
   *    - ห้ามขอซ้ำในเดือนเดียวกัน (Calendar Month)
   * 2. ทุนการศึกษา (EDUCATION_GRANT):
   *    - ห้ามขอซ้ำในปีการศึกษาเดียวกันของผู้รับ (Fiscal/Academic Year)
   * 3. ซ่อมและสร้างที่อยู่อาศัย (HOUSING_REPAIR_BUILD / RAHMAH_HOME):
   *    - ห้ามขอซ้ำหากยังมีโครงการเดิมที่ยังไม่เสร็จสิ้น (Ongoing Project)
   * 4. ช่วยเหลือฉุกเฉิน (EMERGENCY_AID):
   *    - ตรวจสอบเหตุการณ์เดียวกันภายใน 30 วัน (<= 30 Days)
   * 5. สนับสนุนอาชีพ (CAREER_SUPPORT):
   *    - ตรวจสอบประวัติการรับทุนและเงื่อนไขระยะเวลา (Ongoing project or grant within 1 year / 365 days)
   *
   * คืนข้อมูลคำขอเดิม, วันที่ได้รับ, จำนวนเงิน, สถานะปัจจุบัน เพื่อแสดงการแจ้งเตือน
   */
  static async checkDuplicateAssistanceRules(params: DuplicateCheckParams): Promise<DuplicateCheckResult> {
    await initDb();
    const db = getDb();

    // 1. Identify target beneficiary
    const cleanNationalId = params.nationalId ? String(params.nationalId).replace(/[^0-9]/g, '') : '';
    let targetBeneficiaryId = params.beneficiaryId ? String(params.beneficiaryId).trim() : '';

    if (!targetBeneficiaryId && cleanNationalId) {
      const bRes = await db.execute({
        sql: 'SELECT id FROM beneficiaries WHERE national_id = ? LIMIT 1',
        args: [cleanNationalId],
      });
      if (bRes.rows.length > 0) {
        targetBeneficiaryId = String(bRes.rows[0].id);
      }
    }

    // If no beneficiary record exists in system yet, no duplicate history exists
    if (!targetBeneficiaryId && !cleanNationalId) {
      return { hasDuplicate: false };
    }

    // 2. Resolve target assistance type details
    const cleanTypeId = params.assistanceTypeId ? String(params.assistanceTypeId).trim() : '';
    const cleanTypeCode = params.assistanceTypeCode ? String(params.assistanceTypeCode).trim().toUpperCase() : '';
    const cleanTypeName = params.assistanceTypeName ? String(params.assistanceTypeName).trim() : '';

    let matchedType: any = null;
    if (cleanTypeId || cleanTypeCode || cleanTypeName) {
      const typeRes = await db.execute({
        sql: 'SELECT id, code, name FROM assistance_types WHERE id = ? OR code = ? OR name = ? LIMIT 1',
        args: [cleanTypeId || cleanTypeCode, cleanTypeCode || cleanTypeId, cleanTypeName || cleanTypeCode],
      });
      if (typeRes.rows.length > 0) {
        matchedType = typeRes.rows[0];
      }
    }

    const targetCode = String(matchedType?.code || cleanTypeCode).toUpperCase();
    const targetName = String(matchedType?.name || cleanTypeName);

    const isMonthlyLiving = targetCode === 'MONTHLY_ALLOWANCE' || targetName.includes('ปัจจัยยังชีพรายเดือน');
    const isEducation = targetCode === 'EDUCATION_GRANT' || targetName.includes('ทุนการศึกษา');
    const isHousing = ['HOUSING_REPAIR_BUILD', 'RAHMAH_HOME'].includes(targetCode) ||
      targetName.includes('ซ่อมและสร้างที่อยู่อาศัย') || targetName.includes('บ้านอัร-เราะห์มัต') ||
      targetName.includes('ซ่อม') || targetName.includes('สร้างที่อยู่อาศัย');
    const isEmergency = targetCode === 'EMERGENCY_AID' || targetName.includes('ฉุกเฉิน') || targetName.includes('ภัยพิบัติ');
    const isCareer = targetCode === 'CAREER_SUPPORT' || targetName.includes('สนับสนุนอาชีพ') || targetName.includes('ต่อยอดอาชีพ');

    // If type does not fall into any of the 5 controlled categories, no duplicate rules violated
    if (!isMonthlyLiving && !isEducation && !isHousing && !isEmergency && !isCareer) {
      return { hasDuplicate: false };
    }

    // 3. Query existing non-rejected, non-cancelled applications for this beneficiary
    let querySql = `
      SELECT a.id, a.application_no, a.applied_date, a.request_date, a.created_at,
             a.requested_amount, a.approved_amount, a.disbursed_amount,
             a.status, a.request_status, a.assessment_status, a.approval_status,
             a.payment_status, a.delivery_status, a.completion_status,
             a.assistance_type, a.assistance_type_id, a.fiscal_year,
             a.specific_fund_name,
             ast.code as assistance_type_code, ast.name as matched_type_name
      FROM assistance_applications a
      LEFT JOIN assistance_types ast ON (a.assistance_type_id = ast.id OR a.assistance_type = ast.code OR a.assistance_type = ast.name)
      WHERE (
        (a.beneficiary_id = ? AND ? != '')
        OR (a.beneficiary_id IN (SELECT id FROM beneficiaries WHERE national_id = ?) AND ? != '')
      )
      AND (a.approval_status != 'rejected' OR a.approval_status IS NULL)
      AND (a.assessment_status != 'rejected' OR a.assessment_status IS NULL)
      AND (a.completion_status NOT IN ('cancelled', 'terminated') OR a.completion_status IS NULL)
      AND (a.status NOT IN ('rejected', 'cancelled') OR a.status IS NULL)
    `;

    const args: any[] = [
      targetBeneficiaryId,
      targetBeneficiaryId,
      cleanNationalId,
      cleanNationalId,
    ];

    if (params.excludeApplicationId) {
      querySql += ` AND a.id != ?`;
      args.push(params.excludeApplicationId);
    }

    querySql += ` ORDER BY a.created_at DESC, a.id DESC`;

    const appsRes = await db.execute({ sql: querySql, args });
    if (appsRes.rows.length === 0) {
      return { hasDuplicate: false };
    }

    const requestDateObj = parseDateToJsDate(params.requestDate);

    // 4. Evaluate the 5 Rules
    for (const row of appsRes.rows) {
      const rowCode = String(row.assistance_type_code || row.assistance_type || '').toUpperCase();
      const rowName = String(row.matched_type_name || row.assistance_type || '');

      const rowIsMonthlyLiving = rowCode === 'MONTHLY_ALLOWANCE' || rowName.includes('ปัจจัยยังชีพรายเดือน');
      const rowIsEducation = rowCode === 'EDUCATION_GRANT' || rowName.includes('ทุนการศึกษา');
      const rowIsHousing = ['HOUSING_REPAIR_BUILD', 'RAHMAH_HOME'].includes(rowCode) ||
        rowName.includes('ซ่อมและสร้างที่อยู่อาศัย') || rowName.includes('บ้านอัร-เราะห์มัต') ||
        rowName.includes('ซ่อม') || rowName.includes('สร้างที่อยู่อาศัย');
      const rowIsEmergency = rowCode === 'EMERGENCY_AID' || rowName.includes('ฉุกเฉิน') || rowName.includes('ภัยพิบัติ');
      const rowIsCareer = rowCode === 'CAREER_SUPPORT' || rowName.includes('สนับสนุนอาชีพ') || rowName.includes('ต่อยอดอาชีพ');

      const rowDate = parseDateToJsDate(
        (row.applied_date as string) || (row.request_date as string) || (row.created_at as string)
      );

      // Rule 1: ปัจจัยยังชีพรายเดือน (ห้ามขอซ้ำในเดือนเดียวกัน)
      if (isMonthlyLiving && rowIsMonthlyLiving) {
        const rowYear = rowDate.getFullYear();
        const rowMonth = rowDate.getMonth();
        const reqYear = requestDateObj.getFullYear();
        const reqMonth = requestDateObj.getMonth();

        if (rowYear === reqYear && rowMonth === reqMonth) {
          const monthLabel = `${THAI_MONTH_NAMES[reqMonth]} ${reqYear + 543}`;
          const amount = Number(row.approved_amount || row.requested_amount || 0);
          return {
            hasDuplicate: true,
            ruleCode: 'MONTHLY_LIVING_SAME_MONTH',
            ruleNameTh: 'ปัจจัยยังชีพรายเดือน (ห้ามขอซ้ำในเดือนเดียวกัน)',
            message: `ตรวจพบคำร้องซ้ำซ้อน: ผู้ขอรับมีคำร้องขอรับปัจจัยยังชีพรายเดือนสำหรับเดือน ${monthLabel} อยู่แล้ว (ห้ามขอซ้ำในเดือนเดียวกัน) (เลขที่คำร้อง ${row.application_no}, วันที่ยื่น ${formatThaiDate(rowDate)}, วงเงิน ฿${amount.toLocaleString()}, สถานะ "${getStatusLabelTh(row)}")`,
            existingApplication: buildDuplicateSummary(row, rowDate, requestDateObj),
          };
        }
      }

      // Rule 2: ทุนการศึกษา (ห้ามขอซ้ำในปีการศึกษาเดียวกัน)
      if (isEducation && rowIsEducation) {
        const targetFiscalYear = String(params.fiscalYear || '2569');
        const rowFiscalYear = String(row.fiscal_year || '2569');

        if (targetFiscalYear === rowFiscalYear) {
          const amount = Number(row.approved_amount || row.requested_amount || 0);
          return {
            hasDuplicate: true,
            ruleCode: 'EDUCATION_SAME_ACADEMIC_YEAR',
            ruleNameTh: 'ทุนการศึกษา (ห้ามขอซ้ำในปีการศึกษาเดียวกัน)',
            message: `ตรวจพบคำร้องซ้ำซ้อน: ผู้ขอรับมีคำร้องขอรับทุนการศึกษาสำหรับปีการศึกษา ${targetFiscalYear} อยู่แล้ว (ห้ามขอซ้ำในปีการศึกษาเดียวกัน) (เลขที่คำร้อง ${row.application_no}, วันที่ยื่น ${formatThaiDate(rowDate)}, วงเงิน ฿${amount.toLocaleString()}, สถานะ "${getStatusLabelTh(row)}")`,
            existingApplication: buildDuplicateSummary(row, rowDate, requestDateObj),
          };
        }
      }

      // Rule 3: ซ่อมและสร้างที่อยู่อาศัย (ห้ามขอซ้ำหากยังมีโครงการเดิมที่ยังไม่เสร็จสิ้น)
      if (isHousing && rowIsHousing) {
        const isClosed = row.completion_status === 'closed' || row.status === 'closed';
        if (!isClosed) {
          const amount = Number(row.approved_amount || row.requested_amount || 0);
          return {
            hasDuplicate: true,
            ruleCode: 'HOUSING_ONGOING_PROJECT',
            ruleNameTh: 'ซ่อมและสร้างที่อยู่อาศัย (ห้ามขอซ้ำหากยังมีโครงการเดิมที่ยังไม่เสร็จสิ้น)',
            message: `ตรวจพบโครงการซ่อม/สร้างที่อยู่อาศัยที่ยังไม่เสร็จสิ้น: ไม่สามารถยื่นคำร้องใหม่ได้จนกว่าโครงการเดิมจะปิดสมบูรณ์ (เลขที่คำร้องเดิม ${row.application_no}, วันที่ยื่น ${formatThaiDate(rowDate)}, วงเงิน ฿${amount.toLocaleString()}, สถานะ "${getStatusLabelTh(row)}")`,
            existingApplication: buildDuplicateSummary(row, rowDate, requestDateObj),
          };
        }
      }

      // Rule 4: ช่วยเหลือฉุกเฉิน (ตรวจสอบเหตุการณ์เดียวกันภายใน 30 วัน)
      if (isEmergency && rowIsEmergency) {
        const diffMs = Math.abs(requestDateObj.getTime() - rowDate.getTime());
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays <= 30) {
          const amount = Number(row.approved_amount || row.requested_amount || 0);
          return {
            hasDuplicate: true,
            ruleCode: 'EMERGENCY_WITHIN_30_DAYS',
            ruleNameTh: 'ช่วยเหลือฉุกเฉิน (ตรวจสอบเหตุการณ์เดียวกันภายใน 30 วัน)',
            message: `ตรวจพบคำร้องขอความช่วยเหลือฉุกเฉินภายใน 30 วัน (ผ่านไปเพียง ${diffDays} วัน จากคำร้องเลขที่ ${row.application_no}, วันที่ยื่น ${formatThaiDate(rowDate)}, วงเงิน ฿${amount.toLocaleString()}, สถานะ "${getStatusLabelTh(row)}")`,
            existingApplication: buildDuplicateSummary(row, rowDate, requestDateObj, diffDays),
          };
        }
      }

      // Rule 5: สนับสนุนอาชีพ (ตรวจสอบประวัติการรับทุนและเงื่อนไขระยะเวลา)
      if (isCareer && rowIsCareer) {
        // Condition A: Ongoing project
        const isClosed = row.completion_status === 'closed' || row.status === 'closed';
        if (!isClosed) {
          return {
            hasDuplicate: true,
            ruleCode: 'CAREER_GRANT_COOLDOWN',
            ruleNameTh: 'สนับสนุนอาชีพ (ตรวจสอบประวัติการรับทุนและเงื่อนไขระยะเวลา)',
            message: `ตรวจพบโครงการสนับสนุนอาชีพเดิมที่ยังดำเนินการไม่เสร็จสิ้น: ไม่สามารถยื่นขอทุนใหม่ได้ (เลขที่คำร้องเดิม ${row.application_no}, วันที่ยื่น ${formatThaiDate(rowDate)}, สถานะ "${getStatusLabelTh(row)}")`,
            existingApplication: buildDuplicateSummary(row, rowDate, requestDateObj),
          };
        }

        // Condition B: Grant cooldown (1 year / 365 days from approval/disbursement)
        const isApprovedOrPaid = row.approval_status === 'approved' || row.status === 'disbursed' || row.payment_status === 'paid';
        if (isApprovedOrPaid) {
          const diffMs = Math.abs(requestDateObj.getTime() - rowDate.getTime());
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

          if (diffDays <= 365) {
            const amount = Number(row.approved_amount || row.disbursed_amount || row.requested_amount || 0);
            return {
              hasDuplicate: true,
              ruleCode: 'CAREER_GRANT_COOLDOWN',
              ruleNameTh: 'สนับสนุนอาชีพ (ตรวจสอบประวัติการรับทุนและเงื่อนไขระยะเวลา)',
              message: `ตรวจพบประวัติการรับทุนสนับสนุนอาชีพที่ยังอยู่ในช่วงเงื่อนไขระยะเวลา (ผ่านไปเพียง ${diffDays} วัน จากคำร้องเลขที่ ${row.application_no}, ได้รับเมื่อ ${formatThaiDate(rowDate)}, วงเงิน ฿${amount.toLocaleString()}, สถานะ "${getStatusLabelTh(row)}")`,
              existingApplication: buildDuplicateSummary(row, rowDate, requestDateObj, diffDays),
            };
          }
        }
      }
    }

    return { hasDuplicate: false };
  }

  /**
   * Helper: Generate strictly unique serial application number (APP-2569-XXXX)
   */
  private static async generateUniqueApplicationNo(db: any): Promise<string> {
    const allRes = await db.execute(`
      SELECT application_no FROM assistance_applications 
      WHERE application_no LIKE 'APP-2569-%'
    `);
    let maxSeq = 0;
    for (const row of allRes.rows) {
      const match = String(row.application_no).match(/^APP-2569-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
    let nextSeq = maxSeq + 1;
    let candidate = `APP-2569-${nextSeq.toString().padStart(4, '0')}`;
    let exists = await db.execute({
      sql: 'SELECT id FROM assistance_applications WHERE application_no = ?',
      args: [candidate],
    });
    while (exists.rows.length > 0) {
      nextSeq++;
      candidate = `APP-2569-${nextSeq.toString().padStart(4, '0')}`;
      exists = await db.execute({
        sql: 'SELECT id FROM assistance_applications WHERE application_no = ?',
        args: [candidate],
      });
    }
    return candidate;
  }

  /**
   * Helper: Create Assistance Request for registered beneficiary with duplicate checking
   */
  static async createAssistanceRequest(
    input: {
      beneficiaryId?: string;
      nationalId?: string;
      primaryGroupCode?: string;
      asnafCategory?: AsnafCategory;
      specificFundId?: string;
      assistanceTypeId?: string;
      assistanceTypeCode?: string;
      assistanceType?: string;
      assistanceFormatId?: string;
      assistanceFormatCode?: string;
      assistanceFormat?: string;
      requestedAmount?: number;
      urgencyLevel?: 'normal' | 'high' | 'urgent';
      hardshipReasons?: any;
      necessityDetails?: string;
      fiscalYear?: string;
      branchId?: string;
      branchName?: string;
      appliedDate?: string;
      status?: ApplicationStatus;
      allowDuplicateOverride?: boolean;
    },
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    // 1. Resolve Beneficiary
    let beneficiaryId = input.beneficiaryId ? String(input.beneficiaryId).trim() : '';
    let nationalId = input.nationalId ? String(input.nationalId).replace(/[^0-9]/g, '') : '';
    let benRow: any = null;

    if (beneficiaryId) {
      const bRes = await db.execute({
        sql: 'SELECT * FROM beneficiaries WHERE id = ? OR member_id = ? OR registration_no = ? LIMIT 1',
        args: [beneficiaryId, beneficiaryId, beneficiaryId],
      });
      if (bRes.rows.length > 0) benRow = bRes.rows[0];
    } else if (nationalId) {
      const bRes = await db.execute({
        sql: 'SELECT * FROM beneficiaries WHERE national_id = ? LIMIT 1',
        args: [nationalId],
      });
      if (bRes.rows.length > 0) benRow = bRes.rows[0];
    }

    if (!benRow) {
      throw new Error('NOT_FOUND_BENEFICIARY: ไม่พบข้อมูลผู้ขอรับในระบบทะเบียน');
    }

    beneficiaryId = String(benRow.id);
    nationalId = String(benRow.national_id);

    // 2. Resolve 3-Tier Fund & Assistance Type
    const resolvedThreeTier = await this.validateAndResolveThreeTierSelection({
      fiscalYear: input.fiscalYear || '2569',
      primaryGroupCode: input.primaryGroupCode || benRow.asnaf_category,
      asnafCategory: input.asnafCategory || benRow.asnaf_category,
      specificFundId: input.specificFundId,
      assistanceTypeId: input.assistanceTypeId || input.assistanceTypeCode,
      assistanceType: input.assistanceType || input.assistanceTypeCode,
      assistanceFormatId: input.assistanceFormatId,
      assistanceFormatCode: input.assistanceFormatCode || input.assistanceFormat,
      assistanceFormat: input.assistanceFormat || input.assistanceFormatCode,
      requestedAmount: input.requestedAmount !== undefined ? input.requestedAmount : 3000,
    });

    // 3. Category-Specific Duplicate Check (Phase 8)
    if (!input.allowDuplicateOverride) {
      const dupResult = await this.checkDuplicateAssistanceRules({
        beneficiaryId,
        nationalId,
        assistanceTypeId: resolvedThreeTier.assistanceTypeId,
        assistanceTypeCode: resolvedThreeTier.assistanceTypeCode,
        assistanceTypeName: resolvedThreeTier.assistanceTypeName,
        fiscalYear: resolvedThreeTier.fiscalYear,
        requestDate: input.appliedDate,
      });

      if (dupResult.hasDuplicate) {
        const err = new Error(`DUPLICATE_ASSISTANCE_VIOLATION: ${dupResult.message}`);
        (err as any).duplicateResult = dupResult;
        throw err;
      }
    }

    // 4. Generate Unique Application Number
    const applicationNo = await BeneficiaryService.generateUniqueApplicationNo(db);
    const applicationId = `app-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const appliedDateStr = input.appliedDate || new Date().toLocaleDateString('th-TH');
    const initialStatus = input.status || 'submitted';

    const fmtCode = String(resolvedThreeTier.assistanceFormatCode || '').toLowerCase();
    const payStatus = fmtCode === 'in_kind' ? 'not_applicable' : 'pending';
    const delivStatus = ['bank_transfer', 'cash', 'salary_direct'].includes(fmtCode) ? 'not_applicable' : 'pending';

    // 5. Insert Application
    await db.execute({
      sql: `INSERT INTO assistance_applications (
        id, application_no, beneficiary_id, asnaf_category, requested_amount,
        status, urgency_level, assigned_officer_id, assigned_officer_name, applied_date,
        branch_id, branch_name, hardship_reasons, assistance_type, assistance_type_id, assistance_group,
        primary_group_code, specific_fund_id, specific_fund_code, specific_fund_name, fiscal_year,
        assistance_format_id, assistance_format_code, assistance_format_name, delivery_method,
        necessity_details,
        request_status, assessment_status, approval_status, payment_status, delivery_status, followup_status, completion_status, request_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        input.branchId || benRow.branch_id || 'br-hq',
        input.branchName || benRow.branch_name || 'สำนักงานใหญ่ กรุงเทพมหานคร',
        input.hardshipReasons ? JSON.stringify(input.hardshipReasons) : null,
        resolvedThreeTier.assistanceTypeName,
        resolvedThreeTier.assistanceTypeId,
        resolvedThreeTier.assistanceGroup,
        resolvedThreeTier.primaryGroupCode,
        resolvedThreeTier.specificFundId,
        resolvedThreeTier.specificFundCode,
        resolvedThreeTier.specificFundName,
        resolvedThreeTier.fiscalYear,
        resolvedThreeTier.assistanceFormatId || null,
        resolvedThreeTier.assistanceFormatCode || null,
        resolvedThreeTier.assistanceFormatName || null,
        resolvedThreeTier.deliveryMethod || null,
        input.necessityDetails || '',
        'submitted',
        'pending',
        'pending',
        payStatus,
        delivStatus,
        'pending_schedule',
        'active',
        appliedDateStr,
      ],
    });

    await BeneficiaryService.recordLifecycleTransition(db, {
      applicationId,
      stage: 'request',
      fromStatus: null,
      toStatus: 'submitted',
      action: 'SUBMIT_REQUEST',
      actor,
      notes: `ยื่นคำร้องขอความช่วยเหลือวงเงิน ฿${Number(input.requestedAmount || 3000).toLocaleString()} (${resolvedThreeTier.assistanceTypeName})`,
      metadata: {
        assistanceTypeId: resolvedThreeTier.assistanceTypeId,
        assistanceFormatId: resolvedThreeTier.assistanceFormatId,
      },
    });

    return {
      applicationId,
      applicationNo,
      beneficiaryId,
      status: initialStatus,
    };
  }
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
    assistanceTypeCode?: string;
    assistanceType?: string;
    assistanceFormatId?: string;
    assistanceFormatCode?: string;
    assistanceFormat?: string;
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
      if ((!params.assistanceTypeId || !String(params.assistanceTypeId).trim()) && (!params.assistanceTypeCode || !String(params.assistanceTypeCode).trim())) {
        throw new Error('MISSING_ASSISTANCE_TYPE: กรุณาเลือกประเภทความช่วยเหลือ');
      }
    } else {
      if (params.specificFundId !== undefined && String(params.specificFundId).trim() === '') {
        throw new Error('MISSING_SPECIFIC_FUND: กรุณาเลือกกองทุนเฉพาะ (Specific Fund)');
      }
      if (params.assistanceTypeId !== undefined && String(params.assistanceTypeId).trim() === '' && !params.assistanceTypeCode) {
        throw new Error('MISSING_ASSISTANCE_TYPE: กรุณาเลือกประเภทความช่วยเหลือ');
      }
    }

    // 2. Resolve & Validate Level 3: Assistance Type
    let astRow: any = null;
    const cleanAstId = (params.assistanceTypeId || params.assistanceTypeCode)
      ? String(params.assistanceTypeId || params.assistanceTypeCode).trim()
      : '';
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

    // 5. Resolve & Validate Level 3 Delivery Format
    let fmtRow: any = null;
    const cleanFmtId = params.assistanceFormatId ? String(params.assistanceFormatId).trim() : '';
    const cleanFmtCode = (params.assistanceFormatCode || params.assistanceFormat)
      ? String(params.assistanceFormatCode || params.assistanceFormat).trim()
      : '';

    if (cleanFmtId || cleanFmtCode) {
      const fmtRes = await db.execute({
        sql: 'SELECT * FROM assistance_formats WHERE id = ? OR code = ? LIMIT 1',
        args: [cleanFmtId || cleanFmtCode, cleanFmtCode || cleanFmtId],
      });
      if (fmtRes.rows.length === 0) {
        throw new Error(`INVALID_ASSISTANCE_FORMAT: ไม่พบรูปแบบการช่วยเหลือรหัส "${cleanFmtId || cleanFmtCode}" ในระบบ`);
      }
      fmtRow = fmtRes.rows[0];

      if (Number(fmtRow.is_active ?? 1) !== 1) {
        throw new Error(`INACTIVE_ASSISTANCE_FORMAT: รูปแบบการช่วยเหลือ "${String(fmtRow.name)}" ถูกปิดใช้งานแล้ว`);
      }

      // Verify relation with assistance type via assistance_type_formats
      const atfCheck = await db.execute({
        sql: 'SELECT * FROM assistance_type_formats WHERE assistance_type_id = ? AND format_id = ? AND is_active = 1',
        args: [String(astRow.id), String(fmtRow.id)],
      });
      if (atfCheck.rows.length === 0) {
        throw new Error(`MISMATCH_FORMAT_TYPE: ประเภทความช่วยเหลือ "${String(astRow.name)}" ไม่รองรับรูปแบบการช่วยเหลือ "${String(fmtRow.name)}"`);
      }
    } else {
      // Fallback to default or first active format for this assistance type
      const defAtf = await db.execute({
        sql: `SELECT af.* FROM assistance_type_formats atf
              JOIN assistance_formats af ON atf.format_id = af.id
              WHERE atf.assistance_type_id = ? AND atf.is_active = 1 AND af.is_active = 1
              ORDER BY atf.is_default DESC, atf.sort_order ASC LIMIT 1`,
        args: [String(astRow.id)],
      });
      if (defAtf.rows.length > 0) {
        fmtRow = defAtf.rows[0];
      }
    }

    const fmtId = fmtRow ? String(fmtRow.id) : undefined;
    const fmtCode = fmtRow ? String(fmtRow.code) : undefined;
    const fmtName = fmtRow ? String(fmtRow.name) : undefined;
    const delivMethod = fmtRow ? String(fmtRow.delivery_method) : undefined;

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
      assistanceFormatId: fmtId,
      assistanceFormatCode: fmtCode,
      assistanceFormatName: fmtName,
      deliveryMethod: delivMethod,
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
        assistanceFormatId: fmtId,
        assistanceFormatCode: fmtCode,
        assistanceFormatName: fmtName,
        deliveryMethod: delivMethod,
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

    const isExistingAllowed = Boolean((input as any).allowExistingBeneficiary || (input as any).beneficiaryId);
    if (existingBeneficiary.rows.length > 0 && !isExistingAllowed) {
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
      assistanceTypeId: input.assistanceTypeId || (input as any).assistanceTypeCode,
      assistanceType: input.assistanceType || (input as any).assistanceTypeCode,
      assistanceFormatId: input.assistanceFormatId,
      assistanceFormatCode: input.assistanceFormatCode || input.assistanceFormat,
      assistanceFormat: input.assistanceFormat || input.assistanceFormatCode,
      requestedAmount: input.requestedAmount !== undefined ? input.requestedAmount : 3000,
      requireExplicitThreeTier: false,
    });

    // Category-specific duplicate assistance check (Phase 8)
    if (!(input as any).allowDuplicateOverride) {
      const dupResult = await this.checkDuplicateAssistanceRules({
        beneficiaryId: (input as any).beneficiaryId || (existingBeneficiary.rows[0]?.id as string),
        nationalId: cleanNationalId,
        assistanceTypeId: resolvedThreeTier.assistanceTypeId,
        assistanceTypeCode: resolvedThreeTier.assistanceTypeCode,
        assistanceTypeName: resolvedThreeTier.assistanceTypeName,
        fiscalYear: resolvedThreeTier.fiscalYear,
        requestDate: (input as any).requestDate || (input as any).appliedDate,
      });

      if (dupResult.hasDuplicate) {
        const err = new Error(`DUPLICATE_ASSISTANCE_VIOLATION: ${dupResult.message}`);
        (err as any).duplicateResult = dupResult;
        throw err;
      }
    }

    // Generate unique IDs
    const householdId = (input as any).householdId || `hh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const householdNo = (input as any).householdNo || `HH-2569-${Date.now().toString().slice(-4)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const beneficiaryId = existingBeneficiary.rows.length > 0 
      ? String(existingBeneficiary.rows[0].id) 
      : ((input as any).id || (input as any).beneficiaryId || `ben-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    
    // Generate strictly unique application number and ID
    const applicationNo = (input as any).applicationNo || await BeneficiaryService.generateUniqueApplicationNo(db);
    const applicationId = (input as any).applicationId || `app-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const initialStatus = input.status || 'submitted';

    // 3. Database Insertion (Only for new Beneficiary registration)
    if (existingBeneficiary.rows.length === 0) {
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

      // Insert primary Asnaf into beneficiary_asnaf relation table (Phase 4 & 12 requirement)
      const primaryAsnaf = input.asnafCategory || input.primaryGroupCode || 'faqir_miskin';
      await db.execute({
        sql: `INSERT OR IGNORE INTO beneficiary_asnaf (
          id, beneficiary_id, asnaf_code, is_primary, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, 1, 1, datetime('now'), datetime('now'))`,
        args: [`ba-${beneficiaryId}-${primaryAsnaf}-${Date.now()}`, beneficiaryId, primaryAsnaf],
      });
    }

    const reqStatus = initialStatus === 'draft' ? 'draft' : 'submitted';
    const fmtCode = String(resolvedThreeTier.assistanceFormatCode || '').toLowerCase();
    const payStatus = fmtCode === 'in_kind' ? 'not_applicable' : 'pending';
    const delivStatus = ['bank_transfer', 'cash', 'salary_direct'].includes(fmtCode) ? 'not_applicable' : 'pending';
    const folStatus = 'pending_schedule';
    const compStatus = 'active';

    // Insert Assistance Application (Section B, C & 3-Tier Fund Workflow & Multi-Lifecycle)
    await db.execute({
      sql: `INSERT INTO assistance_applications (
        id, application_no, beneficiary_id, asnaf_category, requested_amount,
        status, urgency_level, assigned_officer_id, assigned_officer_name, applied_date,
        branch_id, branch_name, hardship_reasons, assistance_type, assistance_type_id, assistance_group,
        primary_group_code, specific_fund_id, specific_fund_code, specific_fund_name, fiscal_year,
        assistance_format_id, assistance_format_code, assistance_format_name, delivery_method,
        assistance_type_details, necessity_details, evaluator_checklist,
        request_status, assessment_status, approval_status, payment_status, delivery_status, followup_status, completion_status, request_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        resolvedThreeTier.assistanceFormatId || null,
        resolvedThreeTier.assistanceFormatCode || null,
        resolvedThreeTier.assistanceFormatName || null,
        resolvedThreeTier.deliveryMethod || null,
        input.assistanceTypeDetails || input.requestedItemsDetail || '',
        input.necessityDetails || input.urgencyReason || '',
        input.checklist ? JSON.stringify(input.checklist) : (input.evaluatorChecklist ? JSON.stringify(input.evaluatorChecklist) : null),
        reqStatus,
        'pending',
        'pending',
        payStatus,
        delivStatus,
        folStatus,
        compStatus,
        appliedDateStr,
      ],
    });

    await BeneficiaryService.recordLifecycleTransition(db, {
      applicationId,
      stage: 'request',
      fromStatus: null,
      toStatus: reqStatus,
      action: reqStatus === 'draft' ? 'CREATE_DRAFT' : 'SUBMIT_REQUEST',
      actor,
      notes: `ยื่นคำร้องขอความช่วยเหลือวงเงิน ฿${Number(input.requestedAmount || 3000).toLocaleString()} (${resolvedThreeTier.assistanceTypeName})`,
      metadata: {
        assistanceTypeId: resolvedThreeTier.assistanceTypeId,
        assistanceFormatId: resolvedThreeTier.assistanceFormatId,
        primaryGroupCode: resolvedThreeTier.primaryGroupCode,
        specificFundId: resolvedThreeTier.specificFundId,
      },
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
   * Helper: Record Lifecycle Transition with complete audit trail (Phase 7)
   */
  static async recordLifecycleTransition(
    db: any,
    params: {
      applicationId: string;
      stage: 'request' | 'assessment' | 'approval' | 'payment' | 'delivery' | 'followup' | 'completion';
      fromStatus?: string | null;
      toStatus: string;
      action: string;
      actor: ActorContext;
      notes?: string;
      metadata?: Record<string, any>;
    }
  ) {
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const transId = `alt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const metadataStr = params.metadata ? JSON.stringify(params.metadata) : null;

    try {
      await db.execute({
        sql: `INSERT INTO assistance_lifecycle_transitions (
          id, application_id, stage, from_status, to_status, action,
          actor_id, actor_name, actor_role, notes, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          transId,
          params.applicationId,
          params.stage,
          params.fromStatus || null,
          params.toStatus,
          params.action,
          params.actor.id,
          params.actor.name,
          params.actor.role,
          params.notes || null,
          metadataStr,
        ],
      });
    } catch (e) {
      console.warn('Failed to insert into assistance_lifecycle_transitions:', e);
    }

    try {
      await db.execute({
        sql: `INSERT INTO application_history (id, application_id, status, timestamp, changed_by_id, changed_by_name, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `hist-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          params.applicationId,
          params.toStatus,
          timestampNow,
          params.actor.id,
          params.actor.name,
          `[${params.stage.toUpperCase()}] ${params.notes || params.action}`,
        ],
      });
    } catch {}

    try {
      await db.execute({
        sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          timestampNow,
          params.actor.id,
          params.actor.name,
          params.actor.role,
          `LIFECYCLE_${params.action}`,
          'assistance_application',
          params.applicationId,
          `[${params.stage}] เปลี่ยนสถานะเป็น "${params.toStatus}" โดย ${params.actor.name} (${params.notes || ''})`,
        ],
      });
    } catch {}
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
   * 3a. Start Field Assessment
   */
  static async startAssessment(applicationId: string, actor: ActorContext) {
    await initDb();
    const db = getDb();

    if (!['officer', 'super_admin'].includes(actor.role)) {
      throw new Error(`เฉพาะเจ้าหน้าที่ลงพื้นที่และผู้ดูแลระบบเท่านั้นที่มีสิทธิ์`);
    }

    const appRes = await db.execute({
      sql: 'SELECT id, application_no, request_status, assessment_status, completion_status FROM assistance_applications WHERE id = ?',
      args: [applicationId],
    });
    if (appRes.rows.length === 0) throw new Error(`ไม่พบคำร้องหมายเลข ${applicationId}`);
    const app = appRes.rows[0];

    if (String(app.completion_status || 'active') !== 'active') {
      throw new Error(`คำร้องนี้อยู่ในสถานะ ${app.completion_status} ไม่สามารถดำเนินการประเมินสิทธิ์ได้`);
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    await db.execute({
      sql: `UPDATE assistance_applications 
            SET status = 'assessment', assessment_status = 'in_assessment', updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?`,
      args: [applicationId],
    });

    await BeneficiaryService.recordLifecycleTransition(db, {
      applicationId,
      stage: 'assessment',
      fromStatus: String(app.assessment_status || 'pending'),
      toStatus: 'in_assessment',
      action: 'START_ASSESSMENT',
      actor,
      notes: 'เจ้าหน้าที่เริ่มลงพื้นที่สำรวจและประเมินสิทธิ์',
    });

    return { applicationId, assessmentStatus: 'in_assessment', status: 'assessment' };
  }

  /**
   * 3b. Submit Field Assessment & Living Score
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
      sql: 'SELECT id, application_no, status, specific_fund_id, primary_group_code, assistance_type_id, assistance_type, request_status, assessment_status, completion_status FROM assistance_applications WHERE id = ?',
      args: [applicationId],
    });

    if (appRes.rows.length === 0) {
      throw new Error(`ไม่พบคำร้องหมายเลข ${applicationId}`);
    }

    const app = appRes.rows[0];
    if (String(app.completion_status || 'active') !== 'active') {
      throw new Error(`คำร้องนี้อยู่ในสถานะ ${app.completion_status} ไม่สามารถบันทึกผลประเมินได้`);
    }

    // Auto-resolve specific fund and primary group from application data or Master Data relationship
    let autoSpecificFundId = assessment.recommendedSpecificFundId || (app.specific_fund_id ? String(app.specific_fund_id) : null);
    let autoFundId = assessment.recommendedFundId || (app.primary_group_code ? String(app.primary_group_code) : 'fund-1');

    if (!autoSpecificFundId && (app.assistance_type_id || app.assistance_type)) {
      const astRes = await db.execute({
        sql: 'SELECT specific_fund_id, primary_group_code FROM assistance_types WHERE id = ? OR code = ? OR name = ? LIMIT 1',
        args: [
          String(app.assistance_type_id || app.assistance_type),
          String(app.assistance_type_id || app.assistance_type),
          String(app.assistance_type || app.assistance_type_id),
        ],
      });
      if (astRes.rows.length > 0 && astRes.rows[0].specific_fund_id) {
        autoSpecificFundId = String(astRes.rows[0].specific_fund_id);
        if (astRes.rows[0].primary_group_code && !autoFundId) {
          autoFundId = String(astRes.rows[0].primary_group_code);
        }
      }
    }

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
        autoFundId,
        autoSpecificFundId || null,
        assessment.generalNotes || '',
      ],
    });

    // Advance status to pending_approval and assessment_status to completed
    await db.execute({
      sql: `UPDATE assistance_applications 
            SET status = 'pending_approval', 
                assessment_status = 'completed',
                assessment_date = ?,
                assessed_by_id = ?,
                assessed_by_name = ?,
                ${!app.specific_fund_id && autoSpecificFundId ? 'specific_fund_id = ?, ' : ''}
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?`,
      args: !app.specific_fund_id && autoSpecificFundId
        ? [timestampNow, actor.id, actor.name, autoSpecificFundId, applicationId]
        : [timestampNow, actor.id, actor.name, applicationId],
    });

    // Record Lifecycle Transition
    await BeneficiaryService.recordLifecycleTransition(db, {
      applicationId,
      stage: 'assessment',
      fromStatus: String(app.assessment_status || 'pending'),
      toStatus: 'completed',
      action: 'COMPLETE_ASSESSMENT',
      actor,
      notes: `บันทึกผลการลงพื้นที่ คะแนนความจำเป็น ${assessment.livingScore}/100 และเสนอวงเงิน ฿${assessment.recommendedAmount.toLocaleString()}`,
      metadata: { livingScore: assessment.livingScore, recommendedAmount: assessment.recommendedAmount },
    });

    return { applicationId, status: 'pending_approval', assessmentStatus: 'completed', assessmentId };
  }

  /**
   * 3c. Reject Assessment (Field inspection fails eligibility criteria)
   */
  static async rejectAssessment(applicationId: string, reason: string, actor: ActorContext) {
    await initDb();
    const db = getDb();

    if (!['officer', 'super_admin'].includes(actor.role)) {
      throw new Error(`เฉพาะเจ้าหน้าที่ลงพื้นที่และผู้ดูแลระบบเท่านั้นที่มีสิทธิ์ปฏิเสธการประเมิน`);
    }

    const appRes = await db.execute({
      sql: 'SELECT id, application_no, assessment_status, completion_status FROM assistance_applications WHERE id = ?',
      args: [applicationId],
    });
    if (appRes.rows.length === 0) throw new Error(`ไม่พบคำร้องหมายเลข ${applicationId}`);
    const app = appRes.rows[0];

    if (String(app.completion_status || 'active') !== 'active') {
      throw new Error(`คำร้องนี้อยู่ในสถานะ ${app.completion_status} ไม่สามารถดำเนินการได้`);
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    await db.execute({
      sql: `UPDATE assistance_applications
            SET status = 'rejected',
                assessment_status = 'rejected',
                approval_status = 'rejected',
                payment_status = 'not_applicable',
                delivery_status = 'not_applicable',
                followup_status = 'not_required',
                completion_status = 'terminated',
                rejection_reason = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [reason, applicationId],
    });

    await BeneficiaryService.recordLifecycleTransition(db, {
      applicationId,
      stage: 'assessment',
      fromStatus: String(app.assessment_status || 'pending'),
      toStatus: 'rejected',
      action: 'REJECT_ASSESSMENT',
      actor,
      notes: `ผลการประเมินสิทธิ์ไม่ผ่านเกณฑ์: ${reason}`,
    });

    return { applicationId, assessmentStatus: 'rejected', completionStatus: 'terminated', status: 'rejected' };
  }

  /**
   * Phase 10: Check Fund Solvency before Approval (Live 3-Tier Multi-Fund Pre-Check)
   */
  static async checkFundSolvencyForApproval(params: {
    applicationId: string;
    approvedAmount: number;
    fundId?: string;
    specificFundId?: string;
  }): Promise<FundSolvencyCheckResult> {
    await initDb();
    const db = getDb();

    const appRes = await db.execute({
      sql: `SELECT a.id, a.application_no, a.requested_amount, a.approved_amount, a.specific_fund_id,
                   a.primary_group_code, a.asnaf_category, a.assistance_type, a.assistance_type_id, a.assistance_format_id,
                   a.assistance_format_code, a.delivery_method, a.fiscal_year,
                   ass.recommended_fund_id, ass.recommended_specific_fund_id
            FROM assistance_applications a
            LEFT JOIN beneficiary_assessments ass ON ass.application_id = a.id
            WHERE a.id = ?`,
      args: [params.applicationId],
    });

    if (appRes.rows.length === 0) {
      throw new Error(`ไม่พบคำร้อง ${params.applicationId}`);
    }

    const app = appRes.rows[0];
    const fiscalYear = String(app.fiscal_year || '2569');

    // Strict Assistance Type-driven Sub-Fund Resolution
    const asnafRaw = String(app.asnaf_category || 'faqir_miskin');
    const assistanceTypeStr = String(app.assistance_type || '');
    const assistanceTypeIdStr = app.assistance_type_id ? String(app.assistance_type_id) : undefined;

    const subKey = matchCanonicalSubKey(assistanceTypeStr, assistanceTypeIdStr, undefined, asnafRaw);
    let targetSpecificFundId = params.specificFundId;

    if (!targetSpecificFundId && subKey && CANONICAL_SUB_FUNDS[subKey]) {
      targetSpecificFundId = CANONICAL_SUB_FUNDS[subKey].id;
    }
    if (!targetSpecificFundId) {
      targetSpecificFundId =
        (app.recommended_specific_fund_id ? String(app.recommended_specific_fund_id) : undefined) ||
        (app.specific_fund_id ? String(app.specific_fund_id) : undefined);
    }

    if (!targetSpecificFundId) {
      throw new Error(UNMAPPED_FUND_WARNING);
    }

    const sfRes = await db.execute({
      sql: 'SELECT id, fund_code, code, name, primary_group_code, fund_account_id, is_active, remaining_amount, committed_amount, allocated_amount FROM faqir_miskin_sub_funds WHERE id = ? OR code = ? OR fund_code = ? LIMIT 1',
      args: [targetSpecificFundId, targetSpecificFundId, targetSpecificFundId],
    });

    if (sfRes.rows.length === 0) {
      throw new Error(`ไม่พบข้อมูลกองทุนเฉพาะเจาะจงรหัส ${targetSpecificFundId}`);
    }

    const sf = sfRes.rows[0];
    const primaryGroupCode = String(sf.primary_group_code || app.primary_group_code || 'faqir_miskin');
    const mainCode = matchCanonicalMainFundCode(asnafRaw, subKey);
    let targetFundAccountId = params.fundId || String(sf.fund_account_id || '');
    if (!targetFundAccountId && mainCode && CANONICAL_MAIN_FUNDS[mainCode]) {
      targetFundAccountId = CANONICAL_MAIN_FUNDS[mainCode].id;
    }
    if (!targetFundAccountId) targetFundAccountId = 'fund-1';

    const fundRes = await db.execute({
      sql: 'SELECT id, code, name, available_amount, committed_amount FROM fund_accounts WHERE id = ?',
      args: [targetFundAccountId],
    });

    if (fundRes.rows.length === 0) {
      throw new Error(`ไม่พบบัญชีกองทุนรหัส ${targetFundAccountId}`);
    }

    const fund = fundRes.rows[0];
    const availableAmount = Number(fund.available_amount || 0);

    // Live specific fund metrics
    let sfRemaining = Number(sf.remaining_amount || 0);
    let sfAllocated = Number(sf.allocated_amount || 0);
    let sfDisbursed = Number(sf.disbursed_amount || 0);
    let sfCommitted = Number(sf.committed_amount || 0);

    try {
      const sfList = await FinancialService.getSpecificFunds({
        fiscalYear,
        primaryGroupCode,
        status: 'all',
      });
      const liveSf = sfList.find((s) => s.id === targetSpecificFundId || s.code === sf.code || s.fundCode === sf.fund_code);
      if (liveSf) {
        sfRemaining = Number(liveSf.remainingAmount ?? sfRemaining);
        sfAllocated = Number(liveSf.allocatedAmount ?? sfAllocated);
        sfDisbursed = Number(liveSf.disbursedAmount ?? sfDisbursed);
        sfCommitted = Number(liveSf.committedAmount ?? sfCommitted);
      }
    } catch {}

    // Asnaf Allocation
    const asnafRes = await db.execute({
      sql: 'SELECT asnaf_code, asnaf_name, remaining_amount, committed_amount FROM asnaf_allocations WHERE asnaf_code = ? AND fiscal_year = ? LIMIT 1',
      args: [primaryGroupCode, fiscalYear],
    });
    const asnafAlloc = asnafRes.rows.length > 0 ? asnafRes.rows[0] : null;

    // Chart of accounts preview
    const { debitAcc, creditAcc } = getChartOfAccountsForDisbursement({
      asnafCode: primaryGroupCode,
      formatId: app.assistance_format_id ? String(app.assistance_format_id) : undefined,
      formatCode: app.assistance_format_code ? String(app.assistance_format_code) : undefined,
      deliveryMethod: app.delivery_method ? String(app.delivery_method) : undefined,
    });

    let isSolvent = true;
    let reason = '';

    if (Number(sf.is_active ?? 1) === 0) {
      isSolvent = false;
      reason = `กองทุนเฉพาะเจาะจง "${sf.name}" ถูกปิดใช้งาน ไม่สามารถจัดสรรงบประมาณได้`;
    } else if (availableAmount < params.approvedAmount) {
      isSolvent = false;
      reason = `ยอดเงินคงเหลือจัดสรรได้ในบัญชีกองทุน "${fund.name}" ไม่เพียงพอ (คงเหลือ: ฿${availableAmount.toLocaleString()} บาท, ยอดที่ขออนุมัติ: ฿${params.approvedAmount.toLocaleString()} บาท, ขาดอีก: ฿${(params.approvedAmount - availableAmount).toLocaleString()} บาท)`;
    } else if (sfRemaining < params.approvedAmount) {
      isSolvent = false;
      reason = `ยอดงบประมาณคงเหลือในกองทุนเฉพาะเจาะจง "${sf.name}" (${sf.fund_code || sf.code}) ไม่เพียงพอ (คงเหลือจัดสรรได้: ฿${sfRemaining.toLocaleString()} บาท, ยอดที่ขออนุมัติ: ฿${params.approvedAmount.toLocaleString()} บาท, ขาดอีก: ฿${(params.approvedAmount - sfRemaining).toLocaleString()} บาท)`;
    }

    return {
      isSolvent,
      applicationId: String(app.id),
      approvedAmount: params.approvedAmount,
      fundAccount: {
        id: String(fund.id),
        code: String(fund.code || ''),
        name: String(fund.name),
        availableAmount,
        committedAmount: Number(fund.committed_amount || 0),
      },
      specificSubFund: {
        id: String(sf.id),
        code: String(sf.code || sf.fund_code || ''),
        name: String(sf.name),
        allocatedAmount: sfAllocated,
        disbursedAmount: sfDisbursed,
        remainingAmount: sfRemaining,
        committedAmount: Number(sf.committed_amount || 0),
      },
      asnafAllocation: asnafAlloc ? {
        asnafCode: String(asnafAlloc.asnaf_code),
        asnafName: String(asnafAlloc.asnaf_name),
        remainingAmount: Number(asnafAlloc.remaining_amount || 0),
      } : undefined,
      chartOfAccountsPreview: {
        debit: {
          code: debitAcc.code,
          name: debitAcc.name,
          category: debitAcc.category,
          amount: params.approvedAmount,
        },
        credit: {
          code: creditAcc.code,
          name: creditAcc.name,
          category: creditAcc.category,
          amount: params.approvedAmount,
        },
      },
      reason: isSolvent ? undefined : reason,
    };
  }

  /**
   * 4. Approve Application (Segregation of Duties & Fund Solvency Check)
   */
  static async approveApplication(
    applicationId: string,
    approvedAmount: number,
    fundId?: string,
    notes?: string,
    actor?: ActorContext,
    specificFundId?: string
  ) {
    await initDb();
    const db = getDb();

    const currentActor = actor || {
      id: 'u-1',
      name: 'เจ้าหน้าที่ผู้พิจารณาอนุมัติ',
      role: 'approver',
    };

    // 1. Check Role Authorization
    if (!['approver', 'executive', 'super_admin'].includes(currentActor.role)) {
      throw new Error(`บทบาท "${currentActor.role}" ไม่มีสิทธิ์พิจารณาอนุมัติคำร้องขอรับซะกาต`);
    }

    // 2. Fetch Application & Assessment details
    let appRes = await db.execute({
      sql: `SELECT a.id, a.application_no, a.assigned_officer_id, a.status, a.beneficiary_id,
                   a.specific_fund_id, a.primary_group_code, a.asnaf_category, a.assistance_type, a.assistance_type_id, a.fiscal_year,
                   a.request_status, a.assessment_status, a.approval_status, a.delivery_method, a.completion_status,
                   ass.recommended_fund_id, ass.recommended_specific_fund_id
            FROM assistance_applications a
            LEFT JOIN beneficiary_assessments ass ON ass.application_id = a.id
            WHERE a.id = ?`,
      args: [applicationId],
    });

    if (appRes.rows.length === 0) {
      try {
        const { ensureApplicationInSqlite } = await import('@/lib/syncAssistanceRequest');
        const synced = await ensureApplicationInSqlite(applicationId);
        if (synced) {
          appRes = await db.execute({
            sql: `SELECT a.id, a.application_no, a.assigned_officer_id, a.status, a.beneficiary_id,
                         a.specific_fund_id, a.primary_group_code, a.asnaf_category, a.assistance_type, a.assistance_type_id, a.fiscal_year,
                         a.request_status, a.assessment_status, a.approval_status, a.delivery_method, a.completion_status,
                         ass.recommended_fund_id, ass.recommended_specific_fund_id
                  FROM assistance_applications a
                  LEFT JOIN beneficiary_assessments ass ON ass.application_id = a.id
                  WHERE a.id = ?`,
            args: [applicationId],
          });
        }
      } catch {}
    }

    if (appRes.rows.length === 0) {
      throw new Error(`ไม่พบคำร้อง ${applicationId}`);
    }

    const app = appRes.rows[0];

    // SEGREGATION OF DUTIES ENFORCEMENT:
    // Assigned Help Officer CANNOT approve their own application!
    if (app.assigned_officer_id === currentActor.id && currentActor.role !== 'super_admin') {
      throw new Error(
        `การละเมิดหลักการแบ่งแยกหน้าที่ (Segregation of Duties): เจ้าหน้าที่ผู้รับผิดชอบคำร้อง (${currentActor.name}) ไม่มีสิทธิ์อนุมัติคำร้องของตนเอง`
      );
    }

    // Strict Workflow Check (Phase 7): Must be assessed before approval!
    const asmStatus = String(app.assessment_status || '');
    if (asmStatus !== 'completed') {
      throw new Error(
        `CANNOT_APPROVE_UNASSESSED: คำร้องนี้ยังไม่ผ่านการประเมินสิทธิ์ (Assessment Status ต้องเป็น completed เท่านั้น ปัจจุบัน: "${asmStatus || 'pending'}")`
      );
    }

    if (String(app.completion_status || 'active') !== 'active') {
      throw new Error(`CANNOT_APPROVE_TERMINATED: คำร้องนี้อยู่ในสถานะ ${app.completion_status} ไม่สามารถอนุมัติได้`);
    }

    if (String(app.approval_status || 'pending') === 'approved') {
      throw new Error(`ALREADY_APPROVED: คำร้องนี้ได้รับการอนุมัติเรียบร้อยแล้ว ห้ามอนุมัติซ้ำ`);
    }

    // State Check: Must be in pending_approval (or pre-approval states)
    if (!['pending_approval', 'doc_review', 'assessment', 'submitted'].includes(String(app.status))) {
      throw new Error(`คำร้องนี้อยู่ในสถานะ "${app.status}" ไม่สามารถอนุมัติได้ (ต้องอยู่ในสถานะรออนุมัติเท่านั้น)`);
    }

    const fiscalYear = String(app.fiscal_year || '2569');

    // 3. Resolve Target Specific Fund (Level 2) strictly by assistance type
    const asnafRaw = String(app.asnaf_category || 'faqir_miskin');
    const assistanceTypeStr = String(app.assistance_type || '');
    const assistanceTypeIdStr = app.assistance_type_id ? String(app.assistance_type_id) : undefined;

    const subKey = matchCanonicalSubKey(assistanceTypeStr, assistanceTypeIdStr, undefined, asnafRaw);
    let targetSpecificFundId = specificFundId;

    if (!targetSpecificFundId && subKey && CANONICAL_SUB_FUNDS[subKey]) {
      targetSpecificFundId = CANONICAL_SUB_FUNDS[subKey].id;
    }
    if (!targetSpecificFundId) {
      targetSpecificFundId =
        (app.recommended_specific_fund_id ? String(app.recommended_specific_fund_id) : undefined) ||
        (app.specific_fund_id ? String(app.specific_fund_id) : undefined);
    }

    if (!targetSpecificFundId) {
      throw new Error(UNMAPPED_FUND_WARNING);
    }

    const sfRes = await db.execute({
      sql: 'SELECT id, fund_code, code, name, primary_group_code, fund_account_id, is_active FROM faqir_miskin_sub_funds WHERE id = ? OR code = ? OR fund_code = ? LIMIT 1',
      args: [targetSpecificFundId, targetSpecificFundId, targetSpecificFundId],
    });

    if (sfRes.rows.length === 0) {
      throw new Error(`ไม่พบข้อมูลกองทุนเฉพาะเจาะจงรหัส ${targetSpecificFundId}`);
    }

    const sf = sfRes.rows[0];
    const primaryGroupCode = String(sf.primary_group_code || app.primary_group_code || 'faqir_miskin');
    const mainCode = matchCanonicalMainFundCode(asnafRaw, subKey);
    let targetFundAccountId = fundId || String(sf.fund_account_id || '');
    if (!targetFundAccountId && mainCode && CANONICAL_MAIN_FUNDS[mainCode]) {
      targetFundAccountId = CANONICAL_MAIN_FUNDS[mainCode].id;
    }
    if (!targetFundAccountId) targetFundAccountId = 'fund-1';

    // 4. SOLVENCY CHECKS ACROSS 3 TIERS (Phase 10: Strict sub-fund balance validation)
    const solvency = await BeneficiaryService.checkFundSolvencyForApproval({
      applicationId,
      approvedAmount,
      fundId: targetFundAccountId,
      specificFundId: targetSpecificFundId,
    });

    if (!solvency.isSolvent) {
      throw new Error(`INSUFFICIENT_SUB_FUND_BALANCE: ${solvency.reason}`);
    }

    const fund = solvency.fundAccount;
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const approvedDateStr = new Date().toLocaleDateString('th-TH');

    // 5. Atomic Multi-Tier Commitment Updates (Fund Balance Hold)
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
      args: [approvedAmount, approvedAmount, sf.id],
    });

    // C) Primary Asnaf Allocation (asnaf_allocations)
    await db.execute({
      sql: `UPDATE asnaf_allocations
            SET committed_amount = committed_amount + ?, remaining_amount = MAX(0, remaining_amount - ?)
            WHERE asnaf_code = ? AND fiscal_year = ?`,
      args: [approvedAmount, approvedAmount, primaryGroupCode, fiscalYear],
    });

    // D) Assistance Applications (Multi-Lifecycle Update)
    await db.execute({
      sql: `UPDATE assistance_applications
            SET status = 'wait_disbursement',
                approval_status = 'approved',
                payment_status = CASE 
                  WHEN assistance_format_code = 'in_kind' OR delivery_method = 'in_kind' THEN 'not_applicable' 
                  ELSE 'wait_disbursement' 
                END,
                delivery_status = CASE 
                  WHEN assistance_format_code IN ('cash', 'bank_transfer', 'salary_direct') OR delivery_method IN ('cash', 'bank_transfer') THEN 'not_applicable' 
                  ELSE 'pending' 
                END,
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
        sf.id ? String(sf.id) : null,
        sf.id ? String(sf.id) : null,
        currentActor.id,
        currentActor.name,
        approvedDateStr,
        notes || 'อนุมัติวงเงินช่วยเหลือ',
        applicationId,
      ],
    });

    // E) Record Lifecycle Transition (Hold balance metadata)
    await BeneficiaryService.recordLifecycleTransition(db, {
      applicationId,
      stage: 'approval',
      fromStatus: String(app.approval_status || 'pending'),
      toStatus: 'approved',
      action: 'APPROVE_REQUEST',
      actor: currentActor,
      notes: `อนุมัติวงเงิน ฿${approvedAmount.toLocaleString()} บาท จาก "${fund.name}" -> กองทุน "${sf.name}" (${notes || 'อนุมัติ'}) และจองงบประมาณ (Fund Hold) ส่งต่อฝ่ายการเงิน`,
      metadata: { 
        approvedAmount, 
        fundId: targetFundAccountId, 
        specificFundId: sf.id,
        action: 'HOLD_FUND_BALANCE',
        chartOfAccounts: solvency.chartOfAccountsPreview
      },
    });

    return {
      applicationId,
      status: 'wait_disbursement',
      approvalStatus: 'approved',
      approvedAmount,
      fundName: String(fund.name),
      specificFundId: targetSpecificFundId,
      specificFundName: String(sf.name),
    };
  }

  /**
   * 5. Reject Application (Phase 10: Releases held funds if previously approved)
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
      sql: `SELECT id, application_no, assigned_officer_id, status, approval_status, completion_status,
                   approved_amount, approved_fund_id, approved_specific_fund_id, specific_fund_id,
                   primary_group_code, fiscal_year
            FROM assistance_applications WHERE id = ?`,
      args: [applicationId],
    });

    if (appRes.rows.length === 0) {
      throw new Error(`ไม่พบคำร้อง ${applicationId}`);
    }

    const app = appRes.rows[0];
    if (app.assigned_officer_id === actor.id && actor.role !== 'super_admin') {
      throw new Error(`เจ้าหน้าที่ผู้รับผิดชอบคำร้องไม่สามารถพิจารณาคำร้องของตนเองได้`);
    }

    const wasApproved = String(app.approval_status || '') === 'approved' ||
      ['approved', 'wait_disbursement'].includes(String(app.status || ''));
    const approvedAmount = Number(app.approved_amount || 0);

    // Release held funds if the request was approved
    if (wasApproved && approvedAmount > 0) {
      const targetFundId = app.approved_fund_id ? String(app.approved_fund_id) : 'fund-1';
      const targetSubFundId = app.approved_specific_fund_id ? String(app.approved_specific_fund_id) : (app.specific_fund_id ? String(app.specific_fund_id) : 'subf-1');
      const primaryGroupCode = String(app.primary_group_code || 'faqir_miskin');
      const fiscalYear = String(app.fiscal_year || '2569');

      await db.execute({
        sql: `UPDATE fund_accounts 
              SET committed_amount = MAX(0, committed_amount - ?), 
                  available_amount = available_amount + ?, 
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [approvedAmount, approvedAmount, targetFundId],
      });

      await db.execute({
        sql: `UPDATE faqir_miskin_sub_funds
              SET committed_amount = MAX(0, committed_amount - ?), 
                  remaining_amount = remaining_amount + ?, 
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ? OR code = ?`,
        args: [approvedAmount, approvedAmount, targetSubFundId, targetSubFundId],
      });

      await db.execute({
        sql: `UPDATE asnaf_allocations
              SET committed_amount = MAX(0, committed_amount - ?), 
                  remaining_amount = remaining_amount + ?
              WHERE asnaf_code = ? AND fiscal_year = ?`,
        args: [approvedAmount, approvedAmount, primaryGroupCode, fiscalYear],
      });

      await BeneficiaryService.recordLifecycleTransition(db, {
        applicationId,
        stage: 'approval',
        fromStatus: 'approved',
        toStatus: 'rejected',
        action: 'RELEASE_FUND_HOLD',
        actor,
        notes: `ปลดการจองงบประมาณ ฿${approvedAmount.toLocaleString()} บาท คืนสู่กองทุนเนื่องจากไม่อนุมัติคำร้อง`,
        metadata: { releasedAmount: approvedAmount, fundId: targetFundId, subFundId: targetSubFundId },
      });
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    await db.execute({
      sql: `UPDATE assistance_applications
            SET status = 'rejected',
                approval_status = 'rejected',
                completion_status = 'terminated',
                payment_status = 'not_applicable',
                delivery_status = 'not_applicable',
                followup_status = 'not_required',
                rejection_reason = ?,
                approval_notes = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [reason, reason, applicationId],
    });

    await BeneficiaryService.recordLifecycleTransition(db, {
      applicationId,
      stage: 'approval',
      fromStatus: String(app.approval_status || 'pending'),
      toStatus: 'rejected',
      action: 'REJECT_REQUEST',
      actor,
      notes: `ไม่อนุมัติคำร้อง: ${reason}`,
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

    // 2. Fetch Application & Assessment for Fund linkage (Multi-Lifecycle)
    const appRes = await db.execute({
      sql: `SELECT a.id, a.application_no, a.approved_amount, a.requested_amount, a.status,
                   a.approved_by_id, a.approved_by_name, a.beneficiary_id,
                   a.approved_fund_id, a.approved_specific_fund_id, a.specific_fund_id,
                   a.primary_group_code, a.asnaf_category, a.assistance_type_id, a.assistance_type,
                   a.request_status, a.assessment_status, a.approval_status, a.payment_status,
                   a.delivery_status, a.delivery_method, a.completion_status,
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

    // Strict Multi-Lifecycle checks (Phase 7)
    const aprStatus = String(app.approval_status || '');
    if (aprStatus !== 'approved') {
      throw new Error(`CANNOT_DISBURSE_UNAPPROVED: คำร้องนี้ยังไม่ได้รับการอนุมัติ (Approval Status ต้องเป็น approved เท่านั้น ปัจจุบัน: "${aprStatus || 'pending'}")`);
    }

    const currentPayStatus = String(app.payment_status || '');
    if (currentPayStatus === 'paid') {
      throw new Error(`ALREADY_PAID: คำร้องนี้บันทึกจ่ายเงินเรียบร้อยแล้ว ห้ามจ่ายซ้ำ`);
    }

    if (currentPayStatus === 'not_applicable') {
      throw new Error(`PAYMENT_NOT_APPLICABLE: รูปแบบความช่วยเหลือนี้ไม่ใช่การจ่ายเงิน`);
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
      sql: 'SELECT id, fund_code, code, name, primary_group_code, fund_account_id FROM faqir_miskin_sub_funds WHERE id = ? OR code = ? OR fund_code = ? LIMIT 1',
      args: [targetSpecificFundId, targetSpecificFundId, targetSpecificFundId],
    });
    const sf = sfRes.rows.length > 0 ? sfRes.rows[0] : null;
    const actualSpecificFundId = sf ? String(sf.id) : targetSpecificFundId;

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
      args: [amount, amount, actualSpecificFundId],
    });

    // C) Primary Asnaf Allocations (asnaf_allocations)
    await db.execute({
      sql: `UPDATE asnaf_allocations
            SET committed_amount = MAX(0, committed_amount - ?),
                disbursed_amount = disbursed_amount + ?
            WHERE asnaf_code = ? AND fiscal_year = ?`,
      args: [amount, amount, primaryGroupCode, fiscalYear],
    });

    // D) Financial Transactions & General Ledger Double-Entry (Phase 10)
    const txnNo = `TXN-DISB-2569-${Date.now().toString().slice(-5)}`;
    const journalNo = `JV-${fiscalYear}-${Date.now().toString().slice(-6)}`;
    const sfCode = sf?.code ? String(sf.code) : 'living';
    const astId = app.assistance_type_id ? String(app.assistance_type_id) : null;
    const fmtId = app.assistance_format_id ? String(app.assistance_format_id) : 'fmt-bank-transfer';
    const txnId = `txn-${Date.now()}`;

    // Resolve Chart of Accounts: Debit Zakat Expense by Asnaf, Credit Asset/Liability by Format
    const { debitAcc, creditAcc } = getChartOfAccountsForDisbursement({
      asnafCode: primaryGroupCode,
      formatId: fmtId,
      formatCode: app.assistance_format_code ? String(app.assistance_format_code) : undefined,
      deliveryMethod: app.delivery_method ? String(app.delivery_method) : undefined,
    });

    // 1) General Ledger Entry - DEBIT: Zakat Expense
    await db.execute({
      sql: `INSERT INTO general_ledger_entries (
        id, journal_no, transaction_id, application_id, beneficiary_id, entry_date,
        account_code, account_name, account_category, entry_type, amount, currency,
        asnaf_code, assistance_type_id, assistance_format_id, description, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `gl-deb-${Date.now()}-1`,
        journalNo,
        txnId,
        applicationId,
        String(app.beneficiary_id),
        timestampNow,
        debitAcc.code,
        debitAcc.name,
        'expense',
        'debit',
        amount,
        'THB',
        primaryGroupCode,
        astId,
        fmtId,
        `จ่ายเงินสวัสดิการซะกาต (${app.application_no} - ${sf?.name || 'กองทุนเฉพาะเจาะจง'})`,
        actor.name,
      ],
    });

    // 2) General Ledger Entry - CREDIT: Asset / Liability
    await db.execute({
      sql: `INSERT INTO general_ledger_entries (
        id, journal_no, transaction_id, application_id, beneficiary_id, entry_date,
        account_code, account_name, account_category, entry_type, amount, currency,
        asnaf_code, assistance_type_id, assistance_format_id, description, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `gl-crd-${Date.now()}-2`,
        journalNo,
        txnId,
        applicationId,
        String(app.beneficiary_id),
        timestampNow,
        creditAcc.code,
        creditAcc.name,
        creditAcc.category,
        'credit',
        amount,
        'THB',
        primaryGroupCode,
        astId,
        fmtId,
        `จ่ายเงินสวัสดิการซะกาต (${app.application_no} - ตัดจ่ายผ่าน ${creditAcc.name})`,
        actor.name,
      ],
    });

    // 3) Record Financial Transaction with Journal Link
    await db.execute({
      sql: `INSERT INTO financial_transactions (
        id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
        payer_or_payee, reference_no, slip_url, status, recorded_by_id, recorded_by_name, notes,
        specific_fund_id, sub_fund_category, asnaf_category, assistance_type_id, application_id, beneficiary_id, zakat_year,
        journal_no, assistance_format_code, delivery_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        txnId,
        txnNo,
        timestampNow,
        'disbursement',
        targetFundId,
        fundName,
        `จ่ายเงินสวัสดิการผู้รับซะกาต (${app.application_no} - ${sf?.name || 'กองทุนเฉพาะเจาะจง'})`,
        amount,
        app.delivery_method || 'bank_transfer',
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
        journalNo,
        fmtId,
        app.delivery_method || 'bank_transfer',
      ],
    });

    // E) Update Application to 'disbursed' and set payment_status to 'paid' with journal_no
    await db.execute({
      sql: `UPDATE assistance_applications 
            SET status = 'disbursed',
                payment_status = 'paid',
                journal_no = ?,
                delivery_status = CASE 
                  WHEN delivery_method IN ('bank_transfer', 'cash') OR assistance_format_code IN ('bank_transfer', 'cash', 'salary_direct') THEN 'delivered'
                  ELSE delivery_status 
                END,
                delivery_date = CASE 
                  WHEN delivery_method IN ('bank_transfer', 'cash') OR assistance_format_code IN ('bank_transfer', 'cash', 'salary_direct') THEN ?
                  ELSE delivery_date 
                END,
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
        journalNo,
        disbursementDateStr,
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

    // F) Record Lifecycle Transition
    await BeneficiaryService.recordLifecycleTransition(db, {
      applicationId,
      stage: 'payment',
      fromStatus: String(app.payment_status || 'wait_disbursement'),
      toStatus: 'paid',
      action: 'DISBURSE_PAYMENT',
      actor,
      notes: `ฝ่ายการเงินจ่ายเงินจำนวน ฿${amount.toLocaleString()} บาท เรียบร้อย ใบสำคัญ ${journalNo} เลขอ้างอิง ${cleanPaymentRef}`,
      metadata: { 
        amount, 
        paymentRef: cleanPaymentRef, 
        transactionNo: txnNo, 
        journalNo, 
        debitAccount: debitAcc.code, 
        creditAccount: creditAcc.code 
      },
    });

    return { 
      applicationId, 
      status: 'disbursed', 
      paymentStatus: 'paid', 
      amount, 
      transactionNo: txnNo, 
      journalNo,
      debitAccount: debitAcc.code,
      creditAccount: creditAcc.code 
    };
  }

  /**
   * Phase 10: Get Financial Ledger Details & Journal Entries for Application
   */
  static async getFinancialLedgerDetails(applicationId: string): Promise<FinancialLedgerDetails> {
    await initDb();
    const db = getDb();

    let appRes = await db.execute({
      sql: `SELECT a.id, a.application_no, a.beneficiary_id, b.full_name as beneficiary_name,
                   a.approved_amount, a.disbursed_amount, a.status, a.journal_no,
                   fa.name as fund_name, sf.name as specific_sub_fund_name
            FROM assistance_applications a
            LEFT JOIN beneficiaries b ON b.id = a.beneficiary_id
            LEFT JOIN fund_accounts fa ON fa.id = a.approved_fund_id
            LEFT JOIN faqir_miskin_sub_funds sf ON sf.id = a.approved_specific_fund_id OR sf.id = a.specific_fund_id
            WHERE a.id = ?`,
      args: [applicationId],
    });

    if (appRes.rows.length === 0) {
      try {
        const { ensureApplicationInSqlite } = await import('@/lib/syncAssistanceRequest');
        const synced = await ensureApplicationInSqlite(applicationId);
        if (synced) {
          appRes = await db.execute({
            sql: `SELECT a.id, a.application_no, a.beneficiary_id, b.full_name as beneficiary_name,
                         a.approved_amount, a.disbursed_amount, a.status, a.journal_no,
                         fa.name as fund_name, sf.name as specific_sub_fund_name
                  FROM assistance_applications a
                  LEFT JOIN beneficiaries b ON b.id = a.beneficiary_id
                  LEFT JOIN fund_accounts fa ON fa.id = a.approved_fund_id
                  LEFT JOIN faqir_miskin_sub_funds sf ON sf.id = a.approved_specific_fund_id OR sf.id = a.specific_fund_id
                  WHERE a.id = ?`,
            args: [applicationId],
          });
        }
      } catch {}
    }

    if (appRes.rows.length === 0) {
      throw new Error(`ไม่พบคำร้อง ${applicationId}`);
    }

    const app = appRes.rows[0];

    const glRes = await db.execute({
      sql: `SELECT id, journal_no as journalNo, transaction_id as transactionId,
                   application_id as applicationId, beneficiary_id as beneficiaryId,
                   entry_date as entryDate, account_code as accountCode, account_name as accountName,
                   account_category as accountCategory, entry_type as entryType, amount, currency,
                   asnaf_code as asnafCode, assistance_type_id as assistanceTypeId,
                   assistance_format_id as assistanceFormatId, description, created_by as createdBy,
                   created_at as createdAt
            FROM general_ledger_entries
            WHERE application_id = ?
            ORDER BY created_at ASC, entry_type DESC`,
      args: [applicationId],
    });

    const txRes = await db.execute({
      sql: `SELECT id, transaction_no as transactionNo, date, type, fund_id as fundId,
                   fund_name as fundName, category, amount, payment_method as paymentMethod,
                   payer_or_payee as payerOrPayee, reference_no as referenceNo,
                   slip_url as slipUrl, status, recorded_by_name as recordedBy,
                   notes, journal_no as journalNo, assistance_format_code as assistanceFormatCode
            FROM financial_transactions
            WHERE application_id = ?
            ORDER BY created_at DESC`,
      args: [applicationId],
    });

    const holdHistoryRes = await db.execute({
      sql: `SELECT id, stage, from_status as fromStatus, to_status as toStatus,
                   action, actor_name as actorName, actor_role as actorRole, notes,
                   metadata, created_at as createdAt
            FROM assistance_lifecycle_transitions
            WHERE application_id = ? AND action IN ('HOLD_FUND_BALANCE', 'RELEASE_FUND_HOLD', 'APPROVE', 'APPROVE_REQUEST', 'DISBURSE_PAYMENT', 'CANCEL_REQUEST')
            ORDER BY created_at DESC`,
      args: [applicationId],
    });

    const glEntries = glRes.rows as unknown as GeneralLedgerEntry[];
    const totalDebit = glEntries.filter((e) => e.entryType === 'debit').reduce((sum, e) => sum + Number(e.amount), 0);
    const totalCredit = glEntries.filter((e) => e.entryType === 'credit').reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      applicationId: String(app.id),
      applicationNo: String(app.application_no),
      beneficiaryId: String(app.beneficiary_id),
      beneficiaryName: String(app.beneficiary_name || 'ผู้มีสิทธิ์รับซะกาต'),
      approvedAmount: Number(app.approved_amount || 0),
      disbursedAmount: Number(app.disbursed_amount || 0),
      status: String(app.status),
      journalNo: app.journal_no ? String(app.journal_no) : undefined,
      fundName: app.fund_name ? String(app.fund_name) : undefined,
      specificSubFundName: app.specific_sub_fund_name ? String(app.specific_sub_fund_name) : undefined,
      transactions: txRes.rows as any,
      glEntries,
      totalDebit,
      totalCredit,
      isBalanced: totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.001,
      holdHistory: holdHistoryRes.rows,
    };
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
      sql: `UPDATE assistance_applications 
            SET status = 'followup', followup_status = 'completed', updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?`,
      args: [applicationId],
    });

    await BeneficiaryService.recordLifecycleTransition(db, {
      applicationId,
      stage: 'followup',
      fromStatus: 'scheduled',
      toStatus: 'completed',
      action: 'COMPLETE_FOLLOWUP',
      actor,
      notes: `บันทึกผลการติดตามหลังการช่วยเหลือ: ${statusSummary} (ความเป็นอยู่${isLivingImproved ? 'ดีขึ้น' : 'ยังไม่ดีขึ้น'})`,
      metadata: { isLivingImproved },
    });

    return { applicationId, status: 'followup', followupStatus: 'completed' };
  }

  /**
   * 8. Record Delivery (Execution of in-kind goods, building materials, contractor, training, equipment)
   */
  static async recordDelivery(
    applicationId: string,
    deliveryData: {
      deliveryDate?: string;
      deliveryRef?: string;
      proofUrl?: string;
      notes?: string;
      deliveredByName?: string;
    },
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    if (!['officer', 'finance', 'super_admin'].includes(actor.role)) {
      throw new Error(`บทบาท ${actor.role} ไม่มีสิทธิ์บันทึกการส่งมอบความช่วยเหลือ`);
    }

    const appRes = await db.execute({
      sql: `SELECT id, application_no, approval_status, delivery_status, completion_status, delivery_method, assistance_format_name
            FROM assistance_applications WHERE id = ?`,
      args: [applicationId],
    });
    if (appRes.rows.length === 0) throw new Error(`ไม่พบคำร้อง ${applicationId}`);
    const app = appRes.rows[0];

    if (String(app.approval_status || '') !== 'approved') {
      throw new Error(`CANNOT_DELIVER_UNAPPROVED: คำร้องนี้ยังไม่ได้รับการอนุมัติ (Approval Status ต้องเป็น approved เท่านั้น)`);
    }
    if (String(app.completion_status || 'active') !== 'active') {
      throw new Error(`คำร้องนี้อยู่ในสถานะ ${app.completion_status} ไม่สามารถดำเนินการส่งมอบได้`);
    }
    if (String(app.delivery_status || '') === 'delivered') {
      throw new Error(`ALREADY_DELIVERED: คำร้องนี้บันทึกการส่งมอบเรียบร้อยแล้ว ห้ามส่งมอบซ้ำ`);
    }

    const delivDate = deliveryData.deliveryDate || new Date().toLocaleDateString('th-TH');
    const delivRef = deliveryData.deliveryRef || `DELIV-${Date.now().toString().slice(-6)}`;

    await db.execute({
      sql: `UPDATE assistance_applications
            SET delivery_status = 'delivered',
                delivery_date = ?,
                delivered_by_id = ?,
                delivered_by_name = ?,
                delivery_ref = ?,
                delivery_proof_url = ?,
                delivery_notes = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        delivDate,
        actor.id,
        deliveryData.deliveredByName || actor.name,
        delivRef,
        deliveryData.proofUrl || null,
        deliveryData.notes || null,
        applicationId,
      ],
    });

    await BeneficiaryService.recordLifecycleTransition(db, {
      applicationId,
      stage: 'delivery',
      fromStatus: String(app.delivery_status || 'pending'),
      toStatus: 'delivered',
      action: 'DELIVER_ASSISTANCE',
      actor,
      notes: `บันทึกการส่งมอบ (${app.assistance_format_name || app.delivery_method || 'ส่งมอบ'}): อ้างอิง ${delivRef} (${deliveryData.notes || ''})`,
      metadata: { deliveryRef: delivRef, deliveryDate: delivDate, proofUrl: deliveryData.proofUrl },
    });

    return { applicationId, deliveryStatus: 'delivered', deliveryRef: delivRef };
  }

  /**
   * 9. Schedule Follow-up
   */
  static async scheduleFollowup(
    applicationId: string,
    scheduleDate: string,
    officer: { id?: string; name?: string },
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    if (!['officer', 'super_admin'].includes(actor.role)) {
      throw new Error(`เฉพาะเจ้าหน้าที่และผู้ดูแลระบบเท่านั้นที่มีสิทธิ์นัดหมายติดตามผล`);
    }

    const appRes = await db.execute({
      sql: `SELECT id, application_no, approval_status, payment_status, delivery_status, followup_status, completion_status
            FROM assistance_applications WHERE id = ?`,
      args: [applicationId],
    });
    if (appRes.rows.length === 0) throw new Error(`ไม่พบคำร้อง ${applicationId}`);
    const app = appRes.rows[0];

    if (String(app.approval_status || '') !== 'approved') {
      throw new Error(`CANNOT_SCHEDULE_UNAPPROVED: คำร้องนี้ยังไม่ได้รับการอนุมัติ`);
    }
    if (String(app.completion_status || 'active') !== 'active') {
      throw new Error(`คำร้องนี้อยู่ในสถานะ ${app.completion_status} ไม่สามารถนัดหมายได้`);
    }

    await db.execute({
      sql: `UPDATE assistance_applications
            SET followup_status = 'scheduled',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [applicationId],
    });

    await BeneficiaryService.recordLifecycleTransition(db, {
      applicationId,
      stage: 'followup',
      fromStatus: String(app.followup_status || 'pending_schedule'),
      toStatus: 'scheduled',
      action: 'SCHEDULE_FOLLOWUP',
      actor,
      notes: `นัดหมายติดตามผลวันที่ ${scheduleDate} ผู้รับผิดชอบ: ${officer.name || actor.name}`,
      metadata: { scheduleDate, officerId: officer.id || actor.id, officerName: officer.name || actor.name },
    });

    return { applicationId, followupStatus: 'scheduled', scheduleDate };
  }

  /**
   * 10. Close Assistance Request
   */
  static async closeAssistanceRequest(
    applicationId: string,
    closingNotesOrOptions: string | { notes?: string; closingNotes?: string; waiveFollowup?: boolean; actor?: ActorContext },
    maybeActor?: ActorContext,
    maybeOptions?: { waiveFollowup?: boolean }
  ) {
    await initDb();
    const db = getDb();

    let closingNotes = '';
    let actor: ActorContext;
    let options: { waiveFollowup?: boolean } = {};

    if (typeof closingNotesOrOptions === 'object' && closingNotesOrOptions !== null) {
      closingNotes = closingNotesOrOptions.notes || closingNotesOrOptions.closingNotes || '';
      options = { waiveFollowup: closingNotesOrOptions.waiveFollowup };
      actor = maybeActor || (closingNotesOrOptions as any).actor || { id: 'admin-1', name: 'ผู้ดูแลระบบ', role: 'super_admin' };
    } else {
      closingNotes = String(closingNotesOrOptions || '');
      actor = maybeActor!;
      options = maybeOptions || {};
    }

    if (!['approver', 'executive', 'super_admin'].includes(actor.role)) {
      throw new Error(`บทบาท ${actor.role} ไม่มีสิทธิ์ปิดคำร้องขอความช่วยเหลือ`);
    }

    const appRes = await db.execute({
      sql: `SELECT id, application_no, approval_status, payment_status, delivery_status, followup_status, completion_status
            FROM assistance_applications WHERE id = ?`,
      args: [applicationId],
    });
    if (appRes.rows.length === 0) throw new Error(`ไม่พบคำร้อง ${applicationId}`);
    const app = appRes.rows[0];

    if (String(app.completion_status || '') === 'closed') {
      throw new Error(`ALREADY_CLOSED: คำร้องนี้ปิดกระบวนการเรียบร้อยแล้ว`);
    }
    if (String(app.completion_status || '') === 'terminated') {
      throw new Error(`CANNOT_CLOSE_TERMINATED: คำร้องนี้ถูกยกเลิกหรือไม่อนุมัติแล้ว`);
    }
    if (String(app.approval_status || '') !== 'approved') {
      throw new Error(`CANNOT_CLOSE_UNAPPROVED: คำร้องนี้ยังไม่ได้รับการอนุมัติ (Approval Status ต้องเป็น approved)`);
    }

    // Check payment fulfillment
    const paySt = String(app.payment_status || '');
    if (paySt !== 'not_applicable' && paySt !== 'paid') {
      throw new Error(`CANNOT_CLOSE_UNPAID: ไม่สามารถปิดคำร้องได้เนื่องจากยังเบิกจ่ายเงินไม่เสร็จสิ้น (Payment Status: ${paySt})`);
    }

    // Check delivery fulfillment
    const delivSt = String(app.delivery_status || '');
    if (delivSt !== 'not_applicable' && delivSt !== 'delivered') {
      throw new Error(`CANNOT_CLOSE_UNDELIVERED: ไม่สามารถปิดคำร้องได้เนื่องจากยังไม่ได้ส่งมอบความช่วยเหลือ/สิ่งของ (Delivery Status: ${delivSt})`);
    }

    // Check follow-up status
    const folSt = String(app.followup_status || '');
    if (folSt !== 'completed' && folSt !== 'not_required' && !options?.waiveFollowup) {
      throw new Error(`CANNOT_CLOSE_PENDING_FOLLOWUP: ยังไม่ได้บันทึกผลการติดตามหลังการช่วยเหลือ (หรือระบุ waiveFollowup: true เพื่อยกเว้น)`);
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    await db.execute({
      sql: `UPDATE assistance_applications
            SET status = 'closed',
                completion_status = 'closed',
                closed_date = ?,
                closed_by_id = ?,
                closed_by_name = ?,
                closing_notes = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [timestampNow, actor.id, actor.name, closingNotes, applicationId],
    });

    await BeneficiaryService.recordLifecycleTransition(db, {
      applicationId,
      stage: 'completion',
      fromStatus: String(app.completion_status || 'active'),
      toStatus: 'closed',
      action: 'CLOSE_REQUEST',
      actor,
      notes: `ปิดกระบวนการคำร้องเสร็จสิ้นสมบูรณ์: ${closingNotes}`,
    });

    return { applicationId, completionStatus: 'closed', status: 'closed' };
  }

  /**
   * 11. Request More Info & Resubmit
   */
  static async requestMoreInfo(applicationId: string, reason: string, actor: ActorContext) {
    await initDb();
    const db = getDb();

    const appRes = await db.execute({
      sql: 'SELECT id, request_status, approval_status, completion_status FROM assistance_applications WHERE id = ?',
      args: [applicationId],
    });
    if (appRes.rows.length === 0) throw new Error(`ไม่พบคำร้อง ${applicationId}`);
    const app = appRes.rows[0];

    if (String(app.completion_status || 'active') !== 'active') {
      throw new Error(`คำร้องนี้อยู่ในสถานะ ${app.completion_status}`);
    }
    if (String(app.approval_status || '') === 'approved') {
      throw new Error(`คำร้องนี้ได้รับการอนุมัติแล้ว ไม่สามารถส่งกลับขอข้อมูลเพิ่มได้`);
    }

    await db.execute({
      sql: `UPDATE assistance_applications
            SET request_status = 'need_info',
                status = 'need_info',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [applicationId],
    });

    await BeneficiaryService.recordLifecycleTransition(db, {
      applicationId,
      stage: 'request',
      fromStatus: String(app.request_status || 'submitted'),
      toStatus: 'need_info',
      action: 'REQUEST_INFO',
      actor,
      notes: `ขอเอกสาร/ข้อมูลเพิ่มเติม: ${reason}`,
    });

    return { applicationId, requestStatus: 'need_info', status: 'need_info' };
  }

  static async resubmitRequest(applicationId: string, notes: string, actor: ActorContext) {
    await initDb();
    const db = getDb();

    const appRes = await db.execute({
      sql: 'SELECT id, request_status, completion_status FROM assistance_applications WHERE id = ?',
      args: [applicationId],
    });
    if (appRes.rows.length === 0) throw new Error(`ไม่พบคำร้อง ${applicationId}`);
    const app = appRes.rows[0];

    if (String(app.request_status || '') !== 'need_info') {
      throw new Error(`คำร้องนี้ไม่ได้อยู่ในสถานะรอข้อมูลเพิ่มเติม`);
    }

    await db.execute({
      sql: `UPDATE assistance_applications
            SET request_status = 'submitted',
                status = 'submitted',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [applicationId],
    });

    await BeneficiaryService.recordLifecycleTransition(db, {
      applicationId,
      stage: 'request',
      fromStatus: 'need_info',
      toStatus: 'submitted',
      action: 'RESUBMIT_REQUEST',
      actor,
      notes: `ส่งข้อมูลเพิ่มเติมและยื่นคำร้องใหม่: ${notes}`,
    });

    return { applicationId, requestStatus: 'submitted', status: 'submitted' };
  }

  /**
   * 12. Cancel Request (Phase 10: Releases held funds if previously approved)
   */
  static async cancelRequest(applicationId: string, reason: string, actor: ActorContext) {
    await initDb();
    const db = getDb();

    const appRes = await db.execute({
      sql: `SELECT id, application_no, request_status, approval_status, payment_status, completion_status, status,
                   approved_amount, approved_fund_id, approved_specific_fund_id, specific_fund_id,
                   primary_group_code, fiscal_year
            FROM assistance_applications WHERE id = ?`,
      args: [applicationId],
    });
    if (appRes.rows.length === 0) throw new Error(`ไม่พบคำร้อง ${applicationId}`);
    const app = appRes.rows[0];

    if (String(app.payment_status || '') === 'paid') {
      throw new Error(`คำร้องนี้ได้จ่ายเงินไปแล้ว ไม่สามารถยกเลิกได้`);
    }
    if (String(app.completion_status || '') === 'closed') {
      throw new Error(`คำร้องนี้ปิดกระบวนการไปแล้ว ไม่สามารถยกเลิกได้`);
    }

    const wasApproved = String(app.approval_status || '') === 'approved' ||
      ['approved', 'wait_disbursement'].includes(String(app.status || ''));
    const approvedAmount = Number(app.approved_amount || 0);

    // Release held funds if the request was approved
    if (wasApproved && approvedAmount > 0) {
      const targetFundId = app.approved_fund_id ? String(app.approved_fund_id) : 'fund-1';
      const targetSubFundId = app.approved_specific_fund_id ? String(app.approved_specific_fund_id) : (app.specific_fund_id ? String(app.specific_fund_id) : 'subf-1');
      const primaryGroupCode = String(app.primary_group_code || 'faqir_miskin');
      const fiscalYear = String(app.fiscal_year || '2569');

      // A) Release from fund_accounts
      await db.execute({
        sql: `UPDATE fund_accounts 
              SET committed_amount = MAX(0, committed_amount - ?), 
                  available_amount = available_amount + ?, 
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [approvedAmount, approvedAmount, targetFundId],
      });

      // B) Release from faqir_miskin_sub_funds
      await db.execute({
        sql: `UPDATE faqir_miskin_sub_funds
              SET committed_amount = MAX(0, committed_amount - ?), 
                  remaining_amount = remaining_amount + ?, 
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ? OR code = ?`,
        args: [approvedAmount, approvedAmount, targetSubFundId, targetSubFundId],
      });

      // C) Release from asnaf_allocations
      await db.execute({
        sql: `UPDATE asnaf_allocations
              SET committed_amount = MAX(0, committed_amount - ?), 
                  remaining_amount = remaining_amount + ?
              WHERE asnaf_code = ? AND fiscal_year = ?`,
        args: [approvedAmount, approvedAmount, primaryGroupCode, fiscalYear],
      });

      // D) Record transition
      await BeneficiaryService.recordLifecycleTransition(db, {
        applicationId,
        stage: 'approval',
        fromStatus: 'approved',
        toStatus: 'rejected',
        action: 'RELEASE_FUND_HOLD',
        actor,
        notes: `ปลดการจองงบประมาณ ฿${approvedAmount.toLocaleString()} บาท คืนสู่กองทุนเนื่องจากยกเลิกคำร้อง`,
        metadata: { releasedAmount: approvedAmount, fundId: targetFundId, subFundId: targetSubFundId },
      });
    }

    await db.execute({
      sql: `UPDATE assistance_applications
            SET request_status = 'canceled',
                approval_status = 'rejected',
                payment_status = 'not_applicable',
                delivery_status = 'not_applicable',
                followup_status = 'not_required',
                completion_status = 'terminated',
                status = 'cancelled',
                rejection_reason = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [reason, applicationId],
    });

    await BeneficiaryService.recordLifecycleTransition(db, {
      applicationId,
      stage: 'request',
      fromStatus: String(app.request_status || 'submitted'),
      toStatus: 'canceled',
      action: 'CANCEL_REQUEST',
      actor,
      notes: `ยกเลิกคำร้อง: ${reason}`,
    });

    return { applicationId, requestStatus: 'canceled', completionStatus: 'terminated', status: 'cancelled' };
  }

  /**
   * 13. Get Comprehensive Multi-Lifecycle State
   */
  static async getLifecycleState(applicationId: string) {
    await initDb();
    const db = getDb();

    let appRes = await db.execute({
      sql: `SELECT a.*, b.full_name, b.national_id, b.phone,
                   ast.name as type_name, ast.code as type_code,
                   af.name as format_name, af.code as format_code
            FROM assistance_applications a
            LEFT JOIN beneficiaries b ON a.beneficiary_id = b.id
            LEFT JOIN assistance_types ast ON a.assistance_type_id = ast.id
            LEFT JOIN assistance_formats af ON a.assistance_format_id = af.id
            WHERE a.id = ?`,
      args: [applicationId],
    });
    if (appRes.rows.length === 0) {
      try {
        const { ensureApplicationInSqlite } = await import('@/lib/syncAssistanceRequest');
        const synced = await ensureApplicationInSqlite(applicationId);
        if (synced) {
          appRes = await db.execute({
            sql: `SELECT a.*, b.full_name, b.national_id, b.phone,
                         ast.name as type_name, ast.code as type_code,
                         af.name as format_name, af.code as format_code
                  FROM assistance_applications a
                  LEFT JOIN beneficiaries b ON a.beneficiary_id = b.id
                  LEFT JOIN assistance_types ast ON a.assistance_type_id = ast.id
                  LEFT JOIN assistance_formats af ON a.assistance_format_id = af.id
                  WHERE a.id = ?`,
            args: [applicationId],
          });
        }
      } catch {}
    }
    if (appRes.rows.length === 0) throw new Error(`ไม่พบคำร้อง ${applicationId}`);
    const app = appRes.rows[0];

    const transRes = await db.execute({
      sql: `SELECT * FROM assistance_lifecycle_transitions WHERE application_id = ? ORDER BY created_at ASC`,
      args: [applicationId],
    });

    const reqStatus = (app.request_status || 'submitted') as any;
    const asmStatus = (app.assessment_status || 'pending') as any;
    const aprStatus = (app.approval_status || 'pending') as any;
    const payStatus = (app.payment_status || 'pending') as any;
    const delivStatus = (app.delivery_status || 'pending') as any;
    const folStatus = (app.followup_status || 'pending_schedule') as any;
    const compStatus = (app.completion_status || 'active') as any;

    const isActive = compStatus === 'active';

    const canStartAssessment = isActive && reqStatus === 'submitted' && asmStatus === 'pending';
    const canSubmitAssessment = isActive && reqStatus === 'submitted' && ['pending', 'in_assessment'].includes(asmStatus);
    const canApprove = isActive && reqStatus === 'submitted' && asmStatus === 'completed' && ['pending', 'in_review'].includes(aprStatus);
    const canReject = isActive && ['pending', 'in_review'].includes(aprStatus);
    const canDisburse = isActive && aprStatus === 'approved' && ['wait_disbursement', 'pending'].includes(payStatus) && payStatus !== 'not_applicable';
    const canDeliver = isActive && aprStatus === 'approved' && ['pending', 'dispatched'].includes(delivStatus) && delivStatus !== 'not_applicable';
    const canScheduleFollowup = isActive && aprStatus === 'approved' && (payStatus === 'paid' || delivStatus === 'delivered') && folStatus !== 'completed';
    const canCompleteFollowup = isActive && ['scheduled', 'in_progress', 'pending_schedule'].includes(folStatus);
    const canClose = isActive && aprStatus === 'approved' &&
      (payStatus === 'paid' || payStatus === 'not_applicable') &&
      (delivStatus === 'delivered' || delivStatus === 'not_applicable');

    return {
      applicationId: String(app.id),
      applicationNo: String(app.application_no),
      beneficiaryId: String(app.beneficiary_id),
      beneficiaryName: String(app.full_name || ''),
      asnafCategory: String(app.asnaf_category || ''),
      primaryGroupCode: String(app.primary_group_code || ''),
      specificFundId: String(app.specific_fund_id || ''),
      assistanceType: {
        id: String(app.assistance_type_id || ''),
        code: String(app.type_code || ''),
        name: String(app.type_name || app.assistance_type || ''),
      },
      assistanceFormat: {
        id: String(app.assistance_format_id || ''),
        code: String(app.format_code || app.assistance_format_code || ''),
        name: String(app.format_name || app.assistance_format_name || ''),
        deliveryMethod: String(app.delivery_method || ''),
      },
      requestedAmount: Number(app.requested_amount || 0),
      approvedAmount: app.approved_amount ? Number(app.approved_amount) : null,
      disbursedAmount: app.disbursed_amount ? Number(app.disbursed_amount) : null,
      statuses: {
        request: reqStatus,
        assessment: asmStatus,
        approval: aprStatus,
        payment: payStatus,
        delivery: delivStatus,
        followup: folStatus,
        completion: compStatus,
      },
      dates: {
        appliedDate: app.applied_date ? String(app.applied_date) : null,
        requestDate: app.request_date ? String(app.request_date) : null,
        assessmentDate: app.assessment_date ? String(app.assessment_date) : null,
        approvedDate: app.approved_date ? String(app.approved_date) : null,
        disbursementDate: app.disbursement_date ? String(app.disbursement_date) : null,
        deliveryDate: app.delivery_date ? String(app.delivery_date) : null,
        closedDate: app.closed_date ? String(app.closed_date) : null,
      },
      actors: {
        assignedOfficer: { id: app.assigned_officer_id, name: app.assigned_officer_name },
        assessedBy: { id: app.assessed_by_id, name: app.assessed_by_name },
        approvedBy: { id: app.approved_by_id, name: app.approved_by_name },
        disbursedBy: { id: app.disbursed_by_id, name: app.disbursed_by_name },
        deliveredBy: { id: app.delivered_by_id, name: app.delivered_by_name },
        closedBy: { id: app.closed_by_id, name: app.closed_by_name },
      },
      permissions: {
        canStartAssessment,
        canSubmitAssessment,
        canApprove,
        canReject,
        canDisburse,
        canDeliver,
        canScheduleFollowup,
        canCompleteFollowup,
        canClose,
      },
      transitions: transRes.rows.map((t) => ({
        id: String(t.id),
        stage: String(t.stage),
        fromStatus: t.from_status ? String(t.from_status) : null,
        toStatus: String(t.to_status),
        action: String(t.action),
        actorId: t.actor_id ? String(t.actor_id) : null,
        actorName: t.actor_name ? String(t.actor_name) : null,
        actorRole: t.actor_role ? String(t.actor_role) : null,
        notes: t.notes ? String(t.notes) : null,
        metadata: t.metadata ? JSON.parse(String(t.metadata)) : null,
        createdAt: String(t.created_at),
      })),
    };
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
        a.request_status, a.assessment_status, a.approval_status, a.payment_status,
        a.delivery_status, a.followup_status, a.completion_status,
        a.request_date, a.assessment_date, a.delivery_date, a.closed_date,
        a.assistance_format_id, a.assistance_format_code, a.assistance_format_name, a.delivery_method,
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
        AND a.id != 'app-system-internal'
        AND b.id != 'ben-system-internal'
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

        // Phase 7 Separated Lifecycle Status Dimensions
        requestStatus: (row.request_status || 'submitted') as any,
        assessmentStatus: (row.assessment_status || 'pending') as any,
        approvalStatus: (row.approval_status || 'pending') as any,
        paymentStatus: (row.payment_status || 'pending') as any,
        deliveryStatus: (row.delivery_status || 'pending') as any,
        followupStatus: (row.followup_status || 'pending_schedule') as any,
        completionStatus: (row.completion_status || 'active') as any,
        requestDate: row.request_date ? String(row.request_date) : undefined,
        assessmentDate: row.assessment_date ? String(row.assessment_date) : undefined,
        deliveryDate: row.delivery_date ? String(row.delivery_date) : undefined,
        closedDate: row.closed_date ? String(row.closed_date) : undefined,
        
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
    let list = await this.getAllApplications();
    let app = list.find((a: any) => a.id === applicationId || a.applicationNo === applicationId);
    if (!app) {
      try {
        const { ensureApplicationInSqlite } = await import('@/lib/syncAssistanceRequest');
        await ensureApplicationInSqlite(applicationId);
        list = await this.getAllApplications();
        app = list.find((a: any) => a.id === applicationId || a.applicationNo === applicationId);
      } catch {}
    }
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

    let appRes = await db.execute({
      sql: 'SELECT id, application_no, assigned_officer_id, status FROM assistance_applications WHERE id = ?',
      args: [applicationId],
    });

    if (appRes.rows.length === 0) {
      try {
        const { ensureApplicationInSqlite } = await import('@/lib/syncAssistanceRequest');
        const synced = await ensureApplicationInSqlite(applicationId);
        if (synced) {
          appRes = await db.execute({
            sql: 'SELECT id, application_no, assigned_officer_id, status FROM assistance_applications WHERE id = ?',
            args: [applicationId],
          });
        }
      } catch {}
    }

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

    try {
      const { syncStatusToNest } = await import('@/lib/syncAssistanceRequest');
      await syncStatusToNest(applicationId, newStatus, notes);
    } catch {}

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
   * 13. Fetch Active Assistance Types (Extensible by Admin & Dynamic Asnaf Filter)
   */
  static async getAssistanceTypes(filters?: {
    includeInactive?: boolean;
    primaryGroupCode?: string;
    asnafCode?: string;
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

    // Dynamic Asnaf filter using asnaf_assistance_types relationship
    const asnafTarget = filters?.asnafCode || filters?.primaryGroupCode;
    if (asnafTarget && asnafTarget !== 'all') {
      const normalizedAsnaf = resolveAsnafGroupCode(asnafTarget);
      sql += ` AND ast.id IN (
        SELECT aat.assistance_type_id 
        FROM asnaf_assistance_types aat 
        WHERE aat.asnaf_code = ? AND aat.is_active = 1
      )`;
      args.push(normalizedAsnaf);
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

    // Fetch supported formats from assistance_type_formats for returned types
    let formatsByTypeId = new Map<string, any[]>();
    try {
      const formatLinksRes = await db.execute(`
        SELECT atf.assistance_type_id, af.id as format_id, af.code as format_code, af.name as format_name,
               af.delivery_method, af.delivery_method_label_th, atf.is_default, atf.sort_order
        FROM assistance_type_formats atf
        JOIN assistance_formats af ON atf.format_id = af.id
        WHERE atf.is_active = 1 AND af.is_active = 1
        ORDER BY atf.sort_order ASC
      `);
      for (const fl of formatLinksRes.rows) {
        const tid = String(fl.assistance_type_id);
        if (!formatsByTypeId.has(tid)) formatsByTypeId.set(tid, []);
        formatsByTypeId.get(tid)!.push({
          id: String(fl.format_id),
          code: String(fl.format_code),
          name: String(fl.format_name),
          deliveryMethod: String(fl.delivery_method),
          deliveryMethodLabelTh: String(fl.delivery_method_label_th),
          isDefault: Boolean(fl.is_default),
          sortOrder: Number(fl.sort_order),
        });
      }
    } catch {}

    // Fetch allowed asnafs from asnaf_assistance_types for returned types
    let asnafsByTypeId = new Map<string, string[]>();
    try {
      const asnafLinksRes = await db.execute(`
        SELECT assistance_type_id, asnaf_code
        FROM asnaf_assistance_types
        WHERE is_active = 1
      `);
      for (const al of asnafLinksRes.rows) {
        const tid = String(al.assistance_type_id);
        if (!asnafsByTypeId.has(tid)) asnafsByTypeId.set(tid, []);
        asnafsByTypeId.get(tid)!.push(String(al.asnaf_code));
      }
    } catch {}

    return res.rows.map((r) => {
      let reqDocs: string[] = [];
      try { if (r.required_docs) reqDocs = JSON.parse(String(r.required_docs)); } catch {}
      const pCode = r.primary_group_code
        ? String(r.primary_group_code)
        : (r.sf_primary_code ? String(r.sf_primary_code) : undefined);

      const tid = String(r.id);
      const supportedFormats = formatsByTypeId.get(tid) || [];
      const allowedAsnafs = asnafsByTypeId.get(tid) || (pCode ? [pCode] : []);

      return {
        id: tid,
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
        supportedFormats,
        allowedAsnafs,
      };
    });
  }

  /**
   * 13.1 Fetch Assistance Formats (Level 3 Delivery Formats & Type-Specific Filter)
   */
  static async getAssistanceFormats(filters?: {
    assistanceTypeId?: string;
    assistanceTypeCode?: string;
    includeInactive?: boolean;
  }) {
    await initDb();
    const db = getDb();

    if (filters?.assistanceTypeId || filters?.assistanceTypeCode) {
      let typeId = filters.assistanceTypeId;
      if (!typeId && filters.assistanceTypeCode) {
        const typeRes = await db.execute({
          sql: 'SELECT id FROM assistance_types WHERE code = ? LIMIT 1',
          args: [filters.assistanceTypeCode],
        });
        if (typeRes.rows.length > 0) {
          typeId = String(typeRes.rows[0].id);
        }
      }

      if (typeId) {
        const res = await db.execute({
          sql: `
            SELECT af.id, af.code, af.name, af.name_en, af.description,
                   af.delivery_method, af.delivery_method_label_th,
                   af.requires_receipt, af.requires_inspection, af.is_active,
                   atf.is_default, atf.sort_order
            FROM assistance_type_formats atf
            JOIN assistance_formats af ON atf.format_id = af.id
            WHERE atf.assistance_type_id = ?
              ${filters?.includeInactive ? '' : 'AND atf.is_active = 1 AND af.is_active = 1'}
            ORDER BY atf.sort_order ASC, af.sort_order ASC
          `,
          args: [typeId],
        });

        return res.rows.map((r) => ({
          id: String(r.id),
          code: String(r.code),
          name: String(r.name),
          nameEn: r.name_en ? String(r.name_en) : undefined,
          description: r.description ? String(r.description) : undefined,
          deliveryMethod: String(r.delivery_method),
          deliveryMethodLabelTh: String(r.delivery_method_label_th),
          requiresReceipt: Boolean(r.requires_receipt),
          requiresInspection: Boolean(r.requires_inspection),
          isDefault: Boolean(r.is_default),
          isActive: Boolean(r.is_active),
          sortOrder: Number(r.sort_order),
        }));
      }
    }

    // Return all master assistance formats
    const allRes = await db.execute({
      sql: `
        SELECT id, code, name, name_en, description,
               delivery_method, delivery_method_label_th,
               requires_receipt, requires_inspection, is_active, sort_order
        FROM assistance_formats
        ${filters?.includeInactive ? '' : 'WHERE is_active = 1'}
        ORDER BY sort_order ASC, code ASC
      `,
    });

    return allRes.rows.map((r) => ({
      id: String(r.id),
      code: String(r.code),
      name: String(r.name),
      nameEn: r.name_en ? String(r.name_en) : undefined,
      description: r.description ? String(r.description) : undefined,
      deliveryMethod: String(r.delivery_method),
      deliveryMethodLabelTh: String(r.delivery_method_label_th),
      requiresReceipt: Boolean(r.requires_receipt),
      requiresInspection: Boolean(r.requires_inspection),
      isDefault: false,
      isActive: Boolean(r.is_active),
      sortOrder: Number(r.sort_order),
    }));
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
          allowedAsnafCodes?: string[];
          allowedFormatIds?: string[];
          formatIds?: string[];
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

    // Phase 9: Synchronize asnaf_assistance_types relationship
    try {
      const rawAsnafs = (
        'allowedAsnafCodes' in payload && Array.isArray(payload.allowedAsnafCodes) && payload.allowedAsnafCodes.length > 0
          ? payload.allowedAsnafCodes
          : [primaryGroupCode === 'faqir_miskin' ? 'faqir' : primaryGroupCode]
      );
      const asnafsToLink: string[] = [];
      for (const r of rawAsnafs) {
        const clean = String(r || '').trim().toLowerCase();
        if (clean === 'faqir_miskin') {
          if (!asnafsToLink.includes('faqir')) asnafsToLink.push('faqir');
          if (!asnafsToLink.includes('miskin')) asnafsToLink.push('miskin');
        } else if (clean === 'humanitarian') {
          if (!asnafsToLink.includes('riqab')) asnafsToLink.push('riqab');
        } else if (clean && !asnafsToLink.includes(clean)) {
          asnafsToLink.push(clean);
        }
      }

      for (let i = 0; i < asnafsToLink.length; i++) {
        const ac = asnafsToLink[i];
        const linkId = `aat-${ac}-${id}`;
        await db.execute({
          sql: `INSERT OR REPLACE INTO asnaf_assistance_types (
                  id, asnaf_code, assistance_type_id, is_active, sort_order, effective_date, created_by
                ) VALUES (?, ?, ?, 1, ?, datetime('now'), ?)`,
          args: [linkId, ac, id, i + 1, actor.id || 'system'],
        });
      }

      // Synchronize assistance_type_formats
      const formatsToLink = (
        'allowedFormatIds' in payload && Array.isArray(payload.allowedFormatIds) && payload.allowedFormatIds.length > 0
          ? payload.allowedFormatIds
          : 'formatIds' in payload && Array.isArray(payload.formatIds) && payload.formatIds.length > 0
          ? payload.formatIds
          : []
      );
      if (formatsToLink.length > 0) {
        for (let i = 0; i < formatsToLink.length; i++) {
          const fid = formatsToLink[i];
          await db.execute({
            sql: `INSERT OR REPLACE INTO assistance_type_formats (
                    id, assistance_type_id, format_id, is_default, is_active, sort_order, updated_at
                  ) VALUES (?, ?, ?, ?, 1, ?, datetime('now'))`,
            args: [`atf-${id}-${fid}`, id, fid, i === 0 ? 1 : 0, i + 1],
          });
        }
      }
    } catch (linkErr) {
      console.warn('Warning syncing asnaf / format links on create:', linkErr);
    }

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
      allowedAsnafCodes?: string[];
      allowedFormatIds?: string[];
      formatIds?: string[];
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

    // Phase 9: Synchronize asnaf_assistance_types relationship on update
    try {
      if (input.allowedAsnafCodes && Array.isArray(input.allowedAsnafCodes)) {
        // Deactivate all existing links for this type first
        await db.execute({
          sql: `UPDATE asnaf_assistance_types SET is_active = 0, updated_at = datetime('now'), updated_by = ? WHERE assistance_type_id = ?`,
          args: [actor.id || 'system', id],
        });

        // Activate or insert selected links
        const asnafsToLink: string[] = [];
        for (const r of input.allowedAsnafCodes) {
          const clean = String(r || '').trim().toLowerCase();
          if (clean === 'faqir_miskin') {
            if (!asnafsToLink.includes('faqir')) asnafsToLink.push('faqir');
            if (!asnafsToLink.includes('miskin')) asnafsToLink.push('miskin');
          } else if (clean === 'humanitarian') {
            if (!asnafsToLink.includes('riqab')) asnafsToLink.push('riqab');
          } else if (clean && !asnafsToLink.includes(clean)) {
            asnafsToLink.push(clean);
          }
        }

        for (let i = 0; i < asnafsToLink.length; i++) {
          const ac = asnafsToLink[i];
          const linkId = `aat-${ac}-${id}`;
          await db.execute({
            sql: `INSERT OR REPLACE INTO asnaf_assistance_types (
                    id, asnaf_code, assistance_type_id, is_active, sort_order, effective_date, updated_by
                  ) VALUES (?, ?, ?, 1, ?, datetime('now'), ?)`,
            args: [linkId, ac, id, i + 1, actor.id || 'system'],
          });
        }

        // Record relationship audit log
        await db.execute({
          sql: `INSERT INTO asnaf_relationship_audit_logs (
                  id, relationship_type, record_id, action, actor_id, actor_name, actor_role, changes_summary, created_at
                ) VALUES (?, 'asnaf_assistance_type', ?, 'SYNC_ALLOWED_ASNAFS', ?, ?, ?, ?, datetime('now'))`,
          args: [
            `aral-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            id,
            actor.id || null,
            actor.name || null,
            actor.role || null,
            `อัปเดตกลุ่มอัสนัฟที่รองรับสำหรับ "${nextName}": [${input.allowedAsnafCodes.join(', ')}]`,
          ],
        });
      }

      // Synchronize format links if provided
      const formatsToLink = (
        input.allowedFormatIds && Array.isArray(input.allowedFormatIds)
          ? input.allowedFormatIds
          : input.formatIds && Array.isArray(input.formatIds)
          ? input.formatIds
          : null
      );
      if (formatsToLink) {
        await db.execute({
          sql: `UPDATE assistance_type_formats SET is_active = 0, updated_at = datetime('now') WHERE assistance_type_id = ?`,
          args: [id],
        });

        for (let i = 0; i < formatsToLink.length; i++) {
          const fid = formatsToLink[i];
          await db.execute({
            sql: `INSERT OR REPLACE INTO assistance_type_formats (
                    id, assistance_type_id, format_id, is_default, is_active, sort_order, updated_at
                  ) VALUES (?, ?, ?, ?, 1, ?, datetime('now'))`,
            args: [`atf-${id}-${fid}`, id, fid, i === 0 ? 1 : 0, i + 1],
          });
        }
      }
    } catch (linkErr) {
      console.warn('Warning syncing asnaf / format links on update:', linkErr);
    }

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
