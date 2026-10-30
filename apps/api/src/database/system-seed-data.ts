import { PERMISSION_CODES, type PermissionCode } from '@zms/shared';

const PERMISSION_DESCRIPTIONS: Record<PermissionCode, string> = {
  'beneficiaries.read': 'ดูรายการและรายละเอียดแบบปกปิด',
  'beneficiaries.read.sensitive': 'เห็นเลขประจำตัวเต็ม',
  'beneficiaries.write': 'สร้างและแก้ร่างทะเบียน',
  'beneficiaries.submit': 'ส่งทะเบียนให้ตรวจสอบ',
  'beneficiaries.review': 'ขอให้แก้ไขข้อมูลทะเบียน',
  'beneficiaries.assess': 'บันทึกการประเมินอัสนัฟ',
  'beneficiaries.decide': 'บันทึกผลคุณสมบัติ ระงับ หรือเก็บถาวรทะเบียน',
  'beneficiaries.aid.view': 'เห็นยอดช่วยเหลือสะสม',
  'documents.read': 'ดูและดาวน์โหลดเอกสาร',
  'documents.write': 'อัปโหลดเอกสาร',
  'documents.review': 'ให้ผลตรวจเอกสาร',
  'documents.delete': 'ปิดใช้งานเอกสาร',
  'reports.export': 'ส่งออก Excel',
  'audit.read': 'ดูบันทึกการตรวจสอบ',
};

export const PERMISSIONS = PERMISSION_CODES.map((code) => ({
  code,
  description: PERMISSION_DESCRIPTIONS[code],
}));

export type { PermissionCode };

export const ROLES = [
  {
    code: 'SUPER_ADMIN',
    name: 'ผู้ดูแลระบบ',
    description: 'บทบาทสมมติสำหรับพัฒนา ใช้สิทธิ์ทั้งหมดจนกว่ามูลนิธิจะยืนยัน',
  },
  {
    code: 'REGISTRAR',
    name: 'เจ้าหน้าที่ทะเบียน',
    description: 'บันทึกและส่งตรวจทะเบียน',
  },
  {
    code: 'REVIEWER',
    name: 'ผู้ตรวจสอบข้อมูล',
    description: 'ตรวจความครบของทะเบียนและเอกสาร',
  },
  {
    code: 'ASSESSOR',
    name: 'ผู้ประเมิน',
    description: 'บันทึกการประเมินอัสนัฟ ไม่ได้ตัดสินคุณสมบัติอัตโนมัติ',
  },
  {
    code: 'APPROVER',
    name: 'ผู้อนุมัติ',
    description: 'บันทึกผลคุณสมบัติ ระงับ และเก็บถาวรทะเบียน โดยไม่คำนวณจากเกณฑ์ศาสนา',
  },
  {
    code: 'FINANCE_VIEWER',
    name: 'ผู้ดูการเงิน',
    description: 'เห็นยอดช่วยเหลือสะสมและส่งออกรายงาน',
  },
  {
    code: 'AUDITOR',
    name: 'ผู้สอบทาน',
    description: 'ดูบันทึกการตรวจสอบและข้อมูลทะเบียนแบบปกปิด',
  },
] as const;

export type RoleCode = (typeof ROLES)[number]['code'];

const ALL_PERMISSIONS: PermissionCode[] = PERMISSIONS.map((permission) => permission.code);

export const ROLE_PERMISSIONS: Record<RoleCode, readonly PermissionCode[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  REGISTRAR: [
    'beneficiaries.read',
    'beneficiaries.read.sensitive',
    'beneficiaries.write',
    'beneficiaries.submit',
    'documents.read',
    'documents.write',
  ],
  REVIEWER: [
    'beneficiaries.read',
    'beneficiaries.read.sensitive',
    'beneficiaries.review',
    'documents.read',
    'documents.review',
  ],
  ASSESSOR: ['beneficiaries.read', 'beneficiaries.assess', 'documents.read'],
  APPROVER: ['beneficiaries.read', 'beneficiaries.read.sensitive', 'beneficiaries.decide'],
  FINANCE_VIEWER: ['beneficiaries.read', 'beneficiaries.aid.view', 'reports.export'],
  AUDITOR: ['beneficiaries.read', 'documents.read', 'audit.read'],
};

export const ASNAF_CATEGORIES = [
  { code: 'FAQIR', nameTh: 'ฟากีร', sortOrder: 1 },
  { code: 'MISKIN', nameTh: 'มิสกิน', sortOrder: 2 },
  { code: 'AMIL', nameTh: 'อามีลีน', sortOrder: 3 },
  { code: 'MUALLAF', nameTh: 'มุอัลลัฟ', sortOrder: 4 },
  { code: 'GHARIM', nameTh: 'อัลฆอริมีน', sortOrder: 5 },
  { code: 'FISABILILLAH', nameTh: 'ฟีสะบีลิลลาฮ์', sortOrder: 6 },
  { code: 'IBNUS_SABIL', nameTh: 'อิบนุสสะบีล', sortOrder: 7 },
  { code: 'OTHER', nameTh: 'หมวดอื่นที่มูลนิธิอนุมัติให้ใช้งาน', sortOrder: 8 },
] as const;

export const SEED_USERS = [
  {
    email: 'super-admin@zms.local',
    displayName: 'ผู้ดูแลระบบ (ข้อมูลสมมติ)',
    roleCode: 'SUPER_ADMIN',
  },
  {
    email: 'registrar@zms.local',
    displayName: 'เจ้าหน้าที่ทะเบียน (ข้อมูลสมมติ)',
    roleCode: 'REGISTRAR',
  },
  {
    email: 'reviewer@zms.local',
    displayName: 'ผู้ตรวจสอบข้อมูล (ข้อมูลสมมติ)',
    roleCode: 'REVIEWER',
  },
  {
    email: 'assessor@zms.local',
    displayName: 'ผู้ประเมิน (ข้อมูลสมมติ)',
    roleCode: 'ASSESSOR',
  },
  {
    email: 'approver@zms.local',
    displayName: 'ผู้อนุมัติ (ข้อมูลสมมติ)',
    roleCode: 'APPROVER',
  },
  {
    email: 'finance@zms.local',
    displayName: 'ผู้ดูการเงิน (ข้อมูลสมมติ)',
    roleCode: 'FINANCE_VIEWER',
  },
  {
    email: 'auditor@zms.local',
    displayName: 'ผู้สอบทาน (ข้อมูลสมมติ)',
    roleCode: 'AUDITOR',
  },
] as const satisfies ReadonlyArray<{
  email: string;
  displayName: string;
  roleCode: RoleCode;
}>;
