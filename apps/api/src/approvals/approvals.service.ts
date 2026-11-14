import { Injectable, HttpStatus } from '@nestjs/common';
import { formatPersonName } from '@zms/shared';
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
      const fullName = ben ? formatPersonName({ prefix: ben.title, firstName: ben.firstName, lastName: ben.lastName }) : '';
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

    // Check valid pre-approval state (or revising approvedAmount while waiting disbursement)
    const wasApproved = ['wait_disbursement', 'approved'].includes(app.status);
    const prevApproved = wasApproved && app.approvedAmount ? Number(app.approvedAmount) : 0;
    if (wasApproved && Math.abs(prevApproved - dto.approvedAmount) < 0.005) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'ALREADY_APPROVED',
        'คำร้องนี้ได้รับการอนุมัติเรียบร้อยแล้ว ห้ามอนุมัติซ้ำ',
      );
    }

    const validStates = ['pending_approval', 'submitted', 'doc_review', 'assessment', 'wait_disbursement', 'approved'];
    if (!validStates.includes(app.status)) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'INVALID_STATE',
        `คำร้องนี้อยู่ในสถานะ "${app.status}" ไม่สามารถอนุมัติได้ (ต้องอยู่ในสถานะรอพิจารณาอนุมัติเท่านั้น)`,
      );
    }

    // 1. Resolve Specific Sub-Fund (Level 2) strictly by Assistance Type
    const cleanType = (app.assistanceType || '').trim().toLowerCase();
    const cleanId = (app.assistanceTypeId || '').trim().toLowerCase();
    let targetSubSearch: string | null = null;

    if (
      cleanType.includes('ทุนการศึกษา') ||
      cleanType.includes('การศึกษา') ||
      cleanType.includes('ค่าเล่าเรียน') ||
      cleanType.includes('อุปกรณ์การเรียน') ||
      cleanType === 'education' ||
      cleanId.includes('edu') ||
      cleanId === 'subf-4' ||
      cleanId === 'ast-4'
    ) {
      targetSubSearch = 'education';
    } else if (cleanType.includes('บ้านอัน-เราะห์มัต') || cleanType.includes('เราะห์มัต')) {
      targetSubSearch = 'housing';
    } else if (
      cleanType.includes('ซ่อมแซม') ||
      cleanType.includes('ที่อยู่อาศัย') ||
      cleanType === 'housing' ||
      cleanId.includes('house') ||
      cleanId === 'subf-2' ||
      cleanId === 'ast-2'
    ) {
      targetSubSearch = 'housing';
    } else if (
      cleanType.includes('ต่อยอดอาชีพ') ||
      cleanType.includes('สนับสนุนอาชีพ') ||
      cleanType.includes('ประกอบอาชีพ') ||
      cleanType.includes('ส่งเสริมอาชีพ') ||
      cleanType.includes('อาชีพ') ||
      cleanType === 'career' ||
      cleanId.includes('career') ||
      cleanId === 'subf-3' ||
      cleanId === 'ast-3'
    ) {
      targetSubSearch = 'career';
    } else if (
      cleanType.includes('ปัจจัยยังชีพ') ||
      cleanType.includes('ยังชีพ') ||
      cleanType.includes('ค่าครองชีพ') ||
      cleanType.includes('อาหาร') ||
      cleanType === 'living' ||
      cleanId.includes('living') ||
      cleanId === 'subf-1' ||
      cleanId === 'ast-1'
    ) {
      targetSubSearch = 'living';
    } else if (
      cleanType.includes('ช่วยเหลือฉุกเฉิน') ||
      cleanType.includes('ฉุกเฉิน') ||
      cleanType.includes('บรรเทาทุกข์') ||
      cleanType.includes('ภัยพิบัติ') ||
      cleanType.includes('ผู้ประสบภัย') ||
      cleanType === 'emergency' ||
      cleanId.includes('emergency') ||
      cleanId === 'subf-5' ||
      cleanId === 'ast-5'
    ) {
      targetSubSearch = 'emergency';
    } else if (
      cleanType.includes('หนี้สิน') ||
      cleanType.includes('ปลดหนี้') ||
      cleanType.includes('ฆอรีมีน') ||
      cleanId.includes('gharim')
    ) {
      targetSubSearch = 'gharimin_debt_relief';
    } else if (
      cleanType.includes('มุอัลลัฟ') ||
      cleanType.includes('มุสลิมใหม่') ||
      cleanId.includes('muallaf')
    ) {
      targetSubSearch = 'muallaf_welfare';
    } else if (
      cleanType.includes('ผู้เดินทาง') ||
      cleanType.includes('พลัดถิ่น') ||
      cleanType.includes('อิบนุสสะบีล') ||
      cleanId.includes('ibnsabil')
    ) {
      targetSubSearch = 'ibnsabil_travel_aid';
    } else if (
      cleanType.includes('มนุษยธรรม') ||
      cleanType.includes('ผู้ลี้ภัย') ||
      cleanId.includes('human')
    ) {
      targetSubSearch = 'humanitarian_relief';
    } else if (
      cleanType.includes('ฟีสะบีลิลลาฮ์') ||
      cleanType.includes('ส่งเสริมศาสนา') ||
      cleanId.includes('fisabilillah')
    ) {
      targetSubSearch = 'fisabilillah_education_dawah';
    } else if (
      cleanType.includes('อามิล') ||
      cleanId.includes('amil')
    ) {
      targetSubSearch = 'amil_operations';
    }

    let subFund: any = null;

    if (targetSubSearch) {
      subFund = await this.prisma.faqirMiskinSubFund.findFirst({
        where: {
          OR: [
            { code: targetSubSearch },
            { fundCode: targetSubSearch.toUpperCase() },
            ...(targetSubSearch === 'education' ? [{ code: 'education' }, { fundCode: 'SF-FM-04' }, { legacyId: 'subf-4' }] : []),
            ...(targetSubSearch === 'housing' ? [{ code: 'housing' }, { fundCode: 'SF-FM-02' }, { legacyId: 'subf-2' }] : []),
            ...(targetSubSearch === 'career' ? [{ code: 'career' }, { fundCode: 'SF-FM-03' }, { legacyId: 'subf-3' }] : []),
            ...(targetSubSearch === 'living' ? [{ code: 'living' }, { fundCode: 'SF-FM-01' }, { legacyId: 'subf-1' }] : []),
            ...(targetSubSearch === 'emergency' ? [{ code: 'emergency' }, { fundCode: 'SF-FM-05' }, { legacyId: 'subf-5' }] : []),
            ...(targetSubSearch === 'gharimin_debt_relief' ? [{ code: 'gharimin_debt_relief' }, { fundCode: 'SF-GHR-01' }, { legacyId: 'subf-gharimin-1' }] : []),
            ...(targetSubSearch === 'muallaf_welfare' ? [{ code: 'muallaf_welfare' }, { fundCode: 'SF-MLF-01' }, { legacyId: 'subf-muallaf-1' }] : []),
            ...(targetSubSearch === 'ibnsabil_travel_aid' ? [{ code: 'ibnsabil_travel_aid' }, { fundCode: 'SF-IBS-01' }, { legacyId: 'subf-ibnsabil-1' }] : []),
            ...(targetSubSearch === 'humanitarian_relief' ? [{ code: 'humanitarian_relief' }, { fundCode: 'SF-HUM-01' }, { legacyId: 'subf-humanitarian-1' }] : []),
            ...(targetSubSearch === 'fisabilillah_education_dawah' ? [{ code: 'fisabilillah_education_dawah' }, { fundCode: 'SF-FSB-01' }, { legacyId: 'subf-fisabilillah-1' }] : []),
            ...(targetSubSearch === 'amil_operations' ? [{ code: 'amil_operations' }, { fundCode: 'SF-AML-01' }, { legacyId: 'subf-amil-1' }] : []),
          ],
        },
      });
    }

    if (!subFund && dto.specificFundId) {
      const isSubUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dto.specificFundId);
      subFund = await this.prisma.faqirMiskinSubFund.findFirst({
        where: {
          OR: [
            ...(isSubUuid ? [{ id: dto.specificFundId }] : []),
            { code: dto.specificFundId },
            { fundCode: dto.specificFundId },
            { legacyId: dto.specificFundId },
          ],
        },
      });
    }

    if (!subFund) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'UNMAPPED_FUND',
        'ยังไม่ได้กำหนดกองทุนที่สัมพันธ์กับประเภทความช่วยเหลือนี้',
      );
    }

    // 2. Resolve Fund Account (Level 1)
    const rawFundInput =
      dto.fundId?.trim() ||
      app.legacyAssessment?.recommendedFundId ||
      app.approvedFundId ||
      subFund?.fundAccountId ||
      undefined;

    let fund: any = null;
    if (rawFundInput) {
      const isFundUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawFundInput);
      fund = await this.prisma.fundAccount.findFirst({
        where: {
          OR: [
            ...(isFundUuid ? [{ id: rawFundInput }] : []),
            { code: rawFundInput },
            { legacyId: rawFundInput },
          ],
        },
      });
    }

    // Auto-resolve from Asnaf Category if still not found
    if (!fund) {
      const asnafClean = (app.asnafCategory || '').toLowerCase();
      let matchedCode = 'FND-ZKT-01';
      if (asnafClean.includes('gharim')) matchedCode = 'FND-ZKT-02';
      else if (asnafClean.includes('fisa') || asnafClean.includes('sabil')) matchedCode = 'FND-ZKT-03';
      else if (asnafClean.includes('ibn')) matchedCode = 'FND-ZKT-04';
      else if (asnafClean.includes('amil')) matchedCode = 'FND-OPR-01';
      else if (asnafClean.includes('muallaf') || asnafClean.includes('human')) matchedCode = 'FND-SDQ-01';

      fund = await this.prisma.fundAccount.findFirst({
        where: {
          OR: [
            { code: matchedCode },
            { primaryAsnafCode: asnafClean },
            { legacyId: 'fund-1' },
          ],
        },
      });
    }

    if (!fund) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'CANNOT_RESOLVE_FUND',
        `ไม่สามารถเชื่อมโยงบัญชีกองทุนสำหรับคำร้อง ${app.applicationNo} ได้ (อัสนัฟ: ${app.asnafCategory}) กรุณาตรวจสอบ Master Data กองทุน`,
      );
    }

    if (!fund.isActive) {
      throw new AppException(HttpStatus.BAD_REQUEST, 'FUND_INACTIVE', `บัญชีกองทุน "${fund.name}" ถูกปิดใช้งาน`);
    }

    const approvedDecimal = new Prisma.Decimal(dto.approvedAmount);
    const holdDelta = Math.round((dto.approvedAmount - prevApproved) * 100) / 100;
    const holdDeltaDecimal = new Prisma.Decimal(holdDelta);
    const nowIso = new Date().toISOString();
    const approvedDateStr = new Date().toLocaleDateString('th-TH');

    return await this.prisma.$transaction(async (tx) => {
      // Concurrency check (Phase 6): query latest balance inside transaction
      const freshFund = await tx.fundAccount.findUnique({
        where: { id: fund.id },
      });
      if (!freshFund || !freshFund.isActive) {
        throw new AppException(HttpStatus.BAD_REQUEST, 'FUND_UNAVAILABLE', `บัญชีกองทุน "${fund.name}" ไม่พร้อมใช้งาน`);
      }
      const liveTotalReceived = Number(freshFund.totalReceived || 0);
      const liveAvailableFund = Number(freshFund.availableAmount || 0) + prevApproved;
      if (liveTotalReceived > 0 && liveAvailableFund < dto.approvedAmount) {
        const shortage = dto.approvedAmount - liveAvailableFund;
        throw new AppException(
          HttpStatus.BAD_REQUEST,
          'INSUFFICIENT_FUNDS',
          `ยอดเงินคงเหลือจัดสรรได้ในบัญชีกองทุน "${freshFund.name}" ไม่เพียงพอ (คงเหลือ: ฿${liveAvailableFund.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท, ยอดที่ขออนุมัติ: ฿${dto.approvedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท, ขาดอีก: ฿${shortage.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)`,
        );
      }

      if (subFund) {
        const freshSubFund = await tx.faqirMiskinSubFund.findUnique({
          where: { id: subFund.id },
        });
        if (freshSubFund) {
          const liveSubAllocated = Number(freshSubFund.allocatedAmount || 0);
          const liveRemainingSubFund = Number(freshSubFund.remainingAmount || 0) + prevApproved;
          if (liveSubAllocated > 0 && liveRemainingSubFund < dto.approvedAmount) {
            const shortage = dto.approvedAmount - liveRemainingSubFund;
            throw new AppException(
              HttpStatus.BAD_REQUEST,
              'INSUFFICIENT_SUB_FUND_BALANCE',
              `ยอดงบประมาณคงเหลือในกองทุนเฉพาะเจาะจง "${freshSubFund.name}" ไม่เพียงพอ (คงเหลือ: ฿${liveRemainingSubFund.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท, ยอดที่ขออนุมัติ: ฿${dto.approvedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท, ขาดอีก: ฿${shortage.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)`,
            );
          }
        }
      }
      // 1) Update FundAccount (Level 1)
      await tx.fundAccount.update({
        where: { id: fund.id },
        data: {
          committedAmount: { increment: holdDeltaDecimal },
          ...(liveTotalReceived > 0 ? { availableAmount: { decrement: holdDeltaDecimal } } : {}),
          updatedAt: new Date(),
        },
      });

      // 2) Update Specific Sub-Fund (Level 2) if present
      if (subFund) {
        await tx.faqirMiskinSubFund.update({
          where: { id: subFund.id },
          data: {
            committedAmount: { increment: holdDeltaDecimal },
            ...(Number(subFund.allocatedAmount || 0) > 0 ? { remainingAmount: { decrement: holdDeltaDecimal } } : {}),
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
            committedAmount: { increment: holdDeltaDecimal },
            ...(Number(asnafAlloc.allocatedAmount || 0) > 0 ? { remainingAmount: { decrement: holdDeltaDecimal } } : {}),
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
      // Release Hold Commitment if previously approved or in wait_disbursement
      const refundAmount = app.approvedAmount ? Number(app.approvedAmount) : 0;
      if (refundAmount > 0 && app.approvedFundId) {
        const refundDecimal = new Prisma.Decimal(refundAmount);
        await tx.fundAccount.update({
          where: { id: app.approvedFundId },
          data: {
            committedAmount: { decrement: refundDecimal },
            availableAmount: { increment: refundDecimal },
            updatedAt: new Date(),
          },
        }).catch(() => {});

        if (app.approvedSpecificFundId) {
          await tx.faqirMiskinSubFund.update({
            where: { id: app.approvedSpecificFundId },
            data: {
              committedAmount: { decrement: refundDecimal },
              remainingAmount: { increment: refundDecimal },
              updatedAt: new Date(),
            },
          }).catch(() => {});
        }
      }

      const updatedApp = await tx.assistanceApplication.update({
        where: { id: app.id },
        data: {
          status: 'rejected',
          approvedAmount: null,
          approvedFundId: null,
          approvedSpecificFundId: null,
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
      // Release Hold Commitment if previously approved or in wait_disbursement
      const refundAmount = app.approvedAmount ? Number(app.approvedAmount) : 0;
      if (refundAmount > 0 && app.approvedFundId) {
        const refundDecimal = new Prisma.Decimal(refundAmount);
        await tx.fundAccount.update({
          where: { id: app.approvedFundId },
          data: {
            committedAmount: { decrement: refundDecimal },
            availableAmount: { increment: refundDecimal },
            updatedAt: new Date(),
          },
        }).catch(() => {});

        if (app.approvedSpecificFundId) {
          await tx.faqirMiskinSubFund.update({
            where: { id: app.approvedSpecificFundId },
            data: {
              committedAmount: { decrement: refundDecimal },
              remainingAmount: { increment: refundDecimal },
              updatedAt: new Date(),
            },
          }).catch(() => {});
        }
      }

      const updatedApp = await tx.assistanceApplication.update({
        where: { id: app.id },
        data: {
          status: targetStatus,
          approvedAmount: null,
          approvedFundId: null,
          approvedSpecificFundId: null,
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

  /**
   * Get real-time budget status and auto-resolved fund relations for an application
   */
  async getBudgetStatus(id: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const app = await this.prisma.assistanceApplication.findFirst({
      where: isUuid ? { id } : { OR: [{ applicationNo: id }, { legacyId: id }] },
      include: {
        legacyAssessment: true,
        beneficiary: {
          select: {
            id: true,
            title: true,
            firstName: true,
            lastName: true,
            registryNumber: true,
          },
        },
      },
    });

    if (!app) {
      throw new AppException(HttpStatus.NOT_FOUND, 'APPLICATION_NOT_FOUND', `ไม่พบคำร้องขอความช่วยเหลือรหัส ${id}`);
    }

    // 1. Resolve Specific Sub-Fund (Level 2) strictly by Assistance Type
    const cleanType = (app.assistanceType || '').trim().toLowerCase();
    const cleanId = (app.assistanceTypeId || '').trim().toLowerCase();
    let targetSubSearch: string | null = null;

    if (
      cleanType.includes('ทุนการศึกษา') ||
      cleanType.includes('การศึกษา') ||
      cleanType.includes('ค่าเล่าเรียน') ||
      cleanType.includes('อุปกรณ์การเรียน') ||
      cleanType === 'education' ||
      cleanId.includes('edu') ||
      cleanId === 'subf-4' ||
      cleanId === 'ast-4'
    ) {
      targetSubSearch = 'education';
    } else if (cleanType.includes('บ้านอัน-เราะห์มัต') || cleanType.includes('เราะห์มัต')) {
      targetSubSearch = 'housing';
    } else if (
      cleanType.includes('ซ่อมแซม') ||
      cleanType.includes('ที่อยู่อาศัย') ||
      cleanType === 'housing' ||
      cleanId.includes('house') ||
      cleanId === 'subf-2' ||
      cleanId === 'ast-2'
    ) {
      targetSubSearch = 'housing';
    } else if (
      cleanType.includes('ต่อยอดอาชีพ') ||
      cleanType.includes('สนับสนุนอาชีพ') ||
      cleanType.includes('ประกอบอาชีพ') ||
      cleanType.includes('ส่งเสริมอาชีพ') ||
      cleanType.includes('อาชีพ') ||
      cleanType === 'career' ||
      cleanId.includes('career') ||
      cleanId === 'subf-3' ||
      cleanId === 'ast-3'
    ) {
      targetSubSearch = 'career';
    } else if (
      cleanType.includes('ปัจจัยยังชีพ') ||
      cleanType.includes('ยังชีพ') ||
      cleanType.includes('ค่าครองชีพ') ||
      cleanType.includes('อาหาร') ||
      cleanType === 'living' ||
      cleanId.includes('living') ||
      cleanId === 'subf-1' ||
      cleanId === 'ast-1'
    ) {
      targetSubSearch = 'living';
    } else if (
      cleanType.includes('ช่วยเหลือฉุกเฉิน') ||
      cleanType.includes('ฉุกเฉิน') ||
      cleanType.includes('บรรเทาทุกข์') ||
      cleanType.includes('ภัยพิบัติ') ||
      cleanType.includes('ผู้ประสบภัย') ||
      cleanType === 'emergency' ||
      cleanId.includes('emergency') ||
      cleanId === 'subf-5' ||
      cleanId === 'ast-5'
    ) {
      targetSubSearch = 'emergency';
    } else if (
      cleanType.includes('หนี้สิน') ||
      cleanType.includes('ปลดหนี้') ||
      cleanType.includes('ฆอรีมีน') ||
      cleanId.includes('gharim')
    ) {
      targetSubSearch = 'gharimin_debt_relief';
    } else if (
      cleanType.includes('มุอัลลัฟ') ||
      cleanType.includes('มุสลิมใหม่') ||
      cleanId.includes('muallaf')
    ) {
      targetSubSearch = 'muallaf_welfare';
    } else if (
      cleanType.includes('ผู้เดินทาง') ||
      cleanType.includes('พลัดถิ่น') ||
      cleanType.includes('อิบนุสสะบีล') ||
      cleanId.includes('ibnsabil')
    ) {
      targetSubSearch = 'ibnsabil_travel_aid';
    } else if (
      cleanType.includes('มนุษยธรรม') ||
      cleanType.includes('ผู้ลี้ภัย') ||
      cleanId.includes('human')
    ) {
      targetSubSearch = 'humanitarian_relief';
    } else if (
      cleanType.includes('ฟีสะบีลิลลาฮ์') ||
      cleanType.includes('ส่งเสริมศาสนา') ||
      cleanId.includes('fisabilillah')
    ) {
      targetSubSearch = 'fisabilillah_education_dawah';
    } else if (
      cleanType.includes('อามิล') ||
      cleanId.includes('amil')
    ) {
      targetSubSearch = 'amil_operations';
    }

    let subFund: any = null;

    if (targetSubSearch) {
      subFund = await this.prisma.faqirMiskinSubFund.findFirst({
        where: {
          OR: [
            { code: targetSubSearch },
            { fundCode: targetSubSearch.toUpperCase() },
            ...(targetSubSearch === 'education' ? [{ code: 'education' }, { fundCode: 'SF-FM-04' }, { legacyId: 'subf-4' }] : []),
            ...(targetSubSearch === 'housing' ? [{ code: 'housing' }, { fundCode: 'SF-FM-02' }, { legacyId: 'subf-2' }] : []),
            ...(targetSubSearch === 'career' ? [{ code: 'career' }, { fundCode: 'SF-FM-03' }, { legacyId: 'subf-3' }] : []),
            ...(targetSubSearch === 'living' ? [{ code: 'living' }, { fundCode: 'SF-FM-01' }, { legacyId: 'subf-1' }] : []),
            ...(targetSubSearch === 'emergency' ? [{ code: 'emergency' }, { fundCode: 'SF-FM-05' }, { legacyId: 'subf-5' }] : []),
            ...(targetSubSearch === 'gharimin_debt_relief' ? [{ code: 'gharimin_debt_relief' }, { fundCode: 'SF-GHR-01' }, { legacyId: 'subf-gharimin-1' }] : []),
            ...(targetSubSearch === 'muallaf_welfare' ? [{ code: 'muallaf_welfare' }, { fundCode: 'SF-MLF-01' }, { legacyId: 'subf-muallaf-1' }] : []),
            ...(targetSubSearch === 'ibnsabil_travel_aid' ? [{ code: 'ibnsabil_travel_aid' }, { fundCode: 'SF-IBS-01' }, { legacyId: 'subf-ibnsabil-1' }] : []),
            ...(targetSubSearch === 'humanitarian_relief' ? [{ code: 'humanitarian_relief' }, { fundCode: 'SF-HUM-01' }, { legacyId: 'subf-humanitarian-1' }] : []),
            ...(targetSubSearch === 'fisabilillah_education_dawah' ? [{ code: 'fisabilillah_education_dawah' }, { fundCode: 'SF-FSB-01' }, { legacyId: 'subf-fisabilillah-1' }] : []),
            ...(targetSubSearch === 'amil_operations' ? [{ code: 'amil_operations' }, { fundCode: 'SF-AML-01' }, { legacyId: 'subf-amil-1' }] : []),
          ],
        },
      });
    }

    // 2. Resolve Main Fund Account (Level 1)
    const rawFundInput =
      app.legacyAssessment?.recommendedFundId ||
      app.approvedFundId ||
      subFund?.fundAccountId ||
      undefined;

    let fund: any = null;
    if (rawFundInput) {
      const isFundUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawFundInput);
      fund = await this.prisma.fundAccount.findFirst({
        where: {
          OR: [
            ...(isFundUuid ? [{ id: rawFundInput }] : []),
            { code: rawFundInput },
            { legacyId: rawFundInput },
          ],
        },
      });
    }

    if (!fund) {
      const asnafClean = (app.asnafCategory || '').toLowerCase();
      let matchedCode = 'FND-ZKT-01';
      if (asnafClean.includes('gharim')) matchedCode = 'FND-ZKT-02';
      else if (asnafClean.includes('fisa') || asnafClean.includes('sabil')) matchedCode = 'FND-ZKT-03';
      else if (asnafClean.includes('ibn')) matchedCode = 'FND-ZKT-04';
      else if (asnafClean.includes('amil')) matchedCode = 'FND-OPR-01';
      else if (asnafClean.includes('muallaf') || asnafClean.includes('human')) matchedCode = 'FND-SDQ-01';

      fund = await this.prisma.fundAccount.findFirst({
        where: {
          OR: [
            { code: matchedCode },
            { primaryAsnafCode: asnafClean },
            { legacyId: 'fund-1' },
          ],
        },
      });
    }

    const asnafLabels: Record<string, string> = {
      faqir_miskin: 'ฟากีร–มิสกิน (Faqir & Miskin)',
      faqir: 'ฟากีร (The Destitute)',
      miskin: 'มิสกิน (The Needy)',
      amil: 'อามิลีน (Amil / Zakat Admin)',
      muallaf: 'มุอัลลัฟ (Muallaf)',
      gharimin: 'อัล-ฆอรีมีน (Gharimin / Debtors)',
      fisabilillah: 'ฟีสะบีลิลลาฮ์ (Fi Sabilillah)',
      ibnsabil: 'อิบนุสสะบีล (Ibn Sabil / Wayfarer)',
      humanitarian: 'มนุษยธรรมและบรรเทาทุกข์',
    };

    const asnafDisplay = asnafLabels[app.asnafCategory] || app.asnafCategory;
    const requestedAmount = Number(app.requestedAmount);
    const recommendedAmount = app.legacyAssessment?.recommendedAmount ? Number(app.legacyAssessment.recommendedAmount) : requestedAmount;

    const mainAllocated = fund ? Number(fund.totalReceived || 0) : 0;
    const mainDisbursed = fund ? Number(fund.disbursedAmount || 0) : 0;
    const mainCommitted = fund ? Number(fund.committedAmount || 0) : 0;
    const mainAvailable = fund ? Number(fund.availableAmount || 0) : 0;

    const subAllocated = subFund ? Number(subFund.allocatedAmount || subFund.targetAmount || 0) : 0;
    const subDisbursed = subFund ? Number(subFund.disbursedAmount || 0) : 0;
    const subCommitted = subFund ? Number(subFund.committedAmount || 0) : 0;
    const subAvailable = subFund ? Number(subFund.remainingAmount || 0) : 0;

    return {
      applicationId: app.id,
      applicationNo: app.applicationNo,
      status: app.status,
      requestInfo: {
        beneficiaryName: app.beneficiary ? formatPersonName({ prefix: app.beneficiary.title, firstName: app.beneficiary.firstName, lastName: app.beneficiary.lastName }) : '',
        beneficiaryRegistryNo: app.beneficiary?.registryNumber || '',
        asnafCategory: app.asnafCategory,
        asnafDisplayName: asnafDisplay,
        assistanceType: app.assistanceType || 'ปัจจัยยังชีพ',
        assistanceTypeId: app.assistanceTypeId,
        assistanceFormat: (app as any).assistanceFormat || 'โอนเงินเข้าบัญชี (Bank Transfer)',
        requestedAmount,
        recommendedAmount,
      },
      resolvedFunds: {
        mainFund: fund
          ? {
              id: fund.id,
              code: fund.code,
              name: fund.name,
              category: fund.category,
              isActive: fund.isActive,
              isAutoResolved: true,
            }
          : null,
        subFund: subFund
          ? {
              id: subFund.id,
              code: subFund.code || subFund.fundCode,
              fundCode: subFund.fundCode,
              name: subFund.name,
              primaryGroupCode: subFund.primaryGroupCode,
              isActive: subFund.isActive ?? true,
              isAutoResolved: true,
            }
          : null,
      },
      budgetStatus: {
        mainFund: {
          allocated: mainAllocated,
          disbursed: mainDisbursed,
          committed: mainCommitted,
          availableBeforeApproval: mainAvailable,
        },
        subFund: {
          allocated: subAllocated,
          disbursed: subDisbursed,
          committed: subCommitted,
          availableBeforeApproval: subAvailable,
        },
      },
      isResolvable: Boolean(fund && subFund),
      isMapped: Boolean(fund && subFund),
      unmappedWarning: (fund && subFund) ? null : 'ยังไม่ได้กำหนดกองทุนที่สัมพันธ์กับประเภทความช่วยเหลือนี้',
    };
  }
}
