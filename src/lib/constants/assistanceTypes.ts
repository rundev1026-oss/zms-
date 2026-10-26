// ZMS 10 Standard Assistance Types (10 ประเภทความช่วยเหลือมาตรฐานของมูลนิธิ)
// แบ่งเป็น 2 กลุ่ม: กลุ่มหลัก (Core 6 รายการ) และ กลุ่มเฉพาะ (Specialized 4 รายการ)

export type AssistanceTypeGroup = 'core' | 'specific';

export interface AssistanceTypeDefinition {
  id: string;
  code: string;
  name: string;
  group: AssistanceTypeGroup;
  groupLabelTh: string;
  category: 'cash' | 'in_kind' | 'service' | 'housing' | 'education' | 'medical' | 'other';
  categoryLabelTh: string;
  description: string;
  defaultAmount?: number;
  requiredDocuments: string[];
  icon: string;
  badgeColor: string;
  isActive: boolean;
  orderIndex: number;
}

export const ASSISTANCE_TYPES: AssistanceTypeDefinition[] = [
  // ==========================================
  // กลุ่มหลัก (Core Assistance Types) - 6 รายการ
  // ==========================================
  {
    id: 'ast-core-1',
    code: 'LIVING_SUPPORT',
    name: 'ปัจจัยยังชีพ',
    group: 'core',
    groupLabelTh: 'กลุ่มหลัก',
    category: 'cash',
    categoryLabelTh: 'เงินสงเคราะห์/สิ่งของยังชีพ',
    description: 'เงินช่วยเหลือยังชีพฉุกเฉินและข้าวสารอาหารแห้งขั้นพื้นฐานสำหรับครอบครัวที่ขาดแคลน',
    defaultAmount: 3000,
    requiredDocuments: [
      'สำเนาบัตรประจำตัวประชาชน',
      'สำเนาทะเบียนบ้าน',
      'หนังสือรับรองความยากจน/ผู้นำชุมชน',
    ],
    icon: 'HeartHandshake',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    isActive: true,
    orderIndex: 1,
  },
  {
    id: 'ast-core-2',
    code: 'MONTHLY_ALLOWANCE',
    name: 'ปัจจัยยังชีพรายเดือน',
    group: 'core',
    groupLabelTh: 'กลุ่มหลัก',
    category: 'cash',
    categoryLabelTh: 'เงินสงเคราะห์รายเดือน',
    description: 'เงินสงเคราะห์เพื่อการครองชีพรายเดือนต่อเนื่องสำหรับผู้สูงอายุ ผู้พิการ หรือผู้ป่วยติดเตียง',
    defaultAmount: 2000,
    requiredDocuments: [
      'สำเนาบัตรประจำตัวประชาชน',
      'สำเนาทะเบียนบ้าน',
      'ใบรับรองแพทย์/สมุดคนพิการ (ถ้ามี)',
      'สมุดบัญชีเงินฝากธนาคารสำหรับรับโอน',
    ],
    icon: 'Calendar',
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
    isActive: true,
    orderIndex: 2,
  },
  {
    id: 'ast-core-3',
    code: 'HOUSING_REPAIR_BUILD',
    name: 'ซ่อมและสร้างที่อยู่อาศัย',
    group: 'core',
    groupLabelTh: 'กลุ่มหลัก',
    category: 'housing',
    categoryLabelTh: 'ที่อยู่อาศัย',
    description: 'ปรับปรุงหลังคารั่ว ฝาผนัง ห้องน้ำ หรือจัดสร้างที่พักอาศัยขั้นพื้นฐานให้ปลอดภัยและมีสุขอนามัย',
    defaultAmount: 25000,
    requiredDocuments: [
      'สำเนาบัตรประจำตัวประชาชน',
      'สำเนาทะเบียนบ้าน',
      'สำเนาเอกสารสิทธิ์ที่ดิน/หนังสือยินยอมให้ใช้ที่ดิน',
      'ภาพถ่ายสภาพความชำรุดทรุดโทรมของบ้าน',
    ],
    icon: 'Home',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    isActive: true,
    orderIndex: 3,
  },
  {
    id: 'ast-core-4',
    code: 'CAREER_SUPPORT',
    name: 'สนับสนุนอาชีพ',
    group: 'core',
    groupLabelTh: 'กลุ่มหลัก',
    category: 'cash',
    categoryLabelTh: 'ทุนประกอบอาชีพ',
    description: 'จัดซื้อเครื่องมือทำกิน อุปกรณ์ประกอบอาชีพ หรือเงินทุนหมุนเวียนตั้งต้นเพื่อการพึ่งพาตนเองอย่างยั่งยืน',
    defaultAmount: 15000,
    requiredDocuments: [
      'สำเนาบัตรประจำตัวประชาชน',
      'สำเนาทะเบียนบ้าน',
      'แผนการประกอบอาชีพหรือใบเสนอราคาอุปกรณ์',
      'หนังสือรับรองผู้นำชุมชน/อิหม่าม',
    ],
    icon: 'Briefcase',
    badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
    isActive: true,
    orderIndex: 4,
  },
  {
    id: 'ast-core-5',
    code: 'EDUCATION_GRANT',
    name: 'ทุนการศึกษา',
    group: 'core',
    groupLabelTh: 'กลุ่มหลัก',
    category: 'education',
    categoryLabelTh: 'การศึกษา',
    description: 'ทุนการศึกษา ค่าเล่าเรียน ค่าชุดนักเรียน และอุปกรณ์การเรียนสำหรับบุตรหลานในครอบครัวยากไร้',
    defaultAmount: 5000,
    requiredDocuments: [
      'สำเนาบัตรประจำตัวประชาชน/สูติบัตรบุตร',
      'สำเนาทะเบียนบ้าน',
      'ใบรับรองสภาพการเป็นนักเรียน/นักศึกษา',
      'ใบเสร็จค่าธรรมเนียมการศึกษา (ถ้ามี)',
    ],
    icon: 'GraduationCap',
    badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    isActive: true,
    orderIndex: 5,
  },
  {
    id: 'ast-core-6',
    code: 'EMERGENCY_AID',
    name: 'ช่วยเหลือฉุกเฉิน',
    group: 'core',
    groupLabelTh: 'กลุ่มหลัก',
    category: 'cash',
    categoryLabelTh: 'บรรเทาทุกข์ฉุกเฉิน',
    description: 'บรรเทาทุกข์เร่งด่วนกรณีประสบอุบัติภัย อัคคีภัย วาตภัย อุทกภัย หรือวิกฤตสุขภาพเฉียบพลัน',
    defaultAmount: 10000,
    requiredDocuments: [
      'สำเนาบัตรประจำตัวประชาชน',
      'สำเนาบันทึกประจำวันของตำรวจ/หนังสือรับรอง อปท. (กรณีภัยพิบัติ)',
      'ภาพถ่ายความเสียหายหรือเอกสารโรงพยาบาล',
    ],
    icon: 'AlertCircle',
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
    isActive: true,
    orderIndex: 6,
  },

  // ==========================================
  // กลุ่มเฉพาะ (Specialized Types) - 4 รายการ
  // ==========================================
  {
    id: 'ast-spec-7',
    code: 'MUALLAF_SUPPORT',
    name: 'มุสลิมใหม่',
    group: 'specific',
    groupLabelTh: 'กลุ่มเฉพาะ',
    category: 'service',
    categoryLabelTh: 'สงเคราะห์มุสลิมใหม่',
    description: 'การสงเคราะห์ผู้เข้ารับอิสลามใหม่เพื่อความมั่นคงในการดำรงชีวิต อุปกรณ์ศาสนกิจ และการเรียนรู้หลักศาสนา',
    defaultAmount: 8000,
    requiredDocuments: [
      'สำเนาบัตรประจำตัวประชาชน',
      'สำเนาทะเบียนบ้าน',
      'หนังสือรับรองการเข้ารับอิสลามจากมัสยิดหรือกรรมการอิสลามประจำจังหวัด',
    ],
    icon: 'Sparkles',
    badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
    isActive: true,
    orderIndex: 7,
  },
  {
    id: 'ast-spec-8',
    code: 'HUMANITARIAN_AID',
    name: 'มนุษยธรรม',
    group: 'specific',
    groupLabelTh: 'กลุ่มเฉพาะ',
    category: 'in_kind',
    categoryLabelTh: 'ช่วยเหลือมนุษยธรรม',
    description: 'ความช่วยเหลือทางมนุษยธรรมแก่ผู้ลี้ภัย บุคคลไร้ที่พึ่ง หรือผู้เผชิญภาวะวิกฤติตามหลักสิทธิมนุษยชน',
    defaultAmount: 6000,
    requiredDocuments: [
      'เอกสารแสดงตัวตน (บัตรประชาชน/หนังสือรับรองสถานะผู้ลี้ภัย/บัตรผู้ไม่มีสถานะ)',
      'หนังสือรับรองจากองค์กรการกุศลหรือหน่วยงานสาธารณสุข',
    ],
    icon: 'Globe',
    badgeColor: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    isActive: true,
    orderIndex: 8,
  },
  {
    id: 'ast-spec-9',
    code: 'GHARIMUN_DEBT',
    name: 'ผู้มีหนี้สินล้นตัว',
    group: 'specific',
    groupLabelTh: 'กลุ่มเฉพาะ',
    category: 'cash',
    categoryLabelTh: 'ปลดเปลื้องหนี้สิน',
    description: 'ปลดเปลื้องภาระหนี้สินจำเป็นจากการกู้ยืมเพื่อการรักษาพยาบาล การศึกษา หรือดำรงชีพ (หมวดฆอริมูน)',
    defaultAmount: 20000,
    requiredDocuments: [
      'สำเนาบัตรประจำตัวประชาชน',
      'สำเนาทะเบียนบ้าน',
      'สัญญากู้ยืมเงิน/หลักฐานหนี้สินและยอดคงค้าง',
      'หลักฐานแสดงวัตถุประสงค์การกู้ยืมเพื่อความจำเป็น',
    ],
    icon: 'Receipt',
    badgeColor: 'bg-orange-50 text-orange-800 border-orange-200',
    isActive: true,
    orderIndex: 9,
  },
  {
    id: 'ast-spec-10',
    code: 'IBN_SABIL',
    name: 'ผู้เดินทาง',
    group: 'specific',
    groupLabelTh: 'กลุ่มเฉพาะ',
    category: 'cash',
    categoryLabelTh: 'ผู้เดินทางตกยาก',
    description: 'ค่าเดินทาง ค่าอาหาร และค่าที่พักฉุกเฉินสำหรับผู้เดินทางตกยากและขาดแคลนทุนทรัพย์ (หมวดอิบนุสสะบีล)',
    defaultAmount: 3000,
    requiredDocuments: [
      'สำเนาบัตรประจำตัวประชาชน/พาสปอร์ต',
      'ตั๋วโดยสาร/หลักฐานการเดินทางกลับภูมิลำเนา',
      'ใบแจ้งความของสถานีตำรวจ (กรณีเงินหายหรือถูกชิงทรัพย์)',
    ],
    icon: 'Navigation',
    badgeColor: 'bg-sky-50 text-sky-800 border-sky-200',
    isActive: true,
    orderIndex: 10,
  },
];

export function getAssistanceTypeByCode(code: string): AssistanceTypeDefinition | undefined {
  return ASSISTANCE_TYPES.find((t) => t.code === code || t.name === code);
}

export function getAssistanceTypeById(id: string): AssistanceTypeDefinition | undefined {
  return ASSISTANCE_TYPES.find((t) => t.id === id);
}

export function getAssistanceTypesByGroup(group: AssistanceTypeGroup): AssistanceTypeDefinition[] {
  return ASSISTANCE_TYPES.filter((t) => t.group === group && t.isActive);
}
