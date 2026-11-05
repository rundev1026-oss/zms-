import { HttpStatus, Injectable } from '@nestjs/common';
import type { Prisma, RegistryStatus } from '@prisma/client';
import { formatPersonName, type RegistryStatusCode } from '@zms/shared';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/app.exception';
import type { AuthUser } from '../common/auth-user';
import { pageWindow } from '../common/pagination';
import { isUniqueConflict } from '../common/prisma-error';
import { PrismaService } from '../prisma/prisma.service';
import { canReviseRegistry, revisionRequiresReview } from '../registry-workflow/registry-rules';
import { verifyPassword } from '../security/password-hash';
import {
  buildBeneficiaryOrder,
  buildBeneficiaryWhere,
  buildDeletedBeneficiaryWhere,
  summaryFilters,
  toStatusSummary,
} from './beneficiary-query';
import { readDateOfBirth, readIdentity } from './beneficiary-fields';
import { isValidThaiNationalId } from './identity';
import {
  beneficiaryInclude,
  presentBeneficiary,
  type BeneficiaryView,
} from './beneficiary.presenter';
import { maskIdentityNumber } from './mask-identity';
import type {
  SoftDeleteBeneficiaryDto,
  RestoreBeneficiaryDto,
  QueryDeletedBeneficiariesDto,
} from './dto/soft-delete.dto';

export interface BeneficiaryWriteInput {
  title?: string | null;
  firstName?: string;
  lastName?: string;
  identityType?: 'THAI_NATIONAL_ID' | 'OTHER';
  identityNumber?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  occupation?: string | null;
  maritalStatus?: string | null;
  registrationNote?: string | null;
}

export interface BeneficiaryListQuery {
  page: number;
  pageSize: number;
  q?: string;
  status?: RegistryStatus;
  asnafCategoryId?: string;
  province?: string;
  sort?: string;
}

@Injectable()
export class BeneficiariesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(input: BeneficiaryWriteInput, actor: AuthUser): Promise<BeneficiaryView> {
    if (
      input.firstName === undefined ||
      input.lastName === undefined ||
      input.identityType === undefined
    ) {
      throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'ข้อมูลไม่ถูกต้อง');
    }
    const identity = readIdentity(input.identityType, input.identityNumber);
    const dateOfBirth = readDateOfBirth(input.dateOfBirth);
    const year = new Date().getFullYear();

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const counter = await tx.registryCounter.upsert({
          where: { year },
          create: { year, lastValue: 1 },
          update: { lastValue: { increment: 1 } },
        });
        const registryNumber = `ZMS-${year}-${String(counter.lastValue).padStart(6, '0')}`;
        const memberCounter = await tx.memberCounter.upsert({
          where: { year },
          create: { year, lastValue: 1 },
          update: { lastValue: { increment: 1 } },
        });
        const memberId = `MB-${year}-${String(memberCounter.lastValue).padStart(6, '0')}`;
        const row = await tx.beneficiary.create({
          data: {
            registryNumber,
            memberId,
            memberStatus: 'ACTIVE',
            status: 'DRAFT',
            title: input.title ?? null,
            firstName: input.firstName!,
            lastName: input.lastName!,
            identityType: input.identityType!,
            identityNumber: identity.identityNumber,
            identityNumberNormalized: identity.identityNumberNormalized,
            dateOfBirth,
            phone: input.phone ?? null,
            occupation: input.occupation ?? null,
            maritalStatus: input.maritalStatus ?? null,
            registrationNote: input.registrationNote ?? null,
            createdById: actor.id,
            updatedById: actor.id,
          },
          include: beneficiaryInclude,
        });
        await tx.registryStatusHistory.create({
          data: {
            beneficiaryId: row.id,
            fromStatus: null,
            toStatus: 'DRAFT',
            reason: 'สร้างร่าง',
            actedById: actor.id,
          },
        });
        await this.audit.record(tx, {
          actorId: actor.id,
          action: 'BENEFICIARY_CREATE',
          resourceType: 'beneficiary',
          resourceId: row.id,
          metadata: { memberId, registryNumber },
        });
        return row;
      });
      return presentBeneficiary(created, this.viewOptions(actor));
    } catch (error) {
      const target = isUniqueConflict(error);
      if (target === null) {
        throw error;
      }
      if (target.includes('registry')) {
        throw new AppException(
          HttpStatus.CONFLICT,
          'CONFLICT',
          'ไม่สามารถออกเลขทะเบียนได้ กรุณาลองอีกครั้ง',
        );
      }
      throw await this.duplicateIdentityConflict(identity.identityNumberNormalized);
    }
  }

  async list(query: BeneficiaryListQuery, actor: AuthUser) {
    const where = buildBeneficiaryWhere(query);
    const orderBy = buildBeneficiaryOrder(query.sort);
    const { skip, take } = pageWindow(query.page, query.pageSize);
    const [rows, total] = await Promise.all([
      this.prisma.beneficiary.findMany({ where, orderBy, skip, take, include: beneficiaryInclude }),
      this.prisma.beneficiary.count({ where }),
    ]);
    return {
      items: rows.map((row) => presentBeneficiary(row, this.viewOptions(actor))),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async summary(query: Pick<BeneficiaryListQuery, 'q' | 'asnafCategoryId' | 'province'>) {
    const where = buildBeneficiaryWhere(summaryFilters(query));
    const groups = await this.prisma.beneficiary.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });
    return toStatusSummary(
      groups.map((group) => ({ status: group.status, count: group._count._all })),
    );
  }

  async getById(id: string, actor: AuthUser): Promise<BeneficiaryView> {
    const row = await this.requireRecord(id);
    await this.audit.write({
      actorId: actor.id,
      action: 'BENEFICIARY_VIEW',
      resourceType: 'beneficiary',
      resourceId: id,
      metadata: { sensitive: actor.permissions.includes('beneficiaries.read.sensitive') },
    });
    return presentBeneficiary(row, this.viewOptions(actor));
  }

  async update(
    id: string,
    input: BeneficiaryWriteInput,
    actor: AuthUser,
  ): Promise<BeneficiaryView> {
    if (Object.values(input).every((value) => value === undefined)) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'ไม่มีข้อมูลที่ต้องการแก้ไข',
      );
    }
    const existing = await this.requireRecord(id);
    this.assertEditable(existing.status);
    const identityType = input.identityType ?? existing.identityType;
    const identity =
      input.identityNumber !== undefined || input.identityType !== undefined
        ? readIdentity(identityType, input.identityNumber ?? existing.identityNumber)
        : null;
    const dateOfBirth =
      input.dateOfBirth !== undefined ? readDateOfBirth(input.dateOfBirth) : undefined;

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const row = await tx.beneficiary.update({
          where: { id },
          data: {
            title: input.title,
            firstName: input.firstName,
            lastName: input.lastName,
            identityType: input.identityType,
            identityNumber: identity?.identityNumber,
            identityNumberNormalized: identity?.identityNumberNormalized,
            dateOfBirth,
            phone: input.phone,
            occupation: input.occupation,
            maritalStatus: input.maritalStatus,
            registrationNote: input.registrationNote,
            updatedById: actor.id,
          },
          include: beneficiaryInclude,
        });
        await this.audit.record(tx, {
          actorId: actor.id,
          action: 'BENEFICIARY_UPDATE',
          resourceType: 'beneficiary',
          resourceId: id,
          metadata: { status: row.status },
        });
        return row;
      });
      return presentBeneficiary(updated, this.viewOptions(actor));
    } catch (error) {
      if (isUniqueConflict(error) !== null) {
        throw await this.duplicateIdentityConflict(
          identity?.identityNumberNormalized ?? existing.identityNumberNormalized,
        );
      }
      throw error;
    }
  }

  async addConsent(
    id: string,
    input: {
      consentTextVersion: string;
      privacyNoticeVersion: string;
      accepted: boolean;
      channel?: string;
    },
    actor: AuthUser,
  ): Promise<{ id: string; accepted: boolean; recordedAt: string }> {
    const existing = await this.requireRecord(id);
    this.assertEditable(existing.status);
    const row = await this.prisma.$transaction(async (tx) => {
      const consent = await tx.consentRecord.create({
        data: {
          beneficiaryId: id,
          consentTextVersion: input.consentTextVersion,
          privacyNoticeVersion: input.privacyNoticeVersion,
          accepted: input.accepted,
          channel: input.channel ?? null,
          recordedById: actor.id,
        },
      });
      await this.audit.record(tx, {
        actorId: actor.id,
        action: 'CONSENT_RECORDED',
        resourceType: 'beneficiary',
        resourceId: id,
        metadata: { accepted: input.accepted, consentTextVersion: input.consentTextVersion },
      });
      return consent;
    });
    return { id: row.id, accepted: row.accepted, recordedAt: row.recordedAt.toISOString() };
  }

  async latestConsent(id: string, actor: AuthUser) {
    await this.requireRecord(id);
    const row = await this.prisma.consentRecord.findFirst({
      where: { beneficiaryId: id },
      orderBy: { recordedAt: 'desc' },
    });
    await this.audit.write({
      actorId: actor.id,
      action: 'CONSENT_VIEW',
      resourceType: 'beneficiary',
      resourceId: id,
      metadata: { present: row !== null },
    });
    if (row === null) {
      return null;
    }
    return {
      id: row.id,
      accepted: row.accepted,
      consentTextVersion: row.consentTextVersion,
      privacyNoticeVersion: row.privacyNoticeVersion,
      recordedAt: row.recordedAt.toISOString(),
    };
  }

  async recordSurveyPrint(id: string, actor: AuthUser) {
    const row = await this.requireRecord(id);
    await this.audit.write({
      actorId: actor.id,
      action: 'REGISTRY_SURVEY_PRINT',
      resourceType: 'beneficiary',
      resourceId: row.id,
      metadata: { registryNumber: row.registryNumber },
    });
    return { recorded: true, registryNumber: row.registryNumber };
  }

  async requireRecord(id: string) {
    const row = await this.prisma.beneficiary.findFirst({
      where: { id, deletedAt: null },
      include: beneficiaryInclude,
    });
    if (row === null) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'ไม่พบทะเบียน');
    }
    if (!row.memberId) {
      const year = row.createdAt ? new Date(row.createdAt).getFullYear() : new Date().getFullYear();
      const memberCounter = await this.prisma.memberCounter.upsert({
        where: { year },
        create: { year, lastValue: 1 },
        update: { lastValue: { increment: 1 } },
      });
      const memberId = `MB-${year}-${String(memberCounter.lastValue).padStart(6, '0')}`;
      await this.prisma.$executeRaw`UPDATE "beneficiaries" SET "member_id" = ${memberId} WHERE "id" = ${row.id}::uuid AND "member_id" IS NULL`;
      row.memberId = memberId;
      return row;
    }
    return row;
  }

  assertEditable(status: RegistryStatus): void {
    if (!canReviseRegistry(status as RegistryStatusCode)) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'INVALID_STATE',
        'ทะเบียนที่เก็บถาวรแล้วแก้ไขไม่ได้',
      );
    }
  }

  /**
   * Preview linked records and check active workflow blockers before soft deleting
   */
  async getDeletePreview(id: string, _actor: AuthUser) {
    const row = await this.prisma.beneficiary.findUnique({
      where: { id },
      include: {
        household: { include: { members: true } },
        applications: true,
        disbursementItems: true,
        documents: { where: { deletedAt: null } },
        followUpRecords: true,
      },
    });

    if (!row) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'ไม่พบทะเบียนผู้มีสิทธิ์รับซะกาต');
    }

    if (row.deletedAt !== null) {
      throw new AppException(HttpStatus.BAD_REQUEST, 'ALREADY_DELETED', 'ทะเบียนนี้อยู่ในสถานะถูกจำหน่าย/ลบแล้ว');
    }

    const blockers: string[] = [];

    // Check active assistance applications
    const activeAppStatuses = ['draft', 'submitted', 'under_review', 'pending_approval', 'approved', 'pending_disbursement'];
    const activeApps = row.applications.filter((a) =>
      activeAppStatuses.includes((a.status || '').toLowerCase()),
    );
    if (activeApps.length > 0) {
      const statuses = [...new Set(activeApps.map((a) => a.status))].join(', ');
      blockers.push(`มีคำขอความช่วยเหลือที่อยู่ระหว่างดำเนินการ ${activeApps.length} รายการ (สถานะ: ${statuses})`);
    }

    // Check active disbursements
    const activeDisbursements = row.disbursementItems.filter((d) =>
      ['draft', 'pending'].includes((d.status || '').toLowerCase()),
    );
    if (activeDisbursements.length > 0) {
      blockers.push(`มีรายการเบิกจ่ายเงินสดที่อยู่ระหว่างดำเนินการ ${activeDisbursements.length} รายการ`);
    }

    const completedAidCount = row.applications.filter((a) =>
      ['completed', 'disbursed'].includes((a.status || '').toLowerCase()),
    ).length;

    return {
      canDelete: blockers.length === 0,
      blockers,
      summary: {
        id: row.id,
        registryNumber: row.registryNumber,
        fullName: formatPersonName({ prefix: row.title, firstName: row.firstName, lastName: row.lastName }),
        identityType: row.identityType,
        identityNumberMasked: maskIdentityNumber(row.identityNumber),
        status: row.status,
        phone: row.phone,
        createdAt: row.createdAt.toISOString(),
        counts: {
          applications: row.applications.length,
          activeApplications: activeApps.length,
          completedAid: completedAidCount,
          disbursements: row.disbursementItems.length,
          followups: row.followUpRecords.length,
          documents: row.documents.length,
          householdMembers: row.household?.members?.length ?? 0,
        },
      },
    };
  }

  /**
   * Super Admin Soft Delete Beneficiary
   */
  async softDelete(id: string, dto: SoftDeleteBeneficiaryDto, actor: AuthUser, ip?: string) {
    const preview = await this.getDeletePreview(id, actor);
    if (!preview.canDelete) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'ACTIVE_WORKFLOW_EXISTS',
        `ไม่สามารถลบทะเบียนได้เนื่องจากมีกระบวนการค้างอยู่: ${preview.blockers.join('; ')}`,
      );
    }

    // If password confirmation is provided, verify it
    if (dto.passwordConfirm) {
      const user = await this.prisma.user.findUnique({ where: { id: actor.id } });
      if (!user || !verifyPassword(dto.passwordConfirm, user.passwordHash)) {
        throw new AppException(HttpStatus.BAD_REQUEST, 'INVALID_PASSWORD', 'รหัสผ่านยืนยันไม่ถูกต้อง');
      }
    }

    const deleted = await this.prisma.$transaction(async (tx) => {
      const row = await tx.beneficiary.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedById: actor.id,
          deletionReason: dto.reason,
          deletionReference: dto.reference ?? null,
          deletionStatus: true,
          updatedById: actor.id,
        },
        include: beneficiaryInclude,
      });

      await tx.registryStatusHistory.create({
        data: {
          beneficiaryId: id,
          fromStatus: row.status,
          toStatus: row.status,
          reason: `[จำหน่าย/ลบข้อมูลทะเบียน] ${dto.reason}${dto.reference ? ` (อ้างอิง: ${dto.reference})` : ''}`,
          actedById: actor.id,
        },
      });

      await this.audit.record(tx, {
        actorId: actor.id,
        action: 'BENEFICIARY_SOFT_DELETE',
        resourceType: 'beneficiary',
        resourceId: id,
        metadata: {
          registryNumber: row.registryNumber,
          reason: dto.reason,
          reference: dto.reference ?? null,
          status: row.status,
          deletedBy: actor.displayName,
          ipAddress: ip ?? null,
        },
      });

      return row;
    });

    return presentBeneficiary(deleted, this.viewOptions(actor));
  }

  /**
   * List soft-deleted beneficiaries (Super Admin only)
   */
  async listDeleted(query: QueryDeletedBeneficiariesDto, actor: AuthUser) {
    const where = buildDeletedBeneficiaryWhere(query);
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(query.pageSize) || 20));
    const { skip, take } = pageWindow(page, pageSize);

    const [rows, total] = await Promise.all([
      this.prisma.beneficiary.findMany({
        where,
        orderBy: { deletedAt: 'desc' },
        skip,
        take,
        include: {
          ...beneficiaryInclude,
          _count: {
            select: {
              assessments: true,
              applications: true,
              disbursementItems: true,
              followUpRecords: true,
              documents: true,
            },
          },
        },
      }),
      this.prisma.beneficiary.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        ...presentBeneficiary(row, this.viewOptions(actor)),
        counts: row._count,
      })),
      page,
      pageSize,
      total,
    };
  }

  /**
   * Super Admin Restore Beneficiary
   */
  async restore(id: string, dto: RestoreBeneficiaryDto, actor: AuthUser, ip?: string) {
    const existing = await this.prisma.beneficiary.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'ไม่พบทะเบียน');
    }

    if (existing.deletedAt === null) {
      throw new AppException(HttpStatus.BAD_REQUEST, 'NOT_DELETED', 'ทะเบียนนี้ไม่ได้อยู่ในสถานะถูกจำหน่าย/ลบ');
    }

    // Check unique conflict for Thai national ID among currently active records
    if (existing.identityType === 'THAI_NATIONAL_ID' && existing.identityNumberNormalized) {
      const activeCollision = await this.prisma.beneficiary.findFirst({
        where: {
          identityType: 'THAI_NATIONAL_ID',
          identityNumberNormalized: existing.identityNumberNormalized,
          deletedAt: null,
          id: { not: id },
        },
      });

      if (activeCollision) {
        throw new AppException(
          HttpStatus.CONFLICT,
          'DUPLICATE_IDENTITY',
          `ไม่สามารถกู้คืนได้ เนื่องจากมีทะเบียน ${activeCollision.registryNumber} ใช้งานเลขประจำตัวประชาชนนี้อยู่แล้ว`,
        );
      }
    }

    const restored = await this.prisma.$transaction(async (tx) => {
      const row = await tx.beneficiary.update({
        where: { id },
        data: {
          deletedAt: null,
          deletedById: null,
          deletionReason: null,
          deletionReference: null,
          deletionStatus: false,
          updatedById: actor.id,
        },
        include: beneficiaryInclude,
      });

      await tx.registryStatusHistory.create({
        data: {
          beneficiaryId: id,
          fromStatus: row.status,
          toStatus: row.status,
          reason: `[กู้คืนทะเบียน] ${dto.reason}${dto.reference ? ` (อ้างอิง: ${dto.reference})` : ''}`,
          actedById: actor.id,
        },
      });

      await this.audit.record(tx, {
        actorId: actor.id,
        action: 'BENEFICIARY_RESTORE',
        resourceType: 'beneficiary',
        resourceId: id,
        metadata: {
          registryNumber: row.registryNumber,
          reason: dto.reason,
          reference: dto.reference ?? null,
          status: row.status,
          restoredBy: actor.displayName,
          ipAddress: ip ?? null,
        },
      });

      return row;
    });

    return presentBeneficiary(restored, this.viewOptions(actor));
  }

  async recordRevision(
    id: string,
    input: {
      expectedUpdatedAt: string;
      reason?: string;
      ipAddress?: string;
      changes: { field: string; fieldLabel: string; oldValue?: string; newValue?: string; material?: boolean }[];
    },
    actor: AuthUser,
  ) {
    const existing = await this.requireRecord(id);
    this.assertEditable(existing.status);
    const baseline = existing.updatedAt.toISOString();
    if (input.expectedUpdatedAt && input.expectedUpdatedAt !== baseline) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'VERSION_CONFLICT',
        'มีผู้อื่นบันทึกทะเบียนนี้ไปแล้ว กรุณาโหลดข้อมูลล่าสุดก่อนแก้ไขอีกครั้ง',
      );
    }
    const materialFields = new Set([
      'address',
      'province',
      'district',
      'subdistrict',
      'community',
      'housingType',
      'housingCondition',
      'monthlyIncome',
      'monthlyExpense',
      'debtAmount',
      'debtMonthlyPayment',
      'debtType',
      'creditorName',
      'disabilityNotes',
      'illnessNotes',
      'livingLimitations',
      'urgentNeeds',
      'dependentBurdens',
      'hardshipReasons',
      'asnafCategory',
      'nationalId',
      'householdMembers',
      'householdMemberNames',
      'incomeBreakdown',
      'expenseBreakdown',
    ]);
    const material = input.changes.some(
      (change) =>
        change.material === true ||
        materialFields.has(change.field) ||
        change.field.startsWith('incomeBreakdown') ||
        change.field.startsWith('expenseBreakdown') ||
        change.field.startsWith('householdMember'),
    );
    const sendBack = revisionRequiresReview(existing.status as RegistryStatusCode) && material;
    if (sendBack && (input.reason ?? '').trim().length < 5) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'REASON_REQUIRED',
        'การแก้ไขข้อมูลที่มีผลต่อคุณสมบัติต้องระบุเหตุผลอย่างน้อย 5 ตัวอักษร',
      );
    }
    const changes = input.changes.map((change) => ({
      field: change.field,
      fieldLabel: change.fieldLabel,
      oldValue: change.field === 'nationalId' ? maskHistoryValue(change.oldValue) : change.oldValue ?? '',
      newValue: change.field === 'nationalId' ? maskHistoryValue(change.newValue) : change.newValue ?? '',
    }));
    await this.prisma.$transaction(async (tx) => {
      if (sendBack) {
        await tx.beneficiary.update({
          where: { id },
          data: { status: 'NEEDS_CORRECTION', updatedById: actor.id },
        });
        await tx.registryStatusHistory.create({
          data: {
            beneficiaryId: id,
            fromStatus: existing.status,
            toStatus: 'NEEDS_CORRECTION',
            reason: input.reason?.trim() || 'แก้ไขข้อมูลที่มีผลต่อคุณสมบัติ',
            actedById: actor.id,
          },
        });
      } else if (changes.length > 0) {
        await tx.beneficiary.update({
          where: { id },
          data: { updatedById: actor.id },
        });
      }
      if (changes.length > 0) {
        await tx.beneficiaryEditHistory.create({
          data: {
            beneficiaryId: id,
            editedById: actor.id,
            editedByName: actor.displayName || actor.email,
            editedByRole: actor.roles[0]?.name || actor.roles[0]?.code || 'เจ้าหน้าที่',
            timestamp: new Date().toISOString(),
            changesSummary: changes.map((change) => change.fieldLabel).join(', ').slice(0, 500),
            changesDetail: JSON.stringify(changes),
            notes: [input.reason?.trim(), input.ipAddress ? `อุปกรณ์: ${input.ipAddress}` : '']
              .filter(Boolean)
              .join(' | ')
              .slice(0, 2000),
          },
        });
        await this.audit.record(tx, {
          actorId: actor.id,
          action: 'BENEFICIARY_REVISED',
          resourceType: 'beneficiary',
          resourceId: id,
          metadata: {
            fields: changes.map((change) => change.field).join(','),
            reReview: sendBack,
          },
        });
      }
    });
    const fresh = await this.requireRecord(id);
    return {
      reReview: sendBack,
      status: fresh.status,
      updatedAt: fresh.updatedAt.toISOString(),
    };
  }

  async listRevisions(id: string, _actor: AuthUser) {
    await this.requireRecord(id);
    const rows = await this.prisma.beneficiaryEditHistory.findMany({
      where: { beneficiaryId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((row) => ({
      id: row.id,
      beneficiaryId: row.beneficiaryId,
      editedById: row.editedById,
      editedByName: row.editedByName,
      editedByRole: row.editedByRole,
      timestamp: row.timestamp,
      changesSummary: row.changesSummary,
      changesDetail: parseHistoryDetail(row.changesDetail),
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  /**
   * Audit log history for a specific beneficiary
   */
  async getAuditHistory(id: string, _actor: AuthUser) {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        resourceType: 'beneficiary',
        resourceId: id,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      actorId: log.actorId,
      actorName: log.actor?.displayName ?? 'ระบบ',
      actorEmail: log.actor?.email ?? null,
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString(),
    }));
  }

  async checkDuplicateNationalId(
    nationalId: string,
    excludeId?: string,
    actor?: AuthUser,
  ) {
    const digits = String(nationalId || '').replace(/\D/g, '');
    if (digits.length !== 13 || !isValidThaiNationalId(digits)) {
      return {
        valid: false,
        duplicate: false,
        existingMember: null,
      };
    }

    const existing = await this.prisma.beneficiary.findFirst({
      where: {
        identityType: 'THAI_NATIONAL_ID',
        identityNumberNormalized: digits,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      include: {
        addresses: true,
        assessments: {
          orderBy: [{ assessedAt: 'desc' }, { createdAt: 'desc' }],
          take: 1,
          include: { category: true },
        },
      },
    });

    if (actor) {
      await this.audit.write({
        actorId: actor.id,
        action: 'BENEFICIARY_DUPLICATE_CHECK',
        resourceType: 'beneficiary',
        resourceId: existing?.id ?? null,
        metadata: {
          duplicate: Boolean(existing),
          memberId: existing?.memberId ?? null,
        },
      });
    }

    if (!existing) {
      return {
        valid: true,
        duplicate: false,
        existingMember: null,
      };
    }

    const currentAddr =
      existing.addresses.find((a) => a.addressType === 'CURRENT') ??
      existing.addresses[0] ??
      null;
    const latestAsm = existing.assessments[0] ?? null;

    return {
      valid: true,
      duplicate: true,
      existingMember: {
        id: existing.id,
        memberId: existing.memberId ?? existing.registryNumber,
        fullName: formatPersonName({
          prefix: existing.title,
          firstName: existing.firstName,
          lastName: existing.lastName,
        }),
        memberStatus: existing.memberStatus || 'ACTIVE',
        registryStatus: existing.status,
        latestAssessmentStatus: latestAsm?.status ?? null,
        latestAssessmentNumber: latestAsm?.assessmentNumber ?? null,
        asnafCategory: latestAsm?.category?.nameTh ?? null,
        province: currentAddr?.province ?? null,
        community: currentAddr?.community ?? null,
        createdAt: existing.createdAt.toISOString(),
      },
    };
  }

  async updateMemberStatus(
    id: string,
    input: { memberStatus: string; reason?: string },
    actor: AuthUser,
  ): Promise<BeneficiaryView> {
    const existing = await this.requireRecord(id);
    const nextMemberStatus = input.memberStatus.toUpperCase();

    const updated = await this.prisma.$transaction(async (tx) => {
      const nextRegistryStatus: RegistryStatus =
        nextMemberStatus === 'SUSPENDED'
          ? 'SUSPENDED'
          : nextMemberStatus === 'ARCHIVED'
            ? 'ARCHIVED'
            : existing.status === 'SUSPENDED' || existing.status === 'ARCHIVED'
              ? 'PENDING_REVIEW'
              : existing.status;

      const row = await tx.beneficiary.update({
        where: { id },
        data: {
          memberStatus: nextMemberStatus,
          status: nextRegistryStatus,
          updatedById: actor.id,
        },
        include: beneficiaryInclude,
      });

      if (nextRegistryStatus !== existing.status) {
        await tx.registryStatusHistory.create({
          data: {
            beneficiaryId: id,
            fromStatus: existing.status,
            toStatus: nextRegistryStatus,
            reason: input.reason?.trim() || `ปรับสถานะสมาชิกเป็น ${nextMemberStatus}`,
            actedById: actor.id,
          },
        });
      }

      await this.audit.record(tx, {
        actorId: actor.id,
        action: 'BENEFICIARY_MEMBER_STATUS_UPDATE',
        resourceType: 'beneficiary',
        resourceId: id,
        metadata: {
          memberId: existing.memberId,
          fromMemberStatus: existing.memberStatus,
          toMemberStatus: nextMemberStatus,
          reason: input.reason?.trim() ?? null,
        },
      });

      return row;
    });

    return presentBeneficiary(updated, this.viewOptions(actor));
  }

  /**
   * Strictly separated counts per Master Requirement Section 9:
   * - totalMembers: distinct non-deleted Beneficiary rows (never counts assessment rounds as members)
   * - pendingAssessments: assessments awaiting review/assessment (+ unassessed members)
   * - eligibleCount: assessments passing eligibility in selected period (or latest per member)
   * - ineligibleCount: assessments not eligible in selected period (or latest per member)
   * - totalAssistanceRequests: AssistanceApplication count
   * - assistedMembersCount: distinct beneficiaries with actual disbursed/confirmed aid
   */
  async dashboardMetrics(period?: string) {
    const normalizedPeriod = period?.trim() || undefined;

    const [
      activeBeneficiaries,
      allAssessments,
      applications,
      confirmedExecutions,
    ] = await Promise.all([
      this.prisma.beneficiary.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          memberId: true,
          memberStatus: true,
          status: true,
          addresses: {
            select: { addressType: true, province: true },
          },
          assessments: {
            orderBy: [{ assessedAt: 'desc' }, { createdAt: 'desc' }],
            include: { category: { select: { code: true, nameTh: true } } },
          },
        },
      }),
      this.prisma.beneficiaryAsnafAssessment.findMany({
        where: { beneficiary: { deletedAt: null } },
        select: {
          id: true,
          beneficiaryId: true,
          assessmentPeriod: true,
          status: true,
          eligibilityResult: true,
          decision: true,
          assessedAt: true,
          category: { select: { code: true, nameTh: true } },
        },
        orderBy: [{ assessedAt: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.assistanceApplication.findMany({
        where: { beneficiary: { deletedAt: null } },
        select: {
          id: true,
          beneficiaryId: true,
          status: true,
          requestedAmount: true,
          approvedAmount: true,
          disbursedAmount: true,
          actualAssistanceValue: true,
          assistanceResultStatus: true,
        },
      }),
      this.prisma.assistanceExecutionRecord.findMany({
        where: {
          isConfirmed: true,
          application: { beneficiary: { deletedAt: null } },
        },
        select: {
          applicationId: true,
          actualDisbursedAmount: true,
          actualAssistanceValue: true,
          application: { select: { beneficiaryId: true } },
        },
      }),
    ]);

    const totalMembers = activeBeneficiaries.length;
    let activeMembers = 0;
    let suspendedMembers = 0;
    let archivedMembers = 0;
    const byProvince: Record<string, number> = {};

    for (const b of activeBeneficiaries) {
      const ms = (b.memberStatus || 'ACTIVE').toUpperCase();
      if (ms === 'SUSPENDED') suspendedMembers += 1;
      else if (ms === 'ARCHIVED') archivedMembers += 1;
      else activeMembers += 1;

      const cur = b.addresses.find((a) => a.addressType === 'CURRENT') ?? b.addresses[0];
      const prov = cur?.province?.trim() || 'ไม่ระบุจังหวัด';
      byProvince[prov] = (byProvince[prov] || 0) + 1;
    }

    const availablePeriods = Array.from(
      new Set(
        allAssessments
          .map((a) => a.assessmentPeriod?.trim())
          .filter((p): p is string => Boolean(p)),
      ),
    );

    // Evaluate assessment metrics either for a specific period or latest assessment per member
    let pendingAssessments = 0;
    let eligibleCount = 0;
    let ineligibleCount = 0;
    const byAsnaf: Record<string, number> = {};

    if (normalizedPeriod) {
      const periodAssessments = allAssessments.filter(
        (a) => (a.assessmentPeriod || '').trim() === normalizedPeriod,
      );
      // Latest per member within the selected period
      const seenMembers = new Set<string>();
      for (const asm of periodAssessments) {
        if (seenMembers.has(asm.beneficiaryId)) continue;
        seenMembers.add(asm.beneficiaryId);
        const bucket = classifyAssessmentOutcome(asm.status, asm.eligibilityResult, asm.decision);
        if (bucket === 'ELIGIBLE') eligibleCount += 1;
        else if (bucket === 'NOT_ELIGIBLE') ineligibleCount += 1;
        else pendingAssessments += 1;

        const code = (asm.category?.code || 'other').toLowerCase();
        byAsnaf[code] = (byAsnaf[code] || 0) + 1;
      }
    } else {
      for (const b of activeBeneficiaries) {
        const latest = b.assessments[0];
        if (!latest) {
          if ((b.memberStatus || 'ACTIVE').toUpperCase() === 'ACTIVE') {
            pendingAssessments += 1;
          }
          continue;
        }
        if (b.status === 'NEEDS_CORRECTION') {
          pendingAssessments += 1;
        } else {
          const bucket = classifyAssessmentOutcome(
            latest.status,
            latest.eligibilityResult,
            latest.decision,
          );
          if (bucket === 'ELIGIBLE') eligibleCount += 1;
          else if (bucket === 'NOT_ELIGIBLE') ineligibleCount += 1;
          else pendingAssessments += 1;
        }

        const code = (latest.category?.code || 'other').toLowerCase();
        byAsnaf[code] = (byAsnaf[code] || 0) + 1;
      }
    }

    const totalAssistanceRequests = applications.length;
    let pendingAssistanceRequests = 0;
    let approvedAssistanceRequests = 0;
    let rejectedAssistanceRequests = 0;
    let totalDisbursedAmount = 0;
    const assistedMemberSet = new Set<string>();

    for (const app of applications) {
      const st = (app.status || '').toLowerCase();
      const resSt = (app.assistanceResultStatus || '').toLowerCase();
      const disb = Number(app.actualAssistanceValue ?? app.disbursedAmount ?? 0);

      if (st === 'rejected' || st === 'cancelled') {
        rejectedAssistanceRequests += 1;
      } else if (st === 'approved' || st === 'pending_disbursement') {
        approvedAssistanceRequests += 1;
      } else if (st === 'disbursed' || st === 'completed' || resSt === 'completed' || disb > 0) {
        approvedAssistanceRequests += 1;
        assistedMemberSet.add(app.beneficiaryId);
        if (Number.isFinite(disb) && disb > 0) {
          totalDisbursedAmount += disb;
        }
      } else {
        pendingAssistanceRequests += 1;
      }
    }

    for (const exec of confirmedExecutions) {
      if (exec.application?.beneficiaryId) {
        assistedMemberSet.add(exec.application.beneficiaryId);
      }
    }

    return {
      period: normalizedPeriod ?? null,
      availablePeriods,
      // 6 Strictly Separated Core Metrics (Section 9)
      totalMembers,
      pendingAssessments,
      eligibleCount,
      ineligibleCount,
      totalAssistanceRequests,
      assistedMembersCount: assistedMemberSet.size,
      // Breakdowns
      memberBreakdown: {
        active: activeMembers,
        suspended: suspendedMembers,
        archived: archivedMembers,
      },
      totalAssessmentRounds: allAssessments.length,
      requestBreakdown: {
        total: totalAssistanceRequests,
        pending: pendingAssistanceRequests,
        approved: approvedAssistanceRequests,
        rejected: rejectedAssistanceRequests,
      },
      totalDisbursedAmount: Number(totalDisbursedAmount.toFixed(2)),
      byAsnaf,
      byProvince,
    };
  }

  private async duplicateIdentityConflict(identityNumberNormalized: string | null) {
    let existingInfo: { id: string; code: string; fullName: string } | undefined;
    if (identityNumberNormalized) {
      const existing = await this.prisma.beneficiary.findFirst({
        where: {
          identityType: 'THAI_NATIONAL_ID',
          identityNumberNormalized,
          deletedAt: null,
        },
        select: {
          id: true,
          memberId: true,
          registryNumber: true,
          title: true,
          firstName: true,
          lastName: true,
        },
      });
      if (existing) {
        existingInfo = {
          id: existing.id,
          code: existing.memberId || existing.registryNumber,
          fullName: formatPersonName({
            prefix: existing.title,
            firstName: existing.firstName,
            lastName: existing.lastName,
          }),
        };
      }
    }
    return new AppException(
      HttpStatus.CONFLICT,
      'DUPLICATE_IDENTITY',
      existingInfo
        ? `เลขประจำตัวประชาชนนี้ขึ้นทะเบียนเป็นสมาชิกอยู่แล้ว (รหัสสมาชิก ${existingInfo.code} - ${existingInfo.fullName}) กรุณาเปิดข้อมูลสมาชิกเดิมแทนการสร้างซ้ำ`
        : 'เลขประจำตัวประชาชนนี้ขึ้นทะเบียนเป็นสมาชิกอยู่แล้ว กรุณาเปิดข้อมูลสมาชิกเดิมแทนการสร้างซ้ำ',
      existingInfo
        ? [
            { field: 'existingBeneficiaryId', message: existingInfo.id },
            { field: 'memberId', message: existingInfo.code },
            { field: 'fullName', message: existingInfo.fullName },
          ]
        : undefined,
    );
  }

  private viewOptions(actor: AuthUser): { revealIdentity: boolean; revealAid: boolean } {
    return {
      revealIdentity: actor.permissions.includes('beneficiaries.read.sensitive'),
      revealAid: actor.permissions.includes('beneficiaries.aid.view'),
    };
  }
}

export type BeneficiaryTransaction = Prisma.TransactionClient;

function maskHistoryValue(value: string | undefined): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length !== 13) return value ? 'ปกปิด' : '';
  return `${digits[0]}-••••-•••••-••-${digits[12]}`;
}

function parseHistoryDetail(raw: string | null) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function classifyAssessmentOutcome(
  status?: string | null,
  eligibilityResult?: string | null,
  decision?: string | null,
): 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'PENDING' {
  const st = String(status || '').toUpperCase();
  const res = String(eligibilityResult || '').toUpperCase();
  const dec = String(decision || '').toUpperCase();
  if (st === 'DRAFT' || st === 'PENDING_ASSESSMENT' || st === 'UNDER_REVIEW' || st === 'RETURNED_FOR_CORRECTION') {
    return 'PENDING';
  }
  if (st === 'ELIGIBLE' || st === 'APPROVED' || res === 'ELIGIBLE' || dec === 'CONFIRMED') {
    return 'ELIGIBLE';
  }
  if (st === 'NOT_ELIGIBLE' || res === 'NOT_ELIGIBLE' || dec === 'REJECTED' || dec === 'NOT_CONFIRMED') {
    return 'NOT_ELIGIBLE';
  }
  return 'PENDING';
}
