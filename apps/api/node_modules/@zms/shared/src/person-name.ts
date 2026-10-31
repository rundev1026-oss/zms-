export const PERSON_TITLE_OPTIONS = [
  'นาย',
  'นาง',
  'นางสาว',
  'อิหม่าม',
  'ฮัจญี',
  'ฮัจญะห์',
  'อื่นๆ',
] as const;

export interface PersonNameInput {
  prefix?: string | null;
  title?: string | null;
  titlePrefix?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
}

export interface SplitPersonName {
  prefix: string;
  firstName: string;
  lastName: string;
}

export function normalizePersonPrefix(value: string | null | undefined): string {
  const prefix = String(value ?? '').trim();
  if (!prefix || prefix === 'ไม่ระบุ' || prefix === '-') return '';
  return prefix;
}

function stripPrefixToken(prefix: string, value: string): string {
  const text = value.trim();
  if (!prefix || !text) return text;
  if (text === prefix) return '';
  if (text.startsWith(`${prefix} `)) return text.slice(prefix.length).trim();
  return text;
}

export function splitPersonName(input: PersonNameInput): SplitPersonName {
  const prefix = normalizePersonPrefix(input.prefix ?? input.titlePrefix ?? input.title);
  let firstName = String(input.firstName ?? '').trim();
  let lastName = String(input.lastName ?? '').trim();

  if (!firstName && !lastName) {
    const combined = stripPrefixToken(prefix, String(input.fullName ?? ''));
    const parts = combined.split(/\s+/).filter(Boolean);
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ');
  } else {
    firstName = stripPrefixToken(prefix, firstName);
    if (!firstName && lastName.includes(' ')) {
      const parts = lastName.split(/\s+/).filter(Boolean);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ');
    }
  }

  return { prefix, firstName, lastName };
}

export function formatPersonName(input: PersonNameInput): string {
  const name = splitPersonName(input);
  const given = [name.firstName, name.lastName].filter(Boolean).join(' ');
  if (given) return name.prefix ? `${name.prefix} ${given}` : given;

  const fullName = String(input.fullName ?? '').trim();
  if (!fullName) return name.prefix;
  if (name.prefix && (fullName === name.prefix || fullName.startsWith(`${name.prefix} `))) {
    return fullName;
  }
  return name.prefix ? `${name.prefix} ${fullName}` : fullName;
}
