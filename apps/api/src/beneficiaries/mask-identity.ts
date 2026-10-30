export function maskIdentityNumber(value: string | null): string | null {
  if (value === null || value.length === 0) {
    return null;
  }
  if (value.length <= 4) {
    return '••••';
  }
  return `${value.slice(0, 1)}${'•'.repeat(value.length - 3)}${value.slice(-2)}`;
}
