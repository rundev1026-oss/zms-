/**
 * Utility functions for calculating and formatting age from birth date.
 * Handles Thai Buddhist Era (พ.ศ.), Western Calendar (ค.ศ.), leap years,
 * and ages under 1 year (formatted in months and days).
 */

export interface AgeCalculationResult {
  isValid: boolean;
  error?: string;
  isFuture?: boolean;
  years: number;
  months: number;
  days: number;
  displayText: string;          // e.g. "54 ปี 5 เดือน" or "8 เดือน" or "15 วัน"
  shortYearText: string;        // e.g. "54 ปี" or "0 ปี"
  isUnderOneYear: boolean;
  isoDate: string;              // Normalized YYYY-MM-DD (CE)
  buddhistDateFormatted: string;// e.g. "12 พฤษภาคม 2515"
}

const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

/**
 * Normalizes input date string into YYYY-MM-DD in Western CE format.
 * If input has BE year (> 2400), converts to CE by subtracting 543.
 */
export function normalizeBirthDateToCE(input: string | Date | null | undefined): string | null {
  if (!input) return null;

  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    const y = input.getFullYear();
    const m = String(input.getMonth() + 1).padStart(2, '0');
    const d = String(input.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const str = String(input).trim();
  const match = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (!match) return null;

  let year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  // If Thai Buddhist Year (e.g. 2515)
  if (year > 2400) {
    year -= 543;
  }

  // Basic range validation
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Returns today's date formatted as YYYY-MM-DD (CE) for use in max attribute of date inputs.
 */
export function getTodayISODate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculates exact age in years, months, and days from birth date.
 * Handles leap years correctly (e.g. Feb 29).
 * Prevents future birth dates.
 */
export function calculateAge(
  birthDateInput: string | Date | null | undefined,
  referenceDate: Date = new Date()
): AgeCalculationResult {
  if (!birthDateInput) {
    return {
      isValid: false,
      error: 'กรุณาระบุวันเดือนปีเกิด',
      years: 0,
      months: 0,
      days: 0,
      displayText: 'ยังไม่ได้ระบุ',
      shortYearText: '-',
      isUnderOneYear: false,
      isoDate: '',
      buddhistDateFormatted: '',
    };
  }

  const normalized = normalizeBirthDateToCE(birthDateInput);
  if (!normalized) {
    return {
      isValid: false,
      error: 'รูปแบบวันเดือนปีเกิดไม่ถูกต้อง (เช่น 1980-05-12)',
      years: 0,
      months: 0,
      days: 0,
      displayText: 'รูปแบบวันที่ไม่ถูกต้อง',
      shortYearText: '-',
      isUnderOneYear: false,
      isoDate: '',
      buddhistDateFormatted: '',
    };
  }

  const [y, m, d] = normalized.split('-').map(Number);
  const birthDate = new Date(y, m - 1, d);

  // Validate date actually exists (e.g. Feb 30)
  if (
    birthDate.getFullYear() !== y ||
    birthDate.getMonth() !== m - 1 ||
    birthDate.getDate() !== d
  ) {
    return {
      isValid: false,
      error: 'วันที่ระบุไม่มีอยู่จริงในปฏิทิน',
      years: 0,
      months: 0,
      days: 0,
      displayText: 'วันที่ไม่ถูกต้อง',
      shortYearText: '-',
      isUnderOneYear: false,
      isoDate: '',
      buddhistDateFormatted: '',
    };
  }

  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );

  // Reject future birth dates
  if (birthDate.getTime() > today.getTime()) {
    return {
      isValid: false,
      isFuture: true,
      error: 'วันเดือนปีเกิดต้องไม่อยู่ในอนาคต',
      years: 0,
      months: 0,
      days: 0,
      displayText: 'วันเกิดอยู่ในอนาคต (ไม่ถูกต้อง)',
      shortYearText: '-',
      isUnderOneYear: false,
      isoDate: normalized,
      buddhistDateFormatted: '',
    };
  }

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  // If day is negative, borrow days from the previous month of reference date
  if (days < 0) {
    months--;
    // Last day of previous month
    const prevMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }

  // If month is negative, borrow 12 months from year
  if (months < 0) {
    years--;
    months += 12;
  }

  // Format display text in Thai
  let displayText = '';
  const isUnderOneYear = years === 0;

  if (years === 0) {
    if (months === 0) {
      displayText = `${days} วัน`;
    } else {
      displayText = days > 0 ? `${months} เดือน ${days} วัน` : `${months} เดือน`;
    }
  } else {
    displayText = months > 0 ? `${years} ปี ${months} เดือน` : `${years} ปี`;
  }

  const shortYearText = `${years} ปี`;

  // Buddhist date format (e.g. 12 พฤษภาคม 2515)
  const beYear = y + 543;
  const monthName = THAI_MONTH_NAMES[m - 1] || '';
  const buddhistDateFormatted = `${d} ${monthName} พ.ศ. ${beYear}`;

  return {
    isValid: true,
    years,
    months,
    days,
    displayText,
    shortYearText,
    isUnderOneYear,
    isoDate: normalized,
    buddhistDateFormatted,
  };
}
