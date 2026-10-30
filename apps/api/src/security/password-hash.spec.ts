import { hashPassword, verifyPassword } from './password-hash';

describe('password hash', () => {
  it('stores a salted scrypt hash that is not the password', () => {
    const encoded = hashPassword('LocalDev-Only-1');

    expect(encoded.startsWith('scrypt$')).toBe(true);
    expect(encoded.includes('LocalDev-Only-1')).toBe(false);
    expect(verifyPassword('LocalDev-Only-1', encoded)).toBe(true);
    expect(verifyPassword('wrong-password', encoded)).toBe(false);
  });

  it('rejects a short password and a malformed hash', () => {
    expect(() => hashPassword('short')).toThrow(/at least 8 characters/);
    expect(verifyPassword('LocalDev-Only-1', 'not-a-hash')).toBe(false);
  });
});
