import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/app.exception';
import type { AuthUser } from '../common/auth-user';
import { maskIdentityNumber } from '../beneficiaries/mask-identity';
import {
  ApproveApplicationDto,
  RejectApplicationDto,
  ReturnApplicationDto,
  QueryPendingApprovalsDto,
} from './dto/approval.dto';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Get pending applications waiting for committee approval
   */
  async getPendingApprovals(query: QueryPendingApprovalsDto, user?: AuthUser) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(query.limit || 20)));
    const skip = (page - 1) * limit;

    const where: Prisma.AssistanceApplicationWhereInput = {
      status: 'pending_approval',
    };

    if (query.asnafCategory && query.asnafCategory.trim()) {
      where.asnafCategory = query.asnafCategory.trim();
    }

    if (query.urgencyLevel && query.urgencyLevel.trim()) {
      where.urgencyLevel = query.urgencyLevel.trim();
    }

    if (query.branchId && query.branchId.trim()) {
      where.branchId = query.branchId.trim();
    }

    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      const cleanQ = q.replace(/[^0-9]/g, '');
      where.OR = [
        { applicationNo: { contains: q, mode: 'insensitive' } },
        { beneficiary: { firstName: { contains: q, mode: 'insensitive' } } },
        { beneficiary: { lastName: { contains: q, mode: 'insensitive' } } },
        { beneficiary: { registryNumber: { contains: q, mode: 'insensitive' } } },
        ...(cleanQ.length > 0 ? [{ beneficiary: { identityNumberNormalized: { contains: cleanQ } } }] : []),
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.assistanceApplication.findMany({
        where,
        orderBy: [{ urgencyLevel: 'desc' }, { createdAt: 'asc' }],
        skip,
        take: limit,
        include: {
          beneficiary: {
            select: {
              id: true,
              title: true,
              firstName: true,
              lastName: true,
              identityNumber: true,
              identityNumberNormalized: true,
              registryNumber: true,
              phone: true,
            },
          },
          documents: true,
          legacyAssessment: true,
          history: {
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
        },
      }),
      this.prisma.assistanceApplication.count({ where }),
    ]);

    const canSeeSensitive = user?.permissions?.includes('beneficiaries.read.sensitive') ?? true;

    const formattedItems = items.map((app) => {
      const ben = app.beneficiary;
      const fullName = ben ? [ben.title, ben.firstName, ben.lastName].filter(Boolean).join(' ') : '';
      const idNum = ben?.identityNumberNormalized || ben?.identityNumber || '';

      return {
        ...app,
        requestedAmount: Number(app.requestedAmount),
        approvedAmount: app.approvedAmount ? Number(app.approvedAmount) : null,
        beneficiary: ben
          ? {
              id: ben.id,
              fullName,
              registryNumber: ben.registryNumber,
              phone: ben.phone,
              identityNumber: canSeeSensitive ? idNum : maskIdentityNumber(idNum),
              identityNumberMasked: maskIdentityNumber(idNum),
            }
          : null,
        assessment: app.legacyAssessment
          ? {
              ...app.legacyAssessment,
              recommendedAmount: Number(app.legacyAssessment.recommendedAmount),
            }
          : null,
      };
    });

    return {
      items: formattedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get approval statistical summary
   */
  async getSummary() {
    const [
      pendingCount,
      approvedCount,
      rejectedCount,
      needInfoCount,
      pendingAmountAgg,
      approvedAmountAgg,
    ] = await Promise.all([
      this.prisma.assistanceApplication.count({ where: { status: 'pending_approval' } }),
      this.prisma.assistanceApplication.count({
        where: { status: { in: ['wait_disbursement', 'approved', 'disbursed'] } },
      }),
      this.prisma.assistanceApplication.count({ where: { status: 'rejected' } }),
      this.prisma.assistanceApplication.count({ where: { status: { in: ['need_info', 'assessment'] } } }),
      this.prisma.assistanceApplication.aggregate({
        where: { status: 'pending_approval' },
        _sum: { requestedAmount: true },
      }),
      this.prisma.assistanceApplication.aggregate({
        where: { status: { in: ['wait_disbursement', 'approved', 'disbursed'] } },
        _sum: { approvedAmount: true },
      }),
    ]);

    return {
      pendingCount,
      approvedCount,
      rejectedCount,
      needInfoCount,
      totalPendingAmount: Number(pendingAmountAgg._sum.requestedAmount || 0),
      totalApprovedAmount: Number(approvedAmountAgg._sum.approvedAmount || 0),
    };
  }

  /**
   * Approve an application with budget commitment and Segregation of Duties check
   */
  async approve(id: string, dto: ApproveApplicationDto, user: AuthUser) {
    if (!dto.approvedAmount || dto.approvedAmount <= 0) {
      throw new AppException(HttpStatus.BAD_REQUEST, 'INVALID_AMOUNT', 'วงเงินที่อนุมัติต้องมากกว่า 0 บาท');
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const app = await this.prisma.assistanceApplication.findFirst({
      where: isUuid ? { id } : { OR: [{ applicationNo: id }, { legacyId: id }] },
      include: { legacyAssessment: true },
    });

    if (!app) {
      throw new AppException(HttpStatus.NOT_FOUND, 'APPLICATION_NOT_FOUND', `ไม่พบคำร้องขอความช่วยเหลือรหัส ${id}`);
    }

    // Segregation of Duties (SoD) check
    const userRoleCodes = (user.roles || []).map((r: any) => (typeof r === 'string' ? r : r.code));
    const isSuperAdmin = userRoleCodes.includes('SUPER_ADMIN');

    if (!isSuperAdmin && app.assignedOfficerId && app.assignedOfficerId === user.id) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'SOD_VIOLATION',
        'การละเมิดหลักการแบ่งแยกหน้าที่ (Segregation of Duties): เจ้าหน้าที่ผู้รับผิดชอบคำร้องไม่มีสิทธิ์อนุมัติคำร้องของตนเอง',
      );
    }

    // Check valid pre-approval state
    const validStates = ['pending_approval', 'submitted', 'doc_review', 'assessment'];
    if (!validStates.includes(app.status)) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'INVALID_STATE',
        `คำร้องนี้อยู่ในสถานะ "${app.status}" ไม่สามารถอนุมัติได้ (ต้องอยู่ในสถานะรอพิจารณาอนุมัติเท่านั้น)`,
      );
    }

    // 1. Resolve Fund Account (Level 1)
    const fundInput = dto.fundId.trim();
    const isFundUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fundInput);
    const fund = await this.prisma.fundAccount.findFirst({
      where: {
        OR: [
          ...(isFundUuid ? [{ id: fundInput }] : []),
          { code: fundInput },
          { legacyId: fundInput },
        ],
      },
    });

    if (!fund) {
      throw new AppException(HttpStatus.NOT_FOUND, 'FUND_NOT_FOUND', `ไม่พบบัญชีกองทุนรหัส ${dto.fundId}`);
    }

    if (!fund.isActive) {
      throw new AppException(HttpStatus.BAD_REQUEST, 'FUND_INACTIVE', `บัญชีกองทุน "${fund.name}" ถูกปิดใช้งาน`);
    }

    const availableFund = Number(fund.availableAmount);
    if (availableFund < dto.approvedAmount) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'INSUFFICIENT_FUNDS',
        `ยอดเงินคงเหลือจัดสรรได้ในบัญชีกองทุน "${fund.name}" ไม่เพียงพอ (คงเหลือ: ฿${availableFund.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท, ยอดที่ขออนุมัติ: ฿${dto.approvedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)`,
      );
    }

    // 2. Resolve Specific Sub-Fund (Level 2) if specified or inherited
    const specificFundId =
      dto.specificFundId ||
      app.legacyAssessment?.recommendedSpecificFundId ||
      app.specificFundId ||
      undefined;

    let subFund: any = null;
    if (specificFundId) {
      const isSubUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(specificFundId);
      subFund = await this.prisma.faqirMiskinSubFund.findFirst({
        where: {
          OR: [
            ...(isSubUuid ? [{ id: specificFundId }] : []),
            { code: specificFundId },
            { fundCode: specificFundId },
            { legacyId: specificFundId },
          ],
        },
      });
    }

    const approvedDecimal = new Prisma.Decimal(dto.approvedAmount);
    const nowIso = new Date().toISOString();
    const approvedDateStr = new Date().toLocaleDateString('th-TH');

    return await this.prisma.$transaction(async (tx) => {
      // 1) Update FundAccount (Level 1)
      await tx.fundAccount.update({
        where: { id: fund.id },
        data: {
          committedAmount: { increment: approvedDecimal },
          availableAmount: { decrement: approvedDecimal },
          updatedAt: new Date(),
        },
      });

      // 2) Update Specific Sub-Fund (Level 2) if present
      if (subFund) {
        await tx.faqirMiskinSubFund.update({
          where: { id: subFund.id },
          data: {
            committedAmount: { increment: approvedDecimal },
            remainingAmount: { decrement: approvedDecimal },
            updatedAt: new Date(),
          },
        });
      }

      // 3) Update AsnafAllocation (Level 3) if present
      const fiscalYear = app.fiscalYear || '2569';
      const asnafAlloc = await tx.asnafAllocation.findFirst({
        where: { asnafCode: app.asnafCategory, fiscalYear },
      });
      if (asnafAlloc) {
        await tx.asnafAllocation.update({
          where: { id: asnafAlloc.id },
          data: {
            committedAmount: { increment: approvedDecimal },
            remainingAmount: { decrement: approvedDecimal },
            updatedAt: new Date(),
          },
        });
      }

      // 4) Update Assistance Application
      const updatedApp = await tx.assistanceApplication.update({
        where: { id: app.id },
        data: {
          status: 'wait_disbursement',
          approvedAmount: approvedDecimal,
          approvedFundId: fund.id,
          approvedSpecificFundId: subFund?.id || null,
          approvedById: user.id,
          approvedByName: user.displayName,
          approvedDate: approvedDateStr,
          approvalNotes: dto.notes || 'อนุมัติวงเงินช่วยเหลือ',
          updatedAt: new Date(),
        },
      });

      // 5) Record Application History
      await tx.applicationHistory.create({
        data: {
          applicationId: app.id,
          status: 'wait_disbursement',
          timestamp: nowIso,
          changedById: user.id,
          changedByName: user.displayName,
          notes: `อนุมัติวงเงิน ฿${Number(approvedDecimal).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท จากกองทุน "${fund.name}" ${subFund ? `-> "${subFund.name}"` : ''} (${dto.notes || 'อนุมัติ'}) และส่งต่อฝ่ายการเงิน`,
        },
      });

      // 6) Record Audit Log
      await this.audit.record(tx, {
        actorId: user.id,
        action: 'APPLICATION_APPROVED',
        resourceType: 'assistance_application',
        resourceId: app.id,
        metadata: {
          applicationNo: app.applicationNo,
          approvedAmount: approvedDecimal.toFixed(2),
          fundId: fund.id,
          fundName: fund.name,
          specificFundId: subFund?.id || null,
        },
      });

      return {
        applicationId: updatedApp.id,
        applicationNo: updatedApp.applicationNo,
        status: updatedApp.status,
        approvedAmount: Number(updatedApp.approvedAmount),
        fundId: fund.id,
        fundName: fund.name,
        specificFundId: subFund?.id || null,
        specificFundName: subFund?.name || null,
        approvedByName: user.displayName,
        approvedDate: approvedDateStr,
      };
    });
  }

  /**
   * Reject an application with mandatory reason
   */
  async reject(id: string, dto: RejectApplicationDto, user: AuthUser) {
    if (!dto.reason || !dto.reason.trim()) {
      throw new AppException(HttpStatus.BAD_REQUEST, 'REASON_REQUIRED', 'กรุณาระบุเหตุผลในการไม่อนุมัติคำร้อง');
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const app = await this.prisma.assistanceApplication.findFirst({
      where: isUuid ? { id } : { OR: [{ applicationNo: id }, { legacyId: id }] },
    });

    if (!app) {
      throw new AppException(HttpStatus.NOT_FOUND, 'APPLICATION_NOT_FOUND', `ไม่พบคำร้องขอความช่วยเหลือรหัส ${id}`);
    }

    // Segregation of Duties check
    const userRoleCodes = (user.roles || []).map((r: any) => (typeof r === 'string' ? r : r.code));
    const isSuperAdmin = userRoleCodes.includes('SUPER_ADMIN');

    if (!isSuperAdmin && app.assignedOfficerId && app.assignedOfficerId === user.id) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'SOD_VIOLATION',
        'การละเมิดหลักการแบ่งแยกหน้าที่: เจ้าหน้าที่ผู้รับผิดชอบคำร้องไม่สามารถพิจารณาคำร้องของตนเองได้',
      );
    }

    const nowIso = new Date().toISOString();

    return await this.prisma.$transaction(async (tx) => {
      const updatedApp = await tx.assistanceApplication.update({
        where: { id: app.id },
        data: {
          status: 'rejected',
          rejectionReason: dto.reason.trim(),
          approvalNotes: dto.notes ? `${dto.reason} (${dto.notes})` : dto.reason,
          updatedAt: new Date(),
        },
      });

      await tx.applicationHistory.create({
        data: {
          applicationId: app.id,
          status: 'rejected',
          timestamp: nowIso,
          changedById: user.id,
          changedByName: user.displayName,
          notes: `ไม่อนุมัติคำร้อง: ${dto.reason.trim()}`,
        },
      });

      await this.audit.record(tx, {
        actorId: user.id,
        action: 'APPLICATION_REJECTED',
        resourceType: 'assistance_application',
        resourceId: app.id,
        metadata: {
          applicationNo: app.applicationNo,
          reason: dto.reason.trim(),
        },
      });

      return {
        applicationId: updatedApp.id,
        applicationNo: updatedApp.applicationNo,
        status: updatedApp.status,
        rejectionReason: updatedApp.rejectionReason,
      };
    });
  }

  /**
   * Return application for correction or additional info
   */
  async returnForCorrection(id: string, dto: ReturnApplicationDto, user: AuthUser) {
    if (!dto.notes || !dto.notes.trim()) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'NOTES_REQUIRED',
        'กรุณาระบุรายละเอียดที่ต้องการให้แก้ไขหรือเพิ่มเติม',
      );
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const app = await this.prisma.assistanceApplication.findFirst({
      where: isUuid ? { id } : { OR: [{ applicationNo: id }, { legacyId: id }] },
    });

    if (!app) {
      throw new AppException(HttpStatus.NOT_FOUND, 'APPLICATION_NOT_FOUND', `ไม่พบคำร้องขอความช่วยเหลือรหัส ${id}`);
    }

    const targetStatus = dto.targetStatus || 'need_info';
    const nowIso = new Date().toISOString();

    return await this.prisma.$transaction(async (tx) => {
      const updatedApp = await tx.assistanceApplication.update({
        where: { id: app.id },
        data: {
          status: targetStatus,
          approvalNotes: dto.notes.trim(),
          updatedAt: new Date(),
        },
      });

      await tx.applicationHistory.create({
        data: {
          applicationId: app.id,
          status: targetStatus,
          timestamp: nowIso,
          changedById: user.id,
          changedByName: user.displayName,
          notes: `ส่งกลับให้ตรวจสอบ/แก้ไขเพิ่มเติม: ${dto.notes.trim()}`,
        },
      });

      await this.audit.record(tx, {
        actorId: user.id,
        action: 'APPLICATION_RETURNED',
        resourceType: 'assistance_application',
        resourceId: app.id,
        metadata: {
          applicationNo: app.applicationNo,
          targetStatus,
          notes: dto.notes.trim(),
        },
      });

      return {
        applicationId: updatedApp.id,
        applicationNo: updatedApp.applicationNo,
        status: updatedApp.status,
        notes: updatedApp.approvalNotes,
      };
    });
  }
}
