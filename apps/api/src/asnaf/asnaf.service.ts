import { HttpStatus, Injectable } from '@nestjs/common';
import type { Prisma, RegistryStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { beneficiaryInclude } from '../beneficiaries/beneficiary.presenter';
import { BeneficiariesService } from '../beneficiaries/beneficiaries.service';
import { AppException } from '../common/app.exception';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import {
  allocateAssessmentNumber,
  buildMemberAssessmentSnapshot,
  deriveDecisionFromAssessment,
  normalizeEligibilityResult,
} from './assessment-snapshot';
import type {
  CreatePeriodicAssessmentDto,
  UpdatePeriodicAssessmentStatusDto,
} from './periodic-assessment.dto';
import type { ProposeAsnafDto } from './proposal.dto';

@Injectable()
export class AsnafService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly beneficiaries: BeneficiariesService,
    private readonly audit: AuditService,
  ) {}

  listActive() {
    return this.prisma.asnafCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, code: true, nameTh: true, sortOrder: true },
    });
  }

  async latestProposal(beneficiaryId: string, actor: AuthUser) {
    await this.beneficiaries.requireRecord(beneficiaryId);
    const row = await this.prisma.beneficiaryAsnafAssessment.findFirst({
      where: { beneficiaryId, decision: 'PROPOSED' },
      orderBy: { assessedAt: 'desc' },
      include: { category: true },
    });
    await this.audit.write({
      actorId: actor.id,
      action: 'ASNAF_PROPOSAL_VIEW',
      resourceType: 'beneficiary',
      resourceId: beneficiaryId,
      metadata: { present: row !== null },
    });
    return row === null ? null : this.toProposal(row);
  }

  async propose(beneficiaryId: string, input: ProposeAsnafDto, actor: AuthUser) {
    const beneficiary = await this.beneficiaries.requireRecord(beneficiaryId);
    this.beneficiaries.assertEditable(beneficiary.status);
    const category = await this.prisma.asnafCategory.findFirst({
      where: { id: input.categoryId, isActive: true },
    });
    if (category === null) {
      throw new AppException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'BUSINESS_RULE',
        'ไม่พบหมวดอัสนัฟที่เปิดใช้งาน',
      );
    }
    const now = new Date();
    const saved = await this.prisma.$transaction(async (tx) => {
      const assessmentNumber = await allocateAssessmentNumber(tx as any, now);
      const memberSnapshot = buildMemberAssessmentSnapshot(beneficiary as any, now);
      const createData: Prisma.BeneficiaryAsnafAssessmentUncheckedCreateInput = {
        beneficiaryId,
        categoryId: category.id,
        rationale: input.rationale,
        supportingInfo: input.supportingInfo ?? null,
        recordedById: actor.id,
        assessedAt: now,
        decision: 'PROPOSED',
        ...(assessmentNumber ? { assessmentNumber } : {}),
        ...(memberSnapshot ? { memberSnapshot } : {}),
      };
      const row = await tx.beneficiaryAsnafAssessment.create({
        data: createData,
        include: { category: true },
      });
      await this.audit.record(tx, {
        actorId: actor.id,
        action: 'ASNAF_PROPOSAL',
        resourceType: 'beneficiary',
        resourceId: beneficiaryId,
        metadata: { decision: 'PROPOSED', categoryCode: category.code },
      });
      return row;
    });
    return this.toProposal(saved);
  }

  async listAssessments(beneficiaryId: string, actor: AuthUser) {
    const beneficiary = await this.beneficiaries.requireRecord(beneficiaryId);
    const rows = await this.prisma.beneficiaryAsnafAssessment.findMany({
      where: { beneficiaryId },
      orderBy: [{ assessedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        category: true,
        recordedBy: { select: { id: true, displayName: true, email: true } },
        reviewedBy: { select: { id: true, displayName: true, email: true } },
        _count: { select: { applications: true } },
      },
    });

    await this.audit.write({
      actorId: actor.id,
      action: 'BENEFICIARY_ASSESSMENTS_VIEW',
      resourceType: 'beneficiary',
      resourceId: beneficiaryId,
      metadata: { count: rows.length, memberId: beneficiary.memberId ?? null },
    });

    return {
      beneficiaryId: beneficiary.id,
      memberId: beneficiary.memberId ?? null,
      memberStatus: (beneficiary as any).memberStatus ?? 'ACTIVE',
      registryStatus: beneficiary.status,
      total: rows.length,
      items: rows.map((row) => this.presentAssessment(row, beneficiary.memberId ?? null)),
    };
  }

  async createPeriodicAssessment(
    beneficiaryId: string,
    input: CreatePeriodicAssessmentDto,
    actor: AuthUser,
  ) {
    this.assertCanAssess(actor);
    const beneficiary = await this.beneficiaries.requireRecord(beneficiaryId);
    this.beneficiaries.assertEditable(beneficiary.status);
    if ((beneficiary as any).memberStatus === 'ARCHIVED') {
      throw new AppException(
        HttpStatus.CONFLICT,
        'INVALID_STATE',
        'สมาชิกที่ถูกเก็บถาวรไม่สามารถประเมินสิทธิ์ใหม่ได้',
      );
    }

    const category = await this.resolveAsnafCategory(
      input.categoryId,
      input.asnafCode,
      beneficiaryId,
    );

    const assessedAt = resolveAssessedAt(input.assessmentDate);
    if (Number.isNaN(assessedAt.getTime())) {
      throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'วันที่ประเมินไม่ถูกต้อง');
    }

    const nextAssessmentDate = input.nextAssessmentDate
      ? new Date(`${input.nextAssessmentDate}T00:00:00.000Z`)
      : null;
    if (nextAssessmentDate && Number.isNaN(nextAssessmentDate.getTime())) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'วันนัดประเมินรอบถัดไปไม่ถูกต้อง',
      );
    }

    const requestedStatus = (
      input.status ||
      (input.eligibilityResult === 'ELIGIBLE'
        ? 'ELIGIBLE'
        : input.eligibilityResult === 'NOT_ELIGIBLE'
          ? 'NOT_ELIGIBLE'
          : 'UNDER_REVIEW')
    ).toUpperCase();

    const eligibilityResult = normalizeEligibilityResult(requestedStatus, input.eligibilityResult);
    const decision = deriveDecisionFromAssessment(requestedStatus, eligibilityResult);
    const isFinalDecision =
      requestedStatus === 'ELIGIBLE' ||
      requestedStatus === 'APPROVED' ||
      requestedStatus === 'NOT_ELIGIBLE';

    const created = await this.prisma.$transaction(async (tx) => {
      const freshBeneficiary = tx.beneficiary?.findFirst
        ? ((await tx.beneficiary.findFirst({
            where: { id: beneficiaryId, deletedAt: null },
            include: beneficiaryInclude,
          })) ?? beneficiary)
        : beneficiary;

      const priorCount = tx.beneficiaryAsnafAssessment?.count
        ? await tx.beneficiaryAsnafAssessment.count({ where: { beneficiaryId } })
        : 0;

      const assessmentType = (
        input.assessmentType || (priorCount === 0 ? 'INITIAL' : 'PERIODIC')
      ).toUpperCase();

      const buddhistYear = assessedAt.getFullYear() + 543;
      const assessmentPeriod =
        input.assessmentPeriod?.trim() ||
        (assessmentType === 'INITIAL'
          ? `ประจำปี ${buddhistYear} (ขึ้นทะเบียนครั้งแรก)`
          : `ประจำปี ${buddhistYear} รอบที่ ${priorCount + 1}`);

      const assessmentNumber = await allocateAssessmentNumber(tx as any, assessedAt);
      const memberSnapshot = buildMemberAssessmentSnapshot(freshBeneficiary as any, assessedAt);

      const row = await tx.beneficiaryAsnafAssessment.create({
        data: {
          assessmentNumber: assessmentNumber ?? null,
          beneficiaryId,
          categoryId: category.id,
          assessmentPeriod,
          assessmentType,
          assessmentDetails: input.assessmentDetails?.trim() || null,
          eligibilityResult,
          rationale: input.rationale.trim(),
          recommendations: input.recommendations?.trim() || null,
          supportingInfo: input.supportingInfo?.trim() || null,
          nextAssessmentDate,
          status: requestedStatus,
          recordedById: actor.id,
          assessedAt,
          reviewedById: isFinalDecision ? actor.id : null,
          approvedAt:
            requestedStatus === 'APPROVED' || requestedStatus === 'ELIGIBLE' ? assessedAt : null,
          decision,
          checklist: (input.checklist as Prisma.InputJsonValue) ?? undefined,
          memberSnapshot: memberSnapshot ?? undefined,
        },
        include: {
          category: true,
          recordedBy: { select: { id: true, displayName: true, email: true } },
          reviewedBy: { select: { id: true, displayName: true, email: true } },
          _count: { select: { applications: true } },
        },
      });

      const targetRegistryStatus = this.mapAssessmentToRegistryStatus(requestedStatus);
      if (
        targetRegistryStatus &&
        targetRegistryStatus !== freshBeneficiary.status &&
        tx.beneficiary?.update
      ) {
        await tx.beneficiary.update({
          where: { id: beneficiaryId },
          data: {
            status: targetRegistryStatus,
            updatedById: actor.id,
          },
        });
        if (tx.registryStatusHistory?.create) {
          await tx.registryStatusHistory.create({
            data: {
              beneficiaryId,
              fromStatus: freshBeneficiary.status,
              toStatus: targetRegistryStatus,
              reason: `[ประเมินสิทธิ์ ${assessmentNumber ?? row.id}] ${input.rationale.trim().slice(0, 200)}`,
              actedById: actor.id,
            },
          });
        }
      }

      await this.audit.record(tx, {
        actorId: actor.id,
        action: 'BENEFICIARY_PERIODIC_ASSESSMENT_CREATE',
        resourceType: 'beneficiary_assessment',
        resourceId: row.id,
        metadata: {
          beneficiaryId,
          memberId: freshBeneficiary.memberId ?? null,
          assessmentNumber: row.assessmentNumber,
          assessmentType,
          assessmentPeriod,
          status: requestedStatus,
          eligibilityResult,
          categoryCode: category.code,
        },
      });

      return { row, memberId: freshBeneficiary.memberId ?? null };
    });

    return this.presentAssessment(created.row, created.memberId);
  }

  async updateAssessmentStatus(
    beneficiaryId: string,
    assessmentId: string,
    input: UpdatePeriodicAssessmentStatusDto,
    actor: AuthUser,
  ) {
    this.assertCanReviewAssessment(actor, input.status);
    const beneficiary = await this.beneficiaries.requireRecord(beneficiaryId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.beneficiaryAsnafAssessment.findFirst({
        where: { id: assessmentId, beneficiaryId },
      });
      if (!existing) {
        throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'ไม่พบรายการประเมินสิทธิ์');
      }

      const nextStatus = input.status.toUpperCase();
      const eligibilityResult = normalizeEligibilityResult(
        nextStatus,
        input.eligibilityResult ?? existing.eligibilityResult,
      );
      const decision = deriveDecisionFromAssessment(nextStatus, eligibilityResult);
      const nextDate = input.nextAssessmentDate
        ? new Date(`${input.nextAssessmentDate}T00:00:00.000Z`)
        : existing.nextAssessmentDate;

      // Never overwrite memberSnapshot when updating assessment status!
      const row = await tx.beneficiaryAsnafAssessment.update({
        where: { id: assessmentId },
        data: {
          status: nextStatus,
          eligibilityResult,
          decision,
          reviewerNote:
            input.reviewerNote !== undefined ? input.reviewerNote.trim() || null : existing.reviewerNote,
          recommendations:
            input.recommendations !== undefined
              ? input.recommendations.trim() || null
              : existing.recommendations,
          nextAssessmentDate: nextDate,
          reviewedById: actor.id,
          approvedAt:
            nextStatus === 'APPROVED' || nextStatus === 'ELIGIBLE'
              ? existing.approvedAt ?? new Date()
              : existing.approvedAt,
        },
        include: {
          category: true,
          recordedBy: { select: { id: true, displayName: true, email: true } },
          reviewedBy: { select: { id: true, displayName: true, email: true } },
          _count: { select: { applications: true } },
        },
      });

      const latest = await tx.beneficiaryAsnafAssessment.findFirst({
        where: { beneficiaryId },
        orderBy: [{ assessedAt: 'desc' }, { createdAt: 'desc' }],
        select: { id: true },
      });
      const targetRegistryStatus = this.mapAssessmentToRegistryStatus(nextStatus);
      if (latest?.id === assessmentId && targetRegistryStatus && targetRegistryStatus !== beneficiary.status) {
        await tx.beneficiary.update({
          where: { id: beneficiaryId },
          data: { status: targetRegistryStatus, updatedById: actor.id },
        });
        await tx.registryStatusHistory.create({
          data: {
            beneficiaryId,
            fromStatus: beneficiary.status,
            toStatus: targetRegistryStatus,
            reason: `[ปรับสถานะผลประเมิน ${row.assessmentNumber ?? row.id}] ${input.reviewerNote?.trim() || nextStatus}`,
            actedById: actor.id,
          },
        });
      }

      await this.audit.record(tx, {
        actorId: actor.id,
        action: 'BENEFICIARY_ASSESSMENT_STATUS_UPDATE',
        resourceType: 'beneficiary_assessment',
        resourceId: row.id,
        metadata: {
          beneficiaryId,
          memberId: beneficiary.memberId ?? null,
          assessmentNumber: row.assessmentNumber,
          fromStatus: existing.status,
          toStatus: nextStatus,
          eligibilityResult,
        },
      });

      return row;
    });

    return this.presentAssessment(updated, beneficiary.memberId ?? null);
  }

  private async resolveAsnafCategory(
    categoryId?: string,
    asnafCode?: string,
    beneficiaryId?: string,
  ) {
    if (categoryId) {
      const byId = await this.prisma.asnafCategory.findFirst({
        where: { id: categoryId, isActive: true },
      });
      if (byId) return byId;
    }
    if (asnafCode && asnafCode.trim()) {
      const normalized = asnafCode.trim();
      const byCode = await this.prisma.asnafCategory.findFirst({
        where: {
          code: { equals: normalized, mode: 'insensitive' },
          isActive: true,
        },
      });
      if (byCode) return byCode;
    }
    if (beneficiaryId) {
      const prev = await this.prisma.beneficiaryAsnafAssessment.findFirst({
        where: { beneficiaryId },
        orderBy: { assessedAt: 'desc' },
        include: { category: true },
      });
      if (prev?.category?.isActive) return prev.category;
    }
    const fallback = await this.prisma.asnafCategory.findFirst({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (!fallback) {
      throw new AppException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'BUSINESS_RULE',
        'ไม่พบหมวดอัสนัฟที่เปิดใช้งานในระบบ',
      );
    }
    return fallback;
  }

  private mapAssessmentToRegistryStatus(assessmentStatus: string): RegistryStatus | null {
    switch (assessmentStatus.toUpperCase()) {
      case 'ELIGIBLE':
      case 'APPROVED':
        return 'QUALIFIED';
      case 'NOT_ELIGIBLE':
        return 'NOT_QUALIFIED';
      case 'RETURNED_FOR_CORRECTION':
        return 'DRAFT';
      case 'PENDING_ASSESSMENT':
      case 'UNDER_REVIEW':
        return 'UNDER_REVIEW';
      default:
        return null;
    }
  }

  private assertCanAssess(actor: AuthUser) {
    const allowedPerms = [
      'beneficiaries.assess',
      'assessment.perform',
      'beneficiaries.write',
      'beneficiaries.update',
      'beneficiaries.decide',
      'asnaf.propose',
    ];
    const hasPerm = actor.permissions.some((p) => allowedPerms.includes(p));
    const hasAdminRole = actor.roles.some((r) =>
      ['SUPER_ADMIN', 'ADMIN'].includes((r.code || '').toUpperCase()),
    );
    if (!hasPerm && !hasAdminRole) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'ไม่มีสิทธิ์บันทึกผลการประเมินสิทธิ์',
      );
    }
  }

  private assertCanReviewAssessment(actor: AuthUser, status: string) {
    if (status.toUpperCase() === 'APPROVED') {
      const approvePerms = [
        'beneficiaries.decide',
        'beneficiaries.approve',
        'approvals.approve',
        'beneficiaries.assess',
      ];
      const canApprove =
        actor.permissions.some((p) => approvePerms.includes(p)) ||
        actor.roles.some((r) =>
          ['SUPER_ADMIN', 'ADMIN', 'COMMITTEE', 'EXECUTIVE'].includes(
            (r.code || '').toUpperCase(),
          ),
        );
      if (!canApprove) {
        throw new AppException(
          HttpStatus.FORBIDDEN,
          'FORBIDDEN',
          'ไม่มีสิทธิ์อนุมัติผลการประเมินสิทธิ์',
        );
      }
      return;
    }
    this.assertCanAssess(actor);
  }

  private presentAssessment(row: any, memberId: string | null) {
    return {
      id: row.id,
      assessmentNumber: row.assessmentNumber ?? null,
      beneficiaryId: row.beneficiaryId,
      memberId,
      assessmentDate: row.assessedAt instanceof Date ? row.assessedAt.toISOString() : row.assessedAt,
      assessmentPeriod: row.assessmentPeriod ?? null,
      assessmentType: row.assessmentType ?? 'INITIAL',
      assessmentDetails: row.assessmentDetails ?? null,
      asnaf: row.category
        ? {
            id: row.category.id,
            code: row.category.code,
            nameTh: row.category.nameTh,
          }
        : null,
      eligibilityResult:
        row.eligibilityResult ??
        normalizeEligibilityResult(row.status ?? 'PENDING_ASSESSMENT', null),
      reason: row.rationale,
      rationale: row.rationale,
      recommendations: row.recommendations ?? null,
      supportingInfo: row.supportingInfo ?? null,
      nextAssessmentDate:
        row.nextAssessmentDate instanceof Date
          ? row.nextAssessmentDate.toISOString().slice(0, 10)
          : row.nextAssessmentDate ?? null,
      status: row.status ?? 'PENDING_ASSESSMENT',
      decision: row.decision,
      assessorId: row.recordedById ?? null,
      assessorName: row.recordedBy?.displayName || row.recordedBy?.email || null,
      approvedBy: row.reviewedById ?? null,
      approvedByName: row.reviewedBy?.displayName || row.reviewedBy?.email || null,
      approvedAt: row.approvedAt instanceof Date ? row.approvedAt.toISOString() : row.approvedAt ?? null,
      reviewerNote: row.reviewerNote ?? null,
      checklist: row.checklist ?? null,
      memberSnapshot: row.memberSnapshot ?? null,
      linkedRequestCount: row._count?.applications ?? 0,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    };
  }

  private toProposal(row: {
    id: string;
    categoryId: string;
    rationale: string;
    supportingInfo: string | null;
    decision: string;
    assessedAt: Date;
    category: { nameTh: string; code: string };
  }) {
    return {
      id: row.id,
      categoryId: row.categoryId,
      categoryCode: row.category.code,
      categoryNameTh: row.category.nameTh,
      rationale: row.rationale,
      supportingInfo: row.supportingInfo,
      decision: 'PROPOSED' as const,
      assessedAt: row.assessedAt.toISOString(),
    };
  }
}

function resolveAssessedAt(raw?: string): Date {
  const now = new Date();
  if (!raw || !raw.trim()) return now;
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const todayUtc = now.toISOString().slice(0, 10);
    const todayLocal = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    if (trimmed === todayUtc || trimmed === todayLocal) {
      return now;
    }
    const timeSuffix = now.toISOString().slice(10);
    return new Date(`${trimmed}${timeSuffix}`);
  }
  return new Date(trimmed);
}
