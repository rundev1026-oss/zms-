/**
 * Pure client-safe utility functions & central Asnaf policy registry for Finance & Accounting
 * Satang precision math, account number masking, penny allocation algorithm, and central Asnaf definitions
 */

export interface CentralAsnafDefinition {
  code: string;
  nameTh: string;
  nameEn: string;
  defaultFundAccountId: string;
  sortOrder: number;
  description: string;
}

/**
 * Central Asnaf Primary Group Registry (Single Source of Truth across ZMS modules)
 * Referenced by Primary Fund Groups (Level 1), Specific Funds (Level 2), Assistance Types (Level 3),
 * Applications, Field Assessments, Approvals, Finance Ledger, and Reports.
 */
export const CENTRAL_ASNAF_GROUPS: CentralAsnafDefinition[] = [
  {
    code: 'faqir_miskin',
    nameTh: 'ฟากีรและมิสกีน (ผู้ยากไร้และขัดสน)',
    nameEn: 'Faqir & Miskin (The Poor and Needy)',
    defaultFundAccountId: 'fund-1',
    sortOrder: 1,
    description: 'ผู้ยากไร้ที่ไม่มีรายได้หรือมีทรัพย์สิน/รายได้ไม่เพียงพอต่อความจำเป็นพื้นฐานในการดำรงชีพ',
  },
  {
    code: 'amil',
    nameTh: 'อามิล (ผู้ปฏิบัติงานจัดเก็บและบริหารซะกาต)',
    nameEn: 'Amil (Zakat Administrators)',
    defaultFundAccountId: 'fund-2',
    sortOrder: 2,
    description: 'บุคลากรและค่าใช้จ่ายในการบริหารจัดการ การลงพื้นที่สำรวจ และการเบิกจ่ายซะกาตตามหลักการ',
  },
  {
    code: 'muallaf',
    nameTh: 'มุอัลลัฟ (ผู้เข้ารับอิสลามใหม่/ผู้โน้มน้าวใจ)',
    nameEn: 'Muallaf (New Muslims & Hearts Reconciled)',
    defaultFundAccountId: 'fund-3',
    sortOrder: 3,
    description: 'ผู้เข้ารับอิสลามใหม่ที่ต้องการการดูแลด้านการดำรงชีพ การศึกษาศาสนา และการปรับตัวในสังคม',
  },
  {
    code: 'humanitarian',
    nameTh: 'ริกอบ/มนุษยธรรม (ผู้ประสบภัยและปลดเปลื้องพันธนาการ)',
    nameEn: 'Al-Riqab & Humanitarian Relief',
    defaultFundAccountId: 'fund-4',
    sortOrder: 4,
    description: 'การปลดเปลื้องความทุกข์ยาก การช่วยเหลือผู้ประสบภัยพิบัติ และภารกิจด้านมนุษยธรรมฉุกเฉิน',
  },
  {
    code: 'gharimin',
    nameTh: 'ฆอริมีน (ผู้มีภาระหนี้สินจำเป็นสุจริต)',
    nameEn: 'Al-Gharimin (Those in Genuine Debt)',
    defaultFundAccountId: 'fund-5',
    sortOrder: 5,
    description: 'ผู้มีหนี้สินที่เกิดจากความจำเป็นพื้นฐานโดยสุจริตและพ้นวิสัยที่จะชำระคืนได้ด้วยตนเอง',
  },
  {
    code: 'fisabilillah',
    nameTh: 'ฟีสะบีลิลลาฮ์ (ในหนทางของอัลลอฮ์และสาธารณประโยชน์ศาสนา)',
    nameEn: 'Fi Sabilillah (In the Cause of Allah)',
    defaultFundAccountId: 'fund-6',
    sortOrder: 6,
    description: 'โครงการเพื่อเชิดชูศาสนา การศึกษาศาสนา และการพัฒนาประโยชน์สาธารณะตามแนวทางอิสลาม',
  },
  {
    code: 'ibnsabil',
    nameTh: 'อิบนุสสะบีล (ผู้เดินทางที่ขาดแคลนทุนทรัพย์)',
    nameEn: 'Ibn al-Sabil (Stranded Wayfarers)',
    defaultFundAccountId: 'fund-7',
    sortOrder: 7,
    description: 'ผู้เดินทางในภารกิจสุจริตที่ประสบเหตุขัดข้อง ขาดแคลนค่าพาหนะหรือที่พักในการกลับภูมิลำเนา',
  },
];

export function normalizePrimaryGroupCode(code?: string | null): string {
  if (!code) return 'faqir_miskin';
  const cleaned = code.trim().toLowerCase();
  if (cleaned === 'faqir' || cleaned === 'miskin' || cleaned === 'faqir_miskin') return 'faqir_miskin';
  if (cleaned === 'amil' || cleaned === 'amilin') return 'amil';
  if (cleaned === 'muallaf') return 'muallaf';
  if (cleaned === 'riqab' || cleaned === 'al_riqab' || cleaned === 'humanitarian') return 'humanitarian';
  if (cleaned === 'gharimin' || cleaned === 'gharimun' || cleaned === 'al_gharimin') return 'gharimin';
  if (cleaned === 'fisabilillah' || cleaned === 'fi_sabilillah') return 'fisabilillah';
  if (cleaned === 'ibnsabil' || cleaned === 'ibn_sabil' || cleaned === 'ibnu_sabil') return 'ibnsabil';
  return cleaned;
}

export function getCentralAsnafByCode(code?: string | null): CentralAsnafDefinition | undefined {
  const norm = normalizePrimaryGroupCode(code);
  return CENTRAL_ASNAF_GROUPS.find((g) => g.code === norm);
}

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function toSatang(num: number): number {
  return Math.round((num + Number.EPSILON) * 100);
}

export function fromSatang(satang: number): number {
  return Math.round(satang) / 100;
}

export function maskAccountNumber(accNo: string): string {
  if (!accNo) return '';
  const clean = accNo.replace(/[^0-9]/g, '');
  if (clean.length >= 10) {
    return `${clean.slice(0, 3)}-x-xxx${clean.slice(-3, -1)}-${clean.slice(-1)}`;
  }
  return accNo.replace(/.(?=.{4})/g, '•');
}

/**
 * Penny Allocation Algorithm (Largest Remainder Method)
 * Guarantees exact satang sum without floating-point errors.
 * Supports both 100% full allocation and <100% Reserve Policy allocation,
 * while ensuring 0% items never receive rounding satangs.
 */
export function calculatePennyAllocation(
  poolAmount: number,
  items: { code: string; pct: number }[]
): Map<string, number> {
  const totalSatang = toSatang(poolAmount);
  const result = new Map<string, number>();

  if (totalSatang <= 0 || items.length === 0) {
    for (const item of items) {
      result.set(item.code, 0);
    }
    return result;
  }

  const pctSum = items.reduce((s, item) => s + Math.max(0, Number(item.pct) || 0), 0);
  if (pctSum <= 0) {
    for (const item of items) {
      result.set(item.code, 0);
    }
    return result;
  }

  const targetAllocatableSatang =
    Math.abs(pctSum - 100) < 0.001 ? totalSatang : Math.round((totalSatang * pctSum) / 100);

  const intermediate: { code: string; pct: number; satang: number; remainder: number }[] = [];
  let allocatedSatangSum = 0;

  for (const item of items) {
    const pct = Math.max(0, Number(item.pct) || 0);
    if (pct <= 0) {
      intermediate.push({ code: item.code, pct: 0, satang: 0, remainder: 0 });
      continue;
    }
    const exactSatang = (totalSatang * pct) / 100;
    const baseSatang = Math.floor(exactSatang);
    const remainder = exactSatang - baseSatang;
    intermediate.push({ code: item.code, pct, satang: baseSatang, remainder });
    allocatedSatangSum += baseSatang;
  }

  // Distribute remaining satangs only to items with pct > 0 ordered by largest remainder
  const missingSatang = Math.max(0, targetAllocatableSatang - allocatedSatangSum);
  const positiveItems = intermediate.filter((entry) => entry.pct > 0);
  positiveItems.sort((a, b) => b.remainder - a.remainder);

  if (positiveItems.length > 0) {
    for (let i = 0; i < missingSatang; i++) {
      positiveItems[i % positiveItems.length].satang += 1;
    }
  }

  for (const entry of intermediate) {
    result.set(entry.code, fromSatang(entry.satang));
  }

  return result;
}

// Client-safe namespace
export const FinancialService = {
  calculatePennyAllocation,
  maskAccountNumber,
  round2,
  toSatang,
  fromSatang,
  CENTRAL_ASNAF_GROUPS,
  normalizePrimaryGroupCode,
  getCentralAsnafByCode,
};
