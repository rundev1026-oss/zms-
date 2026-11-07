import { 
  AsnafMasterGroup, 
  AssistanceFormatDefinition, 
  AssistanceTypeItem,
  AsnafAssistanceTypeLink,
  AssistanceTypeFormatLink,
  ThreeTierRelationshipMatrix
} from '@/types';

// =========================================================================
// LEVEL 1: ASNAF MASTER DATA (8 อัสนัฟหลัก / กลุ่มเป้าหมายตามหลักการศาสนา)
// =========================================================================

export const LEVEL_1_ASNAFS: AsnafMasterGroup[] = [
  {
    id: 'asnaf-grp-faqir-miskin',
    code: 'faqir_miskin',
    nameTh: 'ฟากีร–มิสกิน',
    nameAr: 'الفقراء والمساكين (Al-Fuqara wa Al-Masakin)',
    nameEn: 'The Destitute & The Needy',
    description: 'ผู้ยากไร้และคนขัดสนที่มีรายได้หรือทรัพย์สินไม่เพียงพอต่อค่าครองชีพพื้นฐานตามความจำเป็น',
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'asnaf-grp-amil',
    code: 'amil',
    nameTh: 'อามิลีน',
    nameAr: 'العاملين عليها (Al-Amilina Alayha)',
    nameEn: 'Zakat Administrators (Amil)',
    description: 'เจ้าหน้าที่ผู้ได้รับการแต่งตั้งให้ปฏิบัติงานบริหารจัดการ รวบรวม ตรวจสอบ และจัดสรรซะกาต',
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'asnaf-grp-muallaf',
    code: 'muallaf',
    nameTh: 'มุอัลลัฟ',
    nameAr: 'المؤلفة قلوبهم (Al-Muallafatu Qulubuhum)',
    nameEn: 'Those Inclined Toward Islam',
    description: 'ผู้มีจิตโน้มสู่ความศรัทธา ผู้เข้ารับอิสลามใหม่ และการเกื้อกูลสร้างความมั่นคงในสังคม',
    sortOrder: 3,
    isActive: true,
  },
  {
    id: 'asnaf-grp-humanitarian',
    code: 'humanitarian',
    nameTh: 'มนุษยธรรม',
    nameAr: 'في الرقاب / الإنسانية (Fi Ar-Riqab & Humanitarian)',
    nameEn: 'Humanitarian & Emancipation',
    description: 'การช่วยเหลือทางมนุษยธรรม การปลดปล่อยพันธนาการ ผู้ลี้ภัย และผู้ถูกลิดรอนอิสรภาพอย่างไม่เป็นธรรม',
    sortOrder: 4,
    isActive: true,
  },
  {
    id: 'asnaf-grp-gharimin',
    code: 'gharimin',
    nameTh: 'ผู้มีหนี้สินล้นตัว',
    nameAr: 'الغارمين (Al-Gharimin)',
    nameEn: 'Debtors in Need (Gharimin)',
    description: 'ผู้มีหนี้สินจำเป็นจากการดำรงชีพ ค่ารักษาพยาบาล หรือภัยพิบัติ ที่ไม่มีความสามารถชำระคืนได้',
    sortOrder: 5,
    isActive: true,
  },
  {
    id: 'asnaf-grp-fisabilillah',
    code: 'fisabilillah',
    nameTh: 'ฟีสะบีลิลลาฮ์',
    nameAr: 'في سبيل الله (Fi Sabilillah)',
    nameEn: 'In the Cause of Allah',
    description: 'กิจการและโครงการเพื่อวิถีทางของศาสนา การศึกษา และสาธารณประโยชน์ต่อชุมชน',
    sortOrder: 6,
    isActive: true,
  },
  {
    id: 'asnaf-grp-ibnsabil',
    code: 'ibnsabil',
    nameTh: 'ผู้เดินทาง / อิบนุสสะบีล',
    nameAr: 'ابن السبيل (Ibn As-Sabil)',
    nameEn: 'Stranded Wayfarers (Ibn Sabil)',
    description: 'ผู้เดินทางที่ประสบเหตุขาดแคลนทุนทรัพย์ในการเดินทางกลับภูมิลำเนาหรือจุดหมายจำเป็น',
    sortOrder: 7,
    isActive: true,
  },
];

// Mapping helper to resolve canonical Asnaf codes
export const ASNAF_CODE_ALIASES: Record<string, string> = {
  faqir: 'faqir_miskin',
  fakir: 'faqir_miskin',
  miskin: 'faqir_miskin',
  faqir_miskin: 'faqir_miskin',
  'fakir-miskin': 'faqir_miskin',
  'faqir-miskin': 'faqir_miskin',
  amil: 'amil',
  amilin: 'amil',
  muallaf: 'muallaf',
  riqab: 'humanitarian',
  humanitarian: 'humanitarian',
  gharimin: 'gharimin',
  gharimun: 'gharimin',
  debtor: 'gharimin',
  fisabilillah: 'fisabilillah',
  sabilillah: 'fisabilillah',
  ibnsabil: 'ibnsabil',
  ibn_sabil: 'ibnsabil',
  wayfarer: 'ibnsabil',
};

export function resolveAsnafGroupCode(rawCode: string): string {
  const clean = String(rawCode || '').trim().toLowerCase();
  return ASNAF_CODE_ALIASES[clean] || clean;
}

// =========================================================================
// LEVEL 3: ASSISTANCE FORMAT MASTER DATA (รูปแบบ/วิธีการส่งมอบความช่วยเหลือ)
// =========================================================================

export const LEVEL_3_ASSISTANCE_FORMATS: AssistanceFormatDefinition[] = [
  {
    id: 'fmt-bank-transfer',
    code: 'bank_transfer',
    name: 'โอนเงิน',
    nameEn: 'Bank Transfer',
    description: 'โอนเงินเข้าบัญชีเงินฝากธนาคารของผู้มีสิทธิ์หรือผู้รับประโยชน์โดยตรง พร้อมหลักฐานสลิปการโอน',
    deliveryMethod: 'direct_transfer',
    deliveryMethodLabelTh: 'โอนผ่านระบบธนาคาร',
    requiresReceipt: true,
    requiresInspection: false,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'fmt-cash',
    code: 'cash',
    name: 'เงินสด',
    nameEn: 'Cash Disbursement',
    description: 'ส่งมอบเงินสดพร้อมใบสำคัญรับเงิน เหมาะสำหรับกรณีฉุกเฉินเร่งด่วน หรือผู้รับไม่มีบัญชีธนาคาร',
    deliveryMethod: 'physical_delivery',
    deliveryMethodLabelTh: 'ส่งมอบเงินสดพร้อมใบสำคัญ',
    requiresReceipt: true,
    requiresInspection: false,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'fmt-in-kind',
    code: 'in_kind',
    name: 'มอบสิ่งของ',
    nameEn: 'In-Kind Delivery',
    description: 'ส่งมอบเครื่องอุปโภคบริโภค ข้าวสาร ถุงยังชีพ อาหารแห้ง หรือเวชภัณฑ์จำเป็นถึงมือผู้รับ',
    deliveryMethod: 'physical_delivery',
    deliveryMethodLabelTh: 'ส่งมอบสิ่งของ/พัสดุ',
    requiresReceipt: true,
    requiresInspection: false,
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 'fmt-materials',
    code: 'materials',
    name: 'จัดซื้อวัสดุ',
    nameEn: 'Material Procurement',
    description: 'จัดซื้อวัสดุก่อสร้าง ซ่อมแซมบ้าน หรือวัตถุดิบเพื่อส่งมอบให้โครงการโดยตรง',
    deliveryMethod: 'vendor_payment',
    deliveryMethodLabelTh: 'จัดซื้อวัสดุอุปกรณ์',
    requiresReceipt: true,
    requiresInspection: true,
    isActive: true,
    sortOrder: 4,
  },
  {
    id: 'fmt-vendor-direct',
    code: 'vendor_direct',
    name: 'จ่ายตรงผู้ขาย',
    nameEn: 'Direct Vendor Payment',
    description: 'ชำระค่าสินค้า ค่าบริการ หรือปลดหนี้จำเป็นโดยจ่ายตรงให้แก่ร้านค้า สถานพยาบาล หรือเจ้าหนี้',
    deliveryMethod: 'vendor_payment',
    deliveryMethodLabelTh: 'ชำระตรงแก่ผู้ขาย/เจ้าหนี้',
    requiresReceipt: true,
    requiresInspection: true,
    isActive: true,
    sortOrder: 5,
  },
  {
    id: 'fmt-contractor',
    code: 'contractor',
    name: 'จ้างผู้รับเหมา',
    nameEn: 'Contractor Service',
    description: 'เบิกจ่ายงวดงานตามสัญญาจ้างเหมาซ่อมแซม จัดสร้างบ้าน หรือสิ่งก่อสร้างสาธารณะ',
    deliveryMethod: 'vendor_payment',
    deliveryMethodLabelTh: 'เบิกจ่ายงวดงานจ้างเหมา',
    requiresReceipt: true,
    requiresInspection: true,
    isActive: true,
    sortOrder: 6,
  },
  {
    id: 'fmt-scholarship',
    code: 'scholarship',
    name: 'มอบทุนการศึกษา',
    nameEn: 'Scholarship Grant',
    description: 'ส่งมอบทุนการศึกษาแก่เยาวชนหรือสถานศึกษา พร้อมเอกสารยืนยันสถานะการศึกษาและใบเสร็จ',
    deliveryMethod: 'direct_transfer',
    deliveryMethodLabelTh: 'มอบทุนผ่านสถานศึกษา/นักเรียน',
    requiresReceipt: true,
    requiresInspection: false,
    isActive: true,
    sortOrder: 7,
  },
  {
    id: 'fmt-training',
    code: 'training',
    name: 'จัดอบรม',
    nameEn: 'Training & Workshop',
    description: 'สนับสนุนค่าใช้จ่ายในการจัดฝึกอบรมทักษะอาชีพ หรือการเรียนรู้หลักการศาสนาและศีลธรรม',
    deliveryMethod: 'service',
    deliveryMethodLabelTh: 'จัดการฝึกอบรม/พัฒนาทักษะ',
    requiresReceipt: true,
    requiresInspection: false,
    isActive: true,
    sortOrder: 8,
  },
  {
    id: 'fmt-career-equip',
    code: 'career_equipment',
    name: 'สนับสนุนอุปกรณ์ประกอบอาชีพ',
    nameEn: 'Livelihood Equipment',
    description: 'จัดซื้อเครื่องมือทำกิน รถเข็น อุปกรณ์ค้าขาย หรือเครื่องจักรมูลค่าไม่เกินเกณฑ์ เพื่อมอบสร้างอาชีพถาวร',
    deliveryMethod: 'vendor_payment',
    deliveryMethodLabelTh: 'จัดหาและมอบอุปกรณ์อาชีพ',
    requiresReceipt: true,
    requiresInspection: true,
    isActive: true,
    sortOrder: 9,
  },
];

// =========================================================================
// LEVEL 2: ASSISTANCE TYPE MASTER DATA (Normalized - รายการประเภทความช่วยเหลือ)
// =========================================================================

export interface MasterAssistanceTypeConfig {
  id: string;
  code: string;
  name: string;
  category: 'cash' | 'in_kind' | 'service' | 'housing' | 'education' | 'medical' | 'other';
  description: string;
  conditionsText: string;
  defaultMinAmount?: number;
  defaultMaxAmount?: number;
  requiredDocuments: string[];
  sortOrder: number;
  isActive: boolean;
  // Relationships
  allowedAsnafCodes: string[];
  supportedFormatCodes: string[];
}

export const NORMALIZED_ASSISTANCE_TYPES: MasterAssistanceTypeConfig[] = [
  // 1. ปัจจัยยังชีพ (ฟากีร–มิสกิน, มุอัลลัฟ)
  {
    id: 'ast-core-1',
    code: 'LIVING_SUPPORT',
    name: 'ปัจจัยยังชีพ',
    category: 'cash',
    description: 'เงินช่วยเหลือยังชีพฉุกเฉินและข้าวสารอาหารแห้งขั้นพื้นฐานสำหรับครอบครัวที่ขาดแคลน',
    conditionsText: 'ผู้มีรายได้ไม่เพียงพอต่อการยังชีพขั้นต่ำ ไม่เกิน 3,000 - 5,000 บาท/ครั้ง',
    defaultMinAmount: 1000,
    defaultMaxAmount: 5000,
    requiredDocuments: [
      'สำเนาบัตรประจำตัวประชาชน',
      'สำเนาทะเบียนบ้าน',
      'หนังสือรับรองสถานะจากผู้นำชุมชน/อิหม่าม',
    ],
    sortOrder: 1,
    isActive: true,
    allowedAsnafCodes: ['faqir_miskin', 'muallaf'],
    supportedFormatCodes: ['bank_transfer', 'cash', 'in_kind'],
  },

  // 2. ปัจจัยยังชีพรายเดือน (ฟากีร–มิสกิน, มุอัลลัฟ)
  {
    id: 'ast-core-2',
    code: 'MONTHLY_ALLOWANCE',
    name: 'ปัจจัยยังชีพรายเดือน',
    category: 'cash',
    description: 'เงินสงเคราะห์เพื่อการครองชีพรายเดือนต่อเนื่องสำหรับผู้สูงอายุ ผู้พิการ หรือผู้ป่วยติดเตียง',
    conditionsText: 'ให้ความช่วยเหลือเป็นรายเดือนต่อเนื่อง 6 - 12 เดือน และต้องผ่านการประเมินสถานะทุก 6 เดือน',
    defaultMinAmount: 1500,
    defaultMaxAmount: 3000,
    requiredDocuments: [
      'สำเนาบัตรประจำตัวประชาชน',
      'สำเนาทะเบียนบ้าน',
      'สมุดคนพิการ หรือใบรับรองแพทย์ผู้ป่วยติดเตียง',
      'หน้าสมุดบัญชีธนาคารสำหรับรับเงินโอน',
    ],
    sortOrder: 2,
    isActive: true,
    allowedAsnafCodes: ['faqir_miskin', 'muallaf'],
    supportedFormatCodes: ['bank_transfer', 'cash'],
  },

  // 3. ซ่อมและสร้างที่อยู่อาศัย (ฟากีร–มิสกิน, มุอัลลัฟ)
  {
    id: 'ast-core-3',
    code: 'HOUSING_REPAIR_BUILD',
    name: 'ซ่อมและสร้างที่อยู่อาศัย',
    category: 'housing',
    description: 'ปรับปรุงหลังคารั่ว ฝาผนัง ห้องน้ำ หรือจัดสร้างที่พักอาศัยขั้นพื้นฐานให้ปลอดภัยและมีสุขอนามัย',
    conditionsText: 'ผู้ขอความช่วยเหลือต้องมีสิทธิ์ในที่ดินหรือมีหนังสือยินยอมจากเจ้าของที่ดิน และต้องมีภาพถ่ายก่อน-หลังการปรับปรุง',
    defaultMinAmount: 10000,
    defaultMaxAmount: 50000,
    requiredDocuments: [
      'สำเนาบัตรประจำตัวประชาชน',
      'สำเนาทะเบียนบ้าน',
      'เอกสารสิทธิ์ที่ดิน หรือหนังสือยินยอมให้ใช้ที่ดิน',
      'ภาพถ่ายสภาพความชำรุดของที่อยู่อาศัย',
      'ประมาณการราคาวัสดุและค่าแรง',
    ],
    sortOrder: 3,
    isActive: true,
    allowedAsnafCodes: ['faqir_miskin', 'muallaf'],
    supportedFormatCodes: ['materials', 'contractor', 'vendor_direct'],
  },

  // 4. สนับสนุนอาชีพ (ฟากีร–มิสกิน, มุอัลลัฟ)
  {
    id: 'ast-core-4',
    code: 'CAREER_SUPPORT',
    name: 'สนับสนุนอาชีพ',
    category: 'cash',
    description: 'จัดซื้อเครื่องมือทำกิน อุปกรณ์ประกอบอาชีพ หรือเงินทุนหมุนเวียนตั้งต้นเพื่อการพึ่งพาตนเองอย่างยั่งยืน',
    conditionsText: 'ต้องมีแผนการประกอบอาชีพที่ชัดเจน และพร้อมรับการติดตามผลความก้าวหน้าทุก 60 วัน',
    defaultMinAmount: 5000,
    defaultMaxAmount: 25000,
    requiredDocuments: [
      'สำเนาบัตรประจำตัวประชาชน',
      'สำเนาทะเบียนบ้าน',
      'แผนการประกอบอาชีพและประมาณการค่าใช้จ่าย',
      'ภาพถ่ายสถานที่ตั้งร้านค้า/พื้นที่ทำงาน',
    ],
    sortOrder: 4,
    isActive: true,
    allowedAsnafCodes: ['faqir_miskin', 'muallaf'],
    supportedFormatCodes: ['career_equipment', 'materials', 'vendor_direct', 'training', 'bank_transfer'],
  },

  // 5. ทุนการศึกษา (ฟากีร–มิสกิน, มุอัลลัฟ, ฟีสะบีลิลลาฮ์)
  {
    id: 'ast-5',
    code: 'EDUCATION_GRANT',
    name: 'ทุนการศึกษา',
    category: 'education',
    description: 'ทุนการศึกษา ค่าเล่าเรียน ค่าชุดนักเรียน และอุปกรณ์การเรียนสำหรับบุตรหลานในครอบครัวยากไร้ หรือผู้ศึกษาศาสนา',
    conditionsText: 'กำลังศึกษาอยู่ในระดับประถม-มัธยม-อุดมศึกษา หรือสถาบันการศึกษาศาสนา ไม่เคยได้รับทุนซ้ำซ้อนในปีการศึกษาเดียวกัน',
    defaultMinAmount: 2000,
    defaultMaxAmount: 15000,
    requiredDocuments: [
      'สำเนาบัตรประจำตัวประชาชนผู้รับทุนและบิดามารดา',
      'สำเนาทะเบียนบ้าน',
      'หนังสือรับรองการเป็นนักเรียน/นักศึกษา หรือใบเสร็จค่าเทอม',
      'ใบรายงานผลการเรียน (ถ้ามี)',
    ],
    sortOrder: 5,
    isActive: true,
    allowedAsnafCodes: ['faqir_miskin', 'muallaf', 'fisabilillah'],
    supportedFormatCodes: ['scholarship', 'bank_transfer', 'materials'],
  },

  // 6. ช่วยเหลือฉุกเฉิน (ฟากีร–มิสกิน, มุอัลลัฟ)
  {
    id: 'ast-core-6',
    code: 'EMERGENCY_AID',
    name: 'ช่วยเหลือฉุกเฉิน',
    category: 'cash',
    description: 'บรรเทาทุกข์เร่งด่วนกรณีประสบอุบัติภัย อัคคีภัย วาตภัย อุทกภัย หรือวิกฤตสุขภาพเฉียบพลัน',
    conditionsText: 'เกิดขึ้นภายใน 30 วันนับจากวันที่เกิดเหตุ พร้อมรายงานบันทึกเหตุการณ์หรือหนังสือรับรองความเสียหาย',
    defaultMinAmount: 2000,
    defaultMaxAmount: 10000,
    requiredDocuments: [
      'สำเนาบัตรประจำตัวประชาชน',
      'สำเนาทะเบียนบ้าน',
      'บันทึกประจำวันตำรวจ หรือหนังสือรับรองภัยพิบัติจากองค์กรปกครองส่วนท้องถิ่น',
      'ภาพถ่ายความเสียหายจริง',
    ],
    sortOrder: 6,
    isActive: true,
    allowedAsnafCodes: ['faqir_miskin', 'muallaf'],
    supportedFormatCodes: ['cash', 'bank_transfer', 'in_kind'],
  },

  // 7. บ้านอัร-เราะห์มัต (ฟากีร–มิสกิน, มุอัลลัฟ)
  {
    id: 'ast-rahmah-home',
    code: 'RAHMAH_HOME',
    name: 'บ้านอัร-เราะห์มัต',
    category: 'housing',
    description: 'โครงการจัดสร้างบ้านพักอาศัยถาวรเพื่อผู้ยากไร้และครอบครัวมุสลิมใหม่ที่ไม่มีที่พักอาศัยเป็นของตนเอง',
    conditionsText: 'ผ่านการพิจารณาเป็นกรณีพิเศษจากคณะกรรมการบริหารซะกาต พร้อมสัญญาการดูแลรักษาบ้าน',
    defaultMinAmount: 50000,
    defaultMaxAmount: 200000,
    requiredDocuments: [
      'สำเนาบัตรประจำตัวประชาชน',
      'สำเนาทะเบียนบ้าน',
      'เอกสารสิทธิ์ที่ดิน/หนังสืออุทิศที่ดินเพื่อการกุศล (วากัฟ)',
      'แบบแปลนก่อสร้างและประมาณการงบประมาณ (BOQ)',
      'มติคณะกรรมการอนุมัติโครงการ',
    ],
    sortOrder: 7,
    isActive: true,
    allowedAsnafCodes: ['faqir_miskin', 'muallaf'],
    supportedFormatCodes: ['contractor', 'materials', 'vendor_direct'],
  },

  // 8. มุสลิมใหม่ (มุอัลลัฟ)
  {
    id: 'ast-spec-7',
    code: 'MUALLAF_SUPPORT',
    name: 'มุสลิมใหม่',
    category: 'service',
    description: 'การสงเคราะห์ผู้เข้ารับอิสลามใหม่เพื่อความมั่นคงในการดำรงชีวิต อุปกรณ์ศาสนกิจ และการเรียนรู้หลักศาสนา',
    conditionsText: 'ผู้เข้ารับอิสลามใหม่พร้อมหนังสือรับรองจากมัสยิดหรือคณะกรรมการอิสลามประจำจังหวัด',
    defaultMinAmount: 3000,
    defaultMaxAmount: 15000,
    requiredDocuments: [
      'หนังสือสำคัญการเข้ารับอิสลาม',
      'สำเนาบัตรประจำตัวประชาชน',
      'สำเนาทะเบียนบ้าน',
    ],
    sortOrder: 8,
    isActive: true,
    allowedAsnafCodes: ['muallaf'],
    supportedFormatCodes: ['bank_transfer', 'in_kind', 'training'],
  },

  // 9. มนุษยธรรม (มนุษยธรรม)
  {
    id: 'ast-spec-8',
    code: 'HUMANITARIAN_AID',
    name: 'มนุษยธรรม',
    category: 'in_kind',
    description: 'ความช่วยเหลือทางมนุษยธรรมแก่ผู้ลี้ภัย บุคคลไร้ที่พึ่ง หรือผู้เผชิญภาวะวิกฤติตามหลักมนุษยธรรม',
    conditionsText: 'การช่วยเหลือเฉพาะหน้าตามหลักสิทธิมนุษยชนและหลักการศาสนา',
    defaultMinAmount: 2000,
    defaultMaxAmount: 20000,
    requiredDocuments: [
      'เอกสารแสดงตัวตน (ถ้ามี) หรือหนังสือส่งตัวจากหน่วยงานสงเคราะห์',
      'บันทึกรายงานสังคมสงเคราะห์',
    ],
    sortOrder: 9,
    isActive: true,
    allowedAsnafCodes: ['humanitarian'],
    supportedFormatCodes: ['in_kind', 'cash', 'bank_transfer'],
  },

  // 10. ผู้มีหนี้สินล้นตัว (ผู้มีหนี้สินล้นตัว)
  {
    id: 'ast-spec-9',
    code: 'GHARIMUN_DEBT',
    name: 'ผู้มีหนี้สินล้นตัว',
    category: 'cash',
    description: 'ปลดเปลื้องภาระหนี้สินจำเป็นจากการกู้ยืมเพื่อการรักษาพยาบาล การศึกษา หรือดำรงชีพ (หมวดฆอริมูน)',
    conditionsText: 'หนี้สินต้องเกิดจากความจำเป็นแท้จริง ไม่เกิดจากอบายมุข และไม่สามารถชำระคืนได้ด้วยตนเอง จ่ายตรงให้เจ้าหนี้เป็นหลัก',
    defaultMinAmount: 5000,
    defaultMaxAmount: 50000,
    requiredDocuments: [
      'สำเนาบัตรประจำตัวประชาชนและทะเบียนบ้าน',
      'สัญญากู้ยืมเงิน หรือหนังสือทวงถามหนี้ที่เป็นทางการ',
      'หลักฐานการเป็นหนี้และยอดหนี้คงค้างล่าสุด',
      'ข้อมูลบัญชีธนาคารของเจ้าหนี้',
    ],
    sortOrder: 10,
    isActive: true,
    allowedAsnafCodes: ['gharimin'],
    supportedFormatCodes: ['vendor_direct', 'bank_transfer'],
  },

  // 11. ผู้เดินทาง (ผู้เดินทาง)
  {
    id: 'ast-spec-10',
    code: 'IBN_SABIL',
    name: 'ผู้เดินทาง',
    category: 'cash',
    description: 'ค่าเดินทาง ค่าอาหาร และค่าที่พักฉุกเฉินสำหรับผู้เดินทางตกยากและขาดแคลนทุนทรัพย์ (หมวดอิบนุสสะบีล)',
    conditionsText: 'อยู่ระหว่างการเดินทางที่ถูกต้องตามหลักการศาสนาและขาดแคลนทุนทรัพย์ในการเดินทางกลับภูมิลำเนา',
    defaultMinAmount: 1000,
    defaultMaxAmount: 5000,
    requiredDocuments: [
      'สำเนาบัตรประจำตัวประชาชน หรือหนังสือเดินทาง',
      'บันทึกประจำวันแจ้งความทรัพย์สินสูญหาย (ถ้ามี)',
      'ตั๋วโดยสาร หรือหลักฐานการเดินทางกลับภูมิลำเนา',
    ],
    sortOrder: 11,
    isActive: true,
    allowedAsnafCodes: ['ibnsabil'],
    supportedFormatCodes: ['cash', 'bank_transfer'],
  },

  // 12. โรงจอดรถมูลนิธิ (ฟีสะบีลิลลาฮ์)
  {
    id: 'ast-fisa-garage',
    code: 'FISABILILLAH_GARAGE',
    name: 'โรงจอดรถมูลนิธิ',
    category: 'housing',
    description: 'การปรับปรุงหรือจัดสร้างโรงจอดรถสำหรับรถพยาบาล ยานพาหนะกู้ภัย และภารกิจมูลนิธิเพื่อส่วนรวม',
    conditionsText: 'ตามมติคณะกรรมการมูลนิธิเพื่อการดำเนินงานสาธารณประโยชน์',
    defaultMinAmount: 10000,
    defaultMaxAmount: 150000,
    requiredDocuments: [
      'โครงการและแผนประมาณการค่าใช้จ่าย',
      'มติที่ประชุมคณะกรรมการ',
      'ใบเสนอราคาผู้รับเหมา/ร้านค้า',
    ],
    sortOrder: 12,
    isActive: true,
    allowedAsnafCodes: ['fisabilillah'],
    supportedFormatCodes: ['contractor', 'materials', 'vendor_direct'],
  },

  // 13. ค่าดำเนินงานจิตอาสา (ฟีสะบีลิลลาฮ์)
  {
    id: 'ast-fisa-volunteer',
    code: 'FISABILILLAH_VOLUNTEER',
    name: 'ค่าดำเนินงานจิตอาสา',
    category: 'other',
    description: 'ค่าใช้จ่ายในการสนับสนุนอาสาสมัครลงพื้นที่กู้ภัย แจกถุงยังชีพ หรือกิจกรรมเผยแผ่และพัฒนาสังคม',
    conditionsText: 'เบิกจ่ายตามแผนกิจกรรมจิตอาสาที่ได้รับอนุมัติล่วงหน้า',
    defaultMinAmount: 1000,
    defaultMaxAmount: 20000,
    requiredDocuments: [
      'แผนปฏิบัติการและรายชื่ออาสาสมัคร',
      'ภาพถ่ายการดำเนินกิจกรรม',
      'ใบเสร็จรับเงิน/ใบสำคัญรับเงิน',
    ],
    sortOrder: 13,
    isActive: true,
    allowedAsnafCodes: ['fisabilillah'],
    supportedFormatCodes: ['bank_transfer', 'cash', 'in_kind'],
  },

  // =========================================================================
  // รายการหมวด อามิลีน (เจ้าหน้าที่บริหารซะกาต) - 10 รายการ
  // =========================================================================

  // 14. ค่าตอบแทนเจ้าหน้าที่ (อามิลีน)
  {
    id: 'ast-amil-remuneration',
    code: 'AMIL_REMUNERATION',
    name: 'ค่าตอบแทนเจ้าหน้าที่',
    category: 'cash',
    description: 'ค่าตอบแทน เบี้ยเลี้ยง และเงินเดือนสำหรับเจ้าหน้าที่ผู้ปฏิบัติงานจัดเก็บ ตรวจสอบ และบริหารซะกาต',
    conditionsText: 'ตามระเบียบค่าตอบแทนเจ้าหน้าที่ซะกาตที่คณะกรรมการมูลนิธิกำหนด',
    defaultMinAmount: 5000,
    defaultMaxAmount: 35000,
    requiredDocuments: [
      'คำสั่งแต่งตั้งเจ้าหน้าที่',
      'ใบลงเวลาปฏิบัติงาน',
      'หลักฐานการจ่ายเงินเดือน/ค่าตอบแทน',
    ],
    sortOrder: 14,
    isActive: true,
    allowedAsnafCodes: ['amil'],
    supportedFormatCodes: ['bank_transfer'],
  },

  // 15. ค่าใช้จ่ายสำนักงาน (อามิลีน)
  {
    id: 'ast-amil-office',
    code: 'AMIL_OFFICE_EXPENSE',
    name: 'ค่าใช้จ่ายสำนักงาน',
    category: 'other',
    description: 'ค่าเครื่องเขียน อุปกรณ์สำนักงาน ค่าพิมพ์เอกสาร และวัสดุสิ้นเปลืองในการบริหารซะกาต',
    conditionsText: 'เบิกจ่ายตามใบเสร็จรับเงินจริงที่เกี่ยวข้องกับงานซะกาต',
    defaultMinAmount: 500,
    defaultMaxAmount: 15000,
    requiredDocuments: ['ใบเสร็จรับเงิน/ใบกำกับภาษี', 'ใบขออนุมัติจัดซื้อจัดจ้าง'],
    sortOrder: 15,
    isActive: true,
    allowedAsnafCodes: ['amil'],
    supportedFormatCodes: ['vendor_direct', 'bank_transfer', 'cash'],
  },

  // 16. ค่าน้ำมันรถ (อามิลีน)
  {
    id: 'ast-amil-fuel',
    code: 'AMIL_FUEL',
    name: 'ค่าน้ำมันรถ',
    category: 'cash',
    description: 'ค่าน้ำมันเชื้อเพลิงสำหรับยานพาหนะในการลงพื้นที่สำรวจ ติดตามผู้ยากไร้ และส่งมอบความช่วยเหลือ',
    conditionsText: 'แนบใบเสร็จค่าน้ำมันพร้อมบันทึกการใช้รถยนต์และวัตถุประสงค์การเดินทาง',
    defaultMinAmount: 500,
    defaultMaxAmount: 5000,
    requiredDocuments: ['ใบเสร็จค่าน้ำมัน', 'สมุดบันทึกการใช้ยานพาหนะ'],
    sortOrder: 16,
    isActive: true,
    allowedAsnafCodes: ['amil'],
    supportedFormatCodes: ['bank_transfer', 'cash'],
  },

  // 17. รถยนต์ (อามิลีน)
  {
    id: 'ast-amil-vehicle',
    code: 'AMIL_VEHICLE',
    name: 'รถยนต์',
    category: 'other',
    description: 'การจัดหายานพาหนะ หรือค่าบำรุงรักษาซ่อมแซมรถยนต์สำหรับภารกิจบริหารซะกาตและการลงพื้นที่',
    conditionsText: 'ตามมติคณะกรรมการมูลนิธิและผ่านการตรวจเช็กสภาพจากศูนย์บริการ',
    defaultMinAmount: 2000,
    defaultMaxAmount: 50000,
    requiredDocuments: ['ใบเสนอราคา/ใบแจ้งหนี้ศูนย์บริการ', 'ใบเสร็จรับเงิน'],
    sortOrder: 17,
    isActive: true,
    allowedAsnafCodes: ['amil'],
    supportedFormatCodes: ['vendor_direct', 'bank_transfer'],
  },

  // 18. ค่าอินเตอร์เน็ต (อามิลีน)
  {
    id: 'ast-amil-internet',
    code: 'AMIL_INTERNET',
    name: 'ค่าอินเตอร์เน็ต',
    category: 'other',
    description: 'ค่าบริการอินเตอร์เน็ตและระบบสื่อสารสำหรับสำนักงานและระบบบริหารจัดการซะกาตออนไลน์ (ZMS)',
    conditionsText: 'เบิกจ่ายตามใบแจ้งหนี้ผู้ให้บริการรายเดือน',
    defaultMinAmount: 500,
    defaultMaxAmount: 2500,
    requiredDocuments: ['ใบเสร็จรับเงิน/ใบแจ้งหนี้ค่าบริการ'],
    sortOrder: 18,
    isActive: true,
    allowedAsnafCodes: ['amil'],
    supportedFormatCodes: ['vendor_direct', 'bank_transfer'],
  },

  // 19. ค่าเดินทาง (อามิลีน)
  {
    id: 'ast-amil-travel',
    code: 'AMIL_TRAVEL',
    name: 'ค่าเดินทาง',
    category: 'cash',
    description: 'ค่าเบี้ยเลี้ยง ค่าที่พัก และค่าพาหนะในการเดินทางไปราชการ ปฏิบัติงานซะกาตนอกพื้นที่',
    conditionsText: 'เบิกจ่ายตามระเบียบการเดินทางไปปฏิบัติงานของมูลนิธิ',
    defaultMinAmount: 500,
    defaultMaxAmount: 10000,
    requiredDocuments: ['ใบขออนุมัติเดินทางไปราชการ', 'ใบสำคัญรับเงิน/ตั๋วโดยสาร/ใบเสร็จที่พัก'],
    sortOrder: 19,
    isActive: true,
    allowedAsnafCodes: ['amil'],
    supportedFormatCodes: ['bank_transfer', 'cash'],
  },

  // 20. ค่าทำบัญชี (อามิลีน)
  {
    id: 'ast-amil-accounting',
    code: 'AMIL_ACCOUNTING',
    name: 'ค่าทำบัญชี',
    category: 'service',
    description: 'ค่าบริการจัดทำบัญชีซะกาตและบัญชีมูลนิธิตามมาตรฐานการบัญชี',
    conditionsText: 'ตามสัญญาจ้างบริการทำบัญชีและรายงานทางการเงินประจำเดือน/ปี',
    defaultMinAmount: 3000,
    defaultMaxAmount: 20000,
    requiredDocuments: ['สัญญาจ้างทำบัญชี', 'ใบแจ้งหนี้/ใบเสร็จรับเงินพร้อมใบหักภาษี ณ ที่จ่าย'],
    sortOrder: 20,
    isActive: true,
    allowedAsnafCodes: ['amil'],
    supportedFormatCodes: ['vendor_direct', 'bank_transfer'],
  },

  // 21. ค่าตรวจสอบบัญชี (อามิลีน)
  {
    id: 'ast-amil-audit',
    code: 'AMIL_AUDIT',
    name: 'ค่าตรวจสอบบัญชี',
    category: 'service',
    description: 'ค่าธรรมเนียมผู้สอบบัญชีรับอนุญาต (CPA) ในการตรวจสอบและรับรองงบการเงินประจำปีของมูลนิธิ',
    conditionsText: 'ตามสัญญาจ้างตรวจสอบบัญชีและผ่านมติแต่งตั้งจากที่ประชุมใหญ่',
    defaultMinAmount: 15000,
    defaultMaxAmount: 60000,
    requiredDocuments: ['สัญญาจ้างตรวจสอบบัญชี', 'รายงานผู้สอบบัญชีรับอนุญาต', 'ใบแจ้งหนี้/ใบเสร็จรับเงิน'],
    sortOrder: 21,
    isActive: true,
    allowedAsnafCodes: ['amil'],
    supportedFormatCodes: ['vendor_direct', 'bank_transfer'],
  },

  // 22. อาหาร (อามิลีน)
  {
    id: 'ast-amil-food',
    code: 'AMIL_FOOD',
    name: 'อาหาร',
    category: 'other',
    description: 'ค่าอาหารและเครื่องดื่มสำหรับการประชุมคณะทำงานซะกาต หรือการปฏิบัติงานนอกเวลา/ลงพื้นที่',
    conditionsText: 'เบิกจ่ายตามค่าใช้จ่ายจริงที่จำเป็นต่อการปฏิบัติงานประชุมหรืองานจัดสรรซะกาต',
    defaultMinAmount: 300,
    defaultMaxAmount: 5000,
    requiredDocuments: ['ใบเสร็จรับเงิน', 'วาระการประชุมหรือบันทึกการปฏิบัติงาน'],
    sortOrder: 22,
    isActive: true,
    allowedAsnafCodes: ['amil'],
    supportedFormatCodes: ['vendor_direct', 'bank_transfer', 'cash'],
  },

  // 23. ค่าไฟฟ้า (อามิลีน)
  {
    id: 'ast-amil-electricity',
    code: 'AMIL_ELECTRICITY',
    name: 'ค่าไฟฟ้า',
    category: 'other',
    description: 'ค่ากระแสไฟฟ้าสำหรับสำนักงานศูนย์ประสานงานซะกาตและการให้บริการผู้ยากไร้',
    conditionsText: 'เบิกจ่ายตามใบเสร็จรับเงินของการไฟฟ้านครหลวงหรือภูมิภาค',
    defaultMinAmount: 500,
    defaultMaxAmount: 10000,
    requiredDocuments: ['ใบแจ้งหนี้/ใบเสร็จรับเงินการไฟฟ้า'],
    sortOrder: 23,
    isActive: true,
    allowedAsnafCodes: ['amil'],
    supportedFormatCodes: ['vendor_direct', 'bank_transfer'],
  },
];

// =========================================================================
// HELPER QUERY FUNCTIONS FOR CASCADING FILTERS
// =========================================================================

/**
 * ดึงรายการประเภทความช่วยเหลือที่สัมพันธ์กับ Asnaf Code ที่ระบุ
 */
export function getAssistanceTypesByAsnaf(rawAsnafCode: string): MasterAssistanceTypeConfig[] {
  const asnafCode = resolveAsnafGroupCode(rawAsnafCode);
  return NORMALIZED_ASSISTANCE_TYPES.filter(
    (item) => item.isActive && item.allowedAsnafCodes.includes(asnafCode)
  );
}

/**
 * ดึงรายการรูปแบบการช่วยเหลือ (Formats) ที่ประเภทความช่วยเหลือรองรับ
 */
export function getSupportedFormatsByType(typeCodeOrId: string): AssistanceFormatDefinition[] {
  const clean = String(typeCodeOrId || '').trim();
  const matched = NORMALIZED_ASSISTANCE_TYPES.find(
    (t) => t.id === clean || t.code === clean || t.name === clean
  );
  if (!matched) return [];

  return LEVEL_3_ASSISTANCE_FORMATS.filter(
    (fmt) => fmt.isActive && matched.supportedFormatCodes.includes(fmt.code)
  );
}

export const getSupportedFormatsForType = getSupportedFormatsByType;

/**
 * ตรวจสอบความถูกต้องของความสัมพันธ์ Asnaf -> Assistance Type -> Assistance Format
 */
export function validateThreeTierRelationship(
  rawAsnafCode: string,
  typeCodeOrId: string,
  formatCode: string
): { isValid: boolean; reason?: string } {
  const asnafCode = resolveAsnafGroupCode(rawAsnafCode);
  const matchedAsnaf = LEVEL_1_ASNAFS.find((a) => a.code === asnafCode);
  if (!matchedAsnaf) {
    return { isValid: false, reason: `ไม่พบหมวดหมู่อัสนัฟรหัส "${rawAsnafCode}" ในระบบ` };
  }

  const cleanType = String(typeCodeOrId || '').trim();
  const matchedType = NORMALIZED_ASSISTANCE_TYPES.find(
    (t) => t.id === cleanType || t.code === cleanType || t.name === cleanType
  );
  if (!matchedType) {
    return { isValid: false, reason: `ไม่พบประเภทความช่วยเหลือรหัส "${typeCodeOrId}" ในระบบ` };
  }

  if (!matchedType.allowedAsnafCodes.includes(asnafCode)) {
    return {
      isValid: false,
      reason: `ประเภทความช่วยเหลือ "${matchedType.name}" ไม่สามารถใช้กับอัสนัฟ "${matchedAsnaf.nameTh}" ได้`,
    };
  }

  const cleanFormat = String(formatCode || '').trim();
  const matchedFormat = LEVEL_3_ASSISTANCE_FORMATS.find((f) => f.code === cleanFormat || f.id === cleanFormat);
  if (!matchedFormat) {
    return { isValid: false, reason: `ไม่พบรูปแบบการช่วยเหลือรหัส "${formatCode}" ในระบบ` };
  }

  if (!matchedType.supportedFormatCodes.includes(matchedFormat.code)) {
    return {
      isValid: false,
      reason: `ประเภทความช่วยเหลือ "${matchedType.name}" ไม่รองรับรูปแบบการช่วยเหลือ "${matchedFormat.name}"`,
    };
  }

  return { isValid: true };
}

/**
 * สร้าง Matrix ความสัมพันธ์ทั้งหมดสำหรับ Admin UI
 */
export function buildRelationshipMatrix(): ThreeTierRelationshipMatrix {
  const asnafs = LEVEL_1_ASNAFS;
  const assistanceTypes = NORMALIZED_ASSISTANCE_TYPES.map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    category: t.category,
    description: t.description,
    conditionsText: t.conditionsText,
    defaultMinAmount: t.defaultMinAmount,
    defaultMaxAmount: t.defaultMaxAmount,
    requiredDocuments: t.requiredDocuments,
    sortOrder: t.sortOrder,
    isActive: t.isActive,
  }));
  const assistanceFormats = LEVEL_3_ASSISTANCE_FORMATS;

  const asnafTypeLinks: AsnafAssistanceTypeLink[] = [];
  NORMALIZED_ASSISTANCE_TYPES.forEach((t) => {
    t.allowedAsnafCodes.forEach((ac, idx) => {
      asnafTypeLinks.push({
        id: `link-asnaf-${ac}-${t.code}`,
        asnafCode: ac,
        assistanceTypeId: t.id,
        assistanceTypeCode: t.code,
        assistanceTypeName: t.name,
        isActive: true,
        sortOrder: idx + 1,
      });
    });
  });

  const typeFormatLinks: AssistanceTypeFormatLink[] = [];
  NORMALIZED_ASSISTANCE_TYPES.forEach((t) => {
    t.supportedFormatCodes.forEach((fc, idx) => {
      const fmt = LEVEL_3_ASSISTANCE_FORMATS.find((f) => f.code === fc);
      typeFormatLinks.push({
        id: `link-fmt-${t.code}-${fc}`,
        assistanceTypeId: t.id,
        assistanceTypeCode: t.code,
        formatId: fmt?.id || `fmt-${fc}`,
        formatCode: fc,
        formatName: fmt?.name || fc,
        isDefault: idx === 0,
        isActive: true,
      });
    });
  });

  return {
    asnafs,
    assistanceTypes,
    assistanceFormats,
    asnafTypeLinks,
    typeFormatLinks,
  };
}

// =========================================================================
// PHASE 10: CHART OF ACCOUNTS (ผังบัญชีซะกาต & รูปแบบการช่วยเหลือ)
// =========================================================================

export interface ChartOfAccountInfo {
  code: string;
  name: string;
  category: 'expense' | 'asset' | 'liability';
}

// 1. Zakat Expense Debit Accounts by Asnaf Level 1
export const ASNAF_DEBIT_CHART_OF_ACCOUNTS: Record<string, ChartOfAccountInfo> = {
  faqir: { code: '5101-FAQIR-MISKIN', name: 'ค่าใช้จ่ายซะกาตผู้ยากไร้และขัดสน', category: 'expense' },
  miskin: { code: '5101-FAQIR-MISKIN', name: 'ค่าใช้จ่ายซะกาตผู้ยากไร้และขัดสน', category: 'expense' },
  faqir_miskin: { code: '5101-FAQIR-MISKIN', name: 'ค่าใช้จ่ายซะกาตผู้ยากไร้และขัดสน', category: 'expense' },
  amil: { code: '5102-AMIL', name: 'ค่าใช้จ่ายซะกาตผู้บริหารจัดการซะกาต (อามิลีน)', category: 'expense' },
  muallaf: { code: '5103-MUALLAF', name: 'ค่าใช้จ่ายซะกาตมุสลิมใหม่ (มุอัลลัฟ)', category: 'expense' },
  humanitarian: { code: '5104-HUMANITARIAN', name: 'ค่าใช้จ่ายซะกาตด้านมนุษยธรรมและบรรเทาทุกข์', category: 'expense' },
  gharimin: { code: '5105-GHARIMIN', name: 'ค่าใช้จ่ายซะกาตผู้มีหนี้สินล้นตัว (อัล-ฆอรีมีน)', category: 'expense' },
  fisabilillah: { code: '5106-FISABILILLAH', name: 'ค่าใช้จ่ายซะกาตในหนทางของอัลลอฮ์ (ฟีสะบีลิลลาฮ์)', category: 'expense' },
  ibnsabil: { code: '5107-IBNSABIL', name: 'ค่าใช้จ่ายซะกาตผู้เดินทางตกยาก (อิบนุสสะบีล)', category: 'expense' },
};

// 2. Asset / Liability Credit Accounts by Delivery Format Level 3
export const FORMAT_CREDIT_CHART_OF_ACCOUNTS: Record<string, ChartOfAccountInfo> = {
  'fmt-bank-transfer': { code: '1102-BANK', name: 'เงินฝากธนาคารเพื่อการจัดสรรซะกาต', category: 'asset' },
  'bank_transfer': { code: '1102-BANK', name: 'เงินฝากธนาคารเพื่อการจัดสรรซะกาต', category: 'asset' },
  'fmt-cash': { code: '1101-CASH', name: 'เงินสดในมือ', category: 'asset' },
  'cash': { code: '1101-CASH', name: 'เงินสดในมือ', category: 'asset' },
  'fmt-in-kind': { code: '1105-INVENTORY', name: 'สินค้า/ถุงยังชีพและสิ่งของคงคลัง', category: 'asset' },
  'in_kind': { code: '1105-INVENTORY', name: 'สินค้า/ถุงยังชีพและสิ่งของคงคลัง', category: 'asset' },
  'fmt-materials': { code: '2101-AP-MATERIALS', name: 'เจ้าหนี้การค้า - จัดซื้อวัสดุก่อสร้าง/ซ่อมแซม', category: 'liability' },
  'materials': { code: '2101-AP-MATERIALS', name: 'เจ้าหนี้การค้า - จัดซื้อวัสดุก่อสร้าง/ซ่อมแซม', category: 'liability' },
  'fmt-vendor-direct': { code: '2102-AP-VENDOR', name: 'เจ้าหนี้การค้า - จ่ายตรงผู้ขายสินค้า/ร้านค้า', category: 'liability' },
  'vendor_direct': { code: '2102-AP-VENDOR', name: 'เจ้าหนี้การค้า - จ่ายตรงผู้ขายสินค้า/ร้านค้า', category: 'liability' },
  'fmt-contractor': { code: '2103-AP-CONTRACTOR', name: 'เจ้าหนี้ค่าจ้างผู้รับเหมาปรับปรุงที่อยู่อาศัย', category: 'liability' },
  'contractor': { code: '2103-AP-CONTRACTOR', name: 'เจ้าหนี้ค่าจ้างผู้รับเหมาปรับปรุงที่อยู่อาศัย', category: 'liability' },
  'fmt-scholarship': { code: '1102-BANK-SCHOLARSHIP', name: 'เงินฝากธนาคาร - กองทุนทุนการศึกษา', category: 'asset' },
  'scholarship': { code: '1102-BANK-SCHOLARSHIP', name: 'เงินฝากธนาคาร - กองทุนทุนการศึกษา', category: 'asset' },
  'fmt-training': { code: '2104-AP-TRAINING', name: 'เจ้าหนี้ค่าอบรม/วิทยากรและพัฒนาทักษะอาชีพ', category: 'liability' },
  'training': { code: '2104-AP-TRAINING', name: 'เจ้าหนี้ค่าอบรม/วิทยากรและพัฒนาทักษะอาชีพ', category: 'liability' },
  'fmt-career-equipment': { code: '2105-AP-EQUIPMENT', name: 'เจ้าหนี้การค้า - จัดซื้อเครื่องมือและอุปกรณ์ประกอบอาชีพ', category: 'liability' },
  'career_equipment': { code: '2105-AP-EQUIPMENT', name: 'เจ้าหนี้การค้า - จัดซื้อเครื่องมือและอุปกรณ์ประกอบอาชีพ', category: 'liability' },
};

export function getChartOfAccountsForDisbursement(params: {
  asnafCode?: string;
  formatId?: string;
  formatCode?: string;
  deliveryMethod?: string;
}): { debitAcc: ChartOfAccountInfo; creditAcc: ChartOfAccountInfo } {
  const normAsnaf = (params.asnafCode || 'faqir_miskin').toLowerCase();
  const debitAcc = ASNAF_DEBIT_CHART_OF_ACCOUNTS[normAsnaf] || 
    ASNAF_DEBIT_CHART_OF_ACCOUNTS['faqir_miskin'];

  const formatKey = (params.formatId || params.formatCode || params.deliveryMethod || 'fmt-bank-transfer').toLowerCase();
  const creditAcc = FORMAT_CREDIT_CHART_OF_ACCOUNTS[formatKey] || 
    FORMAT_CREDIT_CHART_OF_ACCOUNTS['fmt-bank-transfer'];

  return { debitAcc, creditAcc };
}


