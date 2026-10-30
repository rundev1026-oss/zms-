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
exports.AsnafService = void 0;
const common_1 = require("@nestjs/common");
const audit_service_1 = require("../audit/audit.service");
const beneficiaries_service_1 = require("../beneficiaries/beneficiaries.service");
const app_exception_1 = require("../common/app.exception");
const prisma_service_1 = require("../prisma/prisma.service");
let AsnafService = class AsnafService {
    prisma;
    beneficiaries;
    audit;
    constructor(prisma, beneficiaries, audit) {
        this.prisma = prisma;
        this.beneficiaries = beneficiaries;
        this.audit = audit;
    }
    listActive() {
        return this.prisma.asnafCategory.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select: { id: true, code: true, nameTh: true, sortOrder: true },
        });
    }
    async latestProposal(beneficiaryId, actor) {
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
    async propose(beneficiaryId, input, actor) {
        const beneficiary = await this.beneficiaries.requireRecord(beneficiaryId);
        this.beneficiaries.assertEditable(beneficiary.status);
        const category = await this.prisma.asnafCategory.findFirst({
            where: { id: input.categoryId, isActive: true },
        });
        if (category === null) {
            throw new app_exception_1.AppException(common_1.HttpStatus.UNPROCESSABLE_ENTITY, 'BUSINESS_RULE', 'ไม่พบหมวดอัสนัฟที่เปิดใช้งาน');
        }
        const saved = await this.prisma.$transaction(async (tx) => {
            const row = await tx.beneficiaryAsnafAssessment.create({
                data: {
                    beneficiaryId,
                    categoryId: category.id,
                    rationale: input.rationale,
                    supportingInfo: input.supportingInfo ?? null,
                    recordedById: actor.id,
                    assessedAt: new Date(),
                    decision: 'PROPOSED',
                },
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
    toProposal(row) {
        return {
            id: row.id,
            categoryId: row.categoryId,
            categoryCode: row.category.code,
            categoryNameTh: row.category.nameTh,
            rationale: row.rationale,
            supportingInfo: row.supportingInfo,
            decision: 'PROPOSED',
            assessedAt: row.assessedAt.toISOString(),
        };
    }
};
exports.AsnafService = AsnafService;
exports.AsnafService = AsnafService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        beneficiaries_service_1.BeneficiariesService,
        audit_service_1.AuditService])
], AsnafService);
//# sourceMappingURL=asnaf.service.js.map