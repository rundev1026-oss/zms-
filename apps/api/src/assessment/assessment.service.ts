import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/app.exception';
import type { AuthUser } from '../common/auth-user';
import { SubmitAssessmentDto } from './dto/assessment.dto';

@Injectable()
export class AssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Submit field assessment and living condition score for an assistance application
   */
  async submitAssessment(
    applicationId: string,
    dto: SubmitAssessmentDto,
    user: AuthUser,
  ) {
    if (dto.livingScore < 0 || dto.livingScore > 100) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'INVALID_SCORE',
        'คะแนนประเมินต้องอยู่ระหว่าง 0–100',
      );
    }

    if (dto.recommendedAmount === undefined || dto.recommendedAmount === null || Number.isNaN(dto.recommendedAmount) || dto.recommendedAmount < 0) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'INVALID_AMOUNT',
        'วงเงินที่เสนอพิจารณาต้องไม่ติดลบ',
      );
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(applicationId);
    const app = await this.prisma.assistanceApplication.findFirst({
      where: isUuid ? { id: applicationId } : { OR: [{ applicationNo: applicationId }, { legacyId: applicationId }] },
    });

    if (!app) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        'APPLICATION_NOT_FOUND',
        `ไม่พบคำร้องขอความช่วยเหลือรหัส ${applicationId}`,
      );
    }

    // Validate application lifecycle status
    const assessableStatuses = ['submitted', 'doc_review', 'assessment', 'pending_approval', 'need_info'];
    if (app.status && !assessableStatuses.includes(app.status)) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'INVALID_STATUS',
        `คำร้องนี้อยู่ในสถานะ "${app.status}" ไม่สามารถส่งประเมินได้`,
      );
    }

    const nowIso = new Date().toISOString();
    const assessedDate = new Date().toLocaleString('th-TH', { hour12: false });
    const recommendedDecimal = new Prisma.Decimal(dto.recommendedAmount);

    // Auto-resolve specific fund and primary fund from application or Master Data relationship
    let resolvedSpecificFundId = dto.recommendedSpecificFundId || app.specificFundId || null;
    let resolvedFundId = dto.recommendedFundId || app.approvedFundId || app.primaryGroupCode || null;

    if (!resolvedSpecificFundId && (app.assistanceTypeId || app.assistanceType)) {
      // Look up assistance type to resolve specificFundId from Master Data
      const ast = await this.prisma.assistanceType.findFirst({
        where: {
          OR: [
            ...(app.assistanceTypeId ? [{ id: app.assistanceTypeId }, { legacyId: app.assistanceTypeId }, { code: app.assistanceTypeId }] : []),
            ...(app.assistanceType ? [{ name: app.assistanceType }, { code: app.assistanceType }] : []),
          ],
        },
      });
      if (ast?.specificFundId) {
        resolvedSpecificFundId = ast.specificFundId;
      }
    }

    if (!resolvedFundId) {
      if (resolvedSpecificFundId) {
        const isSubUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedSpecificFundId);
        const sf = await this.prisma.faqirMiskinSubFund.findFirst({
          where: {
            OR: [
              ...(isSubUuid ? [{ id: resolvedSpecificFundId }] : []),
              { legacyId: resolvedSpecificFundId },
              { code: resolvedSpecificFundId },
              { fundCode: resolvedSpecificFundId },
            ],
          },
        });
        resolvedFundId = sf?.fundAccountId || sf?.primaryGroupCode || 'fund-1';
      } else {
        resolvedFundId = 'fund-1';
      }
    }

    return await this.prisma.$transaction(async (tx) => {
      // Upsert BeneficiaryAssessmentLegacy
      const assessment = await tx.beneficiaryAssessmentLegacy.upsert({
        where: { applicationId: app.id },
        update: {
          assessedById: user.id,
          assessedByName: user.displayName,
          assessedDate,
          livingScore: dto.livingScore,
          housingCondition: dto.housingCondition,
          housingNotes: dto.housingNotes || '',
          debtBurdenSummary: dto.debtBurdenSummary || '',
          primaryHardship: dto.primaryHardship || '',
          officerRecommendation: dto.officerRecommendation,
          recommendedAmount: recommendedDecimal,
          recommendedFundId: resolvedFundId,
          recommendedSpecificFundId: resolvedSpecificFundId,
          generalNotes: dto.generalNotes || '',
        },
        create: {
          applicationId: app.id,
          assessedById: user.id,
          assessedByName: user.displayName,
          assessedDate,
          livingScore: dto.livingScore,
          housingCondition: dto.housingCondition,
          housingNotes: dto.housingNotes || '',
          debtBurdenSummary: dto.debtBurdenSummary || '',
          primaryHardship: dto.primaryHardship || '',
          officerRecommendation: dto.officerRecommendation,
          recommendedAmount: recommendedDecimal,
          recommendedFundId: resolvedFundId,
          recommendedSpecificFundId: resolvedSpecificFundId,
          generalNotes: dto.generalNotes || '',
        },
      });

      // Advance application status to pending_approval and sync specificFundId if resolved
      const appUpdateData: Prisma.AssistanceApplicationUpdateInput = {
        status: 'pending_approval',
        updatedAt: new Date(),
      };
      if (!app.specificFundId && resolvedSpecificFundId) {
        appUpdateData.specificFundId = resolvedSpecificFundId;
      }

      await tx.assistanceApplication.update({
        where: { id: app.id },
        data: appUpdateData,
      });

      // Record in application history
      await tx.applicationHistory.create({
        data: {
          applicationId: app.id,
          status: 'pending_approval',
          timestamp: nowIso,
          changedById: user.id,
          changedByName: user.displayName,
          notes: `บันทึกผลการประเมินลงพื้นที่ คะแนนความจำเป็น ${dto.livingScore}/100 เสนอวงเงิน ฿${recommendedDecimal.toFixed(2)} (${dto.officerRecommendation})`,
        },
      });

      // Write audit log
      await this.audit.record(tx, {
        actorId: user.id,
        action: 'ASSESSMENT_SUBMIT',
        resourceType: 'beneficiary_assessment',
        resourceId: assessment.id,
        metadata: {
          applicationId: app.id,
          applicationNo: app.applicationNo,
          livingScore: dto.livingScore,
          recommendedAmount: recommendedDecimal.toFixed(2),
          officerRecommendation: dto.officerRecommendation,
        },
      });

      return {
        ...assessment,
        recommendedAmount: Number(assessment.recommendedAmount),
      };
    });
  }

  /**
   * Get assessment by application ID
   */
  async getAssessment(applicationId: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(applicationId);
    const app = await this.prisma.assistanceApplication.findFirst({
      where: isUuid ? { id: applicationId } : { OR: [{ applicationNo: applicationId }, { legacyId: applicationId }] },
    });

    if (!app) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        'APPLICATION_NOT_FOUND',
        `ไม่พบคำร้องขอความช่วยเหลือรหัส ${applicationId}`,
      );
    }

    const assessment = await this.prisma.beneficiaryAssessmentLegacy.findUnique({
      where: { applicationId: app.id },
    });

    if (!assessment) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        'ASSESSMENT_NOT_FOUND',
        `ยังไม่มีการบันทึกผลการประเมินสำหรับคำร้องหมายเลข ${app.applicationNo}`,
      );
    }

    return {
      ...assessment,
      recommendedAmount: Number(assessment.recommendedAmount),
    };
  }
}

