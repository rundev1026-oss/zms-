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

export function sumFilled(source: unknown, keys: readonly string[]): number | null {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  const record = source as Record<string, unknown>;
  let seen = false;
  let total = 0;
  for (const key of keys) {
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
  if (!Number.isFinite(amount)) return undefined;
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
    input.creditorName !== undefined;
  if (!touched) return undefined;

  const debtType = input.debtType || input.hardshipReasons?.debtType || '';
  const creditorName =
    input.creditorName ||
    (input.debtPurpose && input.debtPurpose !== debtType ? input.debtPurpose : '') ||
    '';
  const profile = {
    v: 1,
    disabilityNotes: input.disabilityNotes || input.hardshipReasons?.disabilityDetails || '',
    illnessNotes: input.illnessNotes || input.hardshipReasons?.illnessDetails || '',
    livingLimitations: input.livingLimitations || input.hardshipReasons?.otherDetails || '',
    debtType,
    creditorName,
    debtNotes: input.debtNotes || '',
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
      const ageRaw = member.ageYears ?? member.age;
      const age = Number(ageRaw);
      return {
        fullName: String(member.fullName).trim(),
        relationship: member.relationship || member.relation || 'สมาชิกในครอบครัว',
        ageYears: Number.isFinite(age) ? Math.round(age) : undefined,
        dateOfBirth: member.dateOfBirth || undefined,
        occupation: member.occupation || undefined,
        monthlyIncome: (() => {
          if (member.monthlyIncome === undefined || member.monthlyIncome === null || member.monthlyIncome === '') {
            return undefined;
          }
          const income = Number(member.monthlyIncome);
          return Number.isFinite(income) ? income : undefined;
        })(),
        educationStatus: member.educationStatus || undefined,
        healthStatus: member.healthStatus || undefined,
        healthNotes: member.healthNotes || undefined,
        notes: member.notes || undefined,
        isDependent: Boolean(
          member.isDependent ??
            (member.relation === 'บุตร' ||
              member.relation === 'คู่สมรส' ||
              member.relationship === 'บุตร' ||
              member.relationship === 'คู่สมรส' ||
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

  const lineIncome = sumFilled(input.incomeBreakdown, INCOME_LINE_KEYS);
  const lineExpense = sumFilled(input.expenseBreakdown, EXPENSE_LINE_KEYS);
  const householdIncome = lineIncome !== null ? lineIncome.toFixed(2) : money(input.monthlyIncome ?? input.totalIncome);
  const householdExpense = lineExpense !== null ? lineExpense.toFixed(2) : money(input.monthlyExpense ?? input.totalExpense);
  if (householdIncome !== undefined) payload.householdIncome = householdIncome;
  if (householdExpense !== undefined) payload.householdExpense = householdExpense;

  const debt = money(input.debtAmount);
  if (input.debtAmount !== undefined && debt !== undefined) payload.debtAmount = debt;

  if (input.debtPurpose !== undefined || input.debtType !== undefined || input.creditorName !== undefined) {
    const debtType = input.debtType || input.hardshipReasons?.debtType || '';
    const creditor =
      input.creditorName || (input.debtPurpose && input.debtPurpose !== debtType ? input.debtPurpose : '');
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

  if (input.latitude !== undefined && input.latitude !== null && input.latitude !== '') {
    const latitude = Number(input.latitude);
    if (Number.isFinite(latitude)) payload.latitude = latitude;
  }
  if (input.longitude !== undefined && input.longitude !== null && input.longitude !== '') {
    const longitude = Number(input.longitude);
    if (Number.isFinite(longitude)) payload.longitude = longitude;
  }
  if (!payload.residenceAddress && input.address) payload.residenceAddress = input.address;
  return payload;
}

export function buildIncomeProfilePayload(input: Record<string, any>): Record<string, string> | null {
  const body: Record<string, string> = {};
  const lineIncome = sumFilled(input.incomeBreakdown, INCOME_LINE_KEYS);
  const lineExpense = sumFilled(input.expenseBreakdown, EXPENSE_LINE_KEYS);
  const personal = lineIncome !== null ? lineIncome.toFixed(2) : money(input.monthlyIncome);
  const regular = lineExpense !== null ? lineExpense.toFixed(2) : money(input.monthlyExpense);
  const debt = input.debtAmount !== undefined ? money(input.debtAmount) : undefined;
  if (personal !== undefined) body.personalIncome = personal;
  if (regular !== undefined) body.regularExpense = regular;
  if (debt !== undefined) body.debtBurden = debt;

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

export function diffRegistryFields(before: Record<string, any>, after: Record<string, any>) {
  const fields: [string, string, boolean][] = [
    ['fullName', 'ชื่อ-นามสกุล', false],
    ['titlePrefix', 'คำนำหน้า', false],
    ['phone', 'เบอร์โทรศัพท์', false],
    ['occupation', 'อาชีพ', false],
    ['address', 'ที่อยู่', true],
    ['province', 'จังหวัด', true],
    ['district', 'อำเภอ', true],
    ['monthlyIncome', 'รายได้ต่อเดือน', true],
    ['monthlyExpense', 'ค่าใช้จ่ายต่อเดือน', true],
    ['debtAmount', 'ยอดหนี้คงเหลือ', true],
    ['debtType', 'ประเภทหนี้สิน', true],
    ['creditorName', 'เจ้าหนี้', true],
    ['disabilityNotes', 'ความพิการ', true],
    ['illnessNotes', 'การเจ็บป่วย', true],
    ['livingLimitations', 'ข้อจำกัดในการดำรงชีวิต', true],
    ['familySituationSummary', 'ปัญหาครอบครัว', false],
    ['nationalId', 'เลขบัตรประชาชน', true],
  ];
  const changes: {
    field: string;
    fieldLabel: string;
    oldValue: string;
    newValue: string;
    material: boolean;
  }[] = [];
  for (const [field, label, material] of fields) {
    const oldValue = field === 'nationalId'
      ? maskNationalId(before[field])
      : field === 'fullName'
        ? formatPersonName(before)
        : displayValue(before[field]);
    const newValue = field === 'nationalId'
      ? maskNationalId(after[field])
      : field === 'fullName'
        ? formatPersonName(after)
        : displayValue(after[field]);
    if (oldValue !== newValue) {
      changes.push({
        field,
        fieldLabel: label,
        oldValue: oldValue.slice(0, 500),
        newValue: newValue.slice(0, 500),
        material,
      });
    }
  }
  const beforeMembers = Array.isArray(before.householdMembers) ? before.householdMembers.length : 0;
  const afterMembers = Array.isArray(after.householdMembers) ? after.householdMembers.length : 0;
  if (beforeMembers !== afterMembers) {
    changes.push({
      field: 'householdMembers',
      fieldLabel: 'จำนวนสมาชิกครัวเรือน',
      oldValue: String(beforeMembers),
      newValue: String(afterMembers),
      material: true,
    });
  }
  const beforeNames = (before.householdMembers || []).map((member: any) => member.fullName).filter(Boolean).join(', ');
  const afterNames = (after.householdMembers || []).map((member: any) => member.fullName).filter(Boolean).join(', ');
  if (beforeNames !== afterNames) {
    changes.push({
      field: 'householdMemberNames',
      fieldLabel: 'รายชื่อสมาชิกครัวเรือน',
      oldValue: beforeNames.slice(0, 500),
      newValue: afterNames.slice(0, 500),
      material: true,
    });
  }
  if (JSON.stringify(before.incomeBreakdown || null) !== JSON.stringify(after.incomeBreakdown || null)) {
    changes.push({
      field: 'incomeBreakdown',
      fieldLabel: 'รายการรายได้',
      oldValue: displayValue(before.monthlyIncome),
      newValue: displayValue(after.monthlyIncome),
      material: true,
    });
  }
  if (JSON.stringify(before.expenseBreakdown || null) !== JSON.stringify(after.expenseBreakdown || null)) {
    changes.push({
      field: 'expenseBreakdown',
      fieldLabel: 'รายการรายจ่าย',
      oldValue: displayValue(before.monthlyExpense),
      newValue: displayValue(after.monthlyExpense),
      material: true,
    });
  }
  return changes;
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
  const maskedId = cleanId
    ? cleanId.length === 13
      ? `${cleanId[0]}-${cleanId.slice(1, 5)}-${cleanId.slice(5, 10)}-${cleanId.slice(10, 12)}-${cleanId[12]}`
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

  return {
    id: nestData.id,
    registrationNo: nestData.registryNumber,
    registryNumber: nestData.registryNumber,
    registrationStatus: mapStatusToFrontend(nestData.status),
    status: nestData.status,
    titlePrefix,
    fullName,
    firstName: name.firstName,
    lastName: name.lastName,
    nationalId: cleanId,
    nationalIdMasked: maskedId,
    birthDate: nestData.dateOfBirth || '',
    age: nestData.ageYears ?? null,
    phone: nestData.phone || '',
    email: '',
    occupation: nestData.occupation || '',
    maritalStatus: nestData.maritalStatus || '',
    asnafCategory: asnafKey,
    address: currentAddr.addressLine || hh.address || '',
    community: currentAddr.community || hh.community || '',
    subdistrict: currentAddr.subdistrict || hh.subdistrict || '',
    district: currentAddr.district || hh.district || '',
    province: currentAddr.province || hh.province || '',
    postcode: currentAddr.postalCode || '',
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
  const raw = body?.message;
  if (typeof raw === 'string' && raw.trim()) return raw;
  if (Array.isArray(raw) && typeof raw[0] === 'string') return raw[0];
  if (typeof body?.error === 'string' && body.error.trim()) return body.error;
  return fallback;
}
