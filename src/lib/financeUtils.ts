/**
 * Pure client-safe utility functions for Finance & Accounting
 * Satang precision math, account number masking, and penny allocation algorithm
 */

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
 * Guarantees 100% exact sum match down to the satang without floating-point errors.
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

  const intermediate: { code: string; satang: number; remainder: number }[] = [];
  let allocatedSatangSum = 0;

  for (const item of items) {
    const exactSatang = (totalSatang * item.pct) / 100;
    const baseSatang = Math.floor(exactSatang);
    const remainder = exactSatang - baseSatang;
    intermediate.push({ code: item.code, satang: baseSatang, remainder });
    allocatedSatangSum += baseSatang;
  }

  // Distribute remaining satangs to items with largest remainder
  const missingSatang = totalSatang - allocatedSatangSum;
  intermediate.sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; i < missingSatang; i++) {
    intermediate[i % intermediate.length].satang += 1;
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
};
