import { formatPersonName, splitPersonName } from '@zms/shared';

export const INCOME_LINE_KEYS = [
  'salary',
  'familySupport',
  'agriculture',
  'trading',
  'assetIncome',
  'freelance',
  'welfare',
  'otherIncome',
] as const;

export const EXPENSE_LINE_KEYS = [
  'living',
  'education',
  'healthcare',
  'utilities',
  'rent',
  'debtPayment',
  'otherExpense',
] as const;

const MARITAL_STATUS_DIFF_LABELS: Record<string, string> = {
  single: 'โสด',
  married: 'สมรส',
  divorced: 'หย่าร้าง',
  widowed: 'หม้าย',
  separated: 'แยกกันอยู่',
};

const ASNAF_DIFF_LABELS: Record<string, string> = {
  fakir: 'ฟะกีร (ผู้ยากไร้)',
  miskin: 'มิสกีน (ผู้ขัดสน)',
  amil: 'อามิล (เจ้าหน้าที่)',
  muallaf: 'มุอัลลัฟ (ผู้มีจิตโน้มสู่悦)',
  riqab: 'ริกอบ (ปลดปล่อยทาส)',
  gharim: 'ฆอริม (ผู้มีหนี้สินล้นพ้นตัว)',
  fisabilillah: 'ฟีสะบีลิลลาฮ์ (เพื่อการศาสนา)',
  ibnussabil: 'อิบนุสสะบีล (ผู้เดินทางไกล)',
};

const HOUSING_TYPE_DIFF_LABELS: Record<string, string> = {
  own: 'บ้านตนเอง',
  rent: 'บ้านเช่า',
  relative: 'อาศัยญาติ/ผู้อื่น',
  public_land: 'ที่ดินสาธารณะ/บุกเบิก',
  other: 'อื่น ๆ',
};

const LAND_TITLE_DIFF_LABELS: Record<string, string> = {
  title_deed: 'โฉนดที่ดิน (น.ส. 4)',
  nor_sor_3: 'น.ส. 3 / น.ส. 3 ก.',
  sor_por_kor: 'ส.ป.ก. 4-01',
  rental_agreement: 'สัญญาเช่าที่ดิน',
  public_land: 'ที่ดินสาธารณะ',
  none: 'ไม่มีเอกสารสิทธิ์',
};

const HEALTH_STATUS_DIFF_LABELS: Record<string, string> = {
  healthy: 'ปกติ/แข็งแรง',
  disabled: 'คนพิการ',
  chronically_ill: 'ผู้ป่วยเรื้อรัง/ติดเตียง',
  elderly: 'ผู้สูงอายุพึ่งพิง',
};

const LOCATION_STATUS_DIFF_LABELS: Record<string, string> = {
  not_specified: 'ยังไม่ได้ระบุพิกัด',
  pending_verification: 'รอตรวจสอบตำแหน่ง',
  verified: 'ตรวจสอบพิกัดแล้ว',
};

const INCOME_FIELD_LABELS: Record<string, string> = {
  salary: 'ค่าจ้าง/เงินเดือน',
  familySupport: 'เงินช่วยเหลือจากบุตร/ครอบครัว',
  agriculture: 'การเกษตร/ปศุสัตว์/ประมง',
  trading: 'การค้าขาย/ธุรกิจส่วนตัว',
  assetIncome: 'รายได้จากทรัพย์สิน/ค่าเช่า',
  freelance: 'รับจ้างอิสระ/บริการทั่วไป',
  welfare: 'สวัสดิการรัฐ/เงินสงเคราะห์',
  otherIncome: 'รายได้อื่น ๆ',
  otherIncomeNotes: 'หมายเหตุรายได้อื่น',
};

const EXPENSE_FIELD_LABELS: Record<string, string> = {
  living: 'อุปโภคบริโภค/อาหาร',
  education: 'การศึกษาบุตร',
  healthcare: 'ค่าใช้จ่ายสุขภาพ/ยา',
  utilities: 'ค่าน้ำ-ไฟ-โทรศัพท์',
  rent: 'ค่าเช่าบ้าน/ที่อยู่',
  debtPayment: 'ภาระชำระหนี้/เดือน',
  otherExpense: 'รายจ่ายอื่น ๆ',
  otherExpenseNotes: 'หมายเหตุรายจ่ายอื่น',
};

export function sumFilled(source: unknown, keys: readonly string[]): number | null {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  const record = source as Record<string, unknown>;
  let seen = false;
  let total = 0;
  const allKeys = Array.from(new Set([...keys, ...Object.keys(record)]));
  for (const key of allKeys) {
    if (key.endsWith('Notes') || key.endsWith('Note') || key.endsWith('Comment')) continue;
    const raw = record[key];
    if (raw === undefined || raw === null || raw === '') continue;
    const amount = Number(raw);
    if (!Number.isFinite(amount)) continue;
    seen = true;
    total += amount;
  }
  return seen ? total : null;
}

function money(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return undefined;
  return amount.toFixed(2);
}

function clip(value: unknown, max: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  return text.slice(0, max);
}

export function buildSituationNotes(input: Record<string, any>): string | undefined {
  const touched =
    input.disabilityNotes !== undefined ||
    input.illnessNotes !== undefined ||
    input.livingLimitations !== undefined ||
    input.hardshipReasons !== undefined ||
    input.debtType !== undefined ||
    input.debtNotes !== undefined ||
    input.debtMonthlyPayment !== undefined ||
    input.creditorName !== undefined;
  if (!touched) return undefined;

  const debtType = input.debtType || input.hardshipReasons?.debtType || '';
  const creditorName =
    input.creditorName !== undefined && input.creditorName !== ''
      ? String(input.creditorName)
      : input.debtPurpose && input.debtPurpose !== debtType
        ? String(input.debtPurpose)
        : '';
  const profile = {
    v: 1,
    disabilityNotes: input.disabilityNotes || input.hardshipReasons?.disabilityDetails || '',
    illnessNotes: input.illnessNotes || input.hardshipReasons?.illnessDetails || '',
    livingLimitations: input.livingLimitations || input.hardshipReasons?.otherDetails || '',
    debtType,
    creditorName,
    debtNotes: input.debtNotes || '',
    debtMonthlyPayment: input.debtMonthlyPayment !== undefined ? input.debtMonthlyPayment : undefined,
    hardshipReasons: input.hardshipReasons || undefined,
  };
  const json = JSON.stringify(profile);
  if (json.length <= 4000) return json;
  const compact = {
    v: 1,
    disabilityNotes: String(profile.disabilityNotes).slice(0, 500),
    illnessNotes: String(profile.illnessNotes).slice(0, 500),
    livingLimitations: String(profile.livingLimitations).slice(0, 500),
    debtType: String(profile.debtType).slice(0, 200),
    creditorName: String(profile.creditorName).slice(0, 200),
    debtNotes: String(profile.debtNotes).slice(0, 500),
    debtMonthlyPayment: profile.debtMonthlyPayment,
  };
  return JSON.stringify(compact);
}

export function parseSituationNotes(raw: unknown): Record<string, any> {
  if (typeof raw !== 'string' || !raw.trim()) return {};
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) return { plainText: trimmed };
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object' || parsed.v !== 1) return { plainText: trimmed };
    return parsed;
  } catch {
    return { plainText: trimmed };
  }
}

function mapMembers(rawMembers: unknown) {
  if (!Array.isArray(rawMembers)) return undefined;
  return rawMembers
    .filter((member) => String(member?.fullName || '').trim() !== '')
    .map((member, index) => {
      const ageRaw = member.age !== undefined ? member.age : member.ageYears;
      const hasAge = ageRaw !== undefined && ageRaw !== null && ageRaw !== '';
      const ageNum = hasAge ? Math.round(Number(ageRaw)) : NaN;
      const validAge = Number.isFinite(ageNum) && ageNum >= 0 && ageNum <= 130 ? ageNum : undefined;
      const dob = member.dateOfBirth && !isNaN(Date.parse(member.dateOfBirth)) ? member.dateOfBirth : undefined;
      const rel = String(member.relation ?? member.relationship ?? '').trim() || 'สมาชิกในครอบครัว';
      return {
        fullName: String(member.fullName).trim().slice(0, 150),
        relationship: rel.slice(0, 80),
        ageYears: validAge,
        dateOfBirth: dob,
        occupation: member.occupation ? String(member.occupation).trim().slice(0, 150) : undefined,
        monthlyIncome: (() => {
          if (member.monthlyIncome === undefined || member.monthlyIncome === null || member.monthlyIncome === '') {
            return undefined;
          }
          const income = Number(member.monthlyIncome);
          return Number.isFinite(income) && income >= 0 ? income : undefined;
        })(),
        educationStatus: member.educationStatus ? String(member.educationStatus).trim().slice(0, 150) : undefined,
        healthStatus: member.healthStatus ? String(member.healthStatus).trim().slice(0, 80) : undefined,
        healthNotes: member.healthNotes ? String(member.healthNotes).trim().slice(0, 500) : undefined,
        notes: member.notes ? String(member.notes).trim().slice(0, 500) : undefined,
        isDependent: Boolean(
          member.isDependent ??
            (rel === 'บุตร' ||
              rel === 'คู่สมรส' ||
              member.healthStatus === 'disabled' ||
              member.healthStatus === 'chronically_ill'),
        ),
        sortOrder: index + 1,
      };
    });
}

export function buildHouseholdPayload(input: Record<string, any>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const rawMembers = input.householdMembers !== undefined ? input.householdMembers : input.members;
  const members = mapMembers(rawMembers);
  if (members) {
    payload.members = members;
    payload.memberCount = members.length + 1;
    payload.dependentCount = members.filter((member) => member.isDependent).length;
  }

  const hasExplicitIncome = input.monthlyIncome !== undefined || input.totalIncome !== undefined;
  const lineIncome = sumFilled(input.incomeBreakdown, INCOME_LINE_KEYS);
  if (hasExplicitIncome) {
    const raw = input.monthlyIncome !== undefined ? input.monthlyIncome : input.totalIncome;
    if (raw === null || raw === '') {
      payload.householdIncome = null;
    } else {
      const formatted = money(raw);
      if (formatted !== undefined) payload.householdIncome = formatted;
    }
  } else if (lineIncome !== null) {
    payload.householdIncome = lineIncome.toFixed(2);
  }

  const hasExplicitExpense = input.monthlyExpense !== undefined || input.totalExpense !== undefined;
  const lineExpense = sumFilled(input.expenseBreakdown, EXPENSE_LINE_KEYS);
  if (hasExplicitExpense) {
    const raw = input.monthlyExpense !== undefined ? input.monthlyExpense : input.totalExpense;
    if (raw === null || raw === '') {
      payload.householdExpense = null;
    } else {
      const formatted = money(raw);
      if (formatted !== undefined) payload.householdExpense = formatted;
    }
  } else if (lineExpense !== null) {
    payload.householdExpense = lineExpense.toFixed(2);
  }

  if (input.debtAmount !== undefined) {
    if (input.debtAmount === null || input.debtAmount === '') {
      payload.debtAmount = null;
    } else {
      const debt = money(input.debtAmount);
      if (debt !== undefined) payload.debtAmount = debt;
    }
  }

  if (input.debtPurpose !== undefined || input.debtType !== undefined || input.creditorName !== undefined) {
    const debtType = input.debtType || input.hardshipReasons?.debtType || '';
    const creditor =
      input.creditorName !== undefined && input.creditorName !== ''
        ? String(input.creditorName)
        : input.debtPurpose && input.debtPurpose !== debtType
          ? String(input.debtPurpose)
          : '';
    payload.debtPurpose = creditor || input.debtPurpose || debtType || '';
  }

  const notes = buildSituationNotes(input);
  if (notes !== undefined) payload.additionalNotes = notes;

  const textKeys = [
    'address',
    'province',
    'district',
    'subdistrict',
    'community',
    'housingType',
    'housingCondition',
    'housingNotes',
    'landTitleType',
    'landTitleNotes',
    'familySituationSummary',
    'urgentNeeds',
    'dependentBurdens',
    'residenceAddress',
    'placeName',
    'locationVerificationStatus',
  ];
  for (const key of textKeys) {
    if (Object.prototype.hasOwnProperty.call(input, key) && input[key] !== undefined && input[key] !== null) {
      payload[key] = input[key];
    }
  }

  if (input.incomeBreakdown && typeof input.incomeBreakdown === 'object') {
    payload.incomeBreakdown = JSON.stringify(input.incomeBreakdown);
  }
  if (input.expenseBreakdown && typeof input.expenseBreakdown === 'object') {
    payload.expenseBreakdown = JSON.stringify(input.expenseBreakdown);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'pastAssistance') && input.pastAssistance !== undefined) {
    payload.pastAssistance =
      typeof input.pastAssistance === 'string' ? input.pastAssistance : JSON.stringify(input.pastAssistance);
  }
  if (input.coordinator) payload.coordinatorInfo = JSON.stringify(input.coordinator);
  if (input.certifier) payload.certifierInfo = JSON.stringify(input.certifier);

  if (input.latitude !== undefined) {
    if (input.latitude === null || input.latitude === '') {
      payload.latitude = null;
    } else {
      const latitude = Number(input.latitude);
      if (Number.isFinite(latitude)) payload.latitude = latitude;
    }
  }
  if (input.longitude !== undefined) {
    if (input.longitude === null || input.longitude === '') {
      payload.longitude = null;
    } else {
      const longitude = Number(input.longitude);
      if (Number.isFinite(longitude)) payload.longitude = longitude;
    }
  }
  if (!payload.residenceAddress && input.address) payload.residenceAddress = input.address;
  return payload;
}

export function buildIncomeProfilePayload(input: Record<string, any>): Record<string, string | null> | null {
  const body: Record<string, string | null> = {};
  const lineIncome = sumFilled(input.incomeBreakdown, INCOME_LINE_KEYS);
  const lineExpense = sumFilled(input.expenseBreakdown, EXPENSE_LINE_KEYS);
  if (input.monthlyIncome !== undefined) {
    body.personalIncome = input.monthlyIncome === null || input.monthlyIncome === '' ? null : (money(input.monthlyIncome) ?? null);
  } else if (lineIncome !== null) {
    body.personalIncome = lineIncome.toFixed(2);
  }
  if (input.monthlyExpense !== undefined) {
    body.regularExpense = input.monthlyExpense === null || input.monthlyExpense === '' ? null : (money(input.monthlyExpense) ?? null);
  } else if (lineExpense !== null) {
    body.regularExpense = lineExpense.toFixed(2);
  }
  if (input.debtAmount !== undefined) {
    body.debtBurden = input.debtAmount === null || input.debtAmount === '' ? null : (money(input.debtAmount) ?? null);
  }

  const housing = clip(input.housingNotes || input.housingCondition, 2000);
  const living = clip(input.livingLimitations || input.disabilityNotes || input.illnessNotes, 2000);
  const needs = clip(input.urgentNeeds || input.necessityDetails || input.assistanceTypeDetails, 2000);
  if (housing) body.housingCondition = housing;
  if (living) body.livingConstraints = living;
  if (needs) body.assistanceNeeds = needs;
  return Object.keys(body).length > 0 ? body : null;
}

function safeJsonParse(value: unknown, fallback: unknown = null) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function parseObject(value: unknown): Record<string, any> | undefined {
  const parsed = safeJsonParse(value, null);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
  return Object.keys(parsed).length > 0 ? (parsed as Record<string, any>) : undefined;
}

function mapStatusToFrontend(nestStatus: string): string {
  const upper = String(nestStatus || '').toUpperCase();
  if (upper === 'DRAFT') return 'draft';
  if (upper === 'SUBMITTED') return 'pending_verification';
  if (upper === 'PENDING_REVIEW') return 'pending_qualification';
  if (upper === 'APPROVED') return 'qualified';
  if (upper === 'REJECTED') return 'disqualified';
  if (upper === 'SUSPENDED') return 'suspended';
  if (upper === 'NEED_INFO' || upper === 'NEEDS_CORRECTION') return 'need_more_info';
  if (upper === 'UNDER_ASSESSMENT') return 'pending_survey';
  if (upper === 'ELIGIBLE') return 'qualified';
  if (upper === 'INELIGIBLE') return 'disqualified';
  if (upper === 'ARCHIVED') return 'suspended';
  return String(nestStatus || 'pending_verification').toLowerCase();
}

const REVIEWED_FRONTEND_STATUSES = new Set([
  'pending_verification',
  'pending_survey',
  'pending_qualification',
  'qualified',
  'disqualified',
  'suspended',
]);

function displayValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function maskNationalId(value: unknown): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length !== 13) return value ? 'ปกปิด' : '';
  return `${digits[0]}-••••-•••••-••-${digits[12]}`;
}

export function registryNeedsReReview(status: string | undefined): boolean {
  return REVIEWED_FRONTEND_STATUSES.has(String(status || ''));
}

export interface RegistryFieldDiff {
  field: string;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
  material: boolean;
}

export function breakdownsEqual(valA: unknown, valB: unknown): boolean {
  const objA = parseObject(valA) || {};
  const objB = parseObject(valB) || {};
  const keys = Array.from(new Set([...Object.keys(objA), ...Object.keys(objB)]));
  for (const key of keys) {
    const type = key.endsWith('Notes') ? 'string' : 'number';
    if (!valuesEqual(objA[key], objB[key], type)) return false;
  }
  return true;
}

export function valuesEqual(
  valA: unknown,
  valB: unknown,
  type: 'string' | 'number' | 'date' | 'phone' | 'nationalId' | 'boolean' = 'string',
): boolean {
  if (type === 'number') {
    const isNoneA = valA === undefined || valA === null || valA === '';
    const isNoneB = valB === undefined || valB === null || valB === '';
    if (isNoneA && isNoneB) return true;
    if (isNoneA !== isNoneB) return false;
    const numA = Number(valA);
    const numB = Number(valB);
    if (!Number.isFinite(numA) || !Number.isFinite(numB)) return false;
    return numA === numB;
  }
  if (type === 'nationalId') {
    const digA = String(valA ?? '').replace(/\D/g, '');
    const digB = String(valB ?? '').replace(/\D/g, '');
    return digA === digB;
  }
  if (type === 'phone') {
    const digA = String(valA ?? '').replace(/\D/g, '');
    const digB = String(valB ?? '').replace(/\D/g, '');
    if (digA && digB) return digA === digB;
    return String(valA ?? '').trim() === String(valB ?? '').trim();
  }
  if (type === 'date') {
    const strA = String(valA ?? '').trim().slice(0, 10);
    const strB = String(valB ?? '').trim().slice(0, 10);
    return strA === strB;
  }
  if (type === 'boolean') {
    return Boolean(valA) === Boolean(valB);
  }
  const strA = valA === undefined || valA === null ? '' : String(valA).trim();
  const strB = valB === undefined || valB === null ? '' : String(valB).trim();
  return strA === strB;
}

function formatDiffValue(
  value: unknown,
  type: 'string' | 'number' | 'date' | 'phone' | 'nationalId' | 'boolean' = 'string',
  valueMap?: Record<string, string>,
): string {
  if (type === 'nationalId') {
    return maskNationalId(value) || 'ไม่มีข้อมูล';
  }
  if (type === 'number') {
    if (value === undefined || value === null || value === '') return 'ไม่มีข้อมูล';
    const num = Number(value);
    return Number.isFinite(num) ? num.toLocaleString('th-TH') : 'ไม่มีข้อมูล';
  }
  if (type === 'boolean') {
    return value ? 'ใช่' : 'ไม่ใช่';
  }
  if (type === 'date') {
    const str = String(value ?? '').trim().slice(0, 10);
    return str || 'ไม่มีข้อมูล';
  }
  const str = value === undefined || value === null ? '' : String(value).trim();
  if (!str) return 'ไม่มีข้อมูล';
  if (valueMap && valueMap[str]) {
    return valueMap[str];
  }
  return str;
}

export function diffRegistryFields(
  before: Record<string, any>,
  after: Record<string, any>,
): RegistryFieldDiff[] {
  const changes: RegistryFieldDiff[] = [];

  // 1. Name & FullName comparison
  const firstNameChanged = !valuesEqual(before.firstName, after.firstName, 'string');
  const lastNameChanged = !valuesEqual(before.lastName, after.lastName, 'string');
  if (firstNameChanged) {
    changes.push({
      field: 'firstName',
      fieldLabel: 'ชื่อ',
      oldValue: formatDiffValue(before.firstName, 'string').slice(0, 500),
      newValue: formatDiffValue(after.firstName, 'string').slice(0, 500),
      material: false,
    });
  }
  if (lastNameChanged) {
    changes.push({
      field: 'lastName',
      fieldLabel: 'นามสกุล',
      oldValue: formatDiffValue(before.lastName, 'string').slice(0, 500),
      newValue: formatDiffValue(after.lastName, 'string').slice(0, 500),
      material: false,
    });
  }
  if (!firstNameChanged && !lastNameChanged) {
    const nameA = formatPersonName(before) || before.fullName;
    const nameB = formatPersonName(after) || after.fullName;
    if (!valuesEqual(nameA, nameB, 'string')) {
      changes.push({
        field: 'fullName',
        fieldLabel: 'ชื่อ-นามสกุล',
        oldValue: formatDiffValue(nameA, 'string').slice(0, 500),
        newValue: formatDiffValue(nameB, 'string').slice(0, 500),
        material: false,
      });
    }
  }

  // 2. Scalar fields configuration across all sections
  const scalarConfigs: Array<{
    field: string;
    label: string;
    type: 'string' | 'number' | 'date' | 'phone' | 'nationalId';
    material: boolean;
    map?: Record<string, string>;
    altKeys?: string[];
  }> = [
    { field: 'titlePrefix', label: 'คำนำหน้า', type: 'string', material: false },
    { field: 'nationalId', label: 'เลขประจำตัวประชาชน', type: 'nationalId', material: true },
    { field: 'birthDate', label: 'วันเดือนปีเกิด', type: 'date', material: false, altKeys: ['dateOfBirth'] },
    { field: 'age', label: 'อายุ (ปี)', type: 'number', material: false, altKeys: ['ageYears'] },
    { field: 'phone', label: 'เบอร์โทรศัพท์', type: 'phone', material: false },
    { field: 'email', label: 'อีเมล', type: 'string', material: false },
    { field: 'occupation', label: 'อาชีพ', type: 'string', material: true },
    { field: 'workStatus', label: 'สถานะการทำงาน', type: 'string', material: true },
    { field: 'maritalStatus', label: 'สถานภาพสมรส', type: 'string', material: false, map: MARITAL_STATUS_DIFF_LABELS },
    { field: 'asnafCategory', label: 'หมวดหมู่อัสนาฟ', type: 'string', material: true, map: ASNAF_DIFF_LABELS },
    { field: 'branchId', label: 'รหัสสาขา', type: 'string', material: false },
    { field: 'branchName', label: 'ชื่อสาขา', type: 'string', material: false },

    // Section 2: Residence & Location
    { field: 'address', label: 'ที่อยู่', type: 'string', material: false },
    { field: 'community', label: 'ชุมชน/หมู่บ้าน', type: 'string', material: false },
    { field: 'subdistrict', label: 'ตำบล/แขวง', type: 'string', material: false },
    { field: 'district', label: 'อำเภอ/เขต', type: 'string', material: false },
    { field: 'province', label: 'จังหวัด', type: 'string', material: false },
    { field: 'postcode', label: 'รหัสไปรษณีย์', type: 'string', material: false, altKeys: ['postalCode'] },
    { field: 'latitude', label: 'ละติจูด', type: 'number', material: false },
    { field: 'longitude', label: 'ลองจิจูด', type: 'number', material: false },
    { field: 'residenceAddress', label: 'ที่อยู่ตามพิกัด', type: 'string', material: false },
    { field: 'placeName', label: 'ชื่อสถานที่/จุดสังเกต', type: 'string', material: false },
    { field: 'locationVerificationStatus', label: 'สถานะตรวจสอบพิกัด', type: 'string', material: false, map: LOCATION_STATUS_DIFF_LABELS },
    { field: 'housingType', label: 'ลักษณะการครอบครองที่อยู่อาศัย', type: 'string', material: true, map: HOUSING_TYPE_DIFF_LABELS },
    { field: 'housingCondition', label: 'สภาพบ้านพัก', type: 'string', material: true },
    { field: 'housingNotes', label: 'หมายเหตุที่อยู่อาศัย', type: 'string', material: false },
    { field: 'landTitleType', label: 'สิทธิในที่ดิน', type: 'string', material: true, map: LAND_TITLE_DIFF_LABELS },
    { field: 'landTitleNotes', label: 'รายละเอียดสิทธิที่ดิน', type: 'string', material: false },

    // Section 7: Income & Expenses totals
    { field: 'monthlyIncome', label: 'รายได้ต่อเดือน', type: 'number', material: true, altKeys: ['householdIncome', 'totalIncome'] },
    { field: 'monthlyExpense', label: 'ค่าใช้จ่ายต่อเดือน', type: 'number', material: true, altKeys: ['householdExpense', 'totalExpense'] },

    // Section 8: Debts
    { field: 'debtAmount', label: 'ยอดหนี้คงเหลือ', type: 'number', material: true },
    { field: 'debtMonthlyPayment', label: 'ยอดผ่อนชำระหนี้ต่อเดือน', type: 'number', material: true },
    { field: 'debtType', label: 'ประเภทหนี้สิน', type: 'string', material: true },
    { field: 'creditorName', label: 'เจ้าหนี้/แหล่งหนี้', type: 'string', material: true },
    { field: 'debtPurpose', label: 'วัตถุประสงค์หนี้สิน', type: 'string', material: false },
    { field: 'debtNotes', label: 'หมายเหตุหนี้สิน', type: 'string', material: false },

    // Section 10: Living Conditions & Limitations
    { field: 'disabilityNotes', label: 'ความพิการ', type: 'string', material: true },
    { field: 'illnessNotes', label: 'การเจ็บป่วย', type: 'string', material: true },
    { field: 'livingLimitations', label: 'ข้อจำกัดในการดำรงชีวิต', type: 'string', material: true },
    { field: 'familySituationSummary', label: 'สรุปสภาพปัญหาครอบครัว', type: 'string', material: false },
    { field: 'urgentNeeds', label: 'ความต้องการเร่งด่วน', type: 'string', material: true },
    { field: 'dependentBurdens', label: 'ภาระผู้พึ่งพิง', type: 'string', material: true },
  ];

  for (const cfg of scalarConfigs) {
    if (
      cfg.field === 'debtPurpose' &&
      changes.some((c) => c.field === 'creditorName') &&
      valuesEqual(before.debtPurpose, before.creditorName, 'string') &&
      valuesEqual(after.debtPurpose, after.creditorName, 'string')
    ) {
      continue;
    }
    const valA = before[cfg.field] !== undefined
      ? before[cfg.field]
      : cfg.altKeys?.map((k) => before[k]).find((v) => v !== undefined);
    const valB = after[cfg.field] !== undefined
      ? after[cfg.field]
      : cfg.altKeys?.map((k) => after[k]).find((v) => v !== undefined);

    if (!valuesEqual(valA, valB, cfg.type)) {
      changes.push({
        field: cfg.field,
        fieldLabel: cfg.label,
        oldValue: formatDiffValue(valA, cfg.type, cfg.map).slice(0, 500),
        newValue: formatDiffValue(valB, cfg.type, cfg.map).slice(0, 500),
        material: cfg.material,
      });
    }
  }

  // 3. Section 7: Income Breakdown comparison
  const incA = parseObject(before.incomeBreakdown) || {};
  const incB = parseObject(after.incomeBreakdown) || {};
  const incKeys = Array.from(new Set([...Object.keys(incA), ...Object.keys(incB)]));
  for (const key of incKeys) {
    const type = key.endsWith('Notes') ? 'string' : 'number';
    if (!valuesEqual(incA[key], incB[key], type)) {
      changes.push({
        field: `incomeBreakdown.${key}`,
        fieldLabel: `รายได้: ${INCOME_FIELD_LABELS[key] || key}`,
        oldValue: formatDiffValue(incA[key], type).slice(0, 500),
        newValue: formatDiffValue(incB[key], type).slice(0, 500),
        material: true,
      });
    }
  }

  // 4. Section 7: Expense Breakdown comparison
  const expA = parseObject(before.expenseBreakdown) || {};
  const expB = parseObject(after.expenseBreakdown) || {};
  const expKeys = Array.from(new Set([...Object.keys(expA), ...Object.keys(expB)]));
  for (const key of expKeys) {
    const type = key.endsWith('Notes') ? 'string' : 'number';
    if (!valuesEqual(expA[key], expB[key], type)) {
      changes.push({
        field: `expenseBreakdown.${key}`,
        fieldLabel: `รายจ่าย: ${EXPENSE_FIELD_LABELS[key] || key}`,
        oldValue: formatDiffValue(expA[key], type).slice(0, 500),
        newValue: formatDiffValue(expB[key], type).slice(0, 500),
        material: true,
      });
    }
  }

  // 5. Section 9: Household Members deep comparison
  const rawMemA = Array.isArray(before.householdMembers) ? before.householdMembers : [];
  const rawMemB = Array.isArray(after.householdMembers) ? after.householdMembers : [];
  const memA = rawMemA.filter((m: any) => m && String(m.fullName || '').trim() !== '');
  const memB = rawMemB.filter((m: any) => m && String(m.fullName || '').trim() !== '');

  if (memA.length !== memB.length) {
    changes.push({
      field: 'householdMembers',
      fieldLabel: 'จำนวนสมาชิกครัวเรือน',
      oldValue: `${memA.length} คน`,
      newValue: `${memB.length} คน`,
      material: true,
    });
  }

  const matchedA = new Set<number>();
  for (let i = 0; i < memB.length; i++) {
    const mb = memB[i];
    let idxA = -1;
    if (mb.id && !String(mb.id).startsWith('mem-')) {
      idxA = memA.findIndex((a: any, idx: number) => !matchedA.has(idx) && a.id === mb.id);
    }
    if (idxA === -1 && mb.fullName) {
      idxA = memA.findIndex(
        (a: any, idx: number) =>
          !matchedA.has(idx) && String(a.fullName || '').trim() === String(mb.fullName).trim(),
      );
    }
    if (idxA === -1 && i < memA.length && !matchedA.has(i)) {
      idxA = i;
    }

    if (idxA !== -1) {
      matchedA.add(idxA);
      const ma = memA[idxA];
      const memberProps: Array<{
        prop: string;
        altProps?: string[];
        label: string;
        type: 'string' | 'number' | 'date' | 'boolean';
        map?: Record<string, string>;
      }> = [
        { prop: 'fullName', label: 'ชื่อ-นามสกุล', type: 'string' },
        { prop: 'relation', altProps: ['relationship'], label: 'ความสัมพันธ์', type: 'string' },
        { prop: 'age', altProps: ['ageYears'], label: 'อายุ', type: 'number' },
        { prop: 'dateOfBirth', label: 'วันเกิด', type: 'date' },
        { prop: 'occupation', label: 'อาชีพ', type: 'string' },
        { prop: 'monthlyIncome', label: 'รายได้ต่อเดือน', type: 'number' },
        { prop: 'educationStatus', label: 'ระดับการศึกษา', type: 'string' },
        { prop: 'healthStatus', label: 'สถานะสุขภาพ', type: 'string', map: HEALTH_STATUS_DIFF_LABELS },
        { prop: 'healthNotes', label: 'หมายเหตุสุขภาพ', type: 'string' },
        { prop: 'isDependent', label: 'สถานะผู้พึ่งพิง', type: 'boolean' },
        { prop: 'notes', label: 'หมายเหตุ', type: 'string' },
      ];
      for (const p of memberProps) {
        const valA =
          ma[p.prop] !== undefined ? ma[p.prop] : p.altProps?.map((k) => ma[k]).find((v) => v !== undefined);
        const valB =
          mb[p.prop] !== undefined ? mb[p.prop] : p.altProps?.map((k) => mb[k]).find((v) => v !== undefined);
        if (!valuesEqual(valA, valB, p.type)) {
          changes.push({
            field: `householdMember.${p.prop}`,
            fieldLabel: `สมาชิก (${mb.fullName || ma.fullName || 'คนที่ ' + (i + 1)}): ${p.label}`,
            oldValue: formatDiffValue(valA, p.type, p.map).slice(0, 500),
            newValue: formatDiffValue(valB, p.type, p.map).slice(0, 500),
            material: true,
          });
        }
      }
    }
  }

  // 6. Section 3: Coordinator comparison
  const coordA = before.coordinator || {};
  const coordB = after.coordinator || {};
  const coordProps: Array<{ key: string; label: string; type: 'string' | 'number' | 'phone' }> = [
    { key: 'fullName', label: 'ชื่อผู้ประสานงาน', type: 'string' },
    { key: 'phone', label: 'เบอร์โทรผู้ประสานงาน', type: 'phone' },
    { key: 'occupation', label: 'อาชีพผู้ประสานงาน', type: 'string' },
    { key: 'roleTitle', label: 'บทบาทผู้ประสานงาน', type: 'string' },
    { key: 'relationship', label: 'ความสัมพันธ์ผู้ประสานงาน', type: 'string' },
    { key: 'address', label: 'ที่อยู่ผู้ประสานงาน', type: 'string' },
    { key: 'organization', label: 'หน่วยงานผู้ประสานงาน', type: 'string' },
    { key: 'age', label: 'อายุผู้ประสานงาน', type: 'number' },
  ];
  for (const p of coordProps) {
    if (!valuesEqual(coordA[p.key], coordB[p.key], p.type)) {
      changes.push({
        field: `coordinator.${p.key}`,
        fieldLabel: p.label,
        oldValue: formatDiffValue(coordA[p.key], p.type).slice(0, 500),
        newValue: formatDiffValue(coordB[p.key], p.type).slice(0, 500),
        material: false,
      });
    }
  }

  // 7. Section 3: Certifier comparison
  const certA = before.certifier || {};
  const certB = after.certifier || {};
  const certProps: Array<{ key: string; label: string; type: 'string' | 'phone' }> = [
    { key: 'fullName', label: 'ชื่อผู้รับรอง', type: 'string' },
    { key: 'phone', label: 'เบอร์โทรผู้รับรอง', type: 'phone' },
    { key: 'roleTitle', label: 'ตำแหน่งผู้รับรอง', type: 'string' },
    { key: 'organization', label: 'หน่วยงานผู้รับรอง', type: 'string' },
    { key: 'comments', label: 'ความเห็นผู้รับรอง', type: 'string' },
  ];
  for (const p of certProps) {
    if (!valuesEqual(certA[p.key], certB[p.key], p.type)) {
      changes.push({
        field: `certifier.${p.key}`,
        fieldLabel: p.label,
        oldValue: formatDiffValue(certA[p.key], p.type).slice(0, 500),
        newValue: formatDiffValue(certB[p.key], p.type).slice(0, 500),
        material: false,
      });
    }
  }

  // 8. Section 5: Past Assistance comparison
  const pastA = (Array.isArray(before.pastAssistance) ? before.pastAssistance : []).filter(
    (p: any) => p && (p.agency || p.amountOrItems || p.yearReceived || p.assistanceType),
  );
  const pastB = (Array.isArray(after.pastAssistance) ? after.pastAssistance : []).filter(
    (p: any) => p && (p.agency || p.amountOrItems || p.yearReceived || p.assistanceType),
  );
  if (pastA.length !== pastB.length) {
    changes.push({
      field: 'pastAssistance',
      fieldLabel: 'จำนวนประวัติการรับความช่วยเหลือ',
      oldValue: `${pastA.length} รายการ`,
      newValue: `${pastB.length} รายการ`,
      material: false,
    });
  } else {
    for (let i = 0; i < pastB.length; i++) {
      const a = pastA[i] || {};
      const b = pastB[i] || {};
      if (
        !valuesEqual(a.agency, b.agency) ||
        !valuesEqual(a.assistanceType, b.assistanceType) ||
        !valuesEqual(a.format, b.format) ||
        !valuesEqual(a.amountOrItems, b.amountOrItems) ||
        !valuesEqual(a.yearReceived, b.yearReceived) ||
        !valuesEqual(a.notes, b.notes)
      ) {
        changes.push({
          field: 'pastAssistance',
          fieldLabel: `ประวัติการรับความช่วยเหลือ (${b.agency || a.agency || 'รายการที่ ' + (i + 1)})`,
          oldValue: a.agency ? `${a.agency} (${a.amountOrItems || '-'})` : 'ไม่มีข้อมูล',
          newValue: b.agency ? `${b.agency} (${b.amountOrItems || '-'})` : 'ไม่มีข้อมูล',
          material: false,
        });
        break;
      }
    }
  }

  // 9. Section 4: Attachments/Documents comparison
  if (Array.isArray(after.newUploadedDocs) && after.newUploadedDocs.length > 0) {
    changes.push({
      field: 'documents',
      fieldLabel: 'เอกสารแนบเพิ่มเติม',
      oldValue: '0 ไฟล์',
      newValue: `${after.newUploadedDocs.length} ไฟล์ (${after.newUploadedDocs.map((d: any) => d.name || 'เอกสาร').join(', ').slice(0, 300)})`,
      material: false,
    });
  }

  // 10. Hardship reasons comparison
  if (before.hardshipReasons || after.hardshipReasons) {
    const jsonA = JSON.stringify(before.hardshipReasons || {});
    const jsonB = JSON.stringify(after.hardshipReasons || {});
    if (jsonA !== jsonB && (jsonA !== '{}' || jsonB !== '{}')) {
      changes.push({
        field: 'hardshipReasons',
        fieldLabel: 'เหตุผลความเดือดร้อน',
        oldValue: jsonA === '{}' ? 'ไม่มีข้อมูล' : 'ข้อมูลเดิม',
        newValue: jsonB === '{}' ? 'ไม่มีข้อมูล' : 'ข้อมูลใหม่',
        material: true,
      });
    }
  }

  return changes.map((c) => ({
    ...c,
    field: c.field.slice(0, 80),
    fieldLabel: c.fieldLabel.slice(0, 120),
  }));
}

function numberOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

export function mapRegistryDocument(document: any) {
  const rawStatus = String(document.status || 'UPLOADED').toUpperCase();
  const status = rawStatus === 'ACCEPTED' || rawStatus === 'VERIFIED'
    ? 'verified'
    : rawStatus === 'REJECTED'
      ? 'rejected'
      : 'pending';
  const fileExists = document.fileAvailable !== false && document.fileExists !== false;
  return {
    id: document.id,
    name: document.name || document.originalFileName || 'เอกสาร',
    fileName: document.fileName || document.originalFileName || document.name,
    category: document.category || document.documentType || 'other_doc',
    documentType: document.documentType || document.category,
    fileSize: document.fileSize ?? document.sizeBytes ?? 0,
    mimeType: document.mimeType || '',
    status,
    fileExists,
    uploadDate: document.uploadDate || document.createdAt || '',
    uploadedByName: document.uploadedByName || '',
    fileUrl: document.id ? `/api/documents/${document.id}/content` : document.fileUrl || '',
  };
}

export function mapNestBeneficiaryToRegistryItem(nestData: any): any {
  const name = splitPersonName({
    prefix: nestData.titlePrefix || nestData.title,
    firstName: nestData.firstName,
    lastName: nestData.lastName,
    fullName: nestData.fullName,
  });
  const titlePrefix = name.prefix;
  const fullName = formatPersonName(name) || 'ไม่ระบุชื่อ';
  const cleanId = nestData.identityNumber || '';
  const formattedId = cleanId
    ? cleanId.length === 13
      ? `${cleanId[0]}-${cleanId.slice(1, 5)}-${cleanId.slice(5, 10)}-${cleanId.slice(10, 12)}-${cleanId[12]}`
      : cleanId
    : '-';
  const maskedId = cleanId
    ? cleanId.length === 13
      ? `${cleanId[0]}-${cleanId.slice(1, 5)}-XXXXX-${cleanId.slice(10, 12)}-${cleanId[12]}`
      : cleanId
    : '-';

  const addresses = Array.isArray(nestData.addresses) ? nestData.addresses : [];
  const currentAddr = addresses.find((address: any) => address.addressType === 'CURRENT') || addresses[0] || {};
  const hh = nestData.household || {};
  const inc = nestData.incomeProfile || {};
  const situation = parseSituationNotes(hh.additionalNotes);
  const incomeBreakdown = parseObject(hh.incomeBreakdown);
  const expenseBreakdown = parseObject(hh.expenseBreakdown);
  const pastAssistance = safeJsonParse(hh.pastAssistance, []);
  const coordinator = safeJsonParse(hh.coordinatorInfo, null);
  const certifier = safeJsonParse(hh.certifierInfo, null);
  const hasProfile = situation.v === 1;
  const debtType = hasProfile ? situation.debtType || '' : hh.debtPurpose || '';
  const creditorName = hasProfile ? situation.creditorName || '' : '';
  const plainNote =
    situation.plainText && situation.plainText !== hh.familySituationSummary ? situation.plainText : '';

  const householdMembers = (Array.isArray(hh.members) ? hh.members : []).map((member: any, index: number) => ({
    id: member.id || `mem-${index + 1}`,
    fullName: member.fullName,
    relation: member.relationship,
    relationship: member.relationship,
    age: member.ageYears ?? null,
    ageYears: member.ageYears ?? null,
    dateOfBirth: member.dateOfBirth || '',
    occupation: member.occupation || '',
    monthlyIncome: numberOrNull(member.monthlyIncome),
    educationStatus: member.educationStatus || '',
    healthStatus: member.healthStatus || '',
    healthNotes: member.healthNotes || '',
    notes: member.notes || '',
    isDependent: member.isDependent,
  }));

  let asnafKey = '';
  if (nestData.asnaf?.code) asnafKey = String(nestData.asnaf.code).toLowerCase();

  const primaryMemberCode = nestData.memberId || nestData.registryNumber || '';
  return {
    id: nestData.id,
    memberId: primaryMemberCode,
    memberCode: primaryMemberCode,
    registrationNo: primaryMemberCode,
    registryNumber: nestData.registryNumber,
    memberStatus: String(nestData.memberStatus || 'ACTIVE').toLowerCase(),
    latestAssessment: nestData.latestAssessment || null,
    assessmentCount: nestData.assessmentCount ?? 0,
    assistanceApplicationsCount: nestData.requestCount ?? 0,
    totalAssistanceReceived: nestData.aidTotal !== undefined ? Number(nestData.aidTotal) || 0 : 0,
    registrationStatus: mapStatusToFrontend(nestData.status),
    status: nestData.status,
    titlePrefix,
    fullName,
    firstName: name.firstName,
    lastName: name.lastName,
    nationalId: cleanId,
    nationalIdFormatted: formattedId,
    nationalIdMasked: maskedId,
    birthDate: nestData.dateOfBirth || '',
    age: nestData.ageYears ?? null,
    phone: nestData.phone || '',
    email: '',
    occupation: nestData.occupation || '',
    maritalStatus: nestData.maritalStatus || '',
    asnafCategory: asnafKey,
    address: currentAddr.addressLine || hh.address || nestData.address || nestData.addressLine || '',
    community: currentAddr.community || hh.community || nestData.community || '',
    subdistrict: currentAddr.subdistrict || hh.subdistrict || nestData.subdistrict || '',
    district: currentAddr.district || hh.district || nestData.district || '',
    province: currentAddr.province || hh.province || nestData.province || '',
    postcode: currentAddr.postalCode || hh.postalCode || hh.postcode || nestData.postalCode || nestData.postcode || '',
    latitude: numberOrNull(currentAddr.latitude ?? hh.latitude),
    longitude: numberOrNull(currentAddr.longitude ?? hh.longitude),
    residenceAddress: hh.residenceAddress || currentAddr.addressLine || '',
    placeName: hh.placeName || '',
    locationVerificationStatus: hh.locationVerificationStatus || '',
    housingType: hh.housingType || '',
    housingCondition: hh.housingCondition || inc.housingCondition || '',
    housingNotes: hh.housingNotes || nestData.registrationNote || '',
    landTitleType: hh.landTitleType || '',
    landTitleNotes: hh.landTitleNotes || '',
    monthlyIncome: numberOrNull(hh.householdIncome) ?? numberOrNull(inc.personalIncome),
    monthlyExpense: numberOrNull(hh.householdExpense) ?? numberOrNull(inc.regularExpense),
    debtAmount: numberOrNull(hh.debtAmount) ?? numberOrNull(inc.debtBurden),
    debtMonthlyPayment: numberOrNull(expenseBreakdown?.debtPayment ?? situation.debtMonthlyPayment),
    debtType: debtType || undefined,
    debtPurpose: creditorName || (debtType ? '' : hh.debtPurpose || ''),
    creditorName: creditorName || '',
    debtNotes: situation.debtNotes || '',
    incomeBreakdown,
    expenseBreakdown,
    householdMembers,
    pastAssistance: Array.isArray(pastAssistance) ? pastAssistance : [],
    familySituationSummary: hh.familySituationSummary || '',
    urgentNeeds: hh.urgentNeeds || inc.assistanceNeeds || '',
    dependentBurdens: hh.dependentBurdens || '',
    disabilityNotes: situation.disabilityNotes || '',
    illnessNotes: situation.illnessNotes || '',
    livingLimitations: situation.livingLimitations || plainNote || '',
    hardshipReasons: situation.hardshipReasons || undefined,
    coordinator,
    certifier,
    documents: (nestData.documents || []).map((document: any) => mapRegistryDocument(document)),
    registeredDate: nestData.createdAt,
    createdAt: nestData.createdAt,
    updatedAt: nestData.updatedAt,
  };
}

export async function readNestFailure(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => ({}));
  if (Array.isArray(body?.details) && body.details.length > 0) {
    const msgs = body.details.map((d: any) => d?.message).filter((m: any) => typeof m === 'string' && m.trim());
    if (msgs.length > 0) return msgs.join(', ');
  }
  const raw = body?.message;
  if (typeof raw === 'string' && raw.trim()) return raw;
  if (Array.isArray(raw) && typeof raw[0] === 'string') return raw[0];
  if (typeof body?.error === 'string' && body.error.trim()) return body.error;
  return fallback;
}
