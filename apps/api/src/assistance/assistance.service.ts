import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/app.exception';
import type { AuthUser } from '../common/auth-user';
import { RecordExecutionDto, ConfirmExecutionDto } from './dto/assistance.dto';

@Injectable()
export class AssistanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Record aid delivery or handover execution
   */
  async recordExecution(dto: RecordExecutionDto, user: AuthUser) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dto.applicationId);
    const app = await this.prisma.assistanceApplication.findFirst({
      where: isUuid
        ? { id: dto.applicationId }
        : { OR: [{ applicationNo: dto.applicationId }, { legacyId: dto.applicationId }] },
    });

    if (!app) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        'APPLICATION_NOT_FOUND',
        `ไม่พบคำร้องขอความช่วยเหลือรหัส ${dto.applicationId}`,
      );
    }

    const nowIso = new Date().toISOString();
    const executionDateStr = new Date().toLocaleDateString('th-TH');
    const disbursedDecimal = new Prisma.Decimal(dto.actualDisbursedAmount);
    const valueDecimal = new Prisma.Decimal(dto.actualAssistanceValue || dto.actualDisbursedAmount);

    return await this.prisma.$transaction(async (tx) => {
      const exec = await tx.assistanceExecutionRecord.create({
        data: {
          applicationId: app.id,
          installmentNo: dto.installmentNo || 1,
          totalInstallments: dto.totalInstallments || 1,
          assistanceType: dto.assistanceType,
          asnafCategory: app.asnafCategory,
          executionDate: executionDateStr,
          executionDatetime: nowIso,
          executorId: user.id,
          executorName: user.displayName,
          assistanceOutcome: dto.assistanceOutcome,
          actualDisbursedAmount: disbursedDecimal,
          actualAssistanceValue: valueDecimal,
          details: dto.details || null,
          proofUrl: dto.proofUrl || null,
          status: 'completed',
          isConfirmed: false,
        },
      });

      await tx.assistanceApplication.update({
        where: { id: app.id },
        data: {
          assistanceResultStatus: 'completed',
          assistanceOutcome: dto.assistanceOutcome,
          actualAssistanceValue: valueDecimal,
          executionConfirmedAt: nowIso,
          executionConfirmedById: user.id,
          executionConfirmedByName: user.displayName,
          updatedAt: new Date(),
        },
      });

      await tx.applicationHistory.create({
        data: {
          applicationId: app.id,
          status: app.status,
          timestamp: nowIso,
          changedById: user.id,
          changedByName: user.displayName,
          notes: `บันทึกการส่งมอบความช่วยเหลือ (${dto.assistanceType}) มูลค่า ฿${valueDecimal.toFixed(2)} บาท (${dto.assistanceOutcome})`,
        },
      });

      await this.audit.record(tx, {
        actorId: user.id,
        action: 'ASSISTANCE_EXECUTION_RECORD',
        resourceType: 'assistance_execution_record',
        resourceId: exec.id,
        metadata: {
          applicationNo: app.applicationNo,
          assistanceType: dto.assistanceType,
          value: valueDecimal.toFixed(2),
        },
      });

      return {
        ...exec,
        actualDisbursedAmount: Number(exec.actualDisbursedAmount),
        actualAssistanceValue: Number(exec.actualAssistanceValue),
      };
    });
  }

  /**
   * Confirm handover with beneficiary verification
   */
  async confirmExecution(id: string, dto: ConfirmExecutionDto, user: AuthUser) {
    const exec = await this.prisma.assistanceExecutionRecord.findUnique({
      where: { id },
    });

    if (!exec) {
      throw new AppException(HttpStatus.NOT_FOUND, 'EXECUTION_NOT_FOUND', `ไม่พบบันทึกการส่งมอบรหัส ${id}`);
    }

    const nowIso = new Date().toISOString();

    const updated = await this.prisma.assistanceExecutionRecord.update({
      where: { id: exec.id },
      data: {
        isConfirmed: true,
        confirmationStatement: dto.confirmationStatement || 'ยืนยันการรับมอบความช่วยเหลือเรียบร้อยครบถ้วน',
        confirmedById: user.id,
        confirmedByName: user.displayName,
        confirmedAt: nowIso,
        proofUrl: dto.proofUrl || exec.proofUrl,
        updatedAt: new Date(),
      },
    });

    await this.audit.write({
      actorId: user.id,
      action: 'ASSISTANCE_EXECUTION_CONFIRMED',
      resourceType: 'assistance_execution_record',
      resourceId: updated.id,
      metadata: {
        applicationId: updated.applicationId,
        confirmedBy: user.displayName,
      },
    });

    return {
      ...updated,
      actualDisbursedAmount: Number(updated.actualDisbursedAmount),
      actualAssistanceValue: Number(updated.actualAssistanceValue),
    };
  }

  /**
   * Get all execution records for an application
   */
  async getExecutionsByApplication(applicationId: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(applicationId);
    const app = await this.prisma.assistanceApplication.findFirst({
      where: isUuid
        ? { id: applicationId }
        : { OR: [{ applicationNo: applicationId }, { legacyId: applicationId }] },
    });

    if (!app) {
      throw new AppException(HttpStatus.NOT_FOUND, 'APPLICATION_NOT_FOUND', `ไม่พบคำร้องรหัส ${applicationId}`);
    }

    const records = await this.prisma.assistanceExecutionRecord.findMany({
      where: { applicationId: app.id },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => ({
      ...r,
      actualDisbursedAmount: Number(r.actualDisbursedAmount),
      actualAssistanceValue: Number(r.actualAssistanceValue),
    }));
  }
}

