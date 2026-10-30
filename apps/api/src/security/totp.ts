import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Base32 encoding for TOTP secret
 */
export function generateBase32Secret(length = 20): string {
  const bytes = randomBytes(length);
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Base32 decoding
 */
export function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_CHARS.indexOf(cleaned[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generate 6-digit TOTP token according to RFC 6238 (30-second interval, HMAC-SHA1)
 */
export function generateTotp(secretBase32: string, time = Date.now(), timeStepSec = 30): string {
  const counter = Math.floor(time / 1000 / timeStepSec);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));

  const secretBuffer = base32Decode(secretBase32);
  const hmac = createHmac('sha1', secretBuffer).update(buf).digest();

  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = (code % 1_000_000).toString().padStart(6, '0');
  return otp;
}

/**
 * Verify TOTP token with +/- 1 interval window (compensate for clock drift)
 */
export function verifyTotp(
  token: string,
  secretBase32: string,
  window = 1,
  timeStepSec = 30
): boolean {
  if (!token || token.length !== 6 || !/^\d{6}$/.test(token)) {
    return false;
  }

  const now = Date.now();
  for (let errorStep = -window; errorStep <= window; errorStep++) {
    const checkTime = now + errorStep * timeStepSec * 1000;
    const expected = generateTotp(secretBase32, checkTime, timeStepSec);
    if (timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
      return true;
    }
  }

  return false;
}

/**
 * Generate recovery codes (10 backup codes of 8 alphanumeric characters)
 */
export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = randomBytes(5).toString('hex').slice(0, 8).toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }
  return codes;
}

/**
 * Build OTPAuth URI for Google Authenticator / 1Password
 */
export function generateOtpAuthUri(
  accountName: string,
  issuer: string,
  secretBase32: string
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secretBase32}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

