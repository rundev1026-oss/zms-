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
exports.RegistryWorkflowService = void 0;
const common_1 = require("@nestjs/common");
const audit_service_1 = require("../audit/audit.service");
const app_exception_1 = require("../common/app.exception");
const request_lock_1 = require("../common/request-lock");
const prisma_service_1 = require("../prisma/prisma.service");
const beneficiaries_service_1 = require("../beneficiaries/beneficiaries.service");
const beneficiary_presenter_1 = require("../beneficiaries/beneficiary.presenter");
const completeness_1 = require("./completeness");
const registry_rules_1 = require("./registry-rules");
let RegistryWorkflowService = class RegistryWorkflowService {
    prisma;
    beneficiaries;
    audit;
    lock = new request_lock_1.RequestLock();
    constructor(prisma, beneficiaries, audit) {
        this.prisma = prisma;
        this.beneficiaries = beneficiaries;
        this.audit = audit;
    }
    async submit(id, actor) {
        this.assertPermission('submit', actor);
        return this.lock.run(`submit:${id}`, () => this.prisma.$transaction(async (tx) => {
            const row = await this.load(tx, id);
            const plan = this.plan((0, registry_rules_1.planTransition)('submit', row.status));
            if (!plan.recordHistory) {
                return (0, beneficiary_presenter_1.presentBeneficiary)(row, this.options(actor));
            }
            const [addressCountWithArea, household, consent] = await Promise.all([
                tx.beneficiaryAddress.count({
                    where: {
                        beneficiaryId: id,
                        province: { not: '' },
                        district: { not: '' },
                        subdistrict: { not: '' },
                    },
                }),
                tx.household.findUnique({ where: { beneficiaryId: id }, select: { id: true } }),
                tx.consentRecord.findFirst({
                    where: { beneficiaryId: id, accepted: true },
                    select: { id: true },
                }),
            ]);
            const missing = (0, completeness_1.missingSubmitFields)({
                firstName: row.firstName,
                lastName: row.lastName,
                identityType: row.identityType,
                identityNumber: row.identityNumber,
                dateOfBirth: row.dateOfBirth,
                phone: row.phone,
                addressCountWithArea,
                hasHousehold: household !== null,
                hasAcceptedConsent: consent !== null,
            });
            if (missing.length > 0) {
                throw new app_exception_1.AppException(common_1.HttpStatus.UNPROCESSABLE_ENTITY, 'BUSINESS_RULE', 'ข้อมูลยังไม่ครบสำหรับส่งตรวจ', missing);
            }
            return this.changeStatus(tx, row, plan.to, 'ส่งตรวจสอบ', actor);
        }));
    }
    async requestCorrection(id, reason, actor) {
        this.assertPermission('correction', actor);
        return this.lock.run(`correction:${id}`, () => this.prisma.$transaction(async (tx) => {
            const row = await this.load(tx, id);
            const plan = this.plan((0, registry_rules_1.planTransition)('correction', row.status));
            return this.changeStatus(tx, row, plan.to, reason, actor);
        }));
    }
    async assess(id, input, actor) {
        this.assertPermission('assess', actor);
        return this.lock.run(`assess:${id}`, () => this.prisma.$transaction(async (tx) => {
            const row = await this.load(tx, id);
            const plan = this.plan((0, registry_rules_1.planTransition)('assess', row.status));
            const category = await tx.asnafCategory.findFirst({
                where: { id: input.categoryId, isActive: true },
            });
            if (category === null) {
                throw new app_exception_1.AppException(common_1.HttpStatus.UNPROCESSABLE_ENTITY, 'BUSINESS_RULE', 'ไม่พบหมวดอัสนัฟที่เปิดใช้งาน');
            }
            const decision = input.decision ?? 'PROPOSED';
            await tx.beneficiaryAsnafAssessment.create({
                data: {
                    beneficiaryId: id,
                    categoryId: category.id,
                    rationale: input.rationale,
                    supportingInfo: input.supportingInfo ?? null,
                    recordedById: actor.id,
                    assessedAt: new Date(),
                    reviewedById: decision === 'PROPOSED' ? null : actor.id,
                    decision,
                    reviewerNote: input.reviewerNote ?? null,
                },
            });
            await this.audit.record(tx, {
                actorId: actor.id,
                action: 'ASNAF_ASSESSMENT',
                resourceType: 'beneficiary',
                resourceId: id,
                metadata: { decision, categoryCode: category.code },
            });
            if (plan.recordHistory) {
                return this.changeStatus(tx, row, plan.to, 'บันทึกการประเมิน', actor);
            }
            const fresh = await this.load(tx, id);
            return (0, beneficiary_presenter_1.presentBeneficiary)(fresh, this.options(actor));
        }));
    }
    async approve(id, reason, actor) {
        this.assertPermission('approve', actor);
        return this.lock.run(`approve:${id}`, () => this.prisma.$transaction(async (tx) => {
            const row = await this.load(tx, id);
            const plan = this.plan((0, registry_rules_1.planTransition)('approve', row.status));
            const assessments = await tx.beneficiaryAsnafAssessment.count({
                where: { beneficiaryId: id },
            });
            if (assessments < 1) {
                throw new app_exception_1.AppException(common_1.HttpStatus.UNPROCESSABLE_ENTITY, 'BUSINESS_RULE', 'ต้องมีการประเมินอัสนัฟก่อนยืนยันคุณสมบัติ');
            }
            return this.changeStatus(tx, row, plan.to, reason, actor);
        }));
    }
    async reject(id, reason, actor) {
        this.assertPermission('reject', actor);
        return this.lock.run(`reject:${id}`, () => this.prisma.$transaction(async (tx) => {
            const row = await this.load(tx, id);
            const plan = this.plan((0, registry_rules_1.planTransition)('reject', row.status));
            return this.changeStatus(tx, row, plan.to, reason, actor);
        }));
    }
    async suspend(id, reason, actor) {
        this.assertPermission('suspend', actor);
        return this.lock.run(`suspend:${id}`, () => this.prisma.$transaction(async (tx) => {
            const row = await this.load(tx, id);
            const plan = this.plan((0, registry_rules_1.planTransition)('suspend', row.status));
            return this.changeStatus(tx, row, plan.to, reason, actor);
        }));
    }
    async archive(id, reason, actor) {
        this.assertPermission('archive', actor);
        return this.lock.run(`archive:${id}`, () => this.prisma.$transaction(async (tx) => {
            const row = await this.load(tx, id);
            const plan = this.plan((0, registry_rules_1.planTransition)('archive', row.status));
            return this.changeStatus(tx, row, plan.to, reason, actor);
        }));
    }
    async history(id) {
        await this.beneficiaries.requireRecord(id);
        const rows = await this.prisma.registryStatusHistory.findMany({
            where: { beneficiaryId: id },
            orderBy: { actedAt: 'desc' },
        });
        return rows.map((row) => ({
            id: row.id,
            fromStatus: row.fromStatus,
            toStatus: row.toStatus,
            reason: row.reason,
            actedById: row.actedById,
            actedAt: row.actedAt.toISOString(),
        }));
    }
    plan(result) {
        if ('error' in result) {
            throw new app_exception_1.AppException(common_1.HttpStatus.CONFLICT, 'INVALID_STATE', result.error);
        }
        return result;
    }
    async load(tx, id) {
        const row = await tx.beneficiary.findFirst({
            where: { id, deletedAt: null },
            include: beneficiary_presenter_1.beneficiaryInclude,
        });
        if (row === null) {
            throw new app_exception_1.AppException(common_1.HttpStatus.NOT_FOUND, 'NOT_FOUND', 'ไม่พบทะเบียน');
        }
        return row;
    }
    async changeStatus(tx, row, to, reason, actor) {
        const updated = await tx.beneficiary.update({
            where: { id: row.id },
            data: { status: to, updatedById: actor.id },
            include: beneficiary_presenter_1.beneficiaryInclude,
        });
        const actedAt = new Date();
        await tx.registryStatusHistory.create({
            data: {
                beneficiaryId: row.id,
                fromStatus: row.status,
                toStatus: to,
                reason,
                actedById: actor.id,
                actedAt,
            },
        });
        await this.audit.record(tx, {
            actorId: actor.id,
            action: 'REGISTRY_STATUS_CHANGE',
            resourceType: 'beneficiary',
            resourceId: row.id,
            metadata: { from: row.status, to, reason },
        });
        return (0, beneficiary_presenter_1.presentBeneficiary)(updated, this.options(actor));
    }
    assertPermission(action, actor) {
        const permission = (0, registry_rules_1.workflowPermission)(action);
        if (!actor.permissions.includes(permission)) {
            throw new app_exception_1.AppException(common_1.HttpStatus.FORBIDDEN, 'FORBIDDEN', 'ไม่มีสิทธิ์ดำเนินการนี้');
        }
    }
    options(actor) {
        return {
            revealIdentity: actor.permissions.includes('beneficiaries.read.sensitive'),
            revealAid: actor.permissions.includes('beneficiaries.aid.view'),
        };
    }
};
exports.RegistryWorkflowService = RegistryWorkflowService;
exports.RegistryWorkflowService = RegistryWorkflowService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        beneficiaries_service_1.BeneficiariesService,
        audit_service_1.AuditService])
], RegistryWorkflowService);
//# sourceMappingURL=registry-workflow.service.js.map