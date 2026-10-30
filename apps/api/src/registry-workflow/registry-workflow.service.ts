import { HttpStatus, Injectable } from '@nestjs/common';
import type { AsnafDecision, Prisma, RegistryStatus } from '@prisma/client';
import type { RegistryStatusCode } from '@zms/shared';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/app.exception';
import type { AuthUser } from '../common/auth-user';
import { RequestLock } from '../common/request-lock';
import { PrismaService } from '../prisma/prisma.service';
import { BeneficiariesService } from '../beneficiaries/beneficiaries.service';
import { presentBeneficiary, beneficiaryInclude } from '../beneficiaries/beneficiary.presenter';
import { missingSubmitFields } from './completeness';
import {
  planTransition,
  workflowPermission,
  type TransitionPlan,
  type WorkflowAction,
} from './registry-rules';

export interface AssessmentInput {
  categoryId: string;
  rationale: string;
  supportingInfo?: string;
  decision?: AsnafDecision;
  reviewerNote?: string;
}

@Injectable()
export class RegistryWorkflowService {
  private readonly lock = new RequestLock();

  constructor(
    private readonly prisma: PrismaService,
    private readonly beneficiaries: BeneficiariesService,
    private readonly audit: AuditService,
  ) {}

  async submit(id: string, actor: AuthUser) {
    this.assertPermission('submit', actor);
    return this.lock.run(`submit:${id}`, () =>
      this.prisma.$transaction(async (tx) => {
        const row = await this.load(tx, id);
        const plan = this.plan(planTransition('submit', row.status as RegistryStatusCode));
        if (!plan.recordHistory) {
          return presentBeneficiary(row, this.options(actor));
        }
        const [addressCountWithArea, household, consent] = await Promise.all([
          tx.beneficiaryAddress.count({
            where: {
              beneficiaryId: id,
              province: { not: '' },
              district: { not: '' },
              subdistrict: { not: '' },
            },
          }),
          tx.household.findUnique({ where: { beneficiaryId: id }, select: { id: true } }),
          tx.consentRecord.findFirst({
            where: { beneficiaryId: id, accepted: true },
            select: { id: true },
          }),
        ]);
        const missing = missingSubmitFields({
          firstName: row.firstName,
          lastName: row.lastName,
          identityType: row.identityType,
          identityNumber: row.identityNumber,
          dateOfBirth: row.dateOfBirth,
          phone: row.phone,
          addressCountWithArea,
          hasHousehold: household !== null,
          hasAcceptedConsent: consent !== null,
        });
        if (missing.length > 0) {
          throw new AppException(
            HttpStatus.UNPROCESSABLE_ENTITY,
            'BUSINESS_RULE',
            'ข้อมูลยังไม่ครบสำหรับส่งตรวจ',
            missing,
          );
        }
        return this.changeStatus(tx, row, plan.to, 'ส่งตรวจสอบ', actor);
      }),
    );
  }

  async requestCorrection(id: string, reason: string, actor: AuthUser) {
    this.assertPermission('correction', actor);
    return this.lock.run(`correction:${id}`, () =>
      this.prisma.$transaction(async (tx) => {
        const row = await this.load(tx, id);
        const plan = this.plan(planTransition('correction', row.status as RegistryStatusCode));
        return this.changeStatus(tx, row, plan.to, reason, actor);
      }),
    );
  }

  async assess(id: string, input: AssessmentInput, actor: AuthUser) {
    this.assertPermission('assess', actor);
    return this.lock.run(`assess:${id}`, () =>
      this.prisma.$transaction(async (tx) => {
        const row = await this.load(tx, id);
        const plan = this.plan(planTransition('assess', row.status as RegistryStatusCode));
        const category = await tx.asnafCategory.findFirst({
          where: { id: input.categoryId, isActive: true },
        });
        if (category === null) {
          throw new AppException(
            HttpStatus.UNPROCESSABLE_ENTITY,
            'BUSINESS_RULE',
            'ไม่พบหมวดอัสนัฟที่เปิดใช้งาน',
          );
        }
        const decision = input.decision ?? 'PROPOSED';
        await tx.beneficiaryAsnafAssessment.create({
          data: {
            beneficiaryId: id,
            categoryId: category.id,
            rationale: input.rationale,
            supportingInfo: input.supportingInfo ?? null,
            recordedById: actor.id,
            assessedAt: new Date(),
            reviewedById: decision === 'PROPOSED' ? null : actor.id,
            decision,
            reviewerNote: input.reviewerNote ?? null,
          },
        });
        await this.audit.record(tx, {
          actorId: actor.id,
          action: 'ASNAF_ASSESSMENT',
          resourceType: 'beneficiary',
          resourceId: id,
          metadata: { decision, categoryCode: category.code },
        });
        if (plan.recordHistory) {
          return this.changeStatus(tx, row, plan.to, 'บันทึกการประเมิน', actor);
        }
        const fresh = await this.load(tx, id);
        return presentBeneficiary(fresh, this.options(actor));
      }),
    );
  }

  async approve(id: string, reason: string, actor: AuthUser) {
    this.assertPermission('approve', actor);
    return this.lock.run(`approve:${id}`, () =>
      this.prisma.$transaction(async (tx) => {
        const row = await this.load(tx, id);
        const plan = this.plan(planTransition('approve', row.status as RegistryStatusCode));
        const assessments = await tx.beneficiaryAsnafAssessment.count({
          where: { beneficiaryId: id },
        });
        if (assessments < 1) {
          throw new AppException(
            HttpStatus.UNPROCESSABLE_ENTITY,
            'BUSINESS_RULE',
            'ต้องมีการประเมินอัสนัฟก่อนยืนยันคุณสมบัติ',
          );
        }
        return this.changeStatus(tx, row, plan.to, reason, actor);
      }),
    );
  }

  async reject(id: string, reason: string, actor: AuthUser) {
    this.assertPermission('reject', actor);
    return this.lock.run(`reject:${id}`, () =>
      this.prisma.$transaction(async (tx) => {
        const row = await this.load(tx, id);
        const plan = this.plan(planTransition('reject', row.status as RegistryStatusCode));
        return this.changeStatus(tx, row, plan.to, reason, actor);
      }),
    );
  }

  async suspend(id: string, reason: string, actor: AuthUser) {
    this.assertPermission('suspend', actor);
    return this.lock.run(`suspend:${id}`, () =>
      this.prisma.$transaction(async (tx) => {
        const row = await this.load(tx, id);
        const plan = this.plan(planTransition('suspend', row.status as RegistryStatusCode));
        return this.changeStatus(tx, row, plan.to, reason, actor);
      }),
    );
  }

  async archive(id: string, reason: string, actor: AuthUser) {
    this.assertPermission('archive', actor);
    return this.lock.run(`archive:${id}`, () =>
      this.prisma.$transaction(async (tx) => {
        const row = await this.load(tx, id);
        const plan = this.plan(planTransition('archive', row.status as RegistryStatusCode));
        return this.changeStatus(tx, row, plan.to, reason, actor);
      }),
    );
  }

  async history(id: string) {
    await this.beneficiaries.requireRecord(id);
    const rows = await this.prisma.registryStatusHistory.findMany({
      where: { beneficiaryId: id },
      orderBy: { actedAt: 'desc' },
    });
    return rows.map((row) => ({
      id: row.id,
      fromStatus: row.fromStatus,
      toStatus: row.toStatus,
      reason: row.reason,
      actedById: row.actedById,
      actedAt: row.actedAt.toISOString(),
    }));
  }

  private plan(result: TransitionPlan | { error: string }): TransitionPlan {
    if ('error' in result) {
      throw new AppException(HttpStatus.CONFLICT, 'INVALID_STATE', result.error);
    }
    return result;
  }

  private async load(tx: Prisma.TransactionClient, id: string) {
    const row = await tx.beneficiary.findFirst({
      where: { id, deletedAt: null },
      include: beneficiaryInclude,
    });
    if (row === null) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'ไม่พบทะเบียน');
    }
    return row;
  }

  private async changeStatus(
    tx: Prisma.TransactionClient,
    row: { id: string; status: RegistryStatus },
    to: RegistryStatusCode,
    reason: string,
    actor: AuthUser,
  ) {
    const updated = await tx.beneficiary.update({
      where: { id: row.id },
      data: { status: to, updatedById: actor.id },
      include: beneficiaryInclude,
    });
    const actedAt = new Date();
    await tx.registryStatusHistory.create({
      data: {
        beneficiaryId: row.id,
        fromStatus: row.status,
        toStatus: to,
        reason,
        actedById: actor.id,
        actedAt,
      },
    });
    await this.audit.record(tx, {
      actorId: actor.id,
      action: 'REGISTRY_STATUS_CHANGE',
      resourceType: 'beneficiary',
      resourceId: row.id,
      metadata: { from: row.status, to, reason },
    });
    return presentBeneficiary(updated, this.options(actor));
  }

  private assertPermission(action: WorkflowAction, actor: AuthUser): void {
    const permission = workflowPermission(action);
    if (!actor.permissions.includes(permission)) {
      throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN', 'ไม่มีสิทธิ์ดำเนินการนี้');
    }
  }

  private options(actor: AuthUser) {
    return {
      revealIdentity: actor.permissions.includes('beneficiaries.read.sensitive'),
      revealAid: actor.permissions.includes('beneficiaries.aid.view'),
    };
  }
}
