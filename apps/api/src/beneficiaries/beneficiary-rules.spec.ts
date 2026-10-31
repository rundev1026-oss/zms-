import { HttpException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { completedAgeYears } from './beneficiary-fields';
import { CreateBeneficiaryDto } from './beneficiary.dto';
import { isValidThaiNationalId } from './identity';
import { maskIdentityNumber } from './mask-identity';
import { buildBeneficiaryWhere, summaryFilters, toStatusSummary } from './beneficiary-query';
import { presentBeneficiary, type BeneficiaryRecord } from './beneficiary.presenter';
import { AssessmentDto } from '../common/request.dto';
import { toErrorBody } from '../common/error-body';

describe('beneficiary rules', () => {
  it('accepts a synthetic Thai national id checksum and rejects a bad one', () => {
    expect(isValidThaiNationalId('0000000000001')).toBe(true);
    expect(isValidThaiNationalId('0000000000002')).toBe(false);
    expect(isValidThaiNationalId('123')).toBe(false);
  });

  it('calculates age from the date of birth without storing an eligibility result', () => {
    expect(completedAgeYears('1990-01-02', new Date('2026-01-01T00:00:00.000Z'))).toBe(35);
    expect(completedAgeYears('1990-01-01', new Date('2026-01-01T00:00:00.000Z'))).toBe(36);
    expect(completedAgeYears('2026-01-02', new Date('2026-01-01T00:00:00.000Z'))).toBeNull();
    const view = presentBeneficiary(sample(), { revealIdentity: false, revealAid: false });
    expect(view.ageYears).toBe(completedAgeYears('1990-01-01', new Date()));
    expect(view).not.toHaveProperty('eligible');
  });

  it('masks the identity number and hides aid without permission', () => {
    expect(maskIdentityNumber('0000000000001')).toBe('0••••••••••01');
    const view = presentBeneficiary(sample(), { revealIdentity: false, revealAid: false });
    expect(view.identityNumber).toBe('0••••••••••01');
    expect(view.aidTotal).toBeUndefined();
    expect(view.requestCount).toBe(0);
    expect(JSON.stringify(view)).not.toContain('identityNumberNormalized');
  });

  it('reveals identity and a zero aid total only when those permissions are applied by the server', () => {
    const view = presentBeneficiary(sample(), { revealIdentity: true, revealAid: true });
    expect(view.identityNumber).toBe('0000000000001');
    expect(view.aidTotal).toBe('0.00');
  });

  it('filters deleted rows and matches a full identity number exactly', () => {
    const where = buildBeneficiaryWhere({ q: '0000000000001', status: 'DRAFT', province: 'ยะลา' });
    expect(where.deletedAt).toBeNull();
    expect(where.status).toBe('DRAFT');
    expect(where.OR).toEqual(
      expect.arrayContaining([{ identityNumberNormalized: '0000000000001' }]),
    );
    const partial = buildBeneficiaryWhere({ q: 'สมมติ' });
    expect(JSON.stringify(partial.OR)).not.toContain('identityNumberNormalized');
  });

  it('counts every registry status from database groups and ignores the selected status tab', () => {
    const filters = summaryFilters({
      q: 'สมมติ',
      status: 'ELIGIBLE',
      province: 'ยะลา',
      asnafCategoryId: '11111111-1111-4111-8111-111111111111',
      sort: 'status:asc',
    });
    const where = buildBeneficiaryWhere(filters);
    expect(where.status).toBeUndefined();
    expect((where as any).province).toBeUndefined();
    expect(where.addresses).toEqual({ some: { province: 'ยะลา' } });

    const summary = toStatusSummary([
      { status: 'DRAFT', count: 4 },
      { status: 'ELIGIBLE', count: 2 },
    ]);
    expect(summary.counts.DRAFT).toBe(4);
    expect(summary.counts.ELIGIBLE).toBe(2);
    expect(summary.counts.ARCHIVED).toBe(0);
    expect(summary.total).toBe(6);
  });

  it('rejects a client trying to set status or user id on create', async () => {
    const dto = plainToInstance(CreateBeneficiaryDto, {
      firstName: 'สมมติ',
      lastName: 'ทดสอบ',
      identityType: 'THAI_NATIONAL_ID',
      status: 'ELIGIBLE',
      userId: 'attacker',
    });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    const fields = errors.map((error) => error.property);
    expect(fields).toEqual(expect.arrayContaining(['status', 'userId']));
  });

  it('rejects an assessment body that tries to send income as an automatic decision', async () => {
    const dto = plainToInstance(AssessmentDto, {
      categoryId: '11111111-1111-4111-8111-111111111111',
      rationale: 'เจ้าหน้าที่บันทึก',
      householdIncome: '100',
    });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.map((error) => error.property)).toContain('householdIncome');
  });

  it('does not return a raw identity number from an error body', () => {
    const body = toErrorBody(
      new HttpException({ code: 'DUPLICATE_IDENTITY', message: 'ซ้ำ 0000000000001' }, 409),
    );
    expect(body.body.message).not.toContain('0000000000001');
    expect(toErrorBody(new Error('secret 0000000000001')).body.message).toBe(
      'เกิดข้อผิดพลาดภายในระบบ',
    );
  });
});

function sample(): BeneficiaryRecord {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: '11111111-1111-4111-8111-111111111111',
    legacyId: null,
    registryNumber: 'ZMS-2026-000001',
    status: 'DRAFT',
    title: null,
    firstName: 'สมมติ',
    lastName: 'ทดสอบ',
    identityType: 'THAI_NATIONAL_ID',
    identityNumber: '0000000000001',
    identityNumberNormalized: '0000000000001',
    dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
    phone: '0812345678',
    occupation: null,
    maritalStatus: null,
    registrationNote: null,
    deletedAt: null,
    deletedById: null,
    deletionReason: null,
    deletionReference: null,
    deletionStatus: false,
    deletedBy: null,
    household: null,
    incomeProfile: null,
    documents: [],
    createdAt: now,
    updatedAt: now,
    createdById: null,
    updatedById: null,
    createdBy: null,
    addresses: [],
    assessments: [],
  };
}
