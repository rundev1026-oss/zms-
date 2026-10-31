import { REGISTRY_STATUSES } from '@zms/shared';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ReasonDto } from '../common/request.dto';
import { AppException } from '../common/app.exception';
import type { AuthUser } from '../common/auth-user';
import type { AuditService } from '../audit/audit.service';
import type { BeneficiariesService } from '../beneficiaries/beneficiaries.service';
import type { PrismaService } from '../prisma/prisma.service';
import {
  REGISTRY_WORKFLOW,
  WORKFLOW_ACTIONS,
  canEditRegistry,
  canReviseRegistry,
  revisionRequiresReview,
  planTransition,
} from './registry-rules';
import { RegistryWorkflowService } from './registry-workflow.service';

const id = '11111111-1111-4111-8111-111111111111';

const approver: AuthUser = {
  id: '33333333-3333-4333-8333-333333333333',
  email: 'approver@zms.local',
  displayName: 'ผู้อนุมัติ (ข้อมูลสมมติ)',
  roles: [{ code: 'APPROVER', name: 'ผู้อนุมัติ' }],
  permissions: ['beneficiaries.read', 'beneficiaries.read.sensitive', 'beneficiaries.decide'],
};

const registrar: AuthUser = {
  id: '44444444-4444-4444-8444-444444444444',
  email: 'registrar@zms.local',
  displayName: 'เจ้าหน้าที่ทะเบียน (ข้อมูลสมมติ)',
  roles: [{ code: 'REGISTRAR', name: 'เจ้าหน้าที่ทะเบียน' }],
  permissions: ['beneficiaries.read', 'beneficiaries.write', 'beneficiaries.submit'],
};

describe('registry transition matrix', () => {
  it('covers every status for every action and stays inside registry statuses', () => {
    const assistanceStatuses = ['SUBMITTED', 'APPROVED', 'PAID', 'CLOSED', 'FOLLOW_UP'];
    expect(WORKFLOW_ACTIONS).toHaveLength(7);

    for (const action of WORKFLOW_ACTIONS) {
      for (const status of REGISTRY_STATUSES) {
        const result = planTransition(action, status);
        const edge = REGISTRY_WORKFLOW[action].edges[status];
        if (edge === undefined) {
          expect(result).toEqual({ error: REGISTRY_WORKFLOW[action].error });
          continue;
        }
        expect(result).toEqual(edge);
        expect(REGISTRY_STATUSES).toContain(edge.to);
        expect(assistanceStatuses).not.toContain(edge.to);
      }
    }
  });

  it('follows the approved path and does not invent a religious eligibility rule', () => {
    expect(planTransition('submit', 'DRAFT')).toEqual({
      to: 'PENDING_REVIEW',
      recordHistory: true,
    });
    expect(planTransition('assess', 'PENDING_REVIEW')).toEqual({
      to: 'UNDER_ASSESSMENT',
      recordHistory: true,
    });
    expect(planTransition('approve', 'UNDER_ASSESSMENT')).toEqual({
      to: 'ELIGIBLE',
      recordHistory: true,
    });
    expect(planTransition('reject', 'UNDER_ASSESSMENT')).toEqual({
      to: 'INELIGIBLE',
      recordHistory: true,
    });
    expect(planTransition('correction', 'PENDING_REVIEW')).toEqual({
      to: 'NEEDS_CORRECTION',
      recordHistory: true,
    });
    expect(planTransition('suspend', 'ELIGIBLE')).toEqual({
      to: 'SUSPENDED',
      recordHistory: true,
    });
    expect(planTransition('archive', 'SUSPENDED')).toEqual({
      to: 'ARCHIVED',
      recordHistory: true,
    });
    expect(planTransition('approve', 'DRAFT')).toEqual({
      error: 'ยืนยันคุณสมบัติได้เมื่อทะเบียนอยู่ระหว่างประเมิน',
    });
    expect(planTransition('archive', 'ARCHIVED')).toEqual({
      error: 'เก็บถาวรได้เมื่อทะเบียนมีผลคุณสมบัติหรือถูกระงับ',
    });
    expect(canEditRegistry('SUSPENDED')).toBe(false);
    expect(canEditRegistry('ARCHIVED')).toBe(false);
    expect(canReviseRegistry('ELIGIBLE')).toBe(true);
    expect(canReviseRegistry('ARCHIVED')).toBe(false);
    expect(revisionRequiresReview('ELIGIBLE')).toBe(true);
    expect(revisionRequiresReview('DRAFT')).toBe(false);
    expect(REGISTRY_WORKFLOW.approve.edges).not.toHaveProperty('DRAFT');
  });

  it('rejects a client-supplied target status', async () => {
    const dto = plainToInstance(ReasonDto, { reason: 'เจ้าหน้าที่บันทึก', status: 'ELIGIBLE' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.some((error) => error.property === 'status')).toBe(true);
  });
});

describe('registry workflow enforcement', () => {
  it('refuses approval by a registrar before touching the record', async () => {
    const transaction = jest.fn();
    const service = serviceWith({ $transaction: transaction });
    await expect(service.approve(id, 'เจ้าหน้าที่ยืนยัน', registrar)).rejects.toMatchObject({
      response: { code: 'FORBIDDEN' },
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('records actor, time, reason, and the statuses around an approval', async () => {
    const harness = harnessFor('UNDER_ASSESSMENT');
    const service = serviceWith(harness.prisma, harness.audit);
    const view = await service.approve(id, 'เจ้าหน้าที่ยืนยันจากข้อมูลที่ตรวจแล้ว', approver);

    expect(view.status).toBe('ELIGIBLE');
    expect(harness.updates[0]).toEqual({ status: 'ELIGIBLE', updatedById: approver.id });
    expect(harness.history[0]).toMatchObject({
      beneficiaryId: id,
      fromStatus: 'UNDER_ASSESSMENT',
      toStatus: 'ELIGIBLE',
      reason: 'เจ้าหน้าที่ยืนยันจากข้อมูลที่ตรวจแล้ว',
      actedById: approver.id,
    });
    expect(harness.history[0]?.actedAt).toBeInstanceOf(Date);
    expect(harness.audits[0]).toMatchObject({
      actorId: approver.id,
      action: 'REGISTRY_STATUS_CHANGE',
      resourceType: 'beneficiary',
      resourceId: id,
      metadata: {
        from: 'UNDER_ASSESSMENT',
        to: 'ELIGIBLE',
        reason: 'เจ้าหน้าที่ยืนยันจากข้อมูลที่ตรวจแล้ว',
      },
    });
    expect(harness.tx.asnafCategory.findFirst).not.toHaveBeenCalled();
    expect(harness.tx).not.toHaveProperty('incomeExpenseProfile');
  });

  it('suspends only an eligible registry and archives that suspension', async () => {
    const suspended = harnessFor('ELIGIBLE');
    const suspendService = serviceWith(suspended.prisma, suspended.audit);
    const suspendedView = await suspendService.suspend(id, 'ระงับชั่วคราว', approver);
    expect(suspendedView.status).toBe('SUSPENDED');
    expect(suspended.history[0]).toMatchObject({
      fromStatus: 'ELIGIBLE',
      toStatus: 'SUSPENDED',
      reason: 'ระงับชั่วคราว',
      actedById: approver.id,
    });

    const archived = harnessFor('SUSPENDED');
    const archiveService = serviceWith(archived.prisma, archived.audit);
    const archivedView = await archiveService.archive(id, 'ปิดแฟ้ม', approver);
    expect(archivedView.status).toBe('ARCHIVED');
    expect(archived.history[0]).toMatchObject({ fromStatus: 'SUSPENDED', toStatus: 'ARCHIVED' });
  });

  it('rejects a forbidden archive and a repeated command', async () => {
    const draft = harnessFor('DRAFT');
    const service = serviceWith(draft.prisma, draft.audit);
    await expect(service.archive(id, 'ปิดแฟ้ม', approver)).rejects.toBeInstanceOf(AppException);
    expect(draft.updates).toHaveLength(0);

    let release: (value: unknown) => void = () => undefined;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const locked = serviceWith({ $transaction: () => gate });
    const first = locked.suspend(id, 'ระงับชั่วคราว', approver);
    await expect(locked.suspend(id, 'ระงับชั่วคราว', approver)).rejects.toMatchObject({
      response: { code: 'DUPLICATE_REQUEST' },
    });
    release({ status: 'SUSPENDED' });
    await first;
  });
});

function serviceWith(
  prisma: unknown,
  audit: { record: jest.Mock } = { record: jest.fn() },
): RegistryWorkflowService {
  return new RegistryWorkflowService(
    prisma as PrismaService,
    { requireRecord: jest.fn() } as unknown as BeneficiariesService,
    audit as unknown as AuditService,
  );
}

function harnessFor(status: string) {
  const updates: Array<Record<string, unknown>> = [];
  const history: Array<Record<string, unknown>> = [];
  const audits: Array<Record<string, unknown>> = [];
  const tx = {
    beneficiary: {
      findFirst: jest.fn().mockResolvedValue(draftRow(status)),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        updates.push(data);
        return { ...draftRow(String(data.status)), ...data };
      }),
    },
    beneficiaryAsnafAssessment: {
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn(),
    },
    asnafCategory: { findFirst: jest.fn() },
    registryStatusHistory: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        history.push(data);
      }),
    },
    beneficiaryAddress: { count: jest.fn().mockResolvedValue(1) },
    household: { findUnique: jest.fn().mockResolvedValue({ id: 'household' }) },
    consentRecord: { findFirst: jest.fn().mockResolvedValue({ id: 'consent' }) },
  };
  const audit = {
    record: jest.fn(async (_writer: unknown, entry: Record<string, unknown>) => {
      audits.push(entry);
    }),
  };
  return {
    tx,
    updates,
    history,
    audits,
    audit,
    prisma: { $transaction: (work: (client: typeof tx) => Promise<unknown>) => work(tx) },
  };
}

function draftRow(status: string) {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id,
    registryNumber: 'ZMS-2026-000001',
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
  };
}
