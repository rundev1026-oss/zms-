import { mapNestBeneficiaryToRegistryItem } from '@/lib/registrySurvey';

export interface SurveyPrintImage {
  id: string;
  dataUrl: string;
  caption: string;
}

export interface SurveyPrintModel {
  registryNumber: string;
  fullName: string;
  titlePrefix: string;
  firstName: string;
  lastName: string;
  statusLabel: string;
  registeredAt: string | null;
  printedAt: string;
  printedBy: string;
  officerName: string | null;
  nationalId: string | null;
  birthDate: string | null;
  birthDay: string | null;
  birthMonth: string | null;
  birthYear: string | null;
  age: string | null;
  phone: string | null;
  occupation: string | null;
  maritalStatus: string | null;
  maritalCode: string | null;
  address: string | null;
  addressLine: string | null;
  community: string | null;
  subdistrict: string | null;
  district: string | null;
  province: string | null;
  postcode: string | null;
  housingCode: string | null;
  landCode: string | null;
  housingType: string | null;
  housingCondition: string | null;
  housingNotes: string | null;
  landTitle: string | null;
  landNotes: string | null;
  reasons: { label: string; checked: boolean | null; detail?: string | null }[];
  reasonsRecorded: boolean;
  disability: string | null;
  illness: string | null;
  limitations: string | null;
  assistanceNeeds: string[];
  pastAssistance: {
    agency: string | null;
    type: string | null;
    amount: string | null;
    year: string | null;
    notes: string | null;
  }[];
  pastAssistanceKnownNone: boolean;
  incomeRows: { label: string; amount: string | null }[];
  expenseRows: { label: string; amount: string | null }[];
  incomeTotal: string | null;
  expenseTotal: string | null;
  net: string | null;
  debt: {
    type: string | null;
    balance: string | null;
    monthly: string | null;
    creditor: string | null;
    notes: string | null;
  } | null;
  members: {
    name: string;
    age: string | null;
    education: string | null;
    occupation: string | null;
    income: string | null;
    relation: string | null;
    notes: string | null;
  }[];
  familySituation: string | null;
  dependentBurdens: string | null;
  criteria: { label: string; result: 'pass' | 'fail' | 'blank'; note: string | null }[];
  criteriaRecorded: boolean;
  committeeNotes: string | null;
  coordinator: Record<string, string | null>;
  certifier: Record<string, string | null>;
  applicantName: string;
  location: {
    address: string | null;
    placeName: string | null;
    latitude: string | null;
    longitude: string | null;
    verification: string | null;
  };
  asnaf: {
    name: string;
    rationale: string | null;
    assessedAt: string | null;
    recordedBy: string | null;
    reviewedBy: string | null;
  } | null;
  consent: { accepted: boolean; version: string | null; recordedAt: string | null } | null;
  applications: {
    no: string | null;
    type: string | null;
    detail: string | null;
    requested: string | null;
    approved: string | null;
    disbursed: string | null;
    status: string | null;
    date: string | null;
  }[];
  applicationsNote: string | null;
  documents: {
    type: string;
    name: string;
    date: string | null;
    status: string;
    kind: 'image' | 'pdf' | 'other';
  }[];
  images: SurveyPrintImage[];
  registrationNote: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'ร่าง',
  pending_verification: 'รอตรวจสอบข้อมูล',
  pending_survey: 'รอลงพื้นที่สำรวจ',
  pending_qualification: 'รอพิจารณาคุณสมบัติ',
  qualified: 'มีคุณสมบัติตามเกณฑ์',
  disqualified: 'ไม่มีคุณสมบัติตามเกณฑ์',
  need_more_info: 'รอตรวจสอบใหม่',
  suspended: 'ระงับหรือยกเลิกทะเบียน',
};

const MARITAL: Record<string, string> = {
  single: 'โสด',
  married: 'สมรส',
  divorced: 'หย่าร้าง',
  widowed: 'หม้าย',
  separated: 'แยกกันอยู่',
};

const HOUSING: Record<string, string> = {
  own: 'บ้านตนเอง',
  rent: 'บ้านเช่า',
  relative: 'อาศัยญาติหรือผู้อื่น',
  other: 'อื่น ๆ',
  public_land: 'ที่ดินสาธารณะ',
};

const HOUSING_CONDITION: Record<string, string> = {
  dilapidated: 'ชำรุดทรุดโทรมมาก',
  poor: 'สภาพไม่มั่นคง',
  fair: 'สภาพพอใช้',
  rented: 'บ้านเช่า',
  owned: 'บ้านตนเอง',
};

const LAND: Record<string, string> = {
  title_deed: 'โฉนดที่ดิน',
  ns3: 'น.ส.3',
  nor_sor_3: 'น.ส.3 / น.ส.3 ก.',
  spk: 'ส.ป.ก.',
  sor_por_kor: 'ส.ป.ก. 4-01',
  public_land: 'ที่ดินสาธารณะ',
  no_doc: 'ไม่มีเอกสารสิทธิ์',
  none: 'ไม่มีเอกสารสิทธิ์',
  permission_granted: 'มีหนังสือให้ใช้จากเจ้าของที่ดิน',
  rental_agreement: 'สัญญาเช่า',
  other: 'อื่น ๆ',
};

const DOC_TYPES: Record<string, string> = {
  id_card: 'สำเนาบัตรประจำตัวประชาชน',
  house_reg: 'สำเนาทะเบียนบ้าน',
  income_proof: 'เอกสารรับรองรายได้',
  medical_cert: 'เอกสารรับรองการเจ็บป่วย',
  debt_doc: 'เอกสารแสดงภาระหนี้สิน',
  housing_exterior: 'ภาพถ่ายภายนอกบ้าน',
  housing_interior: 'ภาพถ่ายภายในบ้าน',
  family_photo: 'ภาพถ่ายครอบครัว',
  field_photo: 'ภาพถ่ายบ้านหรือที่อยู่อาศัย',
  land_doc: 'เอกสารสิทธิ์ที่ดินหรือหนังสือให้ใช้ที่ดิน',
  disability_doc: 'เอกสารรับรองความพิการ',
  other_doc: 'เอกสารอื่น ๆ',
};

const HEALTH: Record<string, string> = {
  healthy: 'สุขภาพปกติ',
  chronically_ill: 'เจ็บป่วยเรื้อรัง',
  disabled: 'พิการ',
  elderly: 'สูงอายุ',
};

const APP_STATUS: Record<string, string> = {
  draft: 'ร่าง',
  submitted: 'ยื่นแล้ว',
  doc_review: 'รอตรวจสอบเอกสาร',
  field_inspection: 'รอลงพื้นที่',
  pending_approval: 'รอพิจารณา',
  approved: 'อนุมัติ',
  rejected: 'ไม่อนุมัติ',
  disbursed: 'ดำเนินการช่วยเหลือแล้ว',
  closed: 'ปิดคำร้อง',
  cancelled: 'ยกเลิก',
};

const INCOME_LINES: { key: string; label: string }[] = [
  { key: 'salary', label: 'รายได้จากค่าจ้าง' },
  { key: 'familySupport', label: 'รายได้จากคนในครอบครัวให้' },
  { key: 'agriculture', label: 'รายได้จากการขายผลผลิตทางการเกษตร' },
  { key: 'trading', label: 'รายได้จากการค้าขาย' },
  { key: 'assetIncome', label: 'รายได้จากทรัพย์สิน เช่น ค่าเช่าทรัพย์สิน' },
  { key: 'freelance', label: 'รายได้จากอาชีพส่วนตัว' },
  { key: 'welfare', label: 'รายได้จากความช่วยเหลือ เช่น สวัสดิการจากรัฐ' },
  { key: 'otherIncome', label: 'รายได้อื่น ๆ' },
];

const EXPENSE_LINES: { key: string; label: string }[] = [
  { key: 'living', label: 'ค่าใช้จ่ายอุปโภคบริโภค' },
  { key: 'education', label: 'ค่าใช้จ่ายเพื่อการศึกษา' },
  { key: 'healthcare', label: 'ค่าใช้จ่ายเพื่อสุขภาพ' },
  { key: 'utilities', label: 'ค่าใช้จ่ายค่าน้ำ ค่าไฟ' },
  { key: 'rent', label: 'ค่าใช้จ่ายบ้านเช่า' },
  { key: 'debtPayment', label: 'รายจ่ายเพื่อการชำระหนี้' },
  { key: 'otherExpense', label: 'รายจ่ายอื่น ๆ' },
];

const CRITERIA: { key: string; label: string }[] = [
  { key: 'amalIbadah', label: 'ประกอบอามั้ล–อิบาดะฮอย่างเคร่งครัด (ในกรณีที่เป็นมุสลิม)' },
  { key: 'landRights', label: 'มีที่ดินเป็นของตนเองหรือมีหนังสือให้ใช้จากเจ้าของที่ดิน' },
  { key: 'housingCondition', label: 'โครงสร้างและที่อยู่อาศัยไม่มั่นคงหรือชำรุดทรุดโทรมมากกว่า 70% (กรณีขอซ่อมหรือสร้างบ้าน)' },
  { key: 'economicStatus', label: 'ฐานะยากจน รายได้ไม่แน่นอน หรือมีหนี้สิน' },
  { key: 'communityParticipation', label: 'ชาวบ้านในพื้นที่ต้องมีส่วนร่วมในการช่วยเหลือ' },
  { key: 'leaderEndorsement', label: 'ต้องได้รับการรับรองความประพฤติจากอิหม่ามและผู้ใหญ่บ้านหรือผู้นำท้องถิ่น' },
  { key: 'asnafVulnerability', label: 'เป็นผู้ด้อยโอกาสและถูกละเลยในสังคม' },
  { key: 'dependentBurdens', label: 'สมาชิกภายในบ้านเป็นผู้พิการ สูงอายุ ป่วยเป็นโรคเรื้อรัง หรือมีภาระต้องเลี้ยงดูบุตรในวัยเรียน' },
];

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  return raw ? raw : null;
}

function labelOf(map: Record<string, string>, value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  return map[raw] || raw;
}

export function formatThaiDate(value: unknown, withTime = false): string | null {
  const raw = text(value);
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: withTime ? 'medium' : 'long',
    timeStyle: withTime ? 'short' : undefined,
    timeZone: 'Asia/Bangkok',
  }).format(date);
}

function baht(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sumLines(source: Record<string, unknown> | null | undefined, keys: string[]): number | null {
  if (!source) return null;
  let seen = false;
  let total = 0;
  for (const key of keys) {
    const amount = source[key];
    if (amount === undefined || amount === null || amount === '') continue;
    const number = Number(amount);
    if (!Number.isFinite(number)) continue;
    seen = true;
    total += number;
  }
  return seen ? total : null;
}

function birthParts(value: unknown): { day: string | null; month: string | null; year: string | null } {
  const raw = text(value);
  if (!raw) return { day: null, month: null, year: null };
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return { day: null, month: null, year: null };
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(date);
  const day = parts.find((part) => part.type === 'day')?.value || null;
  const month = parts.find((part) => part.type === 'month')?.value || null;
  const yearNum = Number(parts.find((part) => part.type === 'year')?.value);
  return {
    day,
    month,
    year: Number.isFinite(yearNum) ? String(yearNum + 543) : null,
  };
}

function formatNationalId(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 13 || raw.includes('•')) return raw;
  return `${digits[0]}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10, 12)}-${digits[12]}`;
}

function personBits(source: any): Record<string, string | null> {
  if (!source || typeof source !== 'object') {
    return { name: null, phone: null, occupation: null, role: null, age: null, nationalId: null, address: null };
  }
  const name = text(source.fullName || source.name);
  return {
    name,
    phone: text(source.phone),
    occupation: text(source.occupation),
    role: text(source.roleTitle || source.position || source.relationship || source.organization),
    age: source.age === undefined || source.age === null || source.age === '' ? null : String(source.age),
    nationalId: formatNationalId(source.nationalId || source.identityNumber),
    address: text(source.address),
  };
}

function parseChecklist(applications: any[]): Record<string, unknown> | null {
  const ordered = [...applications].sort((a, b) => {
    const left = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const right = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return right - left;
  });
  for (const app of ordered) {
    const raw = app?.evaluatorChecklist;
    if (!raw) continue;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      continue;
    }
  }
  return null;
}

function documentKind(mime: string, category: string): 'image' | 'pdf' | 'other' {
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf' || category === 'pdf') return 'pdf';
  return 'other';
}

function documentStatus(doc: any): string {
  if (doc.fileAvailable === false || doc.fileExists === false) return 'ไม่พบไฟล์ต้นฉบับ';
  const raw = String(doc.status || '').toUpperCase();
  if (raw === 'ACCEPTED' || raw === 'VERIFIED' || raw === 'verified') return 'พร้อมใช้งาน';
  if (raw === 'REJECTED' || raw === 'rejected') return 'ไม่ผ่าน';
  if (raw === 'UPLOADED' || raw === 'pending' || raw === 'PENDING') return 'รอตรวจสอบ';
  return text(doc.status) || 'รอตรวจสอบ';
}

export function buildSurveyPrintModel(input: {
  beneficiary: any;
  documents: any[];
  applications: any[];
  applicationsNote: string | null;
  consent: any | null;
  images: SurveyPrintImage[];
  printedBy: string;
  printedAt?: Date;
}): SurveyPrintModel {
  const mapped = mapNestBeneficiaryToRegistryItem(input.beneficiary);
  const printedAt = formatThaiDate(input.printedAt || new Date(), true) || '';
  const income = (mapped.incomeBreakdown || null) as Record<string, unknown> | null;
  const expense = (mapped.expenseBreakdown || null) as Record<string, unknown> | null;
  const incomeSum = sumLines(income, INCOME_LINES.map((line) => line.key));
  const expenseSum = sumLines(expense, EXPENSE_LINES.map((line) => line.key));
  const incomeTotal = incomeSum ?? (mapped.monthlyIncome === null || mapped.monthlyIncome === undefined ? null : Number(mapped.monthlyIncome));
  const expenseTotal = expenseSum ?? (mapped.monthlyExpense === null || mapped.monthlyExpense === undefined ? null : Number(mapped.monthlyExpense));
  const net = incomeTotal !== null && expenseTotal !== null && Number.isFinite(incomeTotal) && Number.isFinite(expenseTotal)
    ? incomeTotal - expenseTotal
    : null;
  const reasons = mapped.hardshipReasons || null;
  const debtMonthly = expense ? baht(expense.debtPayment) : null;
  const hasDebt = [mapped.debtAmount, mapped.debtType, mapped.creditorName, mapped.debtNotes, mapped.debtPurpose, debtMonthly]
    .some((value) => text(value));
  const checklist = parseChecklist(input.applications);
  const members = (Array.isArray(input.beneficiary?.household?.members) ? input.beneficiary.household.members : mapped.householdMembers || [])
    .filter((member: any) => text(member.fullName))
    .map((member: any) => {
      const health = labelOf(HEALTH, member.healthStatus);
      const healthNote = text(member.healthNotes);
      const note = [text(member.notes), health && health !== 'สุขภาพปกติ' ? health : null, healthNote]
        .filter(Boolean)
        .join(' / ');
      return {
        name: String(member.fullName).trim(),
        age: member.ageYears ?? member.age ?? null,
        education: text(member.educationStatus),
        occupation: text(member.occupation),
        income: baht(member.monthlyIncome),
        relation: text(member.relationship || member.relation),
        notes: note || null,
        ageText: member.ageYears ?? member.age,
      };
    })
    .map((member: any) => ({
      name: member.name,
      age: member.age === null || member.age === undefined || member.age === '' ? null : String(member.age),
      education: member.education,
      occupation: member.occupation,
      income: member.income,
      relation: member.relation,
      notes: member.notes,
    }));

  const past = Array.isArray(mapped.pastAssistance) ? mapped.pastAssistance : [];
  const assistanceNeeds = [text(mapped.urgentNeeds), text(input.beneficiary?.incomeProfile?.assistanceNeeds)]
    .filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index);

  const addressLine = text(mapped.address);
  const community = text(mapped.community);
  const subdistrict = text(mapped.subdistrict);
  const district = text(mapped.district);
  const province = text(mapped.province);
  const postcode = text(mapped.postcode);
  const addressParts = [addressLine, community, subdistrict, district, province, postcode].filter(Boolean);
  const born = birthParts(mapped.birthDate);

  const asnaf = input.beneficiary?.asnaf;
  const docs = input.documents.length > 0 ? input.documents : (mapped.documents || []);

  return {
    registryNumber: text(mapped.registrationNo) || '-',
    fullName: text(mapped.fullName) || 'ไม่ระบุชื่อ',
    titlePrefix: text(mapped.titlePrefix) || '',
    firstName: text(mapped.firstName) || '',
    lastName: text(mapped.lastName) || '',
    statusLabel: STATUS_LABELS[mapped.registrationStatus] || text(mapped.registrationStatus) || 'ไม่มีข้อมูล',
    registeredAt: formatThaiDate(mapped.registeredDate || mapped.createdAt),
    printedAt,
    printedBy: text(input.printedBy) || 'ไม่มีข้อมูล',
    officerName: text(input.beneficiary?.createdByName),
    nationalId: formatNationalId(mapped.nationalId),
    birthDate: formatThaiDate(mapped.birthDate),
    birthDay: born.day,
    birthMonth: born.month,
    birthYear: born.year,
    age: mapped.age === null || mapped.age === undefined || mapped.age === '' ? null : String(mapped.age),
    phone: text(mapped.phone),
    occupation: text(mapped.occupation),
    maritalStatus: labelOf(MARITAL, mapped.maritalStatus),
    maritalCode: text(mapped.maritalStatus),
    address: addressParts.length ? addressParts.join(' ') : null,
    addressLine,
    community,
    subdistrict,
    district,
    province,
    postcode,
    housingCode: text(mapped.housingType),
    housingType: labelOf(HOUSING, mapped.housingType),
    housingCondition: labelOf(HOUSING_CONDITION, mapped.housingCondition),
    housingNotes: text(mapped.housingNotes),
    landCode: text(mapped.landTitleType),
    landTitle: labelOf(LAND, mapped.landTitleType),
    landNotes: text(mapped.landTitleNotes),
    reasonsRecorded: Boolean(reasons),
    reasons: [
      { label: 'ยากจน / รายได้น้อย', checked: reasons ? Boolean(reasons.poverty) : null },
      { label: 'มีหนี้สิน', checked: reasons ? Boolean(reasons.debt) : null, detail: text(reasons?.debtType) },
      { label: 'ตกงาน / ไม่มีงานทำ / ไม่มีอาชีพ', checked: reasons ? Boolean(reasons.unemployed) : null },
      { label: 'ปัญหาครอบครัว', checked: reasons ? Boolean(reasons.familyIssue) : null, detail: text(reasons?.familyIssueDetails) },
      { label: 'อื่น ๆ', checked: reasons ? Boolean(reasons.other) : null, detail: text(reasons?.otherDetails) },
    ],
    disability: text(mapped.disabilityNotes) || (reasons?.disability ? text(reasons.disabilityDetails) : null),
    illness: text(mapped.illnessNotes) || (reasons?.illness ? text(reasons.illnessDetails) : null),
    limitations: text(mapped.livingLimitations),
    assistanceNeeds,
    pastAssistanceKnownNone: past.length === 1 && past[0]?.hasReceived === false && !text(past[0]?.agency),
    pastAssistance: past
      .filter((row: any) => row?.hasReceived !== false || text(row?.agency) || text(row?.assistanceType))
      .map((row: any) => ({
        agency: text(row.agency),
        type: text(row.assistanceType),
        amount: text(row.amountOrItems || row.amount),
        year: text(row.yearReceived || row.dateReceived),
        notes: text(row.notes),
      })),
    incomeRows: INCOME_LINES.map((line) => ({
      label: line.key === 'otherIncome' && text(income?.otherIncomeNotes)
        ? `${line.label} (${text(income?.otherIncomeNotes)})`
        : line.label,
      amount: baht(income?.[line.key]),
    })),
    expenseRows: EXPENSE_LINES.map((line) => ({
      label: line.key === 'otherExpense' && text(expense?.otherExpenseNotes)
        ? `${line.label} (${text(expense?.otherExpenseNotes)})`
        : line.label,
      amount: baht(expense?.[line.key]),
    })),
    incomeTotal: baht(incomeTotal),
    expenseTotal: baht(expenseTotal),
    net: baht(net),
    debt: hasDebt
      ? {
          type: text(mapped.debtType),
          balance: baht(mapped.debtAmount),
          monthly: debtMonthly,
          creditor: text(mapped.creditorName || mapped.debtPurpose),
          notes: text(mapped.debtNotes),
        }
      : null,
    members,
    familySituation: text(mapped.familySituationSummary),
    dependentBurdens: text(mapped.dependentBurdens),
    criteriaRecorded: Boolean(checklist),
    criteria: [
      ...CRITERIA.map((item) => {
        if (!checklist || !Object.prototype.hasOwnProperty.call(checklist, item.key)) {
          return { label: item.label, result: 'blank' as const, note: null };
        }
        return {
          label: item.label,
          result: checklist[item.key] ? 'pass' as const : 'fail' as const,
          note: text(checklist[`${item.key}Notes`]),
        };
      }),
      {
        label: 'สมาชิกในครอบครัวจะต้องไม่มีส่วนเกี่ยวข้องกับยาเสพติดหรืออบายมุข โดยขึ้นอยู่กับการพิจารณาของคณะกรรมการที่ลงพื้นที่',
        result: 'blank' as const,
        note: null,
      },
    ],
    committeeNotes: text(checklist?.committeeNotes),
    coordinator: personBits(mapped.coordinator),
    certifier: personBits(mapped.certifier),
    applicantName: text(mapped.fullName) || '',
    location: {
      address: text(mapped.residenceAddress) || (addressParts.length ? addressParts.join(' ') : null),
      placeName: text(mapped.placeName),
      latitude: mapped.latitude === null || mapped.latitude === undefined ? null : String(mapped.latitude),
      longitude: mapped.longitude === null || mapped.longitude === undefined ? null : String(mapped.longitude),
      verification: labelOf(
        {
          not_specified: 'ยังไม่ระบุ',
          pending_verification: 'รอตรวจสอบพิกัด',
          verified: 'ตรวจสอบพิกัดแล้ว',
        },
        mapped.locationVerificationStatus,
      ),
    },
    asnaf: asnaf?.nameTh
      ? {
          name: asnaf.nameTh,
          rationale: text(asnaf.rationale),
          assessedAt: formatThaiDate(asnaf.assessedAt, true),
          recordedBy: text(asnaf.recordedByName),
          reviewedBy: text(asnaf.reviewedByName),
        }
      : null,
    consent: input.consent
      ? {
          accepted: Boolean(input.consent.accepted),
          version: text(input.consent.consentTextVersion || input.consent.privacyNoticeVersion),
          recordedAt: formatThaiDate(input.consent.recordedAt, true),
        }
      : null,
    applications: input.applications.map((app) => ({
      no: text(app.applicationNo),
      type: text(app.assistanceType || app.assistanceTypeDetails),
      detail: text(app.necessityDetails || app.assistanceTypeDetails),
      requested: baht(app.requestedAmount),
      approved: baht(app.approvedAmount),
      disbursed: baht(app.disbursedAmount),
      status: labelOf(APP_STATUS, app.status),
      date: formatThaiDate(app.appliedDate || app.createdAt),
    })),
    applicationsNote: input.applicationsNote,
    documents: docs.map((doc: any) => {
      const category = String(doc.documentType || doc.category || 'other_doc');
      const mime = String(doc.mimeType || '');
      return {
        type: DOC_TYPES[category] || category,
        name: text(doc.originalFileName || doc.fileName || doc.name) || 'ไม่มีชื่อไฟล์',
        date: formatThaiDate(doc.createdAt || doc.uploadDate, true),
        status: documentStatus(doc),
        kind: documentKind(mime, category),
      };
    }),
    images: input.images,
    registrationNote: text(input.beneficiary?.registrationNote),
  };
}
