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

const reviewer: AuthUser = {
  id: '55555555-5555-4555-8555-555555555555',
  email: 'reviewer@zms.local',
  displayName: 'เจ้าหน้าที่ตรวจสอบข้อมูล (ข้อมูลสมมติ)',
  roles: [{ code: 'REVIEWER', name: 'เจ้าหน้าที่ตรวจสอบข้อมูล' }],
  permissions: ['beneficiaries.read', 'beneficiaries.read.sensitive', 'beneficiaries.review'],
};

describe('registry transition matrix', () => {
  it('covers every status for every action and stays inside registry statuses', () => {
    const assistanceStatuses = ['SUBMITTED', 'APPROVED', 'PAID', 'CLOSED', 'FOLLOW_UP'];
    expect(WORKFLOW_ACTIONS).toHaveLength(6);

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

  it('follows the 4-status workflow path and does not allow skipping review', () => {
    expect(planTransition('submit', 'DRAFT')).toEqual({
      to: 'UNDER_REVIEW',
      recordHistory: true,
    });
    expect(planTransition('assess', 'UNDER_REVIEW')).toEqual({
      to: 'UNDER_REVIEW',
      recordHistory: false,
    });
    expect(planTransition('approve', 'UNDER_REVIEW')).toEqual({
      to: 'QUALIFIED',
      recordHistory: true,
    });
    expect(planTransition('reject', 'UNDER_REVIEW')).toEqual({
      to: 'NOT_QUALIFIED',
      recordHistory: true,
    });
    expect(planTransition('correction', 'UNDER_REVIEW')).toEqual({
      to: 'DRAFT',
      recordHistory: true,
    });
    expect(planTransition('reReview', 'QUALIFIED')).toEqual({
      to: 'UNDER_REVIEW',
      recordHistory: true,
    });
    expect(planTransition('reReview', 'NOT_QUALIFIED')).toEqual({
      to: 'UNDER_REVIEW',
      recordHistory: true,
    });
    expect(planTransition('approve', 'DRAFT')).toEqual({
      error: 'ยืนยันมีคุณสมบัติตามเกณฑ์ได้เฉพาะทะเบียนที่อยู่ระหว่างตรวจสอบข้อมูล',
    });
    expect(planTransition('reject', 'DRAFT')).toEqual({
      error: 'ยืนยันไม่มีคุณสมบัติตามเกณฑ์ได้เฉพาะทะเบียนที่อยู่ระหว่างตรวจสอบข้อมูล',
    });
    expect(planTransition('reReview', 'DRAFT')).toEqual({
      error: 'ส่งตรวจสอบข้อมูลใหม่ได้เฉพาะทะเบียนที่ตัดสินคุณสมบัติแล้ว',
    });
    expect(canEditRegistry('DRAFT')).toBe(true);
    expect(canEditRegistry('UNDER_REVIEW')).toBe(false);
    expect(canReviseRegistry('QUALIFIED')).toBe(true);
    expect(canReviseRegistry('NOT_QUALIFIED')).toBe(true);
    expect(revisionRequiresReview('QUALIFIED')).toBe(true);
    expect(revisionRequiresReview('NOT_QUALIFIED')).toBe(true);
    expect(revisionRequiresReview('UNDER_REVIEW')).toBe(true);
    expect(revisionRequiresReview('DRAFT')).toBe(false);
    expect(REGISTRY_WORKFLOW.approve.edges).not.toHaveProperty('DRAFT');
    expect(REGISTRY_WORKFLOW.reject.edges).not.toHaveProperty('DRAFT');
  });

  it('rejects a client-supplied target status', async () => {
    const dto = plainToInstance(ReasonDto, { reason: 'เจ้าหน้าที่บันทึก', status: 'QUALIFIED' });
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
    const harness = harnessFor('UNDER_REVIEW');
    const service = serviceWith(harness.prisma, harness.audit);
    const view = await service.approve(id, 'เจ้าหน้าที่ยืนยันจากข้อมูลที่ตรวจแล้ว', approver);

    expect(view.status).toBe('QUALIFIED');
    expect(harness.updates[0]).toEqual({ status: 'QUALIFIED', updatedById: approver.id });
    expect(harness.history[0]).toMatchObject({
      beneficiaryId: id,
      fromStatus: 'UNDER_REVIEW',
      toStatus: 'QUALIFIED',
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
        from: 'UNDER_REVIEW',
        to: 'QUALIFIED',
        reason: 'เจ้าหน้าที่ยืนยันจากข้อมูลที่ตรวจแล้ว',
      },
    });
    expect(harness.tx.asnafCategory.findFirst).not.toHaveBeenCalled();
    expect(harness.tx).not.toHaveProperty('incomeExpenseProfile');
  });

  it('allows re-review from QUALIFIED or NOT_QUALIFIED back to UNDER_REVIEW', async () => {
    const qualified = harnessFor('QUALIFIED');
    const reReviewService = serviceWith(qualified.prisma, qualified.audit);
    const reReviewedView = await reReviewService.reReview(id, 'ขอทบทวนคุณสมบัติใหม่', reviewer);
    expect(reReviewedView.status).toBe('UNDER_REVIEW');
    expect(qualified.history[0]).toMatchObject({
      fromStatus: 'QUALIFIED',
      toStatus: 'UNDER_REVIEW',
      reason: 'ขอทบทวนคุณสมบัติใหม่',
      actedById: reviewer.id,
    });

    const notQualified = harnessFor('NOT_QUALIFIED');
    const notQualifiedService = serviceWith(notQualified.prisma, notQualified.audit);
    const notQualifiedView = await notQualifiedService.reReview(id, 'ส่งตรวจใหม่', reviewer);
    expect(notQualifiedView.status).toBe('UNDER_REVIEW');
    expect(notQualified.history[0]).toMatchObject({
      fromStatus: 'NOT_QUALIFIED',
      toStatus: 'UNDER_REVIEW',
    });
  });

  it('rejects a forbidden re-review from DRAFT and a repeated command', async () => {
    const draft = harnessFor('DRAFT');
    const service = serviceWith(draft.prisma, draft.audit);
    await expect(service.reReview(id, 'ขอทบทวนใหม่', reviewer)).rejects.toBeInstanceOf(AppException);
    expect(draft.updates).toHaveLength(0);

    let release: (value: unknown) => void = () => undefined;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const locked = serviceWith({ $transaction: () => gate });
    const first = locked.reReview(id, 'ขอทบทวนใหม่', reviewer);
    await expect(locked.reReview(id, 'ขอทบทวนใหม่', reviewer)).rejects.toMatchObject({
      response: { code: 'DUPLICATE_REQUEST' },
    });
    release({ status: 'UNDER_REVIEW' });
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
