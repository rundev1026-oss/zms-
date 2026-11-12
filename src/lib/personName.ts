const PLACEHOLDER_NAMES = new Set([
  '',
  '-',
  'ผู้ขอรับความช่วยเหลือ',
  'ไม่ระบุ',
  'ไม่ระบุชื่อ',
]);

export function isPlaceholderPersonName(value?: string | null): boolean {
  return PLACEHOLDER_NAMES.has(String(value || '').trim());
}
