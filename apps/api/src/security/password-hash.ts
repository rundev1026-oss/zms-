import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
const SCHEME = 'scrypt';

export function hashPassword(password: string): string {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const salt = randomBytes(16).toString('base64url');
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('base64url');
  return `${SCHEME}$${salt}$${hash}`;
}

export function verifyPassword(password: string, encoded: string): boolean {
  const [scheme, salt, hash] = encoded.split('$');
  if (scheme !== SCHEME || salt === undefined || salt.length === 0 || hash === undefined) {
    return false;
  }

  const actual = scryptSync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, 'base64url');
  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}
