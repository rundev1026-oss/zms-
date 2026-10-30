import { HttpException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { mkdir, writeFile } from 'node:fs/promises';
import type { AuthUser } from '../common/auth-user';
import { LoginDto } from '../common/request.dto';
import { toErrorBody } from '../common/error-body';
import { buildBeneficiaryWhere } from '../beneficiaries/beneficiary-query';
import type { AuditService } from '../audit/audit.service';
import type { BeneficiariesService } from '../beneficiaries/beneficiaries.service';
import type { PrismaService } from '../prisma/prisma.service';
import { redactDatabaseMessage } from '../prisma/database-error';
import { DocumentsService } from './documents.service';

jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  readFile: jest.fn(),
}));

const actor: AuthUser = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'registrar@zms.local',
  displayName: 'เจ้าหน้าที่ทะเบียน (ข้อมูลสมมติ)',
  roles: [{ code: 'REGISTRAR', name: 'เจ้าหน้าที่ทะเบียน' }],
  permissions: ['documents.read', 'documents.write'],
};

const beneficiaryId = '11111111-1111-4111-8111-111111111111';
const documentId = '33333333-3333-4333-8333-333333333333';

describe('document authorization and upload safety', () => {
  it('stores the detected type and a base file name, not the client mime or a path', async () => {
    const created = jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: documentId,
      ...data,
      status: 'UPLOADED',
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      reviewedAt: null,
    }));
    const service = new DocumentsService(
      {
        $transaction: (work: (tx: unknown) => Promise<unknown>) =>
          work({
            beneficiaryDocument: { create: created },
          }),
      } as unknown as PrismaService,
      { requireRecord: jest.fn() } as unknown as BeneficiariesService,
      { record: jest.fn() } as unknown as AuditService,
      'storage',
    );

    const view = await service.upload(
      beneficiaryId,
      {
        buffer: Buffer.from('%PDF-1.7'),
        originalname: '..\\..\\secret.html',
        mimetype: 'text/html',
      },
      'สำเนาบัตรประจำตัว',
      actor,
    );

    expect(view.originalFileName).toBe('secret.html');
    expect(view.mimeType).toBe('application/pdf');
    expect(created).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          originalFileName: 'secret.html',
          mimeType: 'application/pdf',
        }),
      }),
    );
    const writtenPath = jest.mocked(writeFile).mock.calls[0]?.[0];
    expect(String(writtenPath)).not.toContain('..');
    expect(jest.mocked(mkdir)).toHaveBeenCalled();
  });

  it('refuses a stored path that escapes the private directory', async () => {
    const service = new DocumentsService(
      {
        beneficiaryDocument: {
          findFirst: jest.fn().mockResolvedValue({
            id: documentId,
            storageKey: '../secret.pdf',
            mimeType: 'application/pdf',
            originalFileName: 'secret.pdf',
            deletedAt: null,
          }),
        },
      } as unknown as PrismaService,
      { requireRecord: jest.fn() } as unknown as BeneficiariesService,
      { write: jest.fn() } as unknown as AuditService,
      'storage',
    );

    await expect(service.readContent(documentId, actor)).rejects.toMatchObject({
      response: { code: 'NOT_FOUND' },
    });
  });

  it('does not return a soft-deleted document to another caller', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new DocumentsService(
      { beneficiaryDocument: { findFirst } } as unknown as PrismaService,
      { requireRecord: jest.fn() } as unknown as BeneficiariesService,
      { write: jest.fn() } as unknown as AuditService,
      'storage',
    );

    await expect(service.readContent(documentId, actor)).rejects.toMatchObject({
      response: { code: 'NOT_FOUND' },
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: documentId, deletedAt: null },
    });
  });
});

describe('data validation and sensitive errors', () => {
  it('keeps a hostile search inside a parameter object', () => {
    const where = buildBeneficiaryWhere({ q: "' OR 1=1 --", status: 'DRAFT' });
    expect(JSON.stringify(where)).toContain("' OR 1=1 --");
    expect(JSON.stringify(where)).not.toContain('SELECT');
    expect(where.OR).toEqual(
      expect.arrayContaining([
        { firstName: { contains: "' OR 1=1 --", mode: 'insensitive' } },
      ]),
    );
  });

  it('rejects a login body that adds another user id or a non-email', async () => {
    const dto = plainToInstance(LoginDto, {
      email: "registrar@zms.local' OR 1=1 --",
      password: 'not-the-real-password',
      userId: 'attacker',
    });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['email', 'userId']),
    );
  });

  it('hides stacks, passwords, and full identity numbers from error and database text', () => {
    const body = toErrorBody(new Error('password=LocalDev-Only-1 token=abc 0000000000001'));
    expect(body.status).toBe(500);
    expect(body.body.message).toBe('เกิดข้อผิดพลาดภายในระบบ');
    expect(JSON.stringify(body)).not.toContain('LocalDev-Only-1');
    expect(JSON.stringify(body)).not.toContain('0000000000001');
    expect(JSON.stringify(body)).not.toContain('stack');

    const leaked = toErrorBody(
      new HttpException({ code: 'BUSINESS_RULE', message: 'ซ้ำ 0000000000001' }, 409),
    );
    expect(leaked.body.message).toBe('ซ้ำ [redacted]');

    const database = redactDatabaseMessage(
      new Error('connect postgresql://zms:LocalDev-Only-1@localhost:5432/zms failed\nstack'),
    );
    expect(database).toBe('connect [redacted-url] failed');
    expect(database).not.toContain('LocalDev-Only-1');
  });
});
