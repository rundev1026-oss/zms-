import { missingSubmitFields } from './completeness';
import { planApprove, planAssess, planSubmit } from './registry-rules';
import { RegistryWorkflowService } from './registry-workflow.service';
import { AppException } from '../common/app.exception';
import type { AuthUser } from '../common/auth-user';
import type { BeneficiariesService } from '../beneficiaries/beneficiaries.service';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';

const actor: AuthUser = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'assessor@zms.local',
  displayName: 'ผู้ประเมิน (ข้อมูลสมมติ)',
  roles: [{ code: 'ASSESSOR', name: 'ผู้ประเมิน' }],
  permissions: ['beneficiaries.assess', 'beneficiaries.decide', 'beneficiaries.read'],
};

describe('registry workflow rules', () => {
  it('does not treat a repeated submit as a new status change', () => {
    expect(planSubmit('UNDER_REVIEW')).toEqual({ to: 'UNDER_REVIEW', recordHistory: false });
    expect(planSubmit('QUALIFIED')).toEqual({ error: 'ส่งตรวจสอบข้อมูลได้เฉพาะทะเบียนสถานะร่าง' });
  });

  it('keeps assessment and eligibility as separate staff actions', () => {
    const assessed = planAssess('UNDER_REVIEW');
    expect('to' in assessed ? assessed.to : '').toBe('UNDER_REVIEW');
    expect(planApprove('DRAFT')).toEqual({
      error: 'ยืนยันมีคุณสมบัติตามเกณฑ์ได้เฉพาะทะเบียนที่อยู่ระหว่างตรวจสอบข้อมูล',
    });
    const approved = planApprove('UNDER_REVIEW');
    expect('to' in approved ? approved.to : '').toBe('QUALIFIED');
  });

  it('requires consent, household, and address before submit', () => {
    const missing = missingSubmitFields({
      firstName: 'สมมติ',
      lastName: 'ทดสอบ',
      identityType: 'THAI_NATIONAL_ID',
      identityNumber: '0000000000001',
      dateOfBirth: new Date('1990-01-01'),
      phone: '0812345678',
      addressCountWithArea: 0,
      hasHousehold: false,
      hasAcceptedConsent: false,
    });
    expect(missing.map((item) => item.field)).toEqual(
      expect.arrayContaining(['addresses', 'household', 'consent']),
    );
  });

  it('stores the staff assessment decision without marking the registry eligible', async () => {
    const updates: Array<Record<string, unknown>> = [];
    const tx = {
      beneficiary: {
        findFirst: jest.fn().mockResolvedValue(draftRow('UNDER_REVIEW')),
        update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          updates.push(data);
          return { ...draftRow('UNDER_REVIEW'), ...data };
        }),
      },
      asnafCategory: {
        findFirst: jest.fn().mockResolvedValue({ id: 'cat-1', code: 'FAQIR', isActive: true }),
      },
      beneficiaryAsnafAssessment: { create: jest.fn().mockResolvedValue({ id: 'a-1' }) },
      registryStatusHistory: { create: jest.fn() },
      beneficiaryAddress: { count: jest.fn() },
      household: { findUnique: jest.fn() },
      consentRecord: { findFirst: jest.fn() },
    };
    const service = new RegistryWorkflowService(
      {
        $transaction: (work: (client: typeof tx) => Promise<unknown>) => work(tx),
      } as unknown as PrismaService,
      { requireRecord: jest.fn() } as unknown as BeneficiariesService,
      { record: jest.fn(), write: jest.fn() } as unknown as AuditService,
    );

    const view = await service.assess(
      '11111111-1111-4111-8111-111111111111',
      { categoryId: 'cat-1', rationale: 'เจ้าหน้าที่บันทึก', decision: 'CONFIRMED' },
      actor,
    );

    expect(tx.beneficiaryAsnafAssessment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ decision: 'CONFIRMED', recordedById: actor.id }),
      }),
    );
    expect(updates).toHaveLength(0);
    expect(view.status).toBe('UNDER_REVIEW');
    expect(tx).not.toHaveProperty('incomeExpenseProfile');
  });

  it('refuses approval until a staff assessment exists', async () => {
    const tx = {
      beneficiary: { findFirst: jest.fn().mockResolvedValue(draftRow('UNDER_REVIEW')) },
      beneficiaryAsnafAssessment: { count: jest.fn().mockResolvedValue(0) },
    };
    const service = new RegistryWorkflowService(
      {
        $transaction: (work: (client: typeof tx) => Promise<unknown>) => work(tx),
      } as unknown as PrismaService,
      { requireRecord: jest.fn() } as unknown as BeneficiariesService,
      { record: jest.fn() } as unknown as AuditService,
    );

    await expect(
      service.approve('11111111-1111-4111-8111-111111111111', 'เจ้าหน้าที่ยืนยัน', actor),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('rejects a second submit while the first request is still running', async () => {
    let release: (value: unknown) => void = () => undefined;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const service = new RegistryWorkflowService(
      { $transaction: () => gate } as unknown as PrismaService,
      { requireRecord: jest.fn() } as unknown as BeneficiariesService,
      { record: jest.fn() } as unknown as AuditService,
    );
    const id = '11111111-1111-4111-8111-111111111111';
    const submitter = {
      ...actor,
      permissions: [...actor.permissions, 'beneficiaries.submit'],
    };
    const first = service.submit(id, submitter);
    await expect(service.submit(id, submitter)).rejects.toMatchObject({
      response: { code: 'DUPLICATE_REQUEST' },
    });
    release({ status: 'UNDER_REVIEW' });
    await first;
  });
});

function draftRow(status: string) {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: '11111111-1111-4111-8111-111111111111',
    registryNumber: 'ZMS-2026-000001',
    memberId: 'MB-2026-000001',
    memberStatus: 'ACTIVE',
    status,
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
    createdAt: now,
    updatedAt: now,
    createdById: null,
    updatedById: null,
    addresses: [],
    assessments: [],
    applications: [],
    _count: {
      assessments: 0,
      applications: 0,
    },
  };
}
