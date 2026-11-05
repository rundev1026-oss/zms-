/**
 * Single Source of Truth Validation Schema for Assistance Requests
 * Used identically across:
 *   1. เมนูหลัก: ยื่นคำร้องขอความช่วยเหลือ (AssistanceRequestsView)
 *   2. หน้าทะเบียนผู้มีสิทธิ์รับซะกาต (BeneficiaryRegistryView -> AssistanceRequestFormModal)
 */

export interface VerifiedBeneficiaryHouseholdSummary {
  memberCount: number;
  members: {
    id: string;
    fullName: string;
    relationship: string;
    ageYears: number | null;
    occupation: string;
    monthlyIncome: number;
    healthNote: string;
  }[];
  monthlyIncome: number;
  monthlyExpense: number;
  debtAmount: number;
  housingStatus: string;
}

export interface VerifiedBeneficiaryRegistryDocument {
  id: string;
  name: string;
  category: string;
  mimeType?: string;
  fileSize?: number;
  status?: string;
  createdAt?: string;
  downloadUrl?: string;
}

export interface VerifiedBeneficiaryAssessmentItem {
  id: string;
  assessmentNumber: string;
  assessmentPeriod: string;
  assessmentType: string;
  status: string;
  eligibilityResult: string;
  assessedAt: string;
  asnafCode: string | null;
  asnafNameTh: string | null;
}

export interface VerifiedBeneficiaryProfile {
  id: string;
  memberId: string;
  memberCode: string;
  registryNumber: string;
  registrationNo: string;
  titlePrefix: string;
  firstName: string;
  lastName: string;
  fullName: string;
  nationalId: string;
  nationalIdMasked: string;
  birthDate: string | null;
  age: number | null;
  phone: string;
  occupation: string;
  maritalStatus: string;
  email?: string;
  asnafCategory: string;
  asnafNameTh?: string | null;
  branchId: string;
  branchName: string;
  memberStatus: string;
  registrationStatus: string;
  latestAssessmentId?: string | null;
  latestAssessmentNumber?: string | null;
  latestAssessmentStatus?: string | null;
  assessments?: VerifiedBeneficiaryAssessmentItem[];
  address: string;
  community: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode?: string;
  household?: VerifiedBeneficiaryHouseholdSummary;
  registryDocuments?: VerifiedBeneficiaryRegistryDocument[];
  missingFields?: string[];
  isProfileComplete?: boolean;
}

export interface AssistanceRequestFormValues {
  beneficiaryId: string;
  verifiedBeneficiary: VerifiedBeneficiaryProfile | null;
  assessmentId?: string;
  primaryGroupCode: string;
  specificFundId: string;
  assistanceTypeId: string;
  assistanceTypeName: string;
  requestedAmount: number;
  assistanceTypeDetails?: string;
  necessityDetails: string;
  urgencyLevel: 'normal' | 'high' | 'urgent';
  appliedDate: string;
}

export interface AssistanceRequestValidationResult {
  valid: boolean;
  step?: 1 | 2 | 3;
  errors: Record<string, string>;
  firstErrorMessage?: string;
}

export function validateAssistanceRequestForm(
  values: AssistanceRequestFormValues
): AssistanceRequestValidationResult {
  const errors: Record<string, string> = {};
  let errorStep: 1 | 2 | 3 | undefined;

  if (!values.beneficiaryId || !values.verifiedBeneficiary?.id) {
    errors.beneficiaryId = 'กรุณาตรวจสอบและเลือกผู้มีสิทธิ์รับซะกาตจากทะเบียนหลักก่อนยื่นคำร้อง';
    errorStep = 1;
  } else if (
    Array.isArray(values.verifiedBeneficiary.missingFields) &&
    values.verifiedBeneficiary.missingFields.length > 0
  ) {
    errors.profileCompleteness = `ข้อมูลทะเบียนหลักยังไม่ครบถ้วน (${values.verifiedBeneficiary.missingFields.join(', ')}) กรุณาตรวจสอบหรือแก้ไขข้อมูลที่ทะเบียนหลักก่อนยื่นคำร้อง`;
    errorStep = 1;
  }

  if (!values.primaryGroupCode || !values.specificFundId || !values.assistanceTypeId || !values.assistanceTypeName) {
    errors.classification = 'กรุณาเลือกกลุ่มกองทุนหลัก กองทุนเฉพาะ และประเภทความช่วยเหลือให้ครบทั้ง 3 ระดับ';
    if (!errorStep) errorStep = 2;
  }

  const amt = Number(values.requestedAmount);
  if (!Number.isFinite(amt) || amt <= 0) {
    errors.requestedAmount = 'กรุณาระบุจำนวนเงินที่ขอรับความช่วยเหลือมากกว่า 0 บาท';
    if (!errorStep) errorStep = 3;
  }

  const reason = String(values.necessityDetails || '').trim();
  if (reason.length < 5) {
    errors.necessityDetails = 'กรุณาระบุสาเหตุและความจำเป็นในการขอความช่วยเหลืออย่างน้อย 5 ตัวอักษร';
    if (!errorStep) errorStep = 3;
  }

  if (!['normal', 'high', 'urgent'].includes(values.urgencyLevel)) {
    errors.urgencyLevel = 'กรุณาเลือกระดับความเร่งด่วนที่ถูกต้อง';
    if (!errorStep) errorStep = 3;
  }

  const firstKey = Object.keys(errors)[0];
  return {
    valid: Object.keys(errors).length === 0,
    step: errorStep,
    errors,
    firstErrorMessage: firstKey ? errors[firstKey] : undefined,
  };
}

