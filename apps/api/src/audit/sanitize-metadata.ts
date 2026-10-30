const FORBIDDEN_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'refreshtoken',
  'accesstoken',
  'identitynumber',
  'identitynumbernormalized',
  'file',
  'filebytes',
]);

export function sanitizeMetadata(
  input: Record<string, string | number | boolean | null> | undefined,
): Record<string, string | number | boolean | null> | undefined {
  if (input === undefined) {
    return undefined;
  }

  const metadata: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(input)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      continue;
    }
    if (typeof value === 'string' && /\d{13}/.test(value)) {
      continue;
    }
    metadata[key] = value;
  }
  return metadata;
}
