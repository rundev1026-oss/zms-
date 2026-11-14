import { AppException } from '../common/app.exception';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import { AssistanceRequestsService } from './assistance-requests.service';

function makeBeneficiary(status: string, memberStatus = 'ACTIVE') {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    memberId: 'MEM-2026-0001',
    registryNumber: 'ZMS-2026-000001',
    title: 'นาย',
    firstName: 'สมมติ',
    lastName: 'ทดสอบ',
    identityType: 'THAI_NATIONAL_ID',
    identityNumber: '1100100100101',
    identityNumberNormalized: '1100100100101',
    dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
    phone: '0812345678',
    occupation: 'รับจ้าง',
    maritalStatus: 'married',
    status,
    memberStatus,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    household: {
      address: '1 หมู่ 1',
      community: 'ชุมชน 1',
      subdistrict: 'ในเมือง',
      district: 'เมือง',
      province: 'ปัตตานี',
      householdIncome: 1500,
      householdExpense: 2500,
      debtAmount: 0,
      members: [],
    },
    addresses: [],
    assessments: [],
    documents: [],
    incomeProfile: null,
  };
}

describe('AssistanceRequestsService eligibility gate', () => {
  it.each(['DRAFT', 'UNDER_REVIEW', 'NOT_QUALIFIED'])(
    'blocks %s beneficiaries in checkBeneficiary and create',
    async (status) => {
      const findFirst = jest.fn().mockResolvedValue(makeBeneficiary(status));
      const transaction = jest.fn();
      const service = new AssistanceRequestsService(
        {
          beneficiary: { findFirst },
          $transaction: transaction,
        } as unknown as PrismaService,
        { record: jest.fn() } as unknown as AuditService,
      );

      await expect(
        service.checkBeneficiary({ registrationNo: 'ZMS-2026-000001' }),
      ).rejects.toMatchObject({
        response: { code: 'BENEFICIARY_INELIGIBLE' },
      });

      await expect(
        service.create({
          beneficiaryId: 'ZMS-2026-000001',
          requestedAmount: 1000,
          purpose: 'ค่าครองชีพ',
        } as any),
      ).rejects.toBeInstanceOf(AppException);
      expect(transaction).not.toHaveBeenCalled();
    },
  );

  it('blocks suspended members even when registration status is QUALIFIED', async () => {
    const findFirst = jest.fn().mockResolvedValue(makeBeneficiary('QUALIFIED', 'SUSPENDED'));
    const service = new AssistanceRequestsService(
      { beneficiary: { findFirst } } as unknown as PrismaService,
      { record: jest.fn() } as unknown as AuditService,
    );

    await expect(
      service.checkBeneficiary({ registrationNo: 'ZMS-2026-000001' }),
    ).rejects.toMatchObject({
      response: { code: 'BENEFICIARY_INELIGIBLE' },
    });
  });

  it('allows active QUALIFIED beneficiaries in checkBeneficiary', async () => {
    const findFirst = jest.fn().mockResolvedValue(makeBeneficiary('QUALIFIED', 'ACTIVE'));
    const service = new AssistanceRequestsService(
      { beneficiary: { findFirst } } as unknown as PrismaService,
      { record: jest.fn() } as unknown as AuditService,
    );

    const res = await service.checkBeneficiary({ registrationNo: 'ZMS-2026-000001' });
    expect(res.found).toBe(true);
    expect(res.canApply).toBe(true);
    expect(res.beneficiary.registrationStatus).toBe('QUALIFIED');
  });
});
