"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssessmentService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const app_exception_1 = require("../common/app.exception");
let AssessmentService = class AssessmentService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async submitAssessment(applicationId, dto, user) {
        if (dto.livingScore < 0 || dto.livingScore > 100) {
            throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'INVALID_SCORE', 'คะแนนสภาพความเป็นอยู่ต้องอยู่ระหว่าง 0 ถึง 100');
        }
        if (dto.recommendedAmount < 0) {
            throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'INVALID_AMOUNT', 'วงเงินช่วยเหลือที่เสนอต้องไม่ติดลบ');
        }
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(applicationId);
        const app = await this.prisma.assistanceApplication.findFirst({
            where: isUuid ? { id: applicationId } : { OR: [{ applicationNo: applicationId }, { legacyId: applicationId }] },
        });
        if (!app) {
            throw new app_exception_1.AppException(common_1.HttpStatus.NOT_FOUND, 'APPLICATION_NOT_FOUND', `ไม่พบคำร้องขอความช่วยเหลือรหัส ${applicationId}`);
        }
        const nowIso = new Date().toISOString();
        const assessedDate = new Date().toLocaleString('th-TH', { hour12: false });
        const recommendedDecimal = new client_1.Prisma.Decimal(dto.recommendedAmount);
        return await this.prisma.$transaction(async (tx) => {
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
                    recommendedFundId: dto.recommendedFundId || 'fund-1',
                    recommendedSpecificFundId: dto.recommendedSpecificFundId || null,
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
                    recommendedFundId: dto.recommendedFundId || 'fund-1',
                    recommendedSpecificFundId: dto.recommendedSpecificFundId || null,
                    generalNotes: dto.generalNotes || '',
                },
            });
            await tx.assistanceApplication.update({
                where: { id: app.id },
                data: {
                    status: 'pending_approval',
                    updatedAt: new Date(),
                },
            });
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
    async getAssessment(applicationId) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(applicationId);
        const app = await this.prisma.assistanceApplication.findFirst({
            where: isUuid ? { id: applicationId } : { OR: [{ applicationNo: applicationId }, { legacyId: applicationId }] },
        });
        if (!app) {
            throw new app_exception_1.AppException(common_1.HttpStatus.NOT_FOUND, 'APPLICATION_NOT_FOUND', `ไม่พบคำร้องขอความช่วยเหลือรหัส ${applicationId}`);
        }
        const assessment = await this.prisma.beneficiaryAssessmentLegacy.findUnique({
            where: { applicationId: app.id },
        });
        if (!assessment) {
            throw new app_exception_1.AppException(common_1.HttpStatus.NOT_FOUND, 'ASSESSMENT_NOT_FOUND', `ยังไม่มีการบันทึกผลการประเมินสำหรับคำร้องหมายเลข ${app.applicationNo}`);
        }
        return {
            ...assessment,
            recommendedAmount: Number(assessment.recommendedAmount),
        };
    }
};
exports.AssessmentService = AssessmentService;
exports.AssessmentService = AssessmentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], AssessmentService);
//# sourceMappingURL=assessment.service.js.map