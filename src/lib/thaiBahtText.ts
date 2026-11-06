/**
 * แปลงจำนวนเงินตัวเลขเป็นคำอ่านภาษาไทย (Thai Baht Text)
 * เช่น 1500.00 -> "หนึ่งพันห้าร้อยบาทถ้วน"
 */

export function thaiBahtText(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'ศูนย์บาทถ้วน';

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const roundedAmount = Math.round(absAmount * 100) / 100;

  const parts = roundedAmount.toFixed(2).split('.');
  const integerPart = parts[0];
  const fractionalPart = parts[1];

  const digits = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  function readGroup(numStr: string): string {
    let result = '';
    const len = numStr.length;

    for (let i = 0; i < len; i++) {
      const digit = parseInt(numStr.charAt(i), 10);
      const pos = len - i - 1;

      if (digit !== 0) {
        if (pos === 0 && digit === 1 && len > 1 && numStr.charAt(len - 2) !== '0') {
          result += 'เอ็ด';
        } else if (pos === 1 && digit === 1) {
          result += ''; // ไม่พูด "หนึ่งสิบ" พูด "สิบ"
        } else if (pos === 1 && digit === 2) {
          result += 'ยี่';
        } else {
          result += digits[digit];
        }
        result += positions[pos];
      }
    }
    return result;
  }

  function readFullInteger(numStr: string): string {
    if (numStr === '0') return 'ศูนย์';
    let result = '';
    let remaining = numStr;

    // แบ่งกลุ่มละ 6 หลัก (ล้าน)
    const groups: string[] = [];
    while (remaining.length > 6) {
      groups.unshift(remaining.slice(-6));
      remaining = remaining.slice(0, -6);
    }
    groups.unshift(remaining);

    for (let i = 0; i < groups.length; i++) {
      const groupText = readGroup(groups[i]);
      if (groupText) {
        result += groupText;
        if (i < groups.length - 1) {
          result += 'ล้าน';
        }
      }
    }
    return result;
  }

  let text = isNegative ? 'ลบ' : '';
  text += readFullInteger(integerPart) + 'บาท';

  if (fractionalPart === '00') {
    text += 'ถ้วน';
  } else {
    text += readGroup(fractionalPart) + 'สตางค์';
  }

  return text;
}

