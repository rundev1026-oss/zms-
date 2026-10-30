import type { AuthUser } from '../common/auth-user';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';

const actor: AuthUser = {
  id: '33333333-3333-4333-8333-333333333333',
  email: 'finance@zms.local',
  displayName: 'ผู้ดูการเงิน (ข้อมูลสมมติ)',
  roles: [{ code: 'FINANCE_VIEWER', name: 'ผู้ดูการเงิน' }],
  permissions: ['beneficiaries.read', 'beneficiaries.aid.view', 'reports.export'],
};

describe('beneficiary excel export', () => {
  it('exports every matching row from the database without a page window or a full identity number', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValue([
        record('ZMS-2026-000001', '0000000000001'),
        record('ZMS-2026-000002', '0000000000001'),
      ]);
    const audit = jest.fn().mockResolvedValue(undefined);
    const service = new ReportsService(
      { beneficiary: { findMany } } as unknown as PrismaService,
      { write: audit } as unknown as AuditService,
    );

    const file = await service.exportBeneficiaries(
      { status: 'DRAFT', province: 'ยะลา', sort: 'createdAt:desc' },
      actor,
    );

    const query = findMany.mock.calls[0]?.[0] as { skip?: number; take?: number; where: object };
    expect(query.skip).toBeUndefined();
    expect(query.take).toBeUndefined();
    expect(query.where).toMatchObject({ status: 'DRAFT', deletedAt: null });
    expect(file.fileName).toBe('zms-beneficiaries.xlsx');
    expect(file.bytes.subarray(0, 2).toString('utf8')).toBe('PK');
    const sheet = file.bytes.toString('utf8');
    expect(sheet).toContain('ZMS-2026-000001');
    expect(sheet).toContain('ZMS-2026-000002');
    expect(sheet).toContain('ยอดช่วยเหลือ');
    expect(sheet).not.toContain('0000000000001');
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BENEFICIARY_EXPORT',
        metadata: { rowCount: 2, revealAid: true },
      }),
    );
    expect(JSON.stringify(audit.mock.calls[0]?.[0])).not.toContain('0000000000001');
  });
});

function record(registryNumber: string, identityNumber: string) {
  const now = new Date('2026-01-02T00:00:00.000Z');
  return {
    id: '11111111-1111-4111-8111-111111111111',
    registryNumber,
    status: 'DRAFT',
    title: null,
    firstName: 'สมมติ',
    lastName: 'ทดสอบ',
    identityType: 'THAI_NATIONAL_ID',
    identityNumber,
    identityNumberNormalized: identityNumber,
    dateOfBirth: null,
    phone: '0812345678',
    occupation: null,
    maritalStatus: null,
    registrationNote: null,
    createdAt: now,
    updatedAt: now,
    addresses: [
      {
        addressType: 'CURRENT',
        province: 'ยะลา',
        community: 'ชุมชนสมมติ',
      },
    ],
    assessments: [],
  };
}
