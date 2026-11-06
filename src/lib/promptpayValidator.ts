/**
 * PromptPay & Bank Validation Utilities for ZMS
 * ตรวจสอบความถูกต้องของหมายเลขโทรศัพท์ 10 หลัก, เลขประจำตัวประชาชน/ผู้เสียภาษี 13 หลัก, และ Biller ID 15 หลัก
 * คำนวณ Checksum Algorithm (Mod 11) ตามมาตรฐานธนาคารแห่งประเทศไทย
 */

export type PromptPayType = 'phone' | 'national_id' | 'tax_id' | 'biller_id';

export interface PromptPayValidationResult {
  valid: boolean;
  type?: PromptPayType;
  normalized?: string;
  formatted?: string;
  error?: string;
}

/**
 * ตรวจสอบเลขประจำตัวประชาชน/เลขประจำตัวผู้เสียภาษี 13 หลัก
 * ใช้อัลกอริทึม Mod 11 Checksum ตามมาตรฐานกระทรวงมหาดไทยและกรมสรรพากร
 */
export function validateThaiNationalOrTaxId(idStr: string): boolean {
  const clean = idStr.replace(/[^0-9]/g, '');
  if (clean.length !== 13) return false;

  // ตรวจสอบว่าเป็นตัวเลขซ้ำกันทั้ง 13 ตัวหรือไม่ (เช่น 0000000000000 หรือ 1111111111111)
  if (/^(\d)\1{12}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(clean.charAt(i), 10) * (13 - i);
  }

  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(clean.charAt(12), 10);
}

/**
 * ตรวจสอบหมายเลขโทรศัพท์มือถือในประเทศไทย 10 หลัก
 */
export function validateThaiPhone(phoneStr: string): boolean {
  const clean = phoneStr.replace(/[^0-9]/g, '');
  if (clean.length !== 10) return false;
  // เบอร์มือถือไทยเริ่มต้นด้วย 06, 08, 09
  return /^(06|08|09)\d{8}$/.test(clean);
}

/**
 * ตรวจสอบ Biller ID 15 หลัก
 */
export function validateBillerId(billerStr: string): boolean {
  const clean = billerStr.replace(/[^0-9]/g, '');
  if (clean.length !== 15) return false;
  return /^\d{15}$/.test(clean);
}

/**
 * จัดรูปแบบการแสดงผล PromptPay ให้เป็นมาตรฐาน
 */
export function formatPromptPayDisplay(clean: string, type: PromptPayType): string {
  if (type === 'phone' && clean.length === 10) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
  }
  if ((type === 'national_id' || type === 'tax_id') && clean.length === 13) {
    return `${clean.slice(0, 1)}-${clean.slice(1, 5)}-${clean.slice(5, 10)}-${clean.slice(10, 12)}-${clean.slice(12)}`;
  }
  if (type === 'biller_id' && clean.length === 15) {
    return `${clean.slice(0, 5)}-${clean.slice(5, 10)}-${clean.slice(10)}`;
  }
  return clean;
}

/**
 * ตรวจสอบและระบุประเภทของ PromptPay โดยอัตโนมัติ
 */
export function validatePromptPay(
  input: string,
  expectedType: 'auto' | PromptPayType = 'auto'
): PromptPayValidationResult {
  if (!input || !input.trim()) {
    return { valid: false, error: 'กรุณาระบุหมายเลข PromptPay' };
  }

  const clean = input.replace(/[^0-9]/g, '');

  // 1. ตรวจสอบตามความยาว
  if (clean.length === 10) {
    if (expectedType !== 'auto' && expectedType !== 'phone') {
      return { valid: false, error: 'หมายเลข 10 หลักต้องเป็นหมายเลขโทรศัพท์มือถือ' };
    }
    const isValid = validateThaiPhone(clean);
    if (!isValid) {
      return {
        valid: false,
        type: 'phone',
        error: 'หมายเลขโทรศัพท์ 10 หลักไม่ถูกต้อง (ต้องขึ้นต้นด้วย 06, 08 หรือ 09)',
      };
    }
    return {
      valid: true,
      type: 'phone',
      normalized: clean,
      formatted: formatPromptPayDisplay(clean, 'phone'),
    };
  }

  if (clean.length === 13) {
    if (expectedType !== 'auto' && expectedType !== 'national_id' && expectedType !== 'tax_id') {
      return { valid: false, error: 'หมายเลข 13 หลักต้องเป็นเลขประจำตัวประชาชนหรือเลขประจำตัวผู้เสียภาษี' };
    }
    const isValid = validateThaiNationalOrTaxId(clean);
    if (!isValid) {
      return {
        valid: false,
        type: 'tax_id',
        error: 'เลขประจำตัว 13 หลักไม่ถูกต้องตาม Checksum Algorithm (Mod 11)',
      };
    }
    return {
      valid: true,
      type: clean.startsWith('0') ? 'tax_id' : 'national_id',
      normalized: clean,
      formatted: formatPromptPayDisplay(clean, 'tax_id'),
    };
  }

  if (clean.length === 15) {
    if (expectedType !== 'auto' && expectedType !== 'biller_id') {
      return { valid: false, error: 'หมายเลข 15 หลักต้องเป็น Biller ID' };
    }
    const isValid = validateBillerId(clean);
    if (!isValid) {
      return { valid: false, type: 'biller_id', error: 'Biller ID ต้องเป็นตัวเลข 15 หลัก' };
    }
    return {
      valid: true,
      type: 'biller_id',
      normalized: clean,
      formatted: formatPromptPayDisplay(clean, 'biller_id'),
    };
  }

  return {
    valid: false,
    error: `ความยาวของ PromptPay ไม่ถูกต้อง (ระบุมา ${clean.length} หลัก: รองรับเบอร์มือถือ 10 หลัก, เลขผู้เสียภาษี/บัตร ปชช. 13 หลัก, หรือ Biller ID 15 หลัก)`,
  };
}

/**
 * Mask เลขบัญชีธนาคารเพื่อความปลอดภัย
 */
export function maskBankAccountNumber(accNo: string, isRevealed: boolean = false): string {
  if (isRevealed) return accNo;
  const clean = accNo.replace(/[^0-9]/g, '');
  if (clean.length >= 10) {
    return `${clean.slice(0, 3)}-x-xxx${clean.slice(-4, -1)}-${clean.slice(-1)}`;
  }
  return accNo.replace(/\d(?=\d{3})/g, '•');
}

/**
 * Mask หมายเลข PromptPay ใน Log / UI
 */
export function maskPromptPayId(ppId: string, isRevealed: boolean = false): string {
  if (isRevealed || !ppId) return ppId;
  const clean = ppId.replace(/[^0-9]/g, '');
  if (clean.length === 10) {
    return `${clean.slice(0, 3)}-xxx-${clean.slice(6)}`;
  }
  if (clean.length === 13) {
    return `${clean.slice(0, 1)}-xxxx-xxxxx-${clean.slice(11)}`;
  }
  return ppId.replace(/\d(?=\d{4})/g, '•');
}

