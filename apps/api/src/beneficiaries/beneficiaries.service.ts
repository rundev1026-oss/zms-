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
import {
  buildBeneficiaryOrder,
  buildBeneficiaryWhere,
  summaryFilters,
  toStatusSummary,
} from './beneficiary-query';
import { readDateOfBirth, readIdentity } from './beneficiary-fields';
import {
  beneficiaryInclude,
  presentBeneficiary,
  type BeneficiaryView,
} from './beneficiary.presenter';

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

  private viewOptions(actor: AuthUser): { revealIdentity: boolean; revealAid: boolean } {
    return {
      revealIdentity: actor.permissions.includes('beneficiaries.read.sensitive'),
      revealAid: actor.permissions.includes('beneficiaries.aid.view'),
    };
  }
}

export type BeneficiaryTransaction = Prisma.TransactionClient;
