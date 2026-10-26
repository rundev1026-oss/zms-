import { getDb, initDb } from '@/lib/db';
import {
  RegistrationStatus,
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
  BeneficiaryRegistryItem,
  DashboardSeparatedStats,
  RegistryEditHistoryItem,
  RegistryChangeItem,
} from '@/types';
import { maskNationalId, ActorContext, HouseholdMemberInput } from './beneficiaryService';
import { StorageService } from './storageService';
import { calculateAge } from '@/utils/ageCalculator';
import { validateAddress } from '@/lib/thaiAddress';
export type { ActorContext };

export interface BeneficiaryProfileInput {
  // ส่วนที่ 1: ข้อมูลส่วนบุคคลและช่องทางติดต่อ
  titlePrefix?: string;
  fullName: string;
  nationalId: string;
  birthDate?: string;
  age?: number;
  phone: string;
  email?: string;
  occupation?: string;
  maritalStatus?: MaritalStatus;
  asnafCategory: AsnafCategory;
  branchId?: string;
  branchName?: string;

  // ส่วนที่ 2: ที่อยู่และข้อมูลที่อยู่อาศัย
  address: string;
  province: string;
  district: string;
  subdistrict?: string;
  community: string;
  postcode?: string;
  housingType?: HousingType;
  housingCondition?: string;
  housingNotes?: string;
  landTitleType?: LandTitleType;
  landTitleNotes?: string;

  // ส่วนที่ 2.1: พิกัดที่อยู่อาศัยบนแผนที่ (Google Maps)
  latitude?: number;
  longitude?: number;
  residenceAddress?: string;
  placeName?: string;
  locationUpdatedAt?: string;
  locationUpdatedBy?: string;
  locationVerificationStatus?: 'not_specified' | 'pending_verification' | 'verified';

  // ส่วนที่ 3: สมาชิกในครัวเรือน
  householdMembers?: HouseholdMemberInput[];

  // ส่วนที่ 4: รายรับและรายจ่ายครอบครัว
  monthlyIncome?: number;
  monthlyExpense?: number;
  incomeBreakdown?: HouseholdIncomeBreakdown;
  expenseBreakdown?: HouseholdExpenseBreakdown;

  // ส่วนที่ 5: หนี้สินและภาระค่าใช้จ่าย
  debtAmount?: number;
  debtPurpose?: string;
  debtType?: string;

  // ส่วนที่ 6: สภาพปัจจุบัน (ความพิการ การเจ็บป่วย และข้อจำกัดในการดำรงชีวิต)
  hardshipReasons?: HardshipReasons;
  hardshipReasonsText?: string;
  disabilityNotes?: string;
  illnessNotes?: string;
  livingLimitations?: string;

  // ส่วนที่ 7: ประวัติการได้รับความช่วยเหลือจากหน่วยงานอื่น
  pastAssistance?: PastAssistanceRecord[];

  // ส่วนที่ 8: ข้อมูลผู้สำรวจ ผู้ประสานงาน และผู้รับรอง
  familySituationSummary?: string;
  urgentNeeds?: string;
  dependentBurdens?: string;
  coordinator?: CoordinatorInfo;
  certifier?: CertifierInfo;

  // ส่วนที่ 9: เอกสารและภาพประกอบ
  documents?: {
    id?: string;
    name?: string;
    fileName?: string;
    category?: string;
    documentType?: string;
    fileUrl: string;
    storageProvider?: string;
    storagePath?: string;
    fileSize?: number;
    mimeType?: string;
  }[];

  // ส่วนที่ 10: ผลการตรวจสอบคุณสมบัติและบันทึกการพิจารณา
  evaluatorChecklist?: EvaluatorChecklist;
  checklist?: EvaluatorChecklist | any;
  registrationStatus?: RegistrationStatus;
}

export interface AssistanceRequestInput {
  beneficiaryId?: string; // เชื่อมโยงกับทะเบียนผู้มีสิทธิ์ (ID หรือ Registration No)
  nationalId?: string;    // เลขประจำตัวประชาชน (13 หลัก) สำหรับตรวจสอบ
  memberId?: string;      // ID บัญชีสมาชิก
  asnafCategory?: AsnafCategory;
  assistanceType: string;
  assistanceTypeId?: string;
  assistanceGroup?: 'core' | 'specific';
  assistanceTypeDetails?: string;
  requestedAmount: number;
  requestedItemsDetail?: string;
  necessityDetails?: string;
  reasons?: string;
  urgencyLevel?: 'normal' | 'high' | 'urgent';
  branchId?: string;
  branchName?: string;
  documents?: {
    name?: string;
    category?: string;
    fileUrl: string;
    storageProvider?: string;
    storagePath?: string;
    fileSize?: number;
    mimeType?: string;
    checksum?: string;
  }[];
}

export class RegistryService {
  /**
   * 1. ขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต (Zakat Beneficiary Registration)
   * บันทึกข้อมูลแบบสำรวจ 10 ส่วน โดยไม่สร้างคำร้องขอความช่วยเหลือโดยอัตโนมัติ
   */
  static async registerBeneficiaryProfile(
    rawInput: BeneficiaryProfileInput | any,
    rawActor?: ActorContext
  ) {
    await initDb();
    const db = getDb();

    // Support both direct input or wrapped { input: ..., actor: ... }
    const input: BeneficiaryProfileInput = (rawInput && (rawInput as any).input) ? (rawInput as any).input : (rawInput || {});
    const actor: ActorContext = rawActor || (rawInput && (rawInput as any).actor) || {
      id: 'officer-1',
      name: 'เจ้าหน้าที่ผู้รับผิดชอบ',
      role: 'officer',
    };

    if (!['officer', 'super_admin', 'member', 'approver', 'executive'].includes(actor.role)) {
      throw new Error(`บทบาท ${actor.role} ไม่มีสิทธิ์ในการขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต`);
    }

    // DUPLICATE CHECK: Validate unique national_id safely
    const rawNationalId = input.nationalId || (rawInput as any)?.nationalId || '';
    const cleanNationalId = String(rawNationalId).replace(/[^0-9]/g, '');

    if (!cleanNationalId) {
      throw new Error('กรุณาระบุหมายเลขบัตรประชาชน (13 หลัก)');
    }

    const existingBeneficiary = await db.execute({
      sql: 'SELECT id, full_name, national_id, registration_no FROM beneficiaries WHERE national_id = ?',
      args: [cleanNationalId],
    });

    if (existingBeneficiary.rows.length > 0) {
      const existing = existingBeneficiary.rows[0];
      throw new Error(
        `ตรวจสอบพบข้อมูลซ้ำ! หมายเลขบัตรประชาชน ${maskNationalId(cleanNationalId)} เคยขึ้นทะเบียนไว้แล้วในชื่อ "${existing.full_name}" (รหัสทะเบียน: ${existing.registration_no || 'มีในระบบเดิม'})`
      );
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const registeredDateStr = new Date().toISOString().slice(0, 10);

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

    const householdId = `hh-${Date.now()}`;
    const householdNo = `HH-2569-${Date.now().toString().slice(-4)}`;
    const beneficiaryId = `ben-${Date.now()}`;

    // Generate Registration Number (REG-2569-XXXX)
    const countRes = await db.execute(`SELECT COUNT(*) as c FROM beneficiaries WHERE registration_no IS NOT NULL AND registration_no != ''`);
    const regSeq = Number(countRes.rows[0].c) + 1;
    const registrationNo = `REG-2569-${regSeq.toString().padStart(4, '0')}`;
    const initialStatus: RegistrationStatus = input.registrationStatus || 'pending_verification';

    // Validate coordinates if provided
    let validLat: number | null = null;
    let validLng: number | null = null;
    if (input.latitude !== undefined && input.latitude !== null && input.latitude !== ('' as any)) {
      const parsedLat = Number(input.latitude);
      if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
        throw new Error('ละติจูดต้องอยู่ระหว่าง -90 ถึง 90 องศา');
      }
      validLat = parsedLat;
    }
    if (input.longitude !== undefined && input.longitude !== null && input.longitude !== ('' as any)) {
      const parsedLng = Number(input.longitude);
      if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
        throw new Error('ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180 องศา');
      }
      validLng = parsedLng;
    }
    const locationUpdatedAt = (validLat !== null && validLng !== null) ? timestampNow : null;
    const locationUpdatedBy = (validLat !== null && validLng !== null) ? `${actor.name} (${actor.role})` : null;

    // 1. Insert Household (Survey Data: Housing, Financials, Survey Details)
    await db.execute({
      sql: `INSERT INTO households (
        id, household_no, address, province, district, subdistrict, community,
        housing_condition, housing_notes, living_score, monthly_income, monthly_expense,
        debt_amount, debt_purpose, housing_type, land_title_type, land_title_notes,
        income_breakdown, expense_breakdown, past_assistance, family_situation_summary,
        urgent_needs, dependent_burdens, coordinator_info, certifier_info,
        latitude, longitude, residence_address, place_name, location_updated_at, location_updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        householdId,
        householdNo,
        input.address || '',
        input.province || '',
        input.district || '',
        input.subdistrict || null,
        input.community || 'ชุมชนทั่วไป',
        input.housingCondition || 'dilapidated',
        input.housingNotes || '',
        0,
        input.monthlyIncome || 0,
        input.monthlyExpense || 0,
        input.debtAmount || 0,
        input.debtPurpose || input.debtType || '',
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
        validLat,
        validLng,
        input.residenceAddress || input.address || null,
        input.placeName || null,
        locationUpdatedAt,
        locationUpdatedBy,
      ],
    });

    // 2. Insert Household Members (Section 3)
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

    // 3. Insert Master Beneficiary (Section 1 & Registry Metadata)
    await db.execute({
      sql: `INSERT INTO beneficiaries (
        id, household_id, full_name, national_id, phone, email, asnaf_category,
        title_prefix, birth_date, age, occupation, marital_status, postcode, subdistrict, branch_id, branch_name,
        registration_no, registration_status, registered_date, surveyor_id, surveyor_name,
        evaluator_checklist, disability_notes, illness_notes, living_limitations, hardship_reasons,
        latitude, longitude, residence_address, place_name, location_updated_at, location_updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        beneficiaryId,
        householdId,
        input.fullName || '',
        cleanNationalId,
        input.phone || '',
        input.email || null,
        input.asnafCategory || 'miskin',
        input.titlePrefix || 'นาย',
        finalBirthDate,
        finalAge,
        input.occupation || '',
        input.maritalStatus || 'single',
        input.postcode || '',
        input.subdistrict || '',
        input.branchId || 'br-hq',
        input.branchName || 'สำนักงานใหญ่ กรุงเทพมหานคร',
        registrationNo,
        initialStatus,
        registeredDateStr,
        actor.id,
        actor.name,
        input.evaluatorChecklist ? JSON.stringify(input.evaluatorChecklist) : null,
        input.disabilityNotes || '',
        input.illnessNotes || '',
        input.livingLimitations || '',
        input.hardshipReasons ? JSON.stringify(input.hardshipReasons) : null,
        validLat,
        validLng,
        input.residenceAddress || input.address || null,
        input.placeName || null,
        locationUpdatedAt,
        locationUpdatedBy,
      ],
    });

    // 4. Insert Registry Documents (Section 9)
    if (input.documents && input.documents.length > 0) {
      for (const doc of input.documents) {
        const docName = doc.name || doc.fileName || 'เอกสารหลักฐาน';
        const docCat = doc.category || doc.documentType || 'other_doc';
        await db.execute({
          sql: `INSERT INTO application_documents (
            id, application_id, beneficiary_id, name, category, file_url, status, upload_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            '', // No application id yet
            beneficiaryId,
            docName,
            docCat,
            doc.fileUrl || '/docs/file.pdf',
            'verified',
            timestampNow,
          ],
        });
      }
    }

    // 5. Insert Registration Status History
    await db.execute({
      sql: `INSERT INTO beneficiary_registration_history (
        id, beneficiary_id, status, timestamp, changed_by_id, changed_by_name, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `reghist-${Date.now()}`,
        beneficiaryId,
        initialStatus,
        timestampNow,
        actor.id,
        actor.name,
        initialStatus === 'draft' ? 'บันทึกฉบับร่างการขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต' : 'ยื่นขึ้นทะเบียนผู้มีสิทธิ์รับซะกาตใหม่เข้าสู่ระบบ',
      ],
    });

    // 6. Record Audit Log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'BENEFICIARY_REGISTERED',
        'application',
        registrationNo,
        `ขึ้นทะเบียนผู้มีสิทธิ์รับซะกาตรายใหม่: ${input.fullName} (รหัสทะเบียน: ${registrationNo}) สถานะ: ${initialStatus}`,
      ],
    });

    return {
      id: beneficiaryId,
      beneficiaryId,
      registrationNo,
      fullName: input.fullName,
      registrationStatus: initialStatus,
    };
  }

  /**
   * 2. ดึงรายการทะเบียนผู้มีสิทธิ์รับซะกาตทั้งหมด (พร้อม Search, Filters, Pagination & Linked Apps Count)
   */
  static async getAllBeneficiaryRegistries(filters?: {
    search?: string;
    registrationStatus?: string;
    asnafCategory?: string;
    branchId?: string;
    page?: number;
    limit?: number;
  }) {
    await initDb();
    const db = getDb();

    let query = `
      SELECT 
        b.id, b.registration_no, b.registration_status, b.registered_date,
        b.full_name, b.title_prefix, b.birth_date, b.age, b.national_id, b.phone, b.email,
        b.occupation, b.marital_status, b.postcode, b.subdistrict as ben_subdistrict,
        b.asnaf_category, b.branch_id, b.branch_name, b.surveyor_id, b.surveyor_name,
        b.qualification_date, b.qualification_notes, b.qualified_by_id, b.qualified_by_name,
        b.evaluator_checklist, b.disability_notes, b.illness_notes, b.living_limitations, b.hardship_reasons,
        b.created_at, b.updated_at,
        h.id as household_id, h.household_no, h.address, h.province, h.district, h.subdistrict, h.community,
        h.housing_type, h.housing_condition, h.housing_notes, h.land_title_type, h.land_title_notes,
        h.monthly_income, h.monthly_expense, h.debt_amount, h.debt_purpose,
        h.income_breakdown, h.expense_breakdown, h.past_assistance, h.family_situation_summary,
        h.urgent_needs, h.dependent_burdens, h.coordinator_info, h.certifier_info,
        COALESCE(b.latitude, h.latitude) as latitude,
        COALESCE(b.longitude, h.longitude) as longitude,
        COALESCE(b.residence_address, h.residence_address) as residence_address,
        COALESCE(b.place_name, h.place_name) as place_name,
        COALESCE(b.location_updated_at, h.location_updated_at) as location_updated_at,
        COALESCE(b.location_updated_by, h.location_updated_by) as location_updated_by,
        COALESCE(b.location_verification_status, h.location_verification_status, 'not_specified') as location_verification_status,
        (SELECT COUNT(*) FROM assistance_applications WHERE beneficiary_id = b.id) as apps_count,
        (SELECT COALESCE(SUM(approved_amount), 0) FROM assistance_applications WHERE beneficiary_id = b.id AND status IN ('approved', 'wait_disbursement', 'disbursed', 'closed')) as total_assisted,
        (SELECT application_no FROM assistance_applications WHERE beneficiary_id = b.id ORDER BY created_at DESC LIMIT 1) as latest_app_no,
        (SELECT status FROM assistance_applications WHERE beneficiary_id = b.id ORDER BY created_at DESC LIMIT 1) as latest_app_status
      FROM beneficiaries b
      JOIN households h ON b.household_id = h.id
      WHERE 1=1
    `;

    const args: any[] = [];

    if (filters?.search && filters.search.trim() !== '') {
      const s = `%${filters.search.trim()}%`;
      query += ` AND (
        b.full_name LIKE ? OR 
        b.registration_no LIKE ? OR 
        b.national_id LIKE ? OR 
        b.phone LIKE ? OR 
        h.province LIKE ? OR 
        h.district LIKE ? OR 
        h.community LIKE ?
      )`;
      args.push(s, s, s, s, s, s, s);
    }

    if (filters?.registrationStatus && filters.registrationStatus !== 'all') {
      query += ` AND b.registration_status = ?`;
      args.push(filters.registrationStatus);
    }

    if (filters?.asnafCategory && filters.asnafCategory !== 'all') {
      query += ` AND b.asnaf_category = ?`;
      args.push(filters.asnafCategory);
    }

    if (filters?.branchId && filters.branchId !== 'all') {
      query += ` AND b.branch_id = ?`;
      args.push(filters.branchId);
    }

    query += ` ORDER BY b.created_at DESC`;

    const res = await db.execute({ sql: query, args });

    const registries: BeneficiaryRegistryItem[] = [];

    for (const row of res.rows) {
      const bId = String(row.id);
      const hhId = String(row.household_id);

      // Members
      const membersRes = await db.execute({
        sql: 'SELECT id, full_name, relation, age, occupation, monthly_income, health_status, health_notes, education_status, notes FROM household_members WHERE household_id = ?',
        args: [hhId],
      });

      // Documents
      const docsRes = await db.execute({
        sql: 'SELECT id, name, category, file_url, status, upload_date, storage_provider, storage_path, file_size, mime_type, checksum, uploaded_by_id, uploaded_by_name FROM application_documents WHERE beneficiary_id = ?',
        args: [bId],
      });

      // Safe JSON parsers
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

      const monthlyIncome = Number(row.monthly_income || 0);
      const monthlyExpense = Number(row.monthly_expense || 0);
      const netIncome = monthlyIncome - monthlyExpense;

      registries.push({
        id: bId,
        registrationNo: row.registration_no ? String(row.registration_no) : `REG-2569-${bId.slice(-4)}`,
        householdId: hhId,
        householdNo: String(row.household_no),
        fullName: String(row.full_name),
        titlePrefix: row.title_prefix ? String(row.title_prefix) : 'นาย',
        birthDate: row.birth_date ? String(row.birth_date) : undefined,
        age: row.age ? Number(row.age) : undefined,
        nationalId: String(row.national_id),
        nationalIdMasked: maskNationalId(String(row.national_id)),
        phone: String(row.phone),
        email: row.email ? String(row.email) : undefined,
        occupation: row.occupation ? String(row.occupation) : undefined,
        maritalStatus: row.marital_status ? (String(row.marital_status) as MaritalStatus) : 'single',
        asnafCategory: String(row.asnaf_category) as AsnafCategory,
        branchId: row.branch_id ? String(row.branch_id) : 'br-hq',
        branchName: row.branch_name ? String(row.branch_name) : 'สำนักงานใหญ่ กรุงเทพมหานคร',
        address: String(row.address),
        province: String(row.province),
        district: String(row.district),
        subdistrict: row.subdistrict ? String(row.subdistrict) : undefined,
        community: String(row.community),
        postcode: row.postcode ? String(row.postcode) : undefined,
        housingType: row.housing_type ? (String(row.housing_type) as HousingType) : 'own',
        housingCondition: row.housing_condition ? String(row.housing_condition) : undefined,
        housingNotes: row.housing_notes ? String(row.housing_notes) : undefined,
        landTitleType: row.land_title_type ? (String(row.land_title_type) as LandTitleType) : undefined,
        landTitleNotes: row.land_title_notes ? String(row.land_title_notes) : undefined,
        monthlyIncome,
        monthlyExpense,
        netIncome,
        debtAmount: Number(row.debt_amount || 0),
        debtPurpose: row.debt_purpose ? String(row.debt_purpose) : undefined,
        hardshipReasons: parsedHardship,
        disabilityNotes: row.disability_notes ? String(row.disability_notes) : undefined,
        illnessNotes: row.illness_notes ? String(row.illness_notes) : undefined,
        livingLimitations: row.living_limitations ? String(row.living_limitations) : undefined,
        incomeBreakdown: parsedIncome,
        expenseBreakdown: parsedExpense,
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
        pastAssistance: parsedPast,
        familySituationSummary: row.family_situation_summary ? String(row.family_situation_summary) : undefined,
        urgentNeeds: row.urgent_needs ? String(row.urgent_needs) : undefined,
        dependentBurdens: row.dependent_burdens ? String(row.dependent_burdens) : undefined,
        coordinator: parsedCoord,
        certifier: parsedCert,
        documents: docsRes.rows.map((d) => ({
          id: String(d.id),
          name: String(d.name),
          category: String(d.category) as any,
          fileUrl: String(d.file_url),
          uploadDate: String(d.upload_date),
          status: String(d.status) as any,
          storageProvider: (d.storage_provider ? String(d.storage_provider) : 'local') as any,
          storagePath: d.storage_path ? String(d.storage_path) : undefined,
          fileSize: d.file_size ? Number(d.file_size) : undefined,
          mimeType: d.mime_type ? String(d.mime_type) : undefined,
          checksum: d.checksum ? String(d.checksum) : undefined,
          uploadedById: d.uploaded_by_id ? String(d.uploaded_by_id) : undefined,
          uploadedByName: d.uploaded_by_name ? String(d.uploaded_by_name) : undefined,
          fileExists: StorageService.checkPhysicalFile(d as any).exists,
        })),
        evaluatorChecklist: parsedChecklist,
        registrationStatus: (row.registration_status ? String(row.registration_status) : 'pending_verification') as RegistrationStatus,
        registeredDate: row.registered_date ? String(row.registered_date) : String(row.created_at).slice(0, 10),
        surveyorId: row.surveyor_id ? String(row.surveyor_id) : undefined,
        surveyorName: row.surveyor_name ? String(row.surveyor_name) : undefined,
        qualificationDate: row.qualification_date ? String(row.qualification_date) : undefined,
        qualificationNotes: row.qualification_notes ? String(row.qualification_notes) : undefined,
        qualifiedById: row.qualified_by_id ? String(row.qualified_by_id) : undefined,
        qualifiedByName: row.qualified_by_name ? String(row.qualified_by_name) : undefined,
        // Google Maps & Location Fields
        latitude: row.latitude !== null && row.latitude !== undefined && row.latitude !== '' ? Number(row.latitude) : undefined,
        longitude: row.longitude !== null && row.longitude !== undefined && row.longitude !== '' ? Number(row.longitude) : undefined,
        residenceAddress: row.residence_address ? String(row.residence_address) : undefined,
        placeName: row.place_name ? String(row.place_name) : undefined,
        locationUpdatedAt: row.location_updated_at ? String(row.location_updated_at) : undefined,
        locationUpdatedBy: row.location_updated_by ? String(row.location_updated_by) : undefined,
        locationVerificationStatus: (row.location_verification_status as any) || (row.latitude && row.longitude ? 'verified' : 'not_specified'),
        assistanceApplicationsCount: Number(row.apps_count || 0),
        totalAssistanceReceived: Number(row.total_assisted || 0),
        latestApplicationNo: row.latest_app_no ? String(row.latest_app_no) : undefined,
        latestApplicationStatus: row.latest_app_status ? (String(row.latest_app_status) as ApplicationStatus) : undefined,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      });
    }

    if (filters?.page && filters?.limit && filters.limit > 0) {
      const page = Math.max(1, filters.page);
      const limit = Math.max(1, filters.limit);
      const total = registries.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const paginatedItems = registries.slice(startIndex, startIndex + limit);

      const result: any = paginatedItems;
      result.pagination = { total, page, limit, totalPages };
      result.total = total;
      result.page = page;
      result.limit = limit;
      result.totalPages = totalPages;
      return result;
    }

    return registries;
  }

  /**
   * 3. ดึงข้อมูลทะเบียนรายบุคคลพร้อมประวัติการพิจารณา และรายการคำร้องขอความช่วยเหลือที่เชื่อมโยง
   */
  static async getBeneficiaryRegistryById(idOrRegNo: string) {
    await initDb();
    const db = getDb();

    const list = await this.getAllBeneficiaryRegistries();
    const item = list.find((b: any) => b.id === idOrRegNo || b.registrationNo === idOrRegNo || b.nationalId === idOrRegNo);

    if (!item) {
      throw new Error(`ไม่พบทะเบียนผู้มีสิทธิ์รับซะกาตรหัส ${idOrRegNo}`);
    }

    // Fetch Registration Status History
    const histRes = await db.execute({
      sql: 'SELECT status, timestamp, changed_by_name, notes FROM beneficiary_registration_history WHERE beneficiary_id = ? ORDER BY created_at ASC',
      args: [item.id],
    });

    item.registrationHistory = histRes.rows.map((h) => ({
      status: String(h.status) as RegistrationStatus,
      timestamp: String(h.timestamp),
      changedBy: String(h.changed_by_name),
      notes: String(h.notes),
    }));

    // Fetch Registry Edit History (Audit Trail for field changes)
    const editHistRes = await db.execute({
      sql: 'SELECT id, edited_by_id, edited_by_name, edited_by_role, timestamp, changes_summary, changes_detail, notes, created_at FROM beneficiary_edit_history WHERE beneficiary_id = ? ORDER BY created_at DESC',
      args: [item.id],
    });

    const editHistory = editHistRes.rows.map((eh) => {
      let detail: any = [];
      try {
        if (eh.changes_detail) detail = JSON.parse(String(eh.changes_detail));
      } catch {}
      return {
        id: String(eh.id),
        beneficiaryId: item.id,
        editedById: String(eh.edited_by_id),
        editedByName: String(eh.edited_by_name),
        editedByRole: String(eh.edited_by_role),
        timestamp: String(eh.timestamp),
        changesSummary: eh.changes_summary ? String(eh.changes_summary) : undefined,
        changesDetail: detail,
        notes: eh.notes ? String(eh.notes) : undefined,
        createdAt: String(eh.created_at),
      };
    });

    // Fetch All Linked Assistance Applications
    const appsRes = await db.execute({
      sql: `SELECT id, application_no, requested_amount, approved_amount, status, assistance_type, applied_date, branch_name 
            FROM assistance_applications WHERE beneficiary_id = ? ORDER BY created_at DESC`,
      args: [item.id],
    });

    const linkedApplications = appsRes.rows.map((a) => ({
      id: String(a.id),
      applicationNo: String(a.application_no),
      requestedAmount: Number(a.requested_amount),
      approvedAmount: a.approved_amount ? Number(a.approved_amount) : undefined,
      status: String(a.status) as ApplicationStatus,
      assistanceType: String(a.assistance_type),
      appliedDate: String(a.applied_date),
      branchName: String(a.branch_name),
    }));

    return {
      ...item,
      editHistory,
      linkedApplications,
      linkedApplicationsCount: linkedApplications.length,
      assistanceApplicationsCount: linkedApplications.length,
    };
  }

  /**
   * 4. เปลี่ยนสถานะการขึ้นทะเบียน (Transition Registration Status)
   * 8 สถานะ: draft, pending_verification, pending_survey, pending_qualification, qualified, disqualified, need_more_info, suspended
   */
  static async transitionRegistryStatus(
    beneficiaryId: string,
    newStatus: RegistrationStatus,
    reason: string,
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    const benRes = await db.execute({
      sql: 'SELECT id, registration_no, registration_status, full_name FROM beneficiaries WHERE id = ?',
      args: [beneficiaryId],
    });

    if (benRes.rows.length === 0) {
      throw new Error(`ไม่พบทะเบียนผู้มีสิทธิ์รับซะกาต ${beneficiaryId}`);
    }

    const ben = benRes.rows[0];
    const oldStatus = String(ben.registration_status || 'pending_verification');
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const qualificationDate = newStatus === 'qualified' ? new Date().toISOString().slice(0, 10) : null;

    // Update registration status
    await db.execute({
      sql: `UPDATE beneficiaries SET 
        registration_status = ?,
        qualification_date = COALESCE(?, qualification_date),
        qualification_notes = CASE WHEN ? IN ('qualified', 'disqualified', 'suspended') THEN ? ELSE qualification_notes END,
        qualified_by_id = CASE WHEN ? = 'qualified' THEN ? ELSE qualified_by_id END,
        qualified_by_name = CASE WHEN ? = 'qualified' THEN ? ELSE qualified_by_name END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      args: [
        newStatus,
        qualificationDate,
        newStatus,
        reason || '',
        newStatus,
        actor.id,
        newStatus,
        actor.name,
        beneficiaryId,
      ],
    });

    // Record Registration Status History
    await db.execute({
      sql: `INSERT INTO beneficiary_registration_history (
        id, beneficiary_id, status, timestamp, changed_by_id, changed_by_name, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `reghist-${Date.now()}`,
        beneficiaryId,
        newStatus,
        timestampNow,
        actor.id,
        actor.name,
        reason || `เปลี่ยนสถานะทะเบียนเป็น "${newStatus}"`,
      ],
    });

    // Record Audit Log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'REGISTRATION_STATUS_CHANGED',
        'application',
        String(ben.registration_no || beneficiaryId),
        `เปลี่ยนสถานะทะเบียนของ ${ben.full_name} จาก ${oldStatus} เป็น ${newStatus} (เหตุผล: ${reason || '-'}) โดย ${actor.name}`,
      ],
    });

    return {
      beneficiaryId,
      registrationNo: ben.registration_no,
      oldStatus,
      newStatus,
      registrationStatus: newStatus,
      reason,
    };
  }

  /**
   * 5. บันทึก / อัปเดตแบบตรวจสอบหลักเกณฑ์ (Checklist) ของทะเบียนผู้มีสิทธิ์
   */
  static async updateBeneficiaryChecklist(
    beneficiaryId: string,
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
      sql: `UPDATE beneficiaries SET evaluator_checklist = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [JSON.stringify(fullChecklist), beneficiaryId],
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
        beneficiaryId,
        `บันทึกผลตรวจสอบหลักเกณฑ์คุณสมบัติ (Checklist) สำหรับทะเบียน ${beneficiaryId}`,
      ],
    });

    return { beneficiaryId, checklist: fullChecklist };
  }

  /**
   * 6. ยื่นคำร้องขอความช่วยเหลือใหม่ (Assistance Request)
   * เชื่อมโยงกับ Beneficiary Registry โดยไม่เปลี่ยนสถานะทะเบียนโดยอัตโนมัติ
   */
  static async createAssistanceRequest(
    input: AssistanceRequestInput,
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    // 1. Upfront Member Ownership Check
    const cleanNationalId = input.nationalId ? input.nationalId.replace(/[^0-9]/g, '') : '';
    const lookupId = input.beneficiaryId || '';

    if (actor.role === 'member') {
      const actorCleanNationalId = actor.nationalId ? actor.nationalId.replace(/[^0-9]/g, '') : '';
      if (cleanNationalId && actorCleanNationalId && cleanNationalId !== actorCleanNationalId) {
        throw new Error('ท่านไม่มีสิทธิ์ยื่นคำร้องแทนบุคคลอื่น หรือไม่มีความเชื่อมโยงกับทะเบียนนี้');
      }
      if (lookupId && actor.beneficiaryId && lookupId !== actor.beneficiaryId) {
        throw new Error('ท่านไม่มีสิทธิ์ยื่นคำร้องแทนบุคคลอื่น หรือไม่มีความเชื่อมโยงกับทะเบียนนี้');
      }
    }

    // 2. Verify beneficiary registration exists
    let benRes = await db.execute({
      sql: `SELECT id, full_name, national_id, member_id, asnaf_category, branch_id, branch_name, 
                   registration_no, registration_status 
            FROM beneficiaries 
            WHERE (id = ? AND ? != '') 
               OR (registration_no = ? AND ? != '') 
               OR (national_id = ? AND ? != '')`,
      args: [lookupId, lookupId, lookupId, lookupId, cleanNationalId, cleanNationalId],
    });

    if (benRes.rows.length === 0) {
      throw new Error(
        'เลขบัตรประชาชนนี้ยังไม่ได้ขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต กรุณาดำเนินการขึ้นทะเบียนผู้มีสิทธิ์รับซะกาตก่อนยื่นคำร้องขอความช่วยเหลือ'
      );
    }

    const ben = benRes.rows[0];

    // 3. Member Ownership & Permission Verification
    if (actor.role === 'member') {
      const actorCleanNationalId = actor.nationalId ? actor.nationalId.replace(/[^0-9]/g, '') : '';
      const isOwner = 
        (ben.member_id && String(ben.member_id) === actor.id) ||
        (actorCleanNationalId && String(ben.national_id) === actorCleanNationalId) ||
        (actor.beneficiaryId && String(ben.id) === String(actor.beneficiaryId));

      if (!isOwner) {
        throw new Error('ท่านไม่มีสิทธิ์ยื่นคำร้องแทนบุคคลอื่น หรือไม่มีความเชื่อมโยงกับทะเบียนนี้');
      }

      // Check registration status: suspended or disqualified cannot apply
      if (['suspended', 'disqualified'].includes(String(ben.registration_status))) {
        const statusLabel = ben.registration_status === 'suspended' ? 'ระงับทะเบียน' : 'ไม่มีคุณสมบัติตามเกณฑ์';
        throw new Error(`ทะเบียนนี้อยู่ในสถานะ "${statusLabel}" จึงไม่สามารถยื่นคำร้องขอความช่วยเหลือได้`);
      }
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const appliedDateStr = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

    // Generate Application Serial Number (APP-2569-XXXX)
    const countRes = await db.execute('SELECT COUNT(*) as total FROM assistance_applications');
    const seq = Number(countRes.rows[0].total) + 1;
    const applicationNo = `APP-2569-${seq.toString().padStart(4, '0')}`;
    const applicationId = `app-${Date.now()}`;
    const initialStatus: ApplicationStatus = 'submitted';

    await db.execute({
      sql: `INSERT INTO assistance_applications (
        id, application_no, beneficiary_id, member_id, registration_no, asnaf_category, requested_amount,
        status, urgency_level, assigned_officer_id, assigned_officer_name, applied_date,
        branch_id, branch_name, assistance_type, assistance_type_id, assistance_group, assistance_type_details, necessity_details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        applicationId,
        applicationNo,
        ben.id,
        ben.member_id || (actor.role === 'member' ? actor.id : (input.memberId || null)),
        ben.registration_no,
        input.asnafCategory || String(ben.asnaf_category) || 'miskin',
        input.requestedAmount || 0,
        initialStatus,
        input.urgencyLevel || 'normal',
        actor.id,
        actor.name,
        appliedDateStr,
        input.branchId || String(ben.branch_id) || 'br-hq',
        input.branchName || String(ben.branch_name) || 'สำนักงานใหญ่ กรุงเทพมหานคร',
        input.assistanceType || input.assistanceTypeId || 'ปัจจัยยังชีพ',
        input.assistanceTypeId || null,
        input.assistanceGroup || 'core',
        input.assistanceTypeDetails || input.requestedItemsDetail || '',
        input.necessityDetails || '',
      ],
    });

    // Insert Application Documents with Cloud Storage metadata
    if (input.documents && input.documents.length > 0) {
      for (const doc of input.documents) {
        await db.execute({
          sql: `INSERT INTO application_documents (
            id, application_id, beneficiary_id, name, category, file_url, status, upload_date,
            storage_provider, storage_path, file_size, mime_type, checksum
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            applicationId,
            String(ben.id),
            doc.name || 'เอกสารประกอบคำร้อง',
            doc.category || 'other_doc',
            doc.fileUrl || '/docs/file.pdf',
            'pending',
            timestampNow,
            doc.storageProvider || 'local',
            doc.storagePath || doc.fileUrl || '',
            doc.fileSize || 0,
            doc.mimeType || 'application/pdf',
            doc.checksum || '',
          ],
        });
      }
    }

    // Insert Application History
    await db.execute({
      sql: `INSERT INTO application_history (id, application_id, status, timestamp, changed_by_id, changed_by_name, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `hist-${Date.now()}`,
        applicationId,
        initialStatus,
        timestampNow,
        actor.id,
        actor.name,
        `ยื่นคำร้องขอความช่วยเหลือประเภท "${input.assistanceType}" วงเงิน ฿${(input.requestedAmount || 0).toLocaleString()} บาท`,
      ],
    });

    // Record Audit Log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'APPLICATION_SUBMITTED',
        'application',
        applicationNo,
        `ยื่นคำร้องขอความช่วยเหลือใหม่: ${applicationNo} สำหรับผู้รับ ${ben.full_name} (${ben.registration_no || ''})`,
      ],
    });

    return {
      id: applicationId,
      applicationId,
      applicationNo,
      beneficiaryId: input.beneficiaryId,
      beneficiaryName: ben.full_name,
      registrationNo: ben.registration_no,
      status: initialStatus,
    };
  }

  /**
   * 7. ดึงสถิติแยก Dashboard Cards ทั้ง 6 รายการจากฐานข้อมูลจริง
   */
  static async getSeparatedDashboardStats(): Promise<DashboardSeparatedStats> {
    await initDb();
    const db = getDb();

    // 1. จำนวนผู้ขึ้นทะเบียนทั้งหมด
    const totalRegRes = await db.execute('SELECT COUNT(*) as total FROM beneficiaries');
    const totalRegisteredBeneficiaries = Number(totalRegRes.rows[0].total || 0);

    // 2. จำนวนทะเบียนที่รอตรวจสอบ (draft, pending_verification, pending_survey, pending_qualification, need_more_info)
    const pendingRegRes = await db.execute(`
      SELECT COUNT(*) as total FROM beneficiaries 
      WHERE registration_status IN ('draft', 'pending_verification', 'pending_survey', 'pending_qualification', 'need_more_info')
         OR registration_status IS NULL
    `);
    const pendingVerificationRegistries = Number(pendingRegRes.rows[0].total || 0);

    // 3. จำนวนผู้ผ่านการพิจารณาคุณสมบัติ (qualified)
    const qualifiedRegRes = await db.execute(`
      SELECT COUNT(*) as total FROM beneficiaries WHERE registration_status = 'qualified'
    `);
    const qualifiedBeneficiaries = Number(qualifiedRegRes.rows[0].total || 0);

    // 4. จำนวนคำร้องขอความช่วยเหลือที่รอดำเนินการ (submitted, doc_review, assessment, pending_approval)
    const pendingAppsRes = await db.execute(`
      SELECT COUNT(*) as total FROM assistance_applications 
      WHERE status IN ('submitted', 'doc_review', 'assessing', 'assessment', 'pending_approval', 'need_info')
    `);
    const pendingAssistanceRequests = Number(pendingAppsRes.rows[0].total || 0);

    // 5. จำนวนคำร้องที่อนุมัติแล้ว (approved, wait_disbursement)
    const approvedAppsRes = await db.execute(`
      SELECT COUNT(*) as total FROM assistance_applications 
      WHERE status IN ('approved', 'wait_disbursement')
    `);
    const approvedAssistanceRequests = Number(approvedAppsRes.rows[0].total || 0);

    // 6. จำนวนรายการช่วยเหลือที่ดำเนินการเสร็จสิ้น (disbursed, closed)
    const completedAppsRes = await db.execute(`
      SELECT COUNT(*) as total FROM assistance_applications 
      WHERE status IN ('disbursed', 'closed')
    `);
    const completedAssistanceDisbursed = Number(completedAppsRes.rows[0].total || 0);

    return {
      totalRegisteredBeneficiaries,
      pendingVerificationRegistries,
      qualifiedBeneficiaries,
      pendingAssistanceRequests,
      approvedAssistanceRequests,
      completedAssistanceDisbursed,

      // Aliases
      totalRegistries: totalRegisteredBeneficiaries,
      qualifiedRegistries: qualifiedBeneficiaries,
      pendingRequests: pendingAssistanceRequests,
      approvedRequests: approvedAssistanceRequests,
      completedAssistance: completedAssistanceDisbursed,
    } as any;
  }

  /**
   * 8. ปรับปรุงข้อมูลทะเบียนผู้มีสิทธิ์รับซะกาตรายบุคคล (Update Beneficiary Registry Details)
   * รองรับการแก้ไขข้อมูล 9 หมวด, บันทึกพิกัด Google Maps, ตรวจสอบสิทธิ์, และบันทึกประวัติการเปลี่ยนแปลง
   * ข้อกำหนดสำคัญ: ห้ามเปลี่ยนผลการอนุมัติหรือสถานะคุณสมบัติโดยอัตโนมัติเพียงเพราะแก้ไขข้อมูล
   */
  static async updateBeneficiaryRegistry(
    beneficiaryId: string,
    rawInput: Partial<BeneficiaryProfileInput> | any,
    rawActor?: ActorContext,
    notes?: string
  ) {
    await initDb();
    const db = getDb();

    const input: Partial<BeneficiaryProfileInput> = (rawInput && rawInput.input) ? rawInput.input : (rawInput || {});
    const actor: ActorContext = rawActor || (rawInput && rawInput.actor) || {
      id: 'officer-1',
      name: 'เจ้าหน้าที่ผู้รับผิดชอบ',
      role: 'officer',
    };

    // 1. ค้นหาข้อมูลเดิม
    const curRes = await db.execute({
      sql: `SELECT 
        b.id, b.household_id, b.registration_no, b.registration_status, b.member_id,
        b.full_name, b.national_id, b.phone, b.email, b.occupation, b.marital_status,
        b.asnaf_category, b.title_prefix, b.birth_date, b.age, b.branch_id, b.branch_name,
        b.postcode, b.subdistrict as ben_subdistrict, b.evaluator_checklist,
        b.disability_notes, b.illness_notes, b.living_limitations, b.hardship_reasons,
        COALESCE(b.latitude, h.latitude) as latitude,
        COALESCE(b.longitude, h.longitude) as longitude,
        COALESCE(b.residence_address, h.residence_address) as residence_address,
        COALESCE(b.place_name, h.place_name) as place_name,
        b.location_updated_at, b.location_updated_by,
        COALESCE(b.location_verification_status, h.location_verification_status, 'not_specified') as location_verification_status,
        h.household_no, h.address, h.province, h.district, h.subdistrict, h.community,
        h.housing_type, h.housing_condition, h.housing_notes, h.land_title_type, h.land_title_notes,
        h.monthly_income, h.monthly_expense, h.debt_amount, h.debt_purpose,
        h.income_breakdown, h.expense_breakdown, h.past_assistance, h.family_situation_summary,
        h.urgent_needs, h.dependent_burdens, h.coordinator_info, h.certifier_info
      FROM beneficiaries b
      JOIN households h ON b.household_id = h.id
      WHERE b.id = ? OR b.registration_no = ?`,
      args: [beneficiaryId, beneficiaryId],
    });

    if (curRes.rows.length === 0) {
      throw new Error(`ไม่พบทะเบียนผู้มีสิทธิ์รับซะกาตรหัส ${beneficiaryId}`);
    }

    const cur = curRes.rows[0];
    const bId = String(cur.id);
    const hhId = String(cur.household_id);

    // 2. ตรวจสอบสิทธิ์ (RBAC)
    if (actor.role === 'member') {
      const isOwner =
        (cur.member_id && cur.member_id === actor.id) ||
        (cur.id === actor.beneficiaryId) ||
        (actor.nationalId && cur.national_id === actor.nationalId);
      if (!isOwner) {
        throw new Error('ท่านไม่มีสิทธิ์แก้ไขข้อมูลทะเบียนของบุคคลอื่น (อนุญาตเฉพาะเจ้าของทะเบียนตามนโยบายมูลนิธิ)');
      }
    } else if (!['officer', 'super_admin', 'approver', 'executive'].includes(actor.role)) {
      throw new Error(`บทบาท ${actor.role} ไม่มีสิทธิ์ในการแก้ไขข้อมูลทะเบียนผู้มีสิทธิ์รับซะกาต`);
    }

    // 3. ตรวจสอบความถูกต้องของเลขบัตรประชาชน (หากมีการแก้ไข)
    let cleanNationalId = cur.national_id ? String(cur.national_id) : '';
    if (input.nationalId !== undefined && input.nationalId !== null) {
      const clean = String(input.nationalId).replace(/[^0-9]/g, '');
      if (clean && clean !== cleanNationalId) {
        if (clean.length !== 13) {
          throw new Error('หมายเลขบัตรประชาชนต้องมี 13 หลัก');
        }
        const dupCheck = await db.execute({
          sql: 'SELECT id, full_name, registration_no FROM beneficiaries WHERE national_id = ? AND id != ?',
          args: [clean, bId],
        });
        if (dupCheck.rows.length > 0) {
          const dup = dupCheck.rows[0];
          throw new Error(`ตรวจสอบพบข้อมูลซ้ำ! หมายเลขบัตรประชาชน ${maskNationalId(clean)} มีอยู่ในระบบแล้ว (${dup.full_name})`);
        }
        cleanNationalId = clean;
      }
    }

    // 3.1 ตรวจสอบวันเกิดและคำนวณอายุอัตโนมัติฝั่ง Server
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
      } else {
        updateBirthDate = null;
        updateAge = null;
      }
    } else if (input.age !== undefined) {
      updateAge = input.age !== null ? Number(input.age) : null;
    }

    // 3.2 ตรวจสอบความถูกต้องและสอดคล้องของที่อยู่ (Address Consistency Check)
    const targetPostcode = input.postcode !== undefined ? input.postcode : cur.postcode;
    const targetProvince = input.province !== undefined ? input.province : cur.province;
    const targetDistrict = input.district !== undefined ? input.district : cur.district;
    const targetSubdistrict = input.subdistrict !== undefined ? input.subdistrict : (cur.subdistrict || cur.ben_subdistrict);

    if (input.postcode !== undefined || input.province !== undefined || input.district !== undefined || input.subdistrict !== undefined) {
      if (targetPostcode && targetProvince && targetDistrict && targetSubdistrict) {
        const addrCheck = validateAddress(
          targetPostcode ? String(targetPostcode) : '',
          targetProvince ? String(targetProvince) : '',
          targetDistrict ? String(targetDistrict) : '',
          targetSubdistrict ? String(targetSubdistrict) : ''
        );
        if (!addrCheck.isValid) {
          throw new Error(`ข้อมูลที่อยู่ไม่ถูกต้องหรือไม่สัมพันธ์กัน: ${addrCheck.message}`);
        }
      }
    }

    // 4. ตรวจสอบพิกัดภูมิศาสตร์ (-90 <= lat <= 90, -180 <= lng <= 180)
    let newLat: number | null = cur.latitude !== null && cur.latitude !== undefined && cur.latitude !== '' ? Number(cur.latitude) : null;
    let newLng: number | null = cur.longitude !== null && cur.longitude !== undefined && cur.longitude !== '' ? Number(cur.longitude) : null;
    let locationChanged = false;

    if (input.latitude !== undefined) {
      if (input.latitude === null || input.latitude === ('' as any)) {
        if (newLat !== null) {
          newLat = null;
          locationChanged = true;
        }
      } else {
        const parsedLat = Number(input.latitude);
        if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
          throw new Error('ละติจูดต้องอยู่ระหว่าง -90 ถึง 90 องศา');
        }
        if (parsedLat !== newLat) {
          newLat = parsedLat;
          locationChanged = true;
        }
      }
    }

    if (input.longitude !== undefined) {
      if (input.longitude === null || input.longitude === ('' as any)) {
        if (newLng !== null) {
          newLng = null;
          locationChanged = true;
        }
      } else {
        const parsedLng = Number(input.longitude);
        if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
          throw new Error('ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180 องศา');
        }
        if (parsedLng !== newLng) {
          newLng = parsedLng;
          locationChanged = true;
        }
      }
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const locationUpdatedAt = locationChanged
      ? timestampNow
      : (cur.location_updated_at ? String(cur.location_updated_at) : (newLat && newLng ? timestampNow : null));
    const locationUpdatedBy = locationChanged
      ? `${actor.name} (${actor.role})`
      : (cur.location_updated_by ? String(cur.location_updated_by) : (newLat && newLng ? `${actor.name} (${actor.role})` : null));

    // 5. บันทึกและเปรียบเทียบการเปลี่ยนแปลง (Field-level Diffs)
    const changes: RegistryChangeItem[] = [];
    const checkField = (field: string, fieldLabel: string, oldVal: any, newVal: any) => {
      if (newVal === undefined) return;
      const normalizedOld = oldVal === null || oldVal === undefined ? '' : String(oldVal);
      const normalizedNew = newVal === null || newVal === undefined ? '' : String(newVal);
      if (normalizedOld !== normalizedNew) {
        changes.push({
          field,
          fieldLabel,
          oldValue: oldVal ?? '-',
          newValue: newVal ?? '-',
        });
      }
    };

    checkField('titlePrefix', 'คำนำหน้า', cur.title_prefix, input.titlePrefix);
    checkField('fullName', 'ชื่อ-นามสกุล', cur.full_name, input.fullName);
    checkField('nationalId', 'เลขบัตรประชาชน', cur.national_id, cleanNationalId);
    checkField('phone', 'เบอร์โทรศัพท์', cur.phone, input.phone);
    checkField('email', 'อีเมล', cur.email, input.email);
    checkField('occupation', 'อาชีพหลัก', cur.occupation, input.occupation);
    checkField('maritalStatus', 'สถานภาพสมรส', cur.marital_status, input.maritalStatus);
    checkField('asnafCategory', 'หมวดอัสนาฟ', cur.asnaf_category, input.asnafCategory);
    checkField('address', 'ที่อยู่', cur.address, input.address);
    checkField('province', 'จังหวัด', cur.province, input.province);
    checkField('district', 'อำเภอ/เขต', cur.district, input.district);
    checkField('subdistrict', 'ตำบล/แขวง', cur.subdistrict, input.subdistrict);
    checkField('community', 'ชุมชน', cur.community, input.community);
    checkField('postcode', 'รหัสไปรษณีย์', cur.postcode, input.postcode);
    checkField('monthlyIncome', 'รายได้รวมต่อเดือน', cur.monthly_income, input.monthlyIncome);
    checkField('monthlyExpense', 'รายจ่ายรวมต่อเดือน', cur.monthly_expense, input.monthlyExpense);
    checkField('debtAmount', 'ภาระหนี้สิน', cur.debt_amount, input.debtAmount);
    checkField('debtPurpose', 'วัตถุประสงค์หนี้สิน', cur.debt_purpose, input.debtPurpose || input.debtType);
    checkField('housingType', 'ประเภทที่อยู่อาศัย', cur.housing_type, input.housingType);
    checkField('housingCondition', 'สภาพบ้านพัก', cur.housing_condition, input.housingCondition);
    checkField('housingNotes', 'หมายเหตุสภาพบ้าน', cur.housing_notes, input.housingNotes);
    checkField('latitude', 'พิกัดละติจูด (Google Maps)', cur.latitude, newLat);
    checkField('longitude', 'พิกัดลองจิจูด (Google Maps)', cur.longitude, newLng);
    checkField('residenceAddress', 'ที่อยู่อาศัยระบุบนแผนที่', cur.residence_address, input.residenceAddress);
    checkField('placeName', 'ชื่อสถานที่/จุดอ้างอิงบนแผนที่', cur.place_name, input.placeName);
    const newLocationStatus = input.locationVerificationStatus !== undefined
      ? input.locationVerificationStatus
      : (newLat !== null && newLng !== null ? (cur.location_verification_status === 'verified' ? 'verified' : 'pending_verification') : 'not_specified');
    checkField('locationVerificationStatus', 'สถานะการตรวจสอบพิกัด', cur.location_verification_status, newLocationStatus);
    checkField('familySituationSummary', 'สรุปสภาพความเป็นอยู่', cur.family_situation_summary, input.familySituationSummary);
    checkField('urgentNeeds', 'ความจำเป็นเร่งด่วน', cur.urgent_needs, input.urgentNeeds);
    checkField('dependentBurdens', 'ภาระพึ่งพิง', cur.dependent_burdens, input.dependentBurdens);

    // 6. อัปเดตข้อมูลตาราง beneficiaries (ห้ามแตะ registration_status)
    await db.execute({
      sql: `UPDATE beneficiaries SET
        title_prefix = COALESCE(?, title_prefix),
        full_name = COALESCE(?, full_name),
        national_id = ?,
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        birth_date = COALESCE(?, birth_date),
        age = COALESCE(?, age),
        occupation = COALESCE(?, occupation),
        marital_status = COALESCE(?, marital_status),
        asnaf_category = COALESCE(?, asnaf_category),
        postcode = COALESCE(?, postcode),
        subdistrict = COALESCE(?, subdistrict),
        branch_id = COALESCE(?, branch_id),
        branch_name = COALESCE(?, branch_name),
        disability_notes = COALESCE(?, disability_notes),
        illness_notes = COALESCE(?, illness_notes),
        living_limitations = COALESCE(?, living_limitations),
        hardship_reasons = CASE WHEN ? IS NOT NULL THEN ? ELSE hardship_reasons END,
        evaluator_checklist = CASE WHEN ? IS NOT NULL THEN ? ELSE evaluator_checklist END,
        latitude = ?,
        longitude = ?,
        residence_address = COALESCE(?, residence_address),
        place_name = COALESCE(?, place_name),
        location_updated_at = COALESCE(?, location_updated_at),
        location_updated_by = COALESCE(?, location_updated_by),
        location_verification_status = COALESCE(?, location_verification_status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      args: [
        input.titlePrefix || null,
        input.fullName || null,
        cleanNationalId,
        input.phone || null,
        input.email !== undefined ? input.email : null,
        input.birthDate !== undefined ? updateBirthDate : null,
        input.birthDate !== undefined ? updateAge : (input.age !== undefined ? (input.age !== null ? Number(input.age) : null) : null),
        input.occupation !== undefined ? input.occupation : null,
        input.maritalStatus || null,
        input.asnafCategory || null,
        input.postcode || null,
        input.subdistrict || null,
        input.branchId || null,
        input.branchName || null,
        input.disabilityNotes !== undefined ? input.disabilityNotes : null,
        input.illnessNotes !== undefined ? input.illnessNotes : null,
        input.livingLimitations !== undefined ? input.livingLimitations : null,
        input.hardshipReasons ? JSON.stringify(input.hardshipReasons) : null,
        input.hardshipReasons ? JSON.stringify(input.hardshipReasons) : null,
        input.evaluatorChecklist ? JSON.stringify(input.evaluatorChecklist) : null,
        input.evaluatorChecklist ? JSON.stringify(input.evaluatorChecklist) : null,
        newLat,
        newLng,
        input.residenceAddress !== undefined ? input.residenceAddress : null,
        input.placeName !== undefined ? input.placeName : null,
        locationUpdatedAt,
        locationUpdatedBy,
        newLocationStatus,
        bId,
      ],
    });

    // 7. อัปเดตข้อมูลตาราง households
    await db.execute({
      sql: `UPDATE households SET
        address = COALESCE(?, address),
        province = COALESCE(?, province),
        district = COALESCE(?, district),
        subdistrict = COALESCE(?, subdistrict),
        community = COALESCE(?, community),
        housing_condition = COALESCE(?, housing_condition),
        housing_notes = COALESCE(?, housing_notes),
        housing_type = COALESCE(?, housing_type),
        land_title_type = COALESCE(?, land_title_type),
        land_title_notes = COALESCE(?, land_title_notes),
        monthly_income = COALESCE(?, monthly_income),
        monthly_expense = COALESCE(?, monthly_expense),
        debt_amount = COALESCE(?, debt_amount),
        debt_purpose = COALESCE(?, debt_purpose),
        income_breakdown = CASE WHEN ? IS NOT NULL THEN ? ELSE income_breakdown END,
        expense_breakdown = CASE WHEN ? IS NOT NULL THEN ? ELSE expense_breakdown END,
        past_assistance = CASE WHEN ? IS NOT NULL THEN ? ELSE past_assistance END,
        family_situation_summary = COALESCE(?, family_situation_summary),
        urgent_needs = COALESCE(?, urgent_needs),
        dependent_burdens = COALESCE(?, dependent_burdens),
        coordinator_info = CASE WHEN ? IS NOT NULL THEN ? ELSE coordinator_info END,
        certifier_info = CASE WHEN ? IS NOT NULL THEN ? ELSE certifier_info END,
        latitude = ?,
        longitude = ?,
        residence_address = COALESCE(?, residence_address),
        place_name = COALESCE(?, place_name),
        location_updated_at = COALESCE(?, location_updated_at),
        location_updated_by = COALESCE(?, location_updated_by),
        location_verification_status = COALESCE(?, location_verification_status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      args: [
        input.address || null,
        input.province || null,
        input.district || null,
        input.subdistrict || null,
        input.community || null,
        input.housingCondition || null,
        input.housingNotes !== undefined ? input.housingNotes : null,
        input.housingType || null,
        input.landTitleType || null,
        input.landTitleNotes !== undefined ? input.landTitleNotes : null,
        input.monthlyIncome !== undefined ? input.monthlyIncome : null,
        input.monthlyExpense !== undefined ? input.monthlyExpense : null,
        input.debtAmount !== undefined ? input.debtAmount : null,
        input.debtPurpose !== undefined ? input.debtPurpose : (input.debtType || null),
        input.incomeBreakdown ? JSON.stringify(input.incomeBreakdown) : null,
        input.incomeBreakdown ? JSON.stringify(input.incomeBreakdown) : null,
        input.expenseBreakdown ? JSON.stringify(input.expenseBreakdown) : null,
        input.expenseBreakdown ? JSON.stringify(input.expenseBreakdown) : null,
        input.pastAssistance ? JSON.stringify(input.pastAssistance) : null,
        input.pastAssistance ? JSON.stringify(input.pastAssistance) : null,
        input.familySituationSummary !== undefined ? input.familySituationSummary : null,
        input.urgentNeeds !== undefined ? input.urgentNeeds : null,
        input.dependentBurdens !== undefined ? input.dependentBurdens : null,
        input.coordinator ? JSON.stringify(input.coordinator) : null,
        input.coordinator ? JSON.stringify(input.coordinator) : null,
        input.certifier ? JSON.stringify(input.certifier) : null,
        input.certifier ? JSON.stringify(input.certifier) : null,
        newLat,
        newLng,
        input.residenceAddress !== undefined ? input.residenceAddress : null,
        input.placeName !== undefined ? input.placeName : null,
        locationUpdatedAt,
        locationUpdatedBy,
        newLocationStatus,
        hhId,
      ],
    });

    // 8. Reconcile สมาชิกในครัวเรือน (Section 3) หากมีการส่งข้อมูลเข้ามา
    if (input.householdMembers && Array.isArray(input.householdMembers)) {
      await db.execute({
        sql: 'DELETE FROM household_members WHERE household_id = ?',
        args: [hhId],
      });
      for (const m of input.householdMembers) {
        if (!m.fullName || !m.fullName.trim()) continue;
        await db.execute({
          sql: `INSERT INTO household_members (
            id, household_id, full_name, relation, age, occupation, monthly_income, health_status, health_notes, education_status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            m.id || `hm-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            hhId,
            m.fullName,
            m.relation || 'สมาชิก',
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
      changes.push({
        field: 'householdMembers',
        fieldLabel: 'ข้อมูลสมาชิกครอบครัว',
        oldValue: 'แก้ไขรายการสมาชิก',
        newValue: `${input.householdMembers.length} คน`,
      });
    }

    // 9. เอกสารแนบ (Section 9) หากมีไฟล์ใหม่
    if (input.documents && Array.isArray(input.documents)) {
      for (const doc of input.documents) {
        if (!doc.fileUrl) continue;
        const docExists = await db.execute({
          sql: 'SELECT id FROM application_documents WHERE beneficiary_id = ? AND file_url = ?',
          args: [bId, doc.fileUrl],
        });
        if (docExists.rows.length === 0) {
          await db.execute({
            sql: `INSERT INTO application_documents (
              id, application_id, beneficiary_id, name, category, file_url, status, upload_date, storage_provider, storage_path, file_size, mime_type, uploaded_by_id, uploaded_by_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              doc.id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              '',
              bId,
              doc.name || doc.fileName || 'เอกสารแนบ',
              doc.category || doc.documentType || 'other_doc',
              doc.fileUrl,
              'verified',
              timestampNow,
              doc.storageProvider || 'local',
              doc.storagePath || null,
              doc.fileSize || 0,
              doc.mimeType || 'application/pdf',
              actor.id,
              actor.name,
            ],
          });
          changes.push({
            field: 'documents',
            fieldLabel: 'เอกสารแนบ',
            oldValue: '-',
            newValue: `เพิ่มไฟล์: ${doc.name || doc.fileName}`,
          });
        }
      }
    }

    // 10. บันทึกประวัติการแก้ไข (beneficiary_edit_history) และ Universal Audit Log
    const changesSummary = changes.length > 0
      ? `แก้ไข ${changes.length} รายการ: ${changes.slice(0, 3).map((c) => c.fieldLabel).join(', ')}${changes.length > 3 ? ' และอื่นๆ' : ''}`
      : (notes || 'บันทึกการปรับปรุงข้อมูลทะเบียน');

    await db.execute({
      sql: `INSERT INTO beneficiary_edit_history (
        id, beneficiary_id, edited_by_id, edited_by_name, edited_by_role, timestamp, changes_summary, changes_detail, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `bedit-${Date.now()}`,
        bId,
        actor.id,
        actor.name,
        actor.role,
        timestampNow,
        changesSummary,
        JSON.stringify(changes),
        notes || null,
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
        'BENEFICIARY_REGISTRY_UPDATED',
        'application',
        String(cur.registration_no || bId),
        `แก้ไขข้อมูลทะเบียน: ${cur.full_name} (${cur.registration_no}) โดย ${actor.name} (${actor.role}): ${changesSummary}`,
      ],
    });

    // 11. ส่งคืนข้อมูลล่าสุดจากฐานข้อมูลจริง
    return await this.getBeneficiaryRegistryById(bId);
  }

  /**
   * 9. ดึงประวัติการแก้ไขข้อมูลทะเบียนรายบุคคล (Registry Edit History)
   */
  static async getRegistryEditHistory(beneficiaryId: string): Promise<RegistryEditHistoryItem[]> {
    await initDb();
    const db = getDb();

    const editHistRes = await db.execute({
      sql: 'SELECT id, beneficiary_id, edited_by_id, edited_by_name, edited_by_role, timestamp, changes_summary, changes_detail, notes, created_at FROM beneficiary_edit_history WHERE beneficiary_id = ? ORDER BY created_at DESC',
      args: [beneficiaryId],
    });

    return editHistRes.rows.map((eh) => {
      let detail: any = [];
      try {
        if (eh.changes_detail) detail = JSON.parse(String(eh.changes_detail));
      } catch {}
      return {
        id: String(eh.id),
        beneficiaryId: String(eh.beneficiary_id),
        editedById: String(eh.edited_by_id),
        editedByName: String(eh.edited_by_name),
        editedByRole: String(eh.edited_by_role),
        timestamp: String(eh.timestamp),
        changesSummary: eh.changes_summary ? String(eh.changes_summary) : undefined,
        changesDetail: detail,
        notes: eh.notes ? String(eh.notes) : undefined,
        createdAt: String(eh.created_at),
      };
    });
  }
}
