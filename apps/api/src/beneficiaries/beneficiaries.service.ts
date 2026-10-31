import { HttpStatus, Injectable } from '@nestjs/common';
import type { Prisma, RegistryStatus } from '@prisma/client';
import type { RegistryStatusCode } from '@zms/shared';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/app.exception';
import type { AuthUser } from '../common/auth-user';
import { pageWindow } from '../common/pagination';
import { isUniqueConflict } from '../common/prisma-error';
import { PrismaService } from '../prisma/prisma.service';
import { canEditRegistry } from '../registry-workflow/registry-rules';
import { verifyPassword } from '../security/password-hash';
import {
  buildBeneficiaryOrder,
  buildBeneficiaryWhere,
  buildDeletedBeneficiaryWhere,
  summaryFilters,
  toStatusSummary,
} from './beneficiary-query';
import { readDateOfBirth, readIdentity } from './beneficiary-fields';
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
        const row = await tx.beneficiary.create({
          data: {
            registryNumber,
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
          metadata: { registryNumber },
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
      throw new AppException(
        HttpStatus.CONFLICT,
        'DUPLICATE_IDENTITY',
        'เลขประจำตัวนี้มีในทะเบียนที่ยังใช้งานแล้ว',
      );
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
        throw new AppException(
          HttpStatus.CONFLICT,
          'DUPLICATE_IDENTITY',
          'เลขประจำตัวนี้มีในทะเบียนที่ยังใช้งานแล้ว',
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

  async requireRecord(id: string) {
    const row = await this.prisma.beneficiary.findFirst({
      where: { id, deletedAt: null },
      include: beneficiaryInclude,
    });
    if (row === null) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'ไม่พบทะเบียน');
    }
    return row;
  }

  assertEditable(status: RegistryStatus): void {
    if (!canEditRegistry(status as RegistryStatusCode)) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'INVALID_STATE',
        'แก้ไขได้เฉพาะทะเบียนที่เป็นร่างหรือรอแก้ไข',
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
        fullName: `${row.title ? row.title + ' ' : ''}${row.firstName} ${row.lastName}`.trim(),
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

  private viewOptions(actor: AuthUser): { revealIdentity: boolean; revealAid: boolean } {
    return {
      revealIdentity: actor.permissions.includes('beneficiaries.read.sensitive'),
      revealAid: actor.permissions.includes('beneficiaries.aid.view'),
    };
  }
}

export type BeneficiaryTransaction = Prisma.TransactionClient;
