import { detectAllowedFile } from './file-signature';
import { sanitizeMetadata } from '../audit/sanitize-metadata';
import { RequestLock } from '../common/request-lock';

describe('documents and audit safeguards', () => {
  it('accepts only pdf, jpeg, and png signatures within the size limit', () => {
    expect(detectAllowedFile(Buffer.from('%PDF-1.7'))).toBe('pdf');
    expect(detectAllowedFile(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toBe('jpg');
    expect(detectAllowedFile(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))).toBe('png');
    expect(detectAllowedFile(Buffer.from('hello'))).toBeNull();
    expect(detectAllowedFile(Buffer.alloc(10 * 1024 * 1024 + 1, 1))).toBeNull();
  });

  it('drops secrets and full identity numbers from audit metadata', () => {
    expect(
      sanitizeMetadata({
        password: 'secret',
        token: 'raw',
        identityNumber: '0000000000001',
        note: '0000000000001',
        status: 'DRAFT',
      }),
    ).toEqual({ status: 'DRAFT' });
  });

  it('does not run the same key twice at the same time', async () => {
    const lock = new RequestLock();
    let release: (value: string) => void = () => undefined;
    const gate = new Promise<string>((resolve) => {
      release = resolve;
    });
    const first = lock.run('submit:1', () => gate);
    await expect(lock.run('submit:1', async () => 'second')).rejects.toMatchObject({
      response: { code: 'DUPLICATE_REQUEST' },
    });
    release('first');
    await expect(first).resolves.toBe('first');
  });
});
