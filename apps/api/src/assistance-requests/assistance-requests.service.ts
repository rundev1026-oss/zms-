import { Injectable, HttpStatus } from '@nestjs/common';
import { formatPersonName } from '@zms/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/app.exception';
import type { AuthUser } from '../common/auth-user';
import { completedAgeYears } from '../beneficiaries/beneficiary-fields';
import { maskIdentityNumber } from '../beneficiaries/mask-identity';
import {
  CreateAssistanceRequestDto,
  UpdateAssistanceRequestDto,
  QueryAssistanceRequestsDto,
  UpdateRequestStatusDto,
  CheckBeneficiaryDto,
  AddApplicationDocumentDto,
} from './dto/assistance-request.dto';

@Injectable()
export class AssistanceRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Check beneficiary eligibility before creating a request
   */
  async checkBeneficiary(dto: CheckBeneficiaryDto, user?: AuthUser) {
    const nationalId = dto.nationalId ? dto.nationalId.replace(/[^0-9]/g, '') : undefined;
    const registrationNo = dto.registrationNo ? dto.registrationNo.trim() : undefined;
    const memberIdInput = dto.memberId ? dto.memberId.trim() : undefined;
    const beneficiaryId = dto.beneficiaryId ? dto.beneficiaryId.trim() : undefined;

    if (!nationalId && !registrationNo && !memberIdInput && !beneficiaryId) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        'กรุณาระบุเลขประจำตัวประชาชน หรือรหัสสมาชิก (MB-...)',
      );
    }

    const isUuid = beneficiaryId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(beneficiaryId);

    const orClauses: Prisma.BeneficiaryWhereInput[] = [];
    if (isUuid) {
      orClauses.push({ id: beneficiaryId });
    } else if (beneficiaryId) {
      orClauses.push({ memberId: beneficiaryId }, { registryNumber: beneficiaryId });
    }
    if (nationalId && nationalId.length === 13) {
      orClauses.push({ identityNumberNormalized: nationalId });
    }
    if (memberIdInput) {
      orClauses.push({ memberId: memberIdInput });
    }
    if (registrationNo) {
      orClauses.push({ memberId: registrationNo }, { registryNumber: registrationNo });
    }

    const beneficiary = await this.prisma.beneficiary.findFirst({
      where: {
        deletedAt: null,
        ...(orClauses.length > 0 ? { OR: orClauses } : { id: beneficiaryId }),
      },
      include: {
        household: {
          include: {
            members: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        incomeProfile: true,
        addresses: true,
        documents: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        assessments: {
          include: { category: true },
          orderBy: [{ assessedAt: 'desc' }, { createdAt: 'desc' }],
          take: 10,
        },
      },
    });

    if (!beneficiary) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        'BENEFICIARY_NOT_FOUND',
        'เลขบัตรประชาชนหรือทะเบียนนี้ยังไม่ได้ขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต กรุณาดำเนินการขึ้นทะเบียนก่อนยื่นคำร้อง',
      );
    }

    const memberStatusUpper = String(beneficiary.memberStatus || 'ACTIVE').toUpperCase();
    const statusUpper = String(beneficiary.status || '').toUpperCase();
    if (
      memberStatusUpper === 'SUSPENDED' ||
      memberStatusUpper === 'ARCHIVED' ||
      statusUpper === 'SUSPENDED' ||
      statusUpper === 'INELIGIBLE' ||
      statusUpper === 'DISQUALIFIED'
    ) {
      const statusLabel =
        memberStatusUpper === 'ARCHIVED'
          ? 'ปิดประวัติถาวร'
          : memberStatusUpper === 'SUSPENDED' || statusUpper === 'SUSPENDED'
            ? 'ระงับทะเบียน'
            : 'ไม่มีคุณสมบัติตามเกณฑ์';
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'BENEFICIARY_INELIGIBLE',
        `ทะเบียนนี้อยู่ในสถานะ "${statusLabel}" จึงไม่สามารถยื่นคำร้องขอความช่วยเหลือได้`,
      );
    }

    const fullName = formatPersonName({
      prefix: beneficiary.title,
      firstName: beneficiary.firstName,
      lastName: beneficiary.lastName,
    });
    const idNum = beneficiary.identityNumberNormalized || beneficiary.identityNumber || '';
    const canSeeSensitive = user?.permissions?.includes('beneficiaries.read.sensitive') ?? true;
    const canViewDocs =
      user?.permissions?.includes('documents.read') ??
      user?.permissions?.includes('beneficiaries.read') ??
      true;
    const currentAddr =
      beneficiary.addresses?.find((a) => a.addressType === 'CURRENT') ||
      beneficiary.addresses?.[0] ||
      null;
    const latestAsm = beneficiary.assessments?.[0] ?? null;
    const asnafCode = latestAsm?.category?.code || 'miskin';
    const birthDateIso = beneficiary.dateOfBirth
      ? beneficiary.dateOfBirth.toISOString().slice(0, 10)
      : null;
    const ageYears = birthDateIso ? completedAgeYears(birthDateIso, new Date()) : null;

    const addressLine = currentAddr?.addressLine ?? beneficiary.household?.address ?? '';
    const community = currentAddr?.community ?? beneficiary.household?.community ?? '';
    const subdistrict = currentAddr?.subdistrict ?? beneficiary.household?.subdistrict ?? '';
    const district = currentAddr?.district ?? beneficiary.household?.district ?? '';
    const province = currentAddr?.province ?? beneficiary.household?.province ?? '';
    const postalCode = currentAddr?.postalCode ?? '';

    const missingFields: string[] = [];
    if (!beneficiary.firstName?.trim() || !beneficiary.lastName?.trim()) {
      missingFields.push('ชื่อ-นามสกุล');
    }
    if (!idNum || idNum.length !== 13) {
      missingFields.push('เลขประจำตัวประชาชน 13 หลัก');
    }
    if (!beneficiary.phone?.trim()) {
      missingFields.push('เบอร์โทรศัพท์ติดต่อ');
    }
    if (!addressLine.trim() || !province.trim()) {
      missingFields.push('ที่อยู่ปัจจุบันและจังหวัด');
    }

    const householdMembers = (beneficiary.household?.members || []).map((m) => ({
      id: m.id,
      fullName: m.fullName,
      relationship: m.relationship ?? '',
      ageYears: m.ageYears ?? null,
      occupation: m.occupation ?? '',
      monthlyIncome: m.monthlyIncome != null ? Number(m.monthlyIncome) : 0,
      healthNote: m.healthNotes ?? '',
    }));

    const monthlyIncome =
      beneficiary.incomeProfile != null
        ? Number((beneficiary.incomeProfile as any).totalMonthlyIncome ?? 0) ||
          Number(beneficiary.household?.householdIncome ?? 0)
        : Number(beneficiary.household?.householdIncome ?? 0);
    const monthlyExpense =
      beneficiary.incomeProfile != null
        ? Number((beneficiary.incomeProfile as any).totalMonthlyExpense ?? 0) ||
          Number(beneficiary.household?.householdExpense ?? 0)
        : Number(beneficiary.household?.householdExpense ?? 0);
    const debtAmount =
      beneficiary.incomeProfile != null
        ? Number((beneficiary.incomeProfile as any).totalDebt ?? 0) ||
          Number(beneficiary.household?.debtAmount ?? 0)
        : Number(beneficiary.household?.debtAmount ?? 0);

    const registryDocuments = canViewDocs
      ? (beneficiary.documents || []).map((doc) => ({
          id: doc.id,
          name: doc.originalFileName,
          category: doc.documentType,
          mimeType: doc.mimeType,
          fileSize: doc.sizeBytes,
          status: String(doc.status || 'UPLOADED').toLowerCase(),
          createdAt: doc.createdAt.toISOString(),
          downloadUrl: `/api/registry/${beneficiary.id}/documents/${doc.id}`,
        }))
      : [];

    const regYearCe = beneficiary.createdAt.getFullYear();
    const regYearBe = regYearCe + 543;

    const matchingAsm = (beneficiary.assessments || []).find((asm) => {
      const d = asm.assessedAt || asm.createdAt;
      const asmCe = d ? (d instanceof Date ? d.getFullYear() : new Date(d).getFullYear()) : null;
      const asmBe = asmCe ? asmCe + 543 : null;
      const periodStr = String(asm.assessmentPeriod || '');
      const numStr = String(asm.assessmentNumber || '');
      return (
        asmCe === regYearCe ||
        asmBe === regYearBe ||
        periodStr.includes(String(regYearBe)) ||
        periodStr.includes(String(regYearCe)) ||
        numStr.includes(String(regYearCe)) ||
        numStr.includes(String(regYearBe))
      );
    }) || null;

    return {
      found: true,
      canApply: true,
      beneficiary: {
        id: beneficiary.id,
        memberId: beneficiary.memberId ?? beneficiary.registryNumber,
        memberCode: beneficiary.memberId ?? beneficiary.registryNumber,
        registryNumber: beneficiary.registryNumber,
        registrationNo: beneficiary.memberId ?? beneficiary.registryNumber,
        titlePrefix: beneficiary.title ?? '',
        firstName: beneficiary.firstName,
        lastName: beneficiary.lastName,
        fullName,
        nationalId: canSeeSensitive ? idNum : maskIdentityNumber(idNum),
        nationalIdMasked: maskIdentityNumber(idNum),
        birthDate: birthDateIso,
        age: ageYears,
        phone: beneficiary.phone ?? '',
        occupation: beneficiary.occupation ?? '',
        maritalStatus: beneficiary.maritalStatus ?? '',
        email: '',
        asnafCategory: asnafCode,
        asnafNameTh: latestAsm?.category?.nameTh ?? null,
        branchId: 'br-hq',
        branchName: 'สำนักงานใหญ่ กรุงเทพมหานคร',
        memberStatus: beneficiary.memberStatus || 'ACTIVE',
        registrationStatus: beneficiary.status,
        createdAt: beneficiary.createdAt.toISOString(),
        registrationDate: beneficiary.createdAt.toISOString().slice(0, 10),
        registrationYearBe: String(regYearBe),
        registrationYearCe: String(regYearCe),
        matchingAssessment: matchingAsm
          ? {
              id: matchingAsm.id,
              assessmentNumber: matchingAsm.assessmentNumber ?? null,
              assessmentPeriod: matchingAsm.assessmentPeriod ?? null,
              assessmentDate: (matchingAsm.assessedAt instanceof Date
                ? matchingAsm.assessedAt
                : new Date(matchingAsm.assessedAt)
              )
                .toISOString()
                .slice(0, 10),
              yearBe: String(regYearBe),
              yearCe: String(regYearCe),
              status: matchingAsm.status,
              eligibilityResult: matchingAsm.eligibilityResult ?? null,
              asnafCode: matchingAsm.category?.code ?? asnafCode,
              asnafNameTh: matchingAsm.category?.nameTh ?? '',
            }
          : null,
        hasAssessmentInYear: Boolean(matchingAsm),
        latestAssessmentId: matchingAsm?.id ?? null,
        latestAssessmentNumber: matchingAsm?.assessmentNumber ?? null,
        latestAssessmentStatus: matchingAsm?.status ?? null,
        assessments: (beneficiary.assessments || []).map((a) => ({
          id: a.id,
          assessmentNumber: a.assessmentNumber ?? null,
          assessmentPeriod: a.assessmentPeriod ?? null,
          assessmentType: a.assessmentType,
          assessmentDate: a.assessedAt.toISOString().slice(0, 10),
          yearCe: a.assessedAt.getFullYear(),
          yearBe: a.assessedAt.getFullYear() + 543,
          status: a.status,
          eligibilityResult: a.eligibilityResult ?? null,
          asnafCode: a.category?.code ?? asnafCode,
          asnafNameTh: a.category?.nameTh ?? '',
        })),
        address: addressLine,
        community,
        subdistrict,
        district,
        province,
        postalCode,
        household: {
          memberCount:
            beneficiary.household?.memberCount ??
            (householdMembers.length > 0 ? householdMembers.length + 1 : 1),
          members: householdMembers,
          monthlyIncome,
          monthlyExpense,
          debtAmount,
          familySituationSummary:
            beneficiary.household?.familySituationSummary ??
            beneficiary.household?.additionalNotes ??
            '',
          urgentNeeds:
            beneficiary.household?.urgentNeeds ??
            beneficiary.incomeProfile?.assistanceNeeds ??
            '',
          coordinatorInfo: beneficiary.household?.coordinatorInfo ?? '',
          certifierInfo: beneficiary.household?.certifierInfo ?? '',
        },
        registryDocuments,
        missingFields,
        isProfileComplete: missingFields.length === 0,
      },
    };
  }

  /**
   * Create an assistance request with sequential application number
   */
  async create(dto: CreateAssistanceRequestDto, user?: AuthUser) {
    if (!dto.requestedAmount || dto.requestedAmount <= 0) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'INVALID_AMOUNT',
        'จำนวนเงินที่ขอความช่วยเหลือต้องมากกว่า 0 บาท',
      );
    }

    // Resolve beneficiary by id, nationalId, or registryNumber
    const benInput = dto.beneficiaryId.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(benInput);
    const cleanId = benInput.replace(/[^0-9]/g, '');

    const orClauses: Prisma.BeneficiaryWhereInput[] = [];
    if (isUuid) orClauses.push({ id: benInput });
    if (cleanId.length === 13) orClauses.push({ identityNumberNormalized: cleanId });
    orClauses.push({ memberId: benInput }, { registryNumber: benInput });

    const beneficiary = await this.prisma.beneficiary.findFirst({
      where: { deletedAt: null, OR: orClauses },
      include: {
        assessments: {
          include: { category: true },
          orderBy: [{ assessedAt: 'desc' }, { createdAt: 'desc' }],
          take: 10,
        },
      },
    });

    if (!beneficiary) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        'BENEFICIARY_NOT_FOUND',
        'ไม่พบข้อมูลผู้ขอรับความช่วยเหลือในระบบ กรุณาตรวจสอบเลขบัตรประชาชนหรือรหัสผู้มีสิทธิ์',
      );
    }

    const memberStatusUpper = String(beneficiary.memberStatus || 'ACTIVE').toUpperCase();
    const statusUpper = String(beneficiary.status || '').toUpperCase();
    if (
      memberStatusUpper === 'SUSPENDED' ||
      memberStatusUpper === 'ARCHIVED' ||
      statusUpper === 'SUSPENDED' ||
      statusUpper === 'INELIGIBLE' ||
      statusUpper === 'DISQUALIFIED'
    ) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'BENEFICIARY_INELIGIBLE',
        'ผู้ขอรับความช่วยเหลืออยู่ในสถานะถูกระงับสิทธิ์หรือไม่ผ่านเกณฑ์',
      );
    }

    const trimmedIdempotencyKey = dto.idempotencyKey?.trim() || undefined;
    if (trimmedIdempotencyKey) {
      // 1. Direct check via classificationSnapshot
      const existingBySnapshot = await this.prisma.assistanceApplication.findFirst({
        where: {
          beneficiaryId: beneficiary.id,
          classificationSnapshot: {
            contains: `"idempotencyKey":"${trimmedIdempotencyKey}"`,
          },
        },
        include: {
          documents: true,
          history: { orderBy: { createdAt: 'asc' } },
          assessment: {
            select: {
              id: true,
              assessmentNumber: true,
              assessmentPeriod: true,
              status: true,
              eligibilityResult: true,
            },
          },
        },
      });

      if (existingBySnapshot) {
        return {
          ...existingBySnapshot,
          periodicAssessment: existingBySnapshot.assessment,
          requestedAmount: Number(existingBySnapshot.requestedAmount),
          approvedAmount: existingBySnapshot.approvedAmount
            ? Number(existingBySnapshot.approvedAmount)
            : null,
          idempotentReplay: true,
        };
      }

      // 2. Audit log fallback
      const priorLog = await this.prisma.auditLog.findFirst({
        where: {
          action: 'ASSISTANCE_REQUEST_CREATE',
          metadata: {
            path: ['idempotencyKey'],
            equals: trimmedIdempotencyKey,
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (priorLog?.resourceId) {
        const existingCreated = await this.prisma.assistanceApplication.findUnique({
          where: { id: priorLog.resourceId },
          include: {
            documents: true,
            history: { orderBy: { createdAt: 'asc' } },
            assessment: {
              select: {
                id: true,
                assessmentNumber: true,
                assessmentPeriod: true,
                status: true,
                eligibilityResult: true,
              },
            },
          },
        });
        if (existingCreated) {
          return {
            ...existingCreated,
            periodicAssessment: existingCreated.assessment,
            requestedAmount: Number(existingCreated.requestedAmount),
            approvedAmount: existingCreated.approvedAmount
              ? Number(existingCreated.approvedAmount)
              : null,
            idempotentReplay: true,
          };
        }
      }
    }

    const fiscalYear = dto.fiscalYear?.trim() || (new Date().getFullYear() + 543).toString();
    const prefix = `APP-${fiscalYear}-`;

    const nowIso = new Date().toISOString();
    const actorId = user?.id ?? null;
    const actorName = user?.displayName ?? 'เจ้าหน้าที่ฝ่ายสงเคราะห์';

    return await this.prisma.$transaction(async (tx) => {
      // Guard against accidental rapid double-click submissions within 10 seconds
      const requestedDecimal = new Prisma.Decimal(dto.requestedAmount);
      const tenSecondsAgo = new Date(Date.now() - 10_000);
      const recentDuplicate = await tx.assistanceApplication.findFirst({
        where: {
          beneficiaryId: beneficiary.id,
          assistanceType: dto.assistanceType || 'cash',
          requestedAmount: requestedDecimal,
          necessityDetails: dto.necessityDetails || null,
          createdById: actorId,
          createdAt: { gte: tenSecondsAgo },
        },
        include: {
          documents: true,
          assessment: {
            select: {
              id: true,
              assessmentNumber: true,
              assessmentPeriod: true,
              status: true,
              eligibilityResult: true,
            },
          },
        },
      });
      if (recentDuplicate) {
        throw new AppException(
          HttpStatus.CONFLICT,
          'DUPLICATE_SUBMISSION',
          `ระบบตรวจพบการส่งคำร้องซ้ำในเวลาไล่เลี่ยกัน (เลขคำร้อง ${recentDuplicate.applicationNo}) กรุณาตรวจสอบรายการคำร้องที่บันทึกแล้ว`,
        );
      }

      // Find all existing application numbers for this fiscal year to determine true maxSeq
      const existingApps = await tx.assistanceApplication.findMany({
        where: {
          applicationNo: { startsWith: prefix },
        },
        select: { applicationNo: true },
      });

      let maxSeq = 0;
      for (const a of existingApps) {
        const parts = a.applicationNo.split('-');
        if (parts[2]) {
          const num = parseInt(parts[2], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }

      let nextSeq = maxSeq + 1;
      let applicationNo = `${prefix}${nextSeq.toString().padStart(6, '0')}`;

      const existingSet = new Set(existingApps.map((a) => a.applicationNo));
      while (existingSet.has(applicationNo)) {
        nextSeq++;
        applicationNo = `${prefix}${nextSeq.toString().padStart(6, '0')}`;
      }

      let linkedAssessmentId: string | null = null;
      const regYearCe = beneficiary.createdAt.getFullYear();
      const regYearBe = regYearCe + 543;

      if (dto.assessmentId) {
        const verifiedAsm = await tx.beneficiaryAsnafAssessment.findFirst({
          where: { id: dto.assessmentId, beneficiaryId: beneficiary.id },
          include: { category: true },
        });
        if (!verifiedAsm) {
          throw new AppException(
            HttpStatus.BAD_REQUEST,
            'INVALID_ASSESSMENT',
            'ไม่พบรอบการประเมินสิทธิ์ที่ระบุสำหรับสมาชิกรายนี้',
          );
        }

        const asmDate = verifiedAsm.assessedAt || verifiedAsm.createdAt;
        const asmCe = asmDate instanceof Date ? asmDate.getFullYear() : new Date(asmDate).getFullYear();
        const asmBe = asmCe + 543;
        const periodStr = String(verifiedAsm.assessmentPeriod || '');
        const numStr = String(verifiedAsm.assessmentNumber || '');
        const isYearMatch =
          asmCe === regYearCe ||
          asmBe === regYearBe ||
          periodStr.includes(String(regYearBe)) ||
          periodStr.includes(String(regYearCe)) ||
          numStr.includes(String(regYearCe)) ||
          numStr.includes(String(regYearBe));

        if (!isYearMatch) {
          throw new AppException(
            HttpStatus.BAD_REQUEST,
            'ASSESSMENT_YEAR_MISMATCH',
            `รอบการประเมินสิทธิ์ที่ระบุไม่ตรงกับปีที่อ้างอิงจากข้อมูลทะเบียน (ปี ${regYearBe})`,
          );
        }
        linkedAssessmentId = verifiedAsm.id;
      } else {
        // Auto-link matching assessment for this beneficiary in the registration year if one exists
        const candidateAsm = (beneficiary.assessments || []).find((asm) => {
          const asmDate = asm.assessedAt || asm.createdAt;
          const asmCe = asmDate instanceof Date ? asmDate.getFullYear() : new Date(asmDate).getFullYear();
          const asmBe = asmCe + 543;
          const periodStr = String(asm.assessmentPeriod || '');
          const numStr = String(asm.assessmentNumber || '');
          return (
            asmCe === regYearCe ||
            asmBe === regYearBe ||
            periodStr.includes(String(regYearBe)) ||
            periodStr.includes(String(regYearCe)) ||
            numStr.includes(String(regYearCe)) ||
            numStr.includes(String(regYearBe))
          );
        });
        linkedAssessmentId = candidateAsm ? candidateAsm.id : null;
      }

      const defaultAsnaf =
        beneficiary.assessments?.find((a) => a.id === linkedAssessmentId)?.category?.code ||
        beneficiary.assessments?.[0]?.category?.code ||
        'miskin';

      const application = await tx.assistanceApplication.create({
        data: {
          applicationNo,
          beneficiaryId: beneficiary.id,
          assessmentId: linkedAssessmentId,
          asnafCategory: dto.asnafCategory || defaultAsnaf,
          primaryGroupCode: dto.primaryGroupCode || null,
          requestedAmount: requestedDecimal,
          urgencyLevel: dto.urgencyLevel || 'normal',
          status: dto.status === 'draft' ? 'draft' : 'submitted',
          appliedDate: nowIso,
          branchId: dto.branchId || 'br-hq',
          branchName: dto.branchName || 'สำนักงานใหญ่ กรุงเทพมหานคร',
          hardshipReasons: dto.hardshipReasons || null,
          necessityDetails: dto.necessityDetails || null,
          assistanceType: dto.assistanceType || 'cash',
          assistanceTypeDetails: dto.assistanceTypeDetails || null,
          assistanceTypeId: dto.assistanceTypeId || null,
          assistanceGroup: dto.assistanceGroup || 'core',
          specificFundId: dto.specificFundId || null,
          specificFundCode: dto.specificFundCode || null,
          specificFundName: dto.specificFundName || null,
          fiscalYear,
          memberId: beneficiary.memberId ?? null,
          registrationNo: beneficiary.registryNumber,
          classificationSnapshot: JSON.stringify({
            idempotencyKey: trimmedIdempotencyKey || null,
            primaryGroupCode: dto.primaryGroupCode || null,
            specificFundCode: dto.specificFundCode || null,
            specificFundName: dto.specificFundName || null,
            assistanceFormatId: dto.assistanceFormatId || null,
            assistanceFormatCode: dto.assistanceFormatCode || null,
            assistanceFormatName: dto.assistanceFormatName || null,
            deliveryMethod: dto.deliveryMethod || null,
          }),
          createdById: actorId,
        },
        include: {
          assessment: {
            select: {
              id: true,
              assessmentNumber: true,
              assessmentPeriod: true,
              status: true,
              eligibilityResult: true,
            },
          },
        },
      });

      // Persist request-specific documents separately in application_documents (never alters beneficiary_documents)
      const createdDocs = [];
      if (Array.isArray(dto.documents) && dto.documents.length > 0) {
        for (const docDto of dto.documents) {
          if (!docDto?.name || !docDto?.fileUrl) continue;
          const createdDoc = await tx.applicationDocument.create({
            data: {
              applicationId: application.id,
              beneficiaryId: beneficiary.id,
              name: docDto.name,
              category: docDto.category || 'other_doc',
              fileUrl: docDto.fileUrl,
              status: 'pending',
              uploadDate: nowIso,
              mimeType: docDto.mimeType || 'application/octet-stream',
              fileSize: Number(docDto.fileSize || 0),
              isConfidential: docDto.isConfidential ?? true,
              uploadedById: actorId,
              uploadedByName: actorName,
              storageProvider: docDto.storageProvider || 'local',
              storagePath: docDto.storagePath || docDto.fileUrl,
            },
          });
          createdDocs.push(createdDoc);
        }
      }

      // Write initial application history
      await tx.applicationHistory.create({
        data: {
          applicationId: application.id,
          status: dto.status === 'draft' ? 'draft' : 'submitted',
          timestamp: nowIso,
          changedById: actorId || 'system',
          changedByName: actorName,
          notes:
            dto.status === 'draft'
              ? `บันทึกฉบับร่างคำร้องขอความช่วยเหลือ (${dto.assistanceType || 'cash'}) วงเงิน ฿${requestedDecimal.toFixed(2)}`
              : `ยื่นคำร้องขอความช่วยเหลือ (${dto.assistanceType || 'cash'}) วงเงิน ฿${requestedDecimal.toFixed(2)}`,
        },
      });

      // Write audit log
      await this.audit.record(tx, {
        actorId,
        action: 'ASSISTANCE_REQUEST_CREATE',
        resourceType: 'assistance_application',
        resourceId: application.id,
        metadata: {
          applicationNo: application.applicationNo,
          beneficiaryId: beneficiary.id,
          memberId: beneficiary.memberId ?? beneficiary.registryNumber,
          requestedAmount: requestedDecimal.toFixed(2),
          documentCount: createdDocs.length,
          ...(trimmedIdempotencyKey ? { idempotencyKey: trimmedIdempotencyKey } : {}),
        },
      });

      return {
        ...application,
        documents: createdDocs,
        periodicAssessment: application.assessment,
        requestedAmount: Number(application.requestedAmount),
        approvedAmount: application.approvedAmount ? Number(application.approvedAmount) : null,
      };
    });
  }

  /**
   * Search and paginated list of assistance requests
   */
  async list(query: QueryAssistanceRequestsDto, user?: AuthUser) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(query.limit || 20)));
    const skip = (page - 1) * limit;

    const where: Prisma.AssistanceApplicationWhereInput = {};

    if (query.status && query.status.trim()) {
      where.status = query.status.trim();
    }

    if (query.asnafCategory && query.asnafCategory.trim()) {
      where.asnafCategory = query.asnafCategory.trim();
    }

    if (query.branchId && query.branchId.trim()) {
      where.branchId = query.branchId.trim();
    }

    if (query.beneficiaryId) {
      where.beneficiaryId = query.beneficiaryId;
    }

    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      const cleanQ = q.replace(/[^0-9]/g, '');
      where.OR = [
        { applicationNo: { contains: q, mode: 'insensitive' } },
        { beneficiary: { firstName: { contains: q, mode: 'insensitive' } } },
        { beneficiary: { lastName: { contains: q, mode: 'insensitive' } } },
        { beneficiary: { memberId: { contains: q, mode: 'insensitive' } } },
        { beneficiary: { registryNumber: { contains: q, mode: 'insensitive' } } },
        ...(cleanQ.length > 0 ? [{ beneficiary: { identityNumberNormalized: { contains: cleanQ } } }] : []),
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.assistanceApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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
              memberId: true,
              registryNumber: true,
              phone: true,
              addresses: {
                select: {
                  addressType: true,
                  addressLine: true,
                  community: true,
                  subdistrict: true,
                  district: true,
                  province: true,
                },
              },
            },
          },
          documents: {
            select: {
              id: true,
              name: true,
              category: true,
              status: true,
              fileUrl: true,
              fileSize: true,
              mimeType: true,
              uploadDate: true,
              storageProvider: true,
              uploadedByName: true,
            },
          },
          history: {
            orderBy: { createdAt: 'asc' },
          },
          assessment: {
            select: {
              id: true,
              assessmentNumber: true,
              assessmentPeriod: true,
              assessmentType: true,
              status: true,
              eligibilityResult: true,
              assessedAt: true,
            },
          },
          legacyAssessment: {
            select: {
              id: true,
              livingScore: true,
              housingCondition: true,
              recommendedAmount: true,
              officerRecommendation: true,
              assessedDate: true,
            },
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
      const currentAddr =
        ben?.addresses?.find((a) => a.addressType === 'CURRENT') ||
        ben?.addresses?.[0] ||
        null;
      const permCode = ben?.memberId ?? app.memberId ?? ben?.registryNumber ?? app.registrationNo ?? '';

      return {
        ...app,
        titlePrefix: ben?.title ?? '',
        firstName: ben?.firstName ?? '',
        lastName: ben?.lastName ?? '',
        fullName,
        phone: ben?.phone ?? '',
        nationalId: canSeeSensitive ? idNum : maskIdentityNumber(idNum),
        nationalIdMasked: maskIdentityNumber(idNum),
        address: currentAddr?.addressLine ?? '',
        community: currentAddr?.community ?? '',
        subdistrict: currentAddr?.subdistrict ?? '',
        district: currentAddr?.district ?? '',
        province: currentAddr?.province ?? '',
        memberId: permCode,
        registrationNo: permCode,
        registryNumber: ben?.registryNumber ?? app.registrationNo ?? '',
        requestedAmount: Number(app.requestedAmount),
        approvedAmount: app.approvedAmount ? Number(app.approvedAmount) : null,
        disbursedAmount: app.disbursedAmount ? Number(app.disbursedAmount) : null,
        householdMembers: [],
        statusHistory: (app.history || []).map((h) => ({
          status: h.status,
          timestamp: h.timestamp,
          changedBy: h.changedByName || h.changedById || 'เจ้าหน้าที่',
          notes: h.notes || '',
        })),
        beneficiary: ben
          ? {
              id: ben.id,
              fullName,
              memberId: permCode,
              registryNumber: ben.registryNumber,
              phone: ben.phone,
              identityNumber: canSeeSensitive ? idNum : maskIdentityNumber(idNum),
              identityNumberMasked: maskIdentityNumber(idNum),
              thaiNationalId: canSeeSensitive ? idNum : maskIdentityNumber(idNum),
              thaiNationalIdMasked: maskIdentityNumber(idNum),
            }
          : null,
        periodicAssessment: app.assessment
          ? {
              ...app.assessment,
              assessedAt: app.assessment.assessedAt.toISOString(),
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
   * Get single application by ID or applicationNo
   */
  async getById(id: string, user?: AuthUser) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const where: Prisma.AssistanceApplicationWhereInput = isUuid
      ? { id }
      : { OR: [{ applicationNo: id }, { legacyId: id }] };

    const app = await this.prisma.assistanceApplication.findFirst({
      where,
      include: {
        beneficiary: {
          include: {
            household: {
              include: {
                members: true,
              },
            },
            addresses: true,
            documents: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        documents: true,
        history: {
          orderBy: { createdAt: 'asc' },
        },
        assessment: true,
        legacyAssessment: true,
        executionRecords: true,
      },
    });

    if (!app) {
      throw new AppException(HttpStatus.NOT_FOUND, 'APPLICATION_NOT_FOUND', `ไม่พบคำร้องขอความช่วยเหลือรหัส ${id}`);
    }

    const canSeeSensitive = user?.permissions?.includes('beneficiaries.read.sensitive') ?? true;
    const canViewDocs = user?.permissions?.includes('documents.read') ?? true;
    const ben = app.beneficiary;
    const fullName = ben ? formatPersonName({ prefix: ben.title, firstName: ben.firstName, lastName: ben.lastName }) : '';
    const idNum = ben?.identityNumberNormalized || ben?.identityNumber || '';
    const currentAddr =
      ben?.addresses?.find((a) => a.addressType === 'CURRENT') ||
      ben?.addresses?.[0] ||
      null;
    const permCode = ben?.memberId ?? app.memberId ?? ben?.registryNumber ?? app.registrationNo ?? '';

    const registryDocuments = canViewDocs
      ? (ben?.documents || []).map((doc) => ({
          id: doc.id,
          name: doc.originalFileName,
          category: doc.documentType,
          mimeType: doc.mimeType,
          fileSize: doc.sizeBytes,
          status: String(doc.status || 'UPLOADED').toLowerCase(),
          createdAt: doc.createdAt.toISOString(),
          downloadUrl: `/api/registry/${ben?.id}/documents/${doc.id}`,
        }))
      : [];

    return {
      ...app,
      titlePrefix: ben?.title ?? '',
      firstName: ben?.firstName ?? '',
      lastName: ben?.lastName ?? '',
      fullName,
      phone: ben?.phone ?? '',
      nationalId: canSeeSensitive ? idNum : maskIdentityNumber(idNum),
      nationalIdMasked: maskIdentityNumber(idNum),
      address: currentAddr?.addressLine ?? '',
      community: currentAddr?.community ?? ben?.household?.community ?? '',
      subdistrict: currentAddr?.subdistrict ?? ben?.household?.subdistrict ?? '',
      district: currentAddr?.district ?? ben?.household?.district ?? '',
      province: currentAddr?.province ?? ben?.household?.province ?? '',
      memberId: permCode,
      registrationNo: permCode,
      registryNumber: ben?.registryNumber ?? app.registrationNo ?? '',
      requestedAmount: Number(app.requestedAmount),
      approvedAmount: app.approvedAmount ? Number(app.approvedAmount) : null,
      disbursedAmount: app.disbursedAmount ? Number(app.disbursedAmount) : null,
      householdMembers: [],
      statusHistory: (app.history || []).map((h) => ({
        status: h.status,
        timestamp: h.timestamp,
        changedBy: h.changedByName || h.changedById || 'เจ้าหน้าที่',
        notes: h.notes || '',
      })),
      registryDocuments,
      beneficiary: ben
        ? {
            ...ben,
            fullName,
            memberId: permCode,
            identityNumber: canSeeSensitive ? idNum : maskIdentityNumber(idNum),
            identityNumberMasked: maskIdentityNumber(idNum),
            thaiNationalId: canSeeSensitive ? idNum : maskIdentityNumber(idNum),
            thaiNationalIdMasked: maskIdentityNumber(idNum),
          }
        : null,
      periodicAssessment: app.assessment
        ? {
            ...app.assessment,
            assessedAt: app.assessment.assessedAt.toISOString(),
          }
        : null,
      legacyAssessment: app.legacyAssessment
        ? {
            ...app.legacyAssessment,
            recommendedAmount: Number(app.legacyAssessment.recommendedAmount),
          }
        : null,
    };
  }

  /**
   * Update full assistance request (e.g. editing a draft or submitting a draft)
   */
  async update(id: string, dto: UpdateAssistanceRequestDto, user?: AuthUser) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const existing = await this.prisma.assistanceApplication.findFirst({
      where: isUuid ? { id } : { OR: [{ applicationNo: id }, { legacyId: id }] },
      include: {
        beneficiary: true,
        documents: true,
      },
    });

    if (!existing) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        'APPLICATION_NOT_FOUND',
        `ไม่พบคำร้องขอความช่วยเหลือรหัส ${id}`,
      );
    }

    const nowIso = new Date().toISOString();
    const actorId = user?.id ?? null;
    const actorName = user?.displayName ?? 'เจ้าหน้าที่';

    let requestedDecimal: Prisma.Decimal | undefined;
    if (dto.requestedAmount !== undefined) {
      if (dto.requestedAmount <= 0) {
        throw new AppException(
          HttpStatus.BAD_REQUEST,
          'INVALID_AMOUNT',
          'จำนวนเงินที่ขอความช่วยเหลือต้องมากกว่า 0 บาท',
        );
      }
      requestedDecimal = new Prisma.Decimal(dto.requestedAmount);
    }

    const newStatus = dto.status || existing.status;
    const isDraftToSubmitted = existing.status === 'draft' && newStatus === 'submitted';

    return await this.prisma.$transaction(async (tx) => {
      const updated = await tx.assistanceApplication.update({
        where: { id: existing.id },
        data: {
          ...(requestedDecimal ? { requestedAmount: requestedDecimal } : {}),
          ...(dto.assistanceType ? { assistanceType: dto.assistanceType } : {}),
          ...(dto.assistanceTypeDetails !== undefined ? { assistanceTypeDetails: dto.assistanceTypeDetails } : {}),
          ...(dto.asnafCategory ? { asnafCategory: dto.asnafCategory } : {}),
          ...(dto.primaryGroupCode !== undefined ? { primaryGroupCode: dto.primaryGroupCode } : {}),
          ...(dto.urgencyLevel ? { urgencyLevel: dto.urgencyLevel } : {}),
          ...(dto.hardshipReasons !== undefined ? { hardshipReasons: dto.hardshipReasons } : {}),
          ...(dto.necessityDetails !== undefined ? { necessityDetails: dto.necessityDetails } : {}),
          ...(dto.specificFundId !== undefined ? { specificFundId: dto.specificFundId } : {}),
          ...(dto.specificFundCode !== undefined ? { specificFundCode: dto.specificFundCode } : {}),
          ...(dto.specificFundName !== undefined ? { specificFundName: dto.specificFundName } : {}),
          ...(dto.assistanceTypeId !== undefined ? { assistanceTypeId: dto.assistanceTypeId } : {}),
          ...(dto.assistanceGroup !== undefined ? { assistanceGroup: dto.assistanceGroup } : {}),
          ...(dto.fiscalYear ? { fiscalYear: dto.fiscalYear } : {}),
          ...(dto.assessmentId ? { assessmentId: dto.assessmentId } : {}),
          status: newStatus,
          ...(isDraftToSubmitted ? { appliedDate: nowIso } : {}),
          updatedAt: new Date(),
        },
        include: {
          assessment: {
            select: {
              id: true,
              assessmentNumber: true,
              assessmentPeriod: true,
              status: true,
              eligibilityResult: true,
            },
          },
          documents: true,
          history: { orderBy: { createdAt: 'asc' } },
        },
      });

      if (Array.isArray(dto.documents) && dto.documents.length > 0) {
        for (const docDto of dto.documents) {
          if (!docDto?.name || !docDto?.fileUrl) continue;
          await tx.applicationDocument.create({
            data: {
              applicationId: existing.id,
              beneficiaryId: existing.beneficiaryId,
              name: docDto.name,
              category: docDto.category || 'other_doc',
              fileUrl: docDto.fileUrl,
              status: 'pending',
              uploadDate: nowIso,
              mimeType: docDto.mimeType || 'application/octet-stream',
              fileSize: Number(docDto.fileSize || 0),
              isConfidential: docDto.isConfidential ?? true,
              uploadedById: actorId,
              uploadedByName: actorName,
              storageProvider: docDto.storageProvider || 'local',
              storagePath: docDto.storagePath || docDto.fileUrl,
            },
          });
        }
      }

      await tx.applicationHistory.create({
        data: {
          applicationId: existing.id,
          status: newStatus,
          timestamp: nowIso,
          changedById: actorId || 'system',
          changedByName: actorName,
          notes: isDraftToSubmitted
            ? `ยื่นคำร้องขอรับความช่วยเหลือ (ส่งจากฉบับร่าง) วงเงิน ฿${Number(updated.requestedAmount).toFixed(2)}`
            : `แก้ไขข้อมูลคำร้องขอความช่วยเหลือ (${newStatus})`,
        },
      });

      await this.audit.record(tx, {
        actorId,
        action: isDraftToSubmitted ? 'ASSISTANCE_REQUEST_SUBMIT_DRAFT' : 'ASSISTANCE_REQUEST_UPDATE',
        resourceType: 'assistance_application',
        resourceId: existing.id,
        metadata: {
          applicationNo: existing.applicationNo,
          oldStatus: existing.status,
          newStatus,
          requestedAmount: Number(updated.requestedAmount).toFixed(2),
        },
      });

      return {
        ...updated,
        requestedAmount: Number(updated.requestedAmount),
        approvedAmount: updated.approvedAmount ? Number(updated.approvedAmount) : null,
      };
    });
  }

  /**
   * Update request status (e.g. submitted -> doc_review -> assessment -> pending_approval)
   */
  async updateStatus(id: string, dto: UpdateRequestStatusDto, user?: AuthUser) {
    const allowedStatuses = [
      'draft',
      'submitted',
      'doc_review',
      'assessment',
      'pending_approval',
      'approved',
      'rejected',
      'disbursed',
      'cancelled',
    ];

    if (!allowedStatuses.includes(dto.status)) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'INVALID_STATUS',
        `สถานะ "${dto.status}" ไม่ถูกต้องตามขั้นตอนการดำเนินงาน`,
      );
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const existing = await this.prisma.assistanceApplication.findFirst({
      where: isUuid ? { id } : { OR: [{ applicationNo: id }, { legacyId: id }] },
    });

    if (!existing) {
      throw new AppException(HttpStatus.NOT_FOUND, 'APPLICATION_NOT_FOUND', `ไม่พบคำร้องขอความช่วยเหลือรหัส ${id}`);
    }

    const nowIso = new Date().toISOString();
    const actorId = user?.id ?? null;
    const actorName = user?.displayName ?? 'เจ้าหน้าที่';

    return await this.prisma.$transaction(async (tx) => {
      const updated = await tx.assistanceApplication.update({
        where: { id: existing.id },
        data: {
          status: dto.status,
          updatedAt: new Date(),
        },
      });

      await tx.applicationHistory.create({
        data: {
          applicationId: existing.id,
          status: dto.status,
          timestamp: nowIso,
          changedById: actorId || 'system',
          changedByName: actorName,
          notes: dto.notes || `เปลี่ยนสถานะเป็น ${dto.status}`,
        },
      });

      await this.audit.record(tx, {
        actorId,
        action: 'ASSISTANCE_REQUEST_STATUS_UPDATE',
        resourceType: 'assistance_application',
        resourceId: existing.id,
        metadata: {
          oldStatus: existing.status,
          newStatus: dto.status,
          notes: dto.notes || null,
        },
      });

      return {
        ...updated,
        requestedAmount: Number(updated.requestedAmount),
        approvedAmount: updated.approvedAmount ? Number(updated.approvedAmount) : null,
      };
    });
  }

  /**
   * Add / attach document to an application
   */
  async addDocument(id: string, dto: AddApplicationDocumentDto, user?: AuthUser) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const app = await this.prisma.assistanceApplication.findFirst({
      where: isUuid ? { id } : { OR: [{ applicationNo: id }, { legacyId: id }] },
    });

    if (!app) {
      throw new AppException(HttpStatus.NOT_FOUND, 'APPLICATION_NOT_FOUND', `ไม่พบคำร้องขอความช่วยเหลือรหัส ${id}`);
    }

    const nowIso = new Date().toISOString();
    const actorId = user?.id ?? null;
    const actorName = user?.displayName ?? 'เจ้าหน้าที่';

    return await this.prisma.$transaction(async (tx) => {
      const doc = await tx.applicationDocument.create({
        data: {
          applicationId: app.id,
          beneficiaryId: app.beneficiaryId,
          name: dto.name,
          category: dto.category,
          fileUrl: dto.fileUrl,
          status: 'pending',
          uploadDate: nowIso,
          mimeType: dto.mimeType || 'application/octet-stream',
          fileSize: dto.fileSize || 0,
          isConfidential: dto.isConfidential ?? true,
          uploadedById: actorId,
          uploadedByName: actorName,
          storageProvider: 'local',
          storagePath: dto.fileUrl,
        },
      });

      await this.audit.record(tx, {
        actorId,
        action: 'APPLICATION_DOCUMENT_ATTACH',
        resourceType: 'application_document',
        resourceId: doc.id,
        metadata: {
          applicationId: app.id,
          documentName: dto.name,
          category: dto.category,
        },
      });

      return doc;
    });
  }
}
