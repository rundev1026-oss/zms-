// Zakat Management System (ZMS) Data Types & Models

export type UserRole = 
  | 'super_admin'      // ผู้ดูแลระบบสูงสุด
  | 'executive'        // ผู้บริหาร
  | 'officer'          // เจ้าหน้าที่ช่วยเหลือ/ลงพื้นที่
  | 'approver'         // ผู้อนุมัติ/ผู้ตรวจสอบ
  | 'finance'          // เจ้าหน้าที่การเงินและบัญชี
  | 'member'           // สมาชิกบุคคลทั่วไป
  | 'public';          // ผู้เยี่ยมชม

export type ApplicationStatus =
  | 'draft'               // 1. ร่างคำร้อง
  | 'submitted'           // 2. ยื่นคำร้องแล้ว
  | 'doc_review'          // 3. รอตรวจสอบเอกสาร
  | 'field_inspection'    // 4. รอลงพื้นที่
  | 'pending_approval'    // 5. รอพิจารณา
  | 'approved'            // 6. อนุมัติ
  | 'rejected'            // 7. ไม่อนุมัติ
  | 'disbursed'           // 8. ดำเนินการช่วยเหลือแล้ว
  | 'closed'              // 9. ปิดคำร้อง
  | 'cancelled'           // ยกเลิกคำร้อง
  | 'need_info'           // รอข้อมูลเพิ่มเติม (legacy/sub-state)
  | 'assessment'          // กำลังประเมิน (legacy alias of field_inspection)
  | 'assessing'           // กำลังประเมิน (alias of field_inspection)
  | 'wait_disbursement'   // รอจ่ายเงิน (legacy alias of approved)
  | 'followup';           // ติดตามผลหลังช่วยเหลือ

// สถานะการขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต (Zakat Eligibility Registration Status)
export type RegistrationStatus =
  | 'draft'                  // 1. ร่างทะเบียน
  | 'pending_verification'   // 2. รอตรวจสอบข้อมูล
  | 'pending_survey'         // 3. รอลงพื้นที่สำรวจ
  | 'pending_qualification'  // 4. รอพิจารณาคุณสมบัติ
  | 'qualified'              // 5. มีคุณสมบัติตามเกณฑ์
  | 'disqualified'           // 6. ไม่มีคุณสมบัติตามเกณฑ์
  | 'need_more_info'         // 7. ต้องตรวจสอบเพิ่มเติม
  | 'suspended';             // 8. ระงับหรือยกเลิกทะเบียน

export type AsnafCategory =
  | 'faqir'           // ผู้ยากไร้ (ไม่มีรายได้)
  | 'miskin'          // ผู้ขัดสน (มีรายได้แต่ไม่พอยังชีพ)
  | 'gharimin'        // ผู้มีหนี้สินล้นพ้นตัว
  | 'amil'            // เจ้าหน้าที่จัดการซะกาต
  | 'muallaf'         // ผู้เข้ารับอิสลามใหม่
  | 'fisabilillah'    // เพื่อหนทางของอัลลอฮ์/การศึกษา/สาธารณประโยชน์
  | 'ibnsabil'        // ผู้เดินทางตกยาก
  | 'riqab';          // ปลดปล่อยภาระผูกพัน

export type BranchType = 'headquarters' | 'regional_branch' | 'sub_branch';

export interface Branch {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  branchType?: BranchType;
  parentBranchId?: string | null;
  parentBranchName?: string | null;
  address?: string;
  subdistrict?: string;
  district?: string;
  province: string;
  postcode?: string;
  phone?: string;
  email?: string;
  managerUserId?: string | null;
  managerName?: string;
  managerRoleTitle?: string;
  isHeadquarters: boolean;
  status?: 'active' | 'inactive';
  deactivatedReason?: string | null;
  staffCount?: number;
  departmentCount?: number;
  beneficiaryCount?: number;
  applicationCount?: number;
  disbursedAmountTotal?: number;
  activeFollowUpCount?: number;
  createdById?: string;
  createdByName?: string;
  updatedById?: string;
  updatedByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  description?: string;
  branchId?: string;
  branchName?: string;
  branchCode?: string;
  headUserId?: string | null;
  headName?: string;
  headRoleTitle?: string;
  allowedRoles?: UserRole[];
  status?: 'active' | 'inactive';
  deactivatedReason?: string | null;
  memberCount?: number;
  createdById?: string;
  createdByName?: string;
  updatedById?: string;
  updatedByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: UserRole;
  roleTitleTh: string;
  avatar?: string;
  phone: string;
  branch: string;
  branchId?: string;
  branchName?: string;
  departmentId?: string;
  departmentName?: string;
  status: 'active' | 'suspended' | 'disabled';
  passwordSetupStatus?: 'pending_setup' | 'completed';
  authUserId?: string;
  hasPassword?: boolean;
  lastLogin?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  pdpaConsentDate?: string;
  pdpaConsentVersion?: string;
  notificationEmail?: boolean;
  notificationSms?: boolean;
  notificationApp?: boolean;
  nationalId?: string;
  beneficiaryId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// แบบสำรวจผู้มีสิทธิ์รับซะกาต ฉบับปรับปรุง (Sections A - I)
// ==========================================

// ส่วน A: ข้อมูลส่วนบุคคลและที่อยู่อาศัย
export type HousingType = 'own' | 'other' | 'rent' | 'relative';
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed' | 'separated';
export type LandTitleType = 'title_deed' | 'ns3' | 'spk' | 'public_land' | 'no_doc' | 'permission_granted' | 'other';

// ส่วน B: เหตุผลและสภาพปัจจุบัน (เลือกได้หลายข้อ)
export interface HardshipReasons {
  poverty?: boolean;              // ยากจนหรือรายได้น้อย
  debt?: boolean;                 // มีหนี้สิน
  debtType?: string;              // ในระบบ / นอกระบบ
  debtAmount?: number;            // จำนวนหนี้
  unemployed?: boolean;           // ตกงาน ไม่มีงานทำ หรือไม่มีอาชีพ
  familyIssue?: boolean;          // ปัญหาครอบครัว
  familyIssueDetails?: string;
  disability?: boolean;           // ความพิการ
  disabilityDetails?: string;
  illness?: boolean;              // การเจ็บป่วย (เรื้อรัง/ติดเตียง)
  illnessDetails?: string;
  other?: boolean;                // เหตุผลอื่น ๆ
  otherDetails?: string;
}

// ส่วน C: ประเภทความช่วยเหลือ
export interface AssistanceTypeItem {
  id: string;
  code: string;
  name: string;
  group?: 'core' | 'specific';
  groupLabelTh?: string;
  category: 'cash' | 'in_kind' | 'service' | 'housing' | 'education' | 'medical' | 'other';
  description?: string;
  requiredDocuments?: string[];
  orderIndex?: number;
  isActive: boolean;
}

// ส่วน D: ประวัติการช่วยเหลือจากหน่วยงานอื่น
export interface PastAssistanceRecord {
  id: string;
  hasReceived: boolean;
  agency: string;
  assistanceType: string;
  format?: 'cash' | 'in_kind' | string; // รูปแบบ: เงิน หรือ สิ่งของ
  amountOrItems: string;                // จำนวนเงิน หรือ รายละเอียดสิ่งของ
  yearReceived: string;                 // ปี หรือ วันที่ได้รับ
  dateReceived?: string;
  evidenceDoc?: string;                 // เอกสารหลักฐาน
  notes?: string;                       // หมายเหตุ
}

// ส่วน E: รายรับและรายจ่ายครัวเรือน
export interface HouseholdIncomeBreakdown {
  salary: number;                 // 1. ค่าจ้าง
  familySupport: number;          // 2. เงินจากสมาชิกครอบครัว
  agriculture: number;            // 3. การขายผลผลิตเกษตร
  trading: number;                // 4. การค้าขาย
  assetIncome: number;            // 5. รายได้จากทรัพย์สิน
  freelance: number;              // 6. อาชีพส่วนตัว
  welfare: number;                // 7. เงินช่วยเหลือหรือสวัสดิการ
  otherIncome: number;            // 8. รายการอื่น
  otherIncomeNotes?: string;
}

export interface HouseholdExpenseBreakdown {
  living: number;                 // 1. ค่าอุปโภคบริโภค
  education: number;              // 2. ค่าใช้จ่ายการศึกษา
  healthcare: number;             // 3. ค่าใช้จ่ายสุขภาพ
  utilities: number;              // 4. ค่าน้ำและค่าไฟ
  rent: number;                   // 5. ค่าเช่าบ้าน
  debtPayment: number;            // 6. ชำระหนี้
  otherExpense: number;           // 7. รายการอื่น
  otherExpenseNotes?: string;
}

// ส่วน F: สมาชิกครอบครัว
export interface HouseholdMember {
  id: string;
  fullName: string;
  relation: string; // เช่น บุตร, บิดา, คู่สมรส
  age: number;
  educationStatus?: string; // ระดับการศึกษา
  occupation: string;
  monthlyIncome: number;
  healthStatus: 'healthy' | 'chronically_ill' | 'disabled' | 'elderly';
  healthNotes?: string;
  notes?: string;
}

// ส่วน H: ผู้ประสานงานและผู้รับรอง
export interface CoordinatorInfo {
  fullName?: string;
  name?: string;
  phone: string;
  occupation?: string;
  relationship?: string;
  roleTitle?: string;
  age?: number;
  address?: string;
  organization?: string;
}

export interface CertifierInfo {
  certifierType?: 'imam' | 'village_head' | 'community_leader' | 'other' | string;
  fullName?: string;
  name?: string;
  roleTitle?: string;
  position?: string;
  phone: string;
  organization?: string;
  comments?: string;
  certifiedDate?: string;
  certificationDocument?: string;
}

// หลักเกณฑ์การพิจารณา (Checklist สำหรับเจ้าหน้าที่และคณะกรรมการ)
export interface EvaluatorChecklist {
  amalIbadah: boolean;                  // การประกอบอามั้ลและอิบาดะฮ์
  amalIbadahNotes?: string;
  landRights: boolean;                  // เอกสารสิทธิ์หรือการอนุญาตใช้ที่ดิน
  landRightsNotes?: string;
  housingCondition: boolean;            // สภาพที่อยู่อาศัย (ซ่อม/สร้างบ้าน)
  housingConditionNotes?: string;
  economicStatus: boolean;              // ฐานะทางเศรษฐกิจและหนี้สิน
  economicStatusNotes?: string;
  communityParticipation: boolean;      // การมีส่วนร่วมของชุมชน
  communityParticipationNotes?: string;
  leaderEndorsement: boolean;           // การรับรองจากผู้นำท้องถิ่น
  leaderEndorsementNotes?: string;
  asnafVulnerability: boolean;          // การเป็นผู้ด้อยโอกาสตาม 8 อัสนาฟ
  asnafVulnerabilityNotes?: string;
  dependentBurdens: boolean;            // ภาระเด็ก/ผู้สูงอายุ/เจ็บป่วยเรื้อรัง
  dependentBurdensNotes?: string;
  committeeNotes?: string;              // ข้อคิดเห็นเพิ่มเติม
  checkedBy?: string;
  checkedAt?: string;
}

export interface BeneficiaryDocument {
  id: string;
  name: string;
  category: 'id_card' | 'house_reg' | 'income_proof' | 'medical_cert' | 'debt_doc' | 'field_photo' | 'family_photo' | 'housing_interior' | 'housing_exterior' | 'land_doc' | 'other_doc';
  fileUrl: string;
  uploadDate: string;
  status: 'pending' | 'verified' | 'rejected';
  verifiedBy?: string;
  rejectionReason?: string;
  fileSize?: number;
  mimeType?: string;
  storageProvider?: 's3' | 'cloudinary' | 'local';
  storagePath?: string;
  checksum?: string;
  isConfidential?: boolean;
  uploadedById?: string;
  uploadedByName?: string;
  fileExists?: boolean;
}

export interface BeneficiaryAssessment {
  id: string;
  assessedBy: string;
  assessedDate: string;
  housingCondition: 'dilapidated' | 'poor' | 'fair' | 'rented' | 'owned';
  housingNotes: string;
  livingScore: number; // 0 - 100
  debtBurdenSummary: string;
  primaryHardship: string;
  officerRecommendation: 'recommend_full' | 'recommend_partial' | 'recommend_decline';
  recommendedAmount: number;
  recommendedFundId: string;
  generalNotes: string;
}

export interface AssistanceApplication {
  id: string;
  applicationNo: string; // เช่น APP-2569-0012
  registrationNo?: string; // เช่น REG-2569-0001
  beneficiaryId: string;
  memberId?: string; // รหัสสมาชิกเจ้าของคำร้อง
  fullName: string;
  titlePrefix?: string;
  birthDate?: string;
  age?: number;
  nationalId?: string; // 13-digit raw (when permitted)
  nationalIdMasked: string; // 1-1002-XXXXX-XX-1
  phone: string;
  address: string;
  province: string;
  district: string;
  subdistrict?: string;
  postcode?: string;
  community: string;
  asnafCategory: AsnafCategory;
  appliedDate: string;
  requestedAmount: number;
  approvedAmount?: number;
  disbursedAmount?: number;
  status: ApplicationStatus;
  urgencyLevel: 'urgent' | 'high' | 'normal';
  assignedOfficerId: string;
  assignedOfficerName: string;
  branchId?: string;
  branchName?: string;
  assistanceTypeId?: string;
  assistanceTypeGroup?: 'core' | 'specific';
  
  // Sections A-I fields
  maritalStatus?: MaritalStatus;
  occupation?: string;
  housingType?: HousingType;
  housingCondition?: string;
  housingNotes?: string;
  landTitleType?: LandTitleType;
  landTitleNotes?: string;
  hardshipReasons?: HardshipReasons;
  assistanceType?: string;
  assistanceTypeDetails?: string;
  necessityDetails?: string;
  pastAssistance?: PastAssistanceRecord[];
  monthlyIncome?: number;
  monthlyExpense?: number;
  debtAmount?: number;
  debtPurpose?: string;
  incomeBreakdown?: HouseholdIncomeBreakdown;
  expenseBreakdown?: HouseholdExpenseBreakdown;
  netIncome?: number;
  familySituationSummary?: string;
  urgentNeeds?: string;
  dependentBurdens?: string;
  coordinator?: CoordinatorInfo;
  certifier?: CertifierInfo;
  checklist?: EvaluatorChecklist;
  rejectionReason?: string;

  householdMembers: HouseholdMember[];
  documents: BeneficiaryDocument[];
  assessment?: BeneficiaryAssessment;
  approvalNotes?: string;
  approvedBy?: string;
  approvedDate?: string;
  disbursementProofUrl?: string;
  disbursementDate?: string;
  disbursedBy?: string;
  disbursementRef?: string;
  disbursementNotes?: string;
  statusHistory: {
    status: ApplicationStatus;
    timestamp: string;
    changedBy: string;
    notes: string;
  }[];
}

export interface FundAccount {
  id: string;
  code: string;
  name: string;
  description: string;
  category: 'zakat' | 'sadaqah' | 'operational';
  totalReceived: number;
  committedAmount: number; // ยอดผูกพันรอจ่าย
  disbursedAmount: number; // ยอดจ่ายจริงแล้ว
  availableAmount: number; // ยอดคงเหลือที่จัดสรรได้
  targetGoal?: number;
}

export interface BankAccount {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string; // Stored full, displayed masked (e.g., 095-x-xxx56-7)
  branchName?: string;
  openingBalance: number;
  currentBalance: number;
  reconciledBalance: number;
  lastReconciledAt?: string;
  lastReconciledBy?: string;
  status: 'active' | 'inactive' | 'closed';
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BankReconciliation {
  id: string;
  bankAccountId: string;
  bankAccountName?: string;
  reconciliationDate: string;
  systemBalance: number;
  statementBalance: number;
  difference: number;
  status: 'balanced' | 'discrepancy' | 'adjusted';
  notes?: string;
  proofUrl?: string;
  auditorId: string;
  auditorName: string;
  createdAt: string;
}

export interface CashFlowDisbursementItem {
  id: string;
  withdrawalId: string;
  workflowId: string;
  applicationId: string;
  applicationNo?: string;
  registrationNo?: string;
  beneficiaryId: string;
  beneficiaryName: string;
  nationalId: string;
  asnafCategory: string;
  assistanceType: string;
  areaInfo?: string;
  approvedAmount: number;
  disbursedAmountBefore: number;
  thisDisbursementAmount: number;
  disbursedAmount?: number;
  remainingBalance: number;
  notes?: string;
  status: 'draft' | 'pending_verification' | 'confirmed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface CashMovementHistoryEntry {
  id: string;
  withdrawalId?: string;
  date: string;
  time: string;
  datetime: string;
  workflowNo: string;
  workflowId: string;
  workflowTitle?: string;
  voucherNo: string;
  voucherType?: 'aid_disbursement' | 'office_expense' | 'other_approved' | 'bank_withdrawal' | 'treasurer_deposit' | 'cash_returned' | 'reversal';
  paymentType: string;
  paymentTypeLabel: string;
  isActualDisbursement: boolean;
  payeeName: string;
  payeeType?: 'beneficiary' | 'vendor' | 'custodian' | 'case_worker' | 'bank';
  nationalId?: string;
  asnaf?: string;
  asnafLabel?: string;
  assistanceType?: string;
  expenseCategory?: string;
  expenseCategoryName?: string;
  expenseDetails?: string;
  currency: string;
  amount: number;
  requestedAmount?: number;
  approvedAmount?: number;
  responsiblePerson: string;
  withdrawerName?: string;
  approverName?: string;
  recordedByName?: string;
  sourceFundType?: string;
  sourceFundName?: string;
  bankAccountName?: string;
  status: string;
  statusLabel: string;
  proofUrl?: string;
  proofName?: string;
  proofSize?: number;
  proofType?: string;
  notes?: string;
  // Detail Modal enriched data
  aidItemsCount?: number;
  aidItems?: CashFlowDisbursementItem[];
  clearanceItemsCount?: number;
  clearanceItems?: PettyCashClearanceItem[];
  handoverSummary?: {
    handoverCount: number;
    totalHandedOver: number;
    remainingHandover: number;
    recipientName?: string;
    handovers: FinanceHandoverRecord[];
  };
  attachments?: any[];
  auditLogs?: any[];
  // Legacy compatibility
  category?: 'เบิกเงินจากธนาคาร' | 'ฝากเข้าบัญชีเหรัญญิก' | 'เบิกเงินสดช่วยเหลือ' | 'เบิกเงินสำรองจ่ายสำนักงาน' | 'เคลียร์เงินสำรองจ่าย' | 'คืนเงินสด' | 'รายการปรับปรุงหรือกลับบัญชี';
  categoryKey?: string;
}

export interface PettyCashClearanceItem {
  id: string;
  withdrawalId: string;
  workflowId: string;
  expenseDate: string;
  description: string;
  amount: number;
  receiptUrl?: string;
  receiptName?: string;
  receiptSize?: number;
  receiptType?: string;
  categoryCode?: string;
  categoryName?: string;
  notes?: string;
  status: 'accepted' | 'rejected';
  createdAt?: string;
  updatedAt?: string;
}

export interface CashFlowWithdrawal {
  id: string;
  workflowId: string;
  withdrawalNo: string; // e.g. "01/2569" or "CW-2569-01"
  voucherType?: 'aid_disbursement' | 'office_expense' | 'other_approved';
  requestedAmount?: number;
  approvedAmount?: number;
  actualReceivedAmount?: number;
  amount: number;
  withdrawalDatetime: string;
  withdrawerId: string;
  withdrawerName: string;
  sourceDescription?: string;
  sourceFundType?: string;
  targetAsnaf: string;
  targetFundId?: string;
  purpose: string;
  // Office Expense Petty Cash fields
  expenseCategory?: string; // staff_remuneration, office_supplies, fuel, vehicle_maintenance, internet, travel, accounting, auditing, food_hospitality, electricity, other
  expenseDetails?: string;
  allowedFundId?: string;
  deadlineDate?: string;
  clearanceStatus?: 'not_required' | 'pending_clearance' | 'cleared' | 'over_spent' | 'overspent_approved';
  clearanceSpentAmount?: number;
  clearanceReturnedAmount?: number;
  clearanceExcessAmount?: number;
  clearanceDate?: string;
  clearanceReturnDate?: string;
  clearanceOverspentReason?: string;
  clearanceOverspentApprovedById?: string;
  clearanceOverspentApprovedByName?: string;
  clearanceOverspentApprovedAt?: string;
  clearanceProofUrl?: string;
  clearanceProofName?: string;
  clearanceProofSize?: number;
  clearanceProofType?: string;
  clearanceNotes?: string;
  clearedById?: string;
  clearedByName?: string;
  clearanceItems?: PettyCashClearanceItem[];
  // Aid Disbursement line items
  disbursementItems?: CashFlowDisbursementItem[];
  approverId?: string;
  approverName?: string;
  proofUrl?: string;
  proofName?: string;
  proofSize?: number;
  proofType?: string;
  notes?: string;
  status: 'draft' | 'pending' | 'pending_approval' | 'approved' | 'disbursed' | 'completed' | 'cancelled';
  // Finance Handover to Case Worker fields (TASK 1)
  handoverStatus?: 'not_handed_over' | 'partially_handed_over' | 'fully_handed_over' | 'pending_verification' | 'discrepancy' | 'error' | 'cancelled';
  totalHandedOverAmount?: number;
  remainingHandoverAmount?: number;
  recipientCaseWorkerName?: string;
  recipientCaseWorkerId?: string;
  handoverNotes?: string;
  handoverHistory?: FinanceHandoverRecord[];
  createdAt: string;
  updatedAt: string;
}

export type HandoverStatus =
  | 'not_handed_over'
  | 'partially_handed_over'
  | 'fully_handed_over'
  | 'pending_verification'
  | 'discrepancy'
  | 'error'
  | 'cancelled';

export interface FinanceHandoverRecord {
  id: string;
  withdrawalId: string;
  workflowId: string;
  handoverNo: string;
  handoverDate: string;
  handoverTime: string;
  handedOverById: string;
  handedOverByName: string;
  receivedById?: string;
  receivedByName: string;
  receivedByPosition?: string;
  amount: number;
  handoverMethod: string;
  referenceNo?: string;
  notes?: string;
  proofUrl: string;
  proofName: string;
  proofSize?: number;
  proofType?: string;
  status: HandoverStatus;
  cancellationReason?: string;
  recordedById: string;
  recordedByName: string;
  confirmedById: string;
  confirmedByName: string;
  confirmedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface VoucherHandoverSummary {
  withdrawalId: string;
  withdrawalNo: string;
  workflowId: string;
  workflowNo: string;
  withdrawalDatetime: string;
  amount: number;
  sourceFundType: string;
  sourceDescription?: string;
  targetAsnaf: string;
  assistanceType?: string;
  purpose?: string;
  withdrawerName: string;
  recipientCaseWorkerName?: string;
  totalHandedOverAmount: number;
  remainingHandoverAmount: number;
  handoverStatus: HandoverStatus;
  handoverHistory: FinanceHandoverRecord[];
}

// ==========================================
// TASK 2: Assistance - Finance Handover Linkage Types
// ==========================================
export type FinanceHandoverStatusType = 'not_handed_over' | 'partially_handed_over' | 'fully_handed_over';
export type AssistanceExecutionStatusType = 'not_started' | 'in_progress' | 'wait_confirmation' | 'completed';

export interface AssistanceFinanceDiscrepancy {
  id: string;
  applicationId: string;
  withdrawalId?: string;
  category: 'amount_mismatch' | 'voucher_mismatch' | 'proof_mismatch' | 'other' | string;
  reportedById: string;
  reportedByName: string;
  reportedAt: string;
  expectedAmount?: number;
  actualAmount?: number;
  notes: string;
  status: 'pending_investigation' | 'acknowledged' | 'resolved';
  resolutionNotes?: string;
  resolvedById?: string;
  resolvedByName?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AssistanceFinancialDetail {
  // 13 Fields required by Prompt
  applicationId: string;
  applicationNo: string;                   // 1. เลขที่คำร้องช่วยเหลือ
  registrationNo: string;                  // 2. รหัสทะเบียนผู้มีสิทธิ์รับซะกาต
  beneficiaryName: string;                 // 3. ชื่อผู้รับความช่วยเหลือ
  asnafCategory: string;                   // 4. อัสนัฟ
  asnafLabel: string;                      // ชื่อภาษาไทยอัสนัฟ
  assistanceType: string;                  // 5. ประเภทการช่วยเหลือ
  approvedAmount: number;                  // 6. ยอดอนุมัติ
  withdrawnAmount: number;                 // 7. ยอดเบิกเงินสด (รวมยอดที่เบิกตามใบสำคัญที่ผูกกับคำร้องนี้)
  handedOverAmount: number;                // 8. ยอดที่ฝ่ายการเงินส่งมอบให้ผู้ดูแลแล้ว
  receivedAmount: number;                  // 9. ยอดที่ผู้ดูแลรับจริง
  disbursedAmount: number;                 // 10. ยอดช่วยเหลือที่ดำเนินการจริง (ที่จ่ายให้ผู้รับซะกาตแล้ว)
  remainingBalance: number;                // 11. ยอดคงเหลือ (approvedAmount - disbursedAmount)
  withdrawalNo: string;                    // 12. เลขที่ใบสำคัญการเบิกจ่าย
  voucherNos: string[];                    // รายการเลขที่ใบสำคัญทั้งหมด
  handoverDatetime?: string;               // 13. วันเวลาส่งมอบ
  proofUrl?: string;                       // 13. หลักฐานการส่งมอบ (URL)
  proofName?: string;                      // 13. ชื่อไฟล์หลักฐาน
  proofSize?: number;

  // Dual Statuses
  financeStatus: FinanceHandoverStatusType;
  financeStatusLabel: string;
  assistanceStatus: AssistanceExecutionStatusType;
  assistanceStatusLabel: string;

  // Context & Security
  assignedOfficerId: string;
  assignedOfficerName: string;
  recipientCaseWorkerName?: string;
  canAccess: boolean;
  discrepancies: AssistanceFinanceDiscrepancy[];
  handovers: FinanceHandoverRecord[];
  disbursementItems: {
    id: string;
    withdrawalId: string;
    voucherNo: string;
    amount: number;
    status: string;
  }[];
  statusHistory: {
    status: string;
    statusLabel: string;
    timestamp: string;
    changedBy: string;
    notes?: string;
  }[];
  // Task 3 Extensions
  outcomeStatus?: AssistanceOutcomeStatus;
  outcomeStatusLabel?: string;
  executionRecords?: AssistanceExecutionRecord[];
  currentInstallment?: number;
  installmentCount?: number;

  // Card UI & Linkage Extensions
  appliedDate?: string;                    // วันที่บันทึก/ยื่นคำร้อง
  approvedDate?: string;                   // วันที่อนุมัติ
  disbursementDate?: string;               // วันที่จ่ายเงิน
  actualAssistanceDate?: string;           // วันที่ช่วยเหลือจริง
  purpose?: string;                        // วัตถุประสงค์/รายละเอียดความจำเป็น
  branchName?: string;                     // สาขา/พื้นที่ที่รับผิดชอบ
  area?: string;                           // พื้นที่/ตำบล
  beneficiaryPhoto?: string;               // รูปโปรไฟล์ (ถ้ามี)
  hasFollowUpPlan?: boolean;               // มีแผนติดตามผลหรือไม่
  followUpStatus?: string;                 // สถานะการติดตามผล
}

// ==========================================
// TASK 3: Assistance Completion & Execution Types
// ==========================================
export type AssistanceOutcomeStatus =
  | 'not_started'             // ยังไม่เริ่มดำเนินการ
  | 'in_progress'             // กำลังดำเนินการ
  | 'partially_assisted'      // ช่วยเหลือบางส่วน
  | 'wait_proof_verification' // รอตรวจสอบหลักฐาน
  | 'completed'               // ช่วยเหลือเสร็จสิ้น
  | 'has_issues'              // มีปัญหาหรือรอแก้ไข
  | 'cancelled'               // ยกเลิกพร้อมเหตุผล
  | 'draft';                  // บันทึกร่าง

export interface AssistanceExecutionRecord {
  id: string;
  applicationId: string;
  withdrawalId?: string;
  workflowId?: string;
  installmentNo: number;
  totalInstallments: number;
  assistanceType: string;
  asnafCategory: string;
  asnafLabel?: string;
  executionDate: string;
  executionTime: string;
  executionDatetime: string;
  executorId: string;
  executorName: string;
  assistanceOutcome: string;
  actualDisbursedAmount: number;
  actualAssistanceValue: number;
  details?: string;
  proofUrl?: string;
  proofName?: string;
  proofSize?: number;
  proofType?: string;
  status: AssistanceOutcomeStatus;
  statusLabel?: string;
  isConfirmed: boolean;
  confirmationStatement?: string;
  confirmedById?: string;
  confirmedByName?: string;
  confirmedAt?: string;
  editReason?: string;
  previousValues?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ConfirmAssistanceInput {
  applicationId: string;
  withdrawalId?: string;
  installmentNo?: number;
  totalInstallments?: number;
  executionDate: string;
  executionTime: string;
  assistanceOutcome: string;
  actualDisbursedAmount: number;
  actualAssistanceValue?: number;
  details?: string;
  proofUrl: string;
  proofName: string;
  proofSize?: number;
  proofType?: string;
  isConfirmed: boolean;
  confirmationStatement: string;
  status?: AssistanceOutcomeStatus;
}

export interface WorkflowAttachment {
  id: string;
  workflowId: string;
  withdrawalId?: string;
  stepNumber: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedById: string;
  uploadedByName: string;
  uploadedAt: string;
  description?: string;
}

export interface CashFlowWorkflow {
  id: string;
  workflowNo: string;
  title: string;
  // Step 1: Withdraw from bank
  step1BankAccountId: string;
  step1BankAccountName?: string;
  step1WithdrawAmount: number;
  step1Date: string;
  step1EventDate?: string;
  step1EventTime?: string;
  step1EventDatetime?: string;
  step1FundType?: string;
  step1TransferRef?: string;
  step1RefNo?: string;
  step1OperatorId: string;
  step1OperatorName: string;
  step1WithdrawnByName?: string;
  step1ApproverId?: string;
  step1ApproverName?: string;
  step1ProofUrl?: string;
  step1ProofName?: string;
  step1ProofSize?: number;
  step1ProofType?: string;
  step1Notes?: string;
  step1Status: 'draft' | 'pending_approval' | 'approved' | 'completed' | 'cancelled';
  // Step 2: Deposit to Treasurer (Ruslan Hasamae)
  step2TreasurerId: string;
  step2TreasurerName: string;
  step2HandoverPersonId?: string;
  step2HandoverPersonName?: string;
  step2HandoverDatetime?: string;
  step2HandoverAmount?: number;
  step2DepositAmount?: number;
  step2ReceivedDatetime?: string;
  step2Date?: string;
  step2EventDatetime?: string;
  step2RefNo?: string;
  step2MismatchReason?: string;
  step2MismatchApprovedById?: string;
  step2MismatchApprovedByName?: string;
  step2MismatchApprovedAt?: string;
  step2AuditorId?: string;
  step2AuditorName?: string;
  step2Notes?: string;
  step2ProofUrl?: string;
  step2ProofName?: string;
  step2ProofSize?: number;
  step2ProofType?: string;
  step2Status: 'pending' | 'draft' | 'received' | 'completed' | 'cancelled';
  // Step 3: Cash withdrawal for aid distribution (Mukhlis Meeraya)
  step3WithdrawerId: string;
  step3WithdrawerName: string;
  step3WithdrawAmount?: number;
  step3Date?: string;
  step3EventDatetime?: string;
  step3Purpose?: string;
  step3TargetAsnaf?: string;
  step3TargetFundId?: string;
  step3ApproverId?: string;
  step3ApproverName?: string;
  step3ProofUrl?: string;
  step3ProofName?: string;
  step3ProofSize?: number;
  step3ProofType?: string;
  step3Status: 'pending' | 'approved' | 'completed';
  // Step 4: Aid allocation & disbursement
  step4AllocatedAmount: number;
  step4Date?: string;
  step4EventDatetime?: string;
  step4DistributionSummary?: string;
  step4ProofUrl?: string;
  step4ProofName?: string;
  step4ProofSize?: number;
  step4ProofType?: string;
  step4Status: 'pending' | 'partial' | 'completed';
  // Step 5: Audit & Reconciliation Close
  step5ReconciledAmount?: number;
  step5RemainingCash: number;
  step5AuditorId?: string;
  step5AuditorName?: string;
  step5ClosedAt?: string;
  step5EventDatetime?: string;
  step5ProofUrl?: string;
  step5ProofName?: string;
  step5ProofSize?: number;
  step5ProofType?: string;
  step5Notes?: string;
  step5Status?: 'pending' | 'completed';
  step5UnallocatedAmount?: number;
  step5ConfirmedAidAmount?: number;
  step5ConfirmedOtherExpenseAmount?: number;
  step5VoucherCount?: number;
  step5AssistanceCaseCount?: number;
  step5PendingItemsCount?: number;
  step5MissingProofCount?: number;
  overallStatus: 'in_progress' | 'completed' | 'cancelled';
  // Calculated & Child Collections
  withdrawals?: CashFlowWithdrawal[];
  attachments?: WorkflowAttachment[];
  totalTreasurerReceived?: number;
  totalCashWithdrawn?: number;
  availableTreasurerCash?: number;
  totalConfirmedDisbursed?: number;
  totalInProgressWithdrawals?: number;
  pendingVoucherCount?: number;
  withdrawalCount?: number;
  proofCount?: number;
  latestActivityDatetime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowAuditSummary {
  workflowId: string;
  workflowNo: string;
  title: string;
  overallStatus: 'in_progress' | 'completed' | 'cancelled';
  // 12 Mandatory metrics (TASK 5)
  bankWithdrawAmount: number;             // 1. ยอดถอนจากธนาคาร
  handoverAmount: number;                 // 2. ยอดส่งมอบ
  treasurerReceivedAmount: number;        // 3. ยอดรับจริงโดยเหรัญญิก
  actualWithdrawnAmount: number;          // 4. ยอดเบิกเงินสดจริง
  confirmedAidAmount: number;             // 5. ยอดจ่ายช่วยเหลือที่ยืนยันแล้ว
  confirmedOtherExpenseAmount: number;    // 6. ยอดค่าใช้จ่ายอื่นที่เกี่ยวข้อง
  remainingCashAmount: number;            // 7. ยอดเงินสดคงเหลือ
  unallocatedAmount: number;              // 8. ยอดที่ยังไม่ระบุการใช้จ่าย
  voucherCount: number;                   // 9. จำนวนใบสำคัญ
  assistanceCaseCount: number;            // 10. จำนวนเคสช่วยเหลือ
  pendingItemCount: number;               // 11. จำนวนรายการรอตรวจสอบ
  missingProofCount: number;              // 12. จำนวนเอกสารที่ยังขาด

  totalPettyReturnedAmount: number;
  discrepancies: {
    stage: string;
    description: string;
    expectedAmount: number;
    actualAmount: number;
    difference: number;
    reason?: string;
    isApproved: boolean;
  }[];
  validationErrors: string[];
  validationWarnings: string[];
  canClose: boolean;
  isClosed: boolean;
  closedAt?: string;
  closedById?: string;
  closedByName?: string;
  closureNotes?: string;
  closureProofUrl?: string;
}

export interface AsnafAllocation {
  id: string;
  fiscalYear: string;
  asnafCode: string;
  asnafName: string;
  percentage: number;
  targetAmount: number;
  allocatedAmount: number;
  disbursedAmount: number;
  remainingAmount: number;
  policyRef?: string;
  updatedById?: string;
  updatedByName?: string;
  updatedAt: string;
}

export interface FaqirMiskinSubFund {
  id: string;
  fiscalYear: string;
  code: string;
  name: string;
  percentage: number;
  targetAmount: number;
  allocatedAmount: number;
  disbursedAmount: number;
  remainingAmount: number;
  isActive: boolean;
  updatedById?: string;
  updatedByName?: string;
  updatedAt: string;
}

export interface AdminExpenseCategory {
  id: string;
  code: string;
  name: string;
  groupName: string;
  expenseGroup?: string;
  budgetLimit: number;
  isActive: boolean;
  orderIndex: number;
  displayOrder?: number;
}

export interface FinancialTransaction {
  id: string;
  transactionNo: string;
  date: string;
  type: 'income' | 'expense' | 'disbursement' | 'reversal';
  fundId: string;
  fundName: string;
  category: string;
  amount: number;
  paymentMethod: 'promptpay_qr' | 'bank_transfer' | 'cash';
  payerOrPayee: string;
  referenceNo: string;
  receiptUrl?: string;
  slipUrl?: string;
  status: 'pending' | 'completed' | 'cancelled' | 'reversed';
  reversalRefId?: string;
  reversalReason?: string;
  reversedAt?: string;
  reversedBy?: string;
  recordedBy: string;
  verifiedBy?: string;
  notes?: string;
  // Extended fields for ZMS Master Finance Specification
  bankAccountId?: string;
  bankAccountName?: string;
  moneyType?: 'zakat' | 'sadaqah' | 'operational_admin';
  zakatYear?: string;
  asnafCategory?: string;
  subFundCategory?: string;
  beneficiaryId?: string;
  applicationId?: string;
  donorName?: string;
  isAnonymous?: boolean;
  usageRestriction?: string;
  workflowId?: string;
}

export interface ZakatCalculationItem {
  id: string;
  type: 'financial' | 'income' | 'business' | 'agriculture' | 'livestock';
  title: string;
  calculatedDate: string;
  grossAmount: number;
  deductibleAmount: number;
  netWealth: number;
  nisabValue: number;
  isEligible: boolean;
  zakatDue: number;
  ratePercent: number;
  notes: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType: 'application' | 'disbursement' | 'income' | 'user' | 'config';
  entityId: string;
  description: string;
  ipAddress: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

// ข้อมูลขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต (Zakat Beneficiary Registry)
export interface BeneficiaryRegistryItem {
  id: string; // ben-...
  registrationNo: string; // REG-2569-XXXX
  householdId: string;
  householdNo: string;
  memberId?: string; // รหัสสมาชิกเจ้าของทะเบียน
  fullName: string;
  titlePrefix?: string;
  birthDate?: string;
  age?: number;
  nationalId: string;
  nationalIdMasked: string; // 1-1002-XXXXX-XX-1
  phone: string;
  email?: string;
  occupation?: string;
  maritalStatus?: MaritalStatus;
  asnafCategory: AsnafCategory;
  branchId?: string;
  branchName?: string;
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
  monthlyIncome: number;
  monthlyExpense: number;
  netIncome: number;
  debtAmount: number;
  debtMonthlyPayment?: number;
  creditorName?: string;
  debtPurpose?: string;
  debtType?: string;
  hardshipReasons?: HardshipReasons;
  disabilityNotes?: string;
  illnessNotes?: string;
  livingLimitations?: string;
  incomeBreakdown?: HouseholdIncomeBreakdown;
  expenseBreakdown?: HouseholdExpenseBreakdown;
  householdMembers: HouseholdMember[];
  pastAssistance?: PastAssistanceRecord[];
  familySituationSummary?: string;
  urgentNeeds?: string;
  dependentBurdens?: string;
  coordinator?: CoordinatorInfo;
  certifier?: CertifierInfo;
  documents?: BeneficiaryDocument[];
  evaluatorChecklist?: EvaluatorChecklist;
  registrationStatus: RegistrationStatus;
  registeredDate: string;
  surveyorId?: string;
  surveyorName?: string;
  qualificationDate?: string;
  qualificationNotes?: string;
  qualifiedById?: string;
  qualifiedByName?: string;
  registrationHistory?: {
    status: RegistrationStatus;
    timestamp: string;
    changedBy: string;
    notes: string;
  }[];
  // Location & Coordinates (Google Maps)
  latitude?: number;
  longitude?: number;
  residenceAddress?: string;
  placeName?: string;
  locationUpdatedAt?: string;
  locationUpdatedBy?: string;
  locationVerificationStatus?: 'not_specified' | 'pending_verification' | 'verified';
  editHistory?: RegistryEditHistoryItem[];
  // Linked Assistance Data
  assistanceApplicationsCount?: number;
  totalAssistanceReceived?: number;
  latestApplicationNo?: string;
  latestApplicationStatus?: ApplicationStatus;
  createdAt?: string;
  updatedAt?: string;
}

// ประวัติการแก้ไขข้อมูลทะเบียนรายบุคคล (Audit Trail with Field-level diff)
export interface RegistryChangeItem {
  field: string;
  fieldLabel: string;
  oldValue: any;
  newValue: any;
}

export interface RegistryEditHistoryItem {
  id: string;
  beneficiaryId: string;
  editedById: string;
  editedByName: string;
  editedByRole: string;
  timestamp: string;
  changesSummary?: string;
  changesDetail?: RegistryChangeItem[];
  notes?: string;
  createdAt?: string;
}

// สถิติแยกแดชบอร์ดตามข้อกำหนด
export interface DashboardSeparatedStats {
  totalRegisteredBeneficiaries: number;       // จำนวนผู้ขึ้นทะเบียนทั้งหมด
  totalRegistries?: number;                   // alias
  pendingVerificationRegistries: number;      // จำนวนทะเบียนที่รอตรวจสอบ
  qualifiedBeneficiaries: number;             // จำนวนผู้ผ่านการพิจารณาคุณสมบัติ
  qualifiedRegistries?: number;               // alias
  pendingAssistanceRequests: number;          // จำนวนคำร้องขอความช่วยเหลือที่รอดำเนินการ
  pendingRequests?: number;                   // alias
  approvedAssistanceRequests: number;         // จำนวนคำร้องที่อนุมัติแล้ว
  approvedRequests?: number;                  // alias
  completedAssistanceDisbursed: number;       // จำนวนรายการช่วยเหลือที่ดำเนินการเสร็จสิ้น
  completedAssistance?: number;               // alias
}

// ==========================================
// ระบบตรวจสอบและติดตามผล (Follow-up & Monitoring System)
// ==========================================

export type FollowUpStatus =
  | 'not_started'          // 1. ยังไม่เริ่มติดตาม (ยังไม่มีการลงพื้นที่หรือนัดหมาย)
  | 'pending'              // 2. รอติดตาม (กำหนดวันนัดหมายในอนาคต)
  | 'due'                  // 3. ถึงกำหนดติดตาม (ถึงวันนัดหมายภายใน 3 วัน หรือวันนี้)
  | 'in_progress'          // 4. กำลังติดตาม (เกินกำหนดนัด หรืออยู่ระหว่างดำเนินการ)
  | 'partially_completed'  // 5. ติดตามบางส่วน (บันทึกผลแล้วแต่ยังไม่ครบเกณฑ์ขั้นต่ำ)
  | 'completed'            // 6. ติดตามครบตามเกณฑ์ (บันทึกผลและหลักฐานครบตามเกณฑ์ขั้นต่ำ)
  | 'requires_additional'  // 7. ต้องติดตามเพิ่มเติม (เจ้าหน้าที่ระบุว่าต้องติดตามเพิ่มเป็นพิเศษ)
  | 'terminated';          // 8. ยุติการติดตาม (ระงับ/ยกเลิกแผนพร้อมเหตุผล)

export type FollowUpVisitFormat =
  | 'field_visit'          // ลงพื้นที่ตรวจเยี่ยมจริง
  | 'phone'                // โทรศัพท์ติดตามผล
  | 'video_call'           // ติดต่อผ่านวิดีโอคอล
  | 'office'               // นัดหมายที่สำนักงาน
  | 'other';               // รูปแบบอื่น

export interface FollowUpAttachment {
  id: string;
  recordId: string;
  planId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  caption?: string;
  uploadedById?: string;
  uploadedByName?: string;
  createdAt: string;
}

export interface FollowUpRecord {
  id: string;
  planId: string;
  applicationId: string;
  beneficiaryId: string;
  visitNumber: number;
  followupDate: string;
  visitFormat: FollowUpVisitFormat;
  location?: string;
  inspectorId: string;
  inspectorName: string;
  inspectionDetails: string;
  visitResult: string;
  progressAssessment: string;
  problemsAndObstacles?: string;
  additionalSupportNeeded?: string;
  officerRecommendation?: string;
  nextAppointmentDate?: string;
  notes?: string;
  createdAt: string;
  attachments: FollowUpAttachment[];
}

export interface FollowUpAuditLog {
  id: string;
  planId: string;
  action: string;
  oldValues?: string;
  newValues?: string;
  actorId: string;
  actorName: string;
  notes?: string;
  createdAt: string;
}

export interface FollowUpPlan {
  id: string;
  assistanceRecordId: string;
  applicationNo: string;
  disbursementRef?: string;
  beneficiaryId: string;
  beneficiaryName: string;
  registrationNo: string;
  nationalId?: string;
  phone?: string;
  address?: string;
  assistanceType: string;
  assistanceTypeName: string;
  disbursementDate?: string;
  disbursedAmount?: number;
  approvedAmount?: number;
  requiresFollowup: boolean;
  optOutReason?: string;
  minVisits: number;
  completedVisits: number;
  remainingVisits: number;
  status: FollowUpStatus;
  statusTh?: string;
  nextFollowupDate?: string;
  assignedOfficerId: string;
  assignedOfficerName: string;
  branchId?: string;
  branchName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  records?: FollowUpRecord[];
  auditLogs?: FollowUpAuditLog[];
}

export interface FollowUpSummaryStats {
  totalPlans: number;
  dueCount: number;
  overdueCount: number;
  inProgressCount: number;
  completedCount: number;
  visitsThisMonth: number;
  requiresAdditionalCount: number;
  navbarBadgeCount: number;
}

// ==========================================
// TASK 4: Verified Aid Expenses & Refunds Types
// ==========================================

export interface AssistanceRefundRecord {
  id: string;
  refundNo: string;
  applicationId?: string;
  applicationNo?: string;
  beneficiaryName?: string;
  withdrawalId?: string;
  withdrawalNo?: string;
  workflowId?: string;
  workflowNo?: string;
  refundDate: string;
  refundTime: string;
  refundDatetime: string;
  refundAmount: number;
  refundReason: string;
  returnedById: string;
  returnedByName: string;
  receivedById: string;
  receivedByName: string;
  targetBankAccountId?: string;
  targetBankAccountName?: string;
  targetFundId?: string;
  proofUrl?: string;
  proofName?: string;
  proofSize?: number;
  proofType?: string;
  status: 'completed' | 'cancelled';
  cancellationReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RecordAssistanceRefundInput {
  applicationId?: string;
  withdrawalId?: string;
  workflowId?: string;
  refundDate: string;
  refundTime?: string;
  refundAmount: number;
  refundReason: string;
  returnedById?: string;
  returnedByName: string;
  receivedById?: string;
  receivedByName?: string;
  targetBankAccountId?: string;
  targetFundId?: string;
  proofUrl?: string;
  proofName?: string;
  proofSize?: number;
  proofType?: string;
  notes?: string;
}

export interface AidDrillDownItem {
  id: string;
  recordType: 'execution_record' | 'direct_disbursement' | 'handover' | 'refund' | 'in_progress';
  recordId: string;
  disbursementRef?: string;
  applicationId?: string;
  applicationNo?: string;
  beneficiaryId?: string;
  beneficiaryName: string;
  nationalId?: string;
  withdrawalId?: string;
  withdrawalNo?: string;
  workflowId?: string;
  workflowNo?: string;
  asnafCode: string;
  asnafName: string;
  assistanceTypeCode: string;
  assistanceTypeName: string;
  amount: number;
  actualAssistanceValue?: number;
  eventDate: string;
  eventDatetime: string;
  caseWorkerId?: string;
  caseWorkerName?: string;
  delivererName?: string;
  status: string;
  statusLabel: string;
  hasValidProof: boolean;
  proofUrl?: string;
  proofName?: string;
  details?: string;
  installmentInfo?: string;
}

export interface AsnafAidExpenseItem {
  asnafCode: string;
  asnafName: string;
  percentage: number;
  targetAmount: number;
  allocatedAmount: number;
  disbursedAmount: number;
  remainingAmount: number;
  caseCount: number;
  confirmedCount: number;
  items: AidDrillDownItem[];
}

export interface AssistanceTypeAidExpenseItem {
  typeCode: string;
  typeId: string;
  typeName: string;
  category: string;
  categoryLabel: string;
  disbursedAmount: number;
  caseCount: number;
  confirmedCount: number;
  items: AidDrillDownItem[];
}

export interface MissingProofItem {
  id: string;
  sourceType: 'execution' | 'direct_transfer' | 'handover';
  applicationNo: string;
  beneficiaryName: string;
  withdrawalNo?: string;
  amount: number;
  eventDate: string;
  officerName: string;
  issueDescription: string;
}

export interface VerifiedAidCalculationResult {
  totalVerifiedAidDisbursed: number;
  totalHandedOverToCaseWorkers: number;
  inProgressAssistanceAmount: number;
  completedAssistanceAmount: number;
  unspentHeldAmount: number;
  totalRefundedAmount: number;
  unclearedAmount: number;
  missingProofCount: number;
  missingProofAmount: number;
  breakdownByAsnaf: AsnafAidExpenseItem[];
  breakdownByAssistanceType: AssistanceTypeAidExpenseItem[];
  refundRecords: AssistanceRefundRecord[];
  missingProofItems: MissingProofItem[];
  drillDown: {
    verifiedAidItems: AidDrillDownItem[];
    handedOverItems: AidDrillDownItem[];
    inProgressItems: AidDrillDownItem[];
    completedItems: AidDrillDownItem[];
    unspentHeldItems: AidDrillDownItem[];
    refundItems: AidDrillDownItem[];
    missingProofItems: AidDrillDownItem[];
  };
}

