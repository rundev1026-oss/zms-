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
exports.BeneficiariesService = void 0;
const common_1 = require("@nestjs/common");
const audit_service_1 = require("../audit/audit.service");
const app_exception_1 = require("../common/app.exception");
const pagination_1 = require("../common/pagination");
const prisma_error_1 = require("../common/prisma-error");
const prisma_service_1 = require("../prisma/prisma.service");
const registry_rules_1 = require("../registry-workflow/registry-rules");
const beneficiary_query_1 = require("./beneficiary-query");
const beneficiary_fields_1 = require("./beneficiary-fields");
const beneficiary_presenter_1 = require("./beneficiary.presenter");
let BeneficiariesService = class BeneficiariesService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async create(input, actor) {
        if (input.firstName === undefined ||
            input.lastName === undefined ||
            input.identityType === undefined) {
            throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'ข้อมูลไม่ถูกต้อง');
        }
        const identity = (0, beneficiary_fields_1.readIdentity)(input.identityType, input.identityNumber);
        const dateOfBirth = (0, beneficiary_fields_1.readDateOfBirth)(input.dateOfBirth);
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
                        firstName: input.firstName,
                        lastName: input.lastName,
                        identityType: input.identityType,
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
                    include: beneficiary_presenter_1.beneficiaryInclude,
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
            return (0, beneficiary_presenter_1.presentBeneficiary)(created, this.viewOptions(actor));
        }
        catch (error) {
            const target = (0, prisma_error_1.isUniqueConflict)(error);
            if (target === null) {
                throw error;
            }
            if (target.includes('registry')) {
                throw new app_exception_1.AppException(common_1.HttpStatus.CONFLICT, 'CONFLICT', 'ไม่สามารถออกเลขทะเบียนได้ กรุณาลองอีกครั้ง');
            }
            throw new app_exception_1.AppException(common_1.HttpStatus.CONFLICT, 'DUPLICATE_IDENTITY', 'เลขประจำตัวนี้มีในทะเบียนที่ยังใช้งานแล้ว');
        }
    }
    async list(query, actor) {
        const where = (0, beneficiary_query_1.buildBeneficiaryWhere)(query);
        const orderBy = (0, beneficiary_query_1.buildBeneficiaryOrder)(query.sort);
        const { skip, take } = (0, pagination_1.pageWindow)(query.page, query.pageSize);
        const [rows, total] = await Promise.all([
            this.prisma.beneficiary.findMany({ where, orderBy, skip, take, include: beneficiary_presenter_1.beneficiaryInclude }),
            this.prisma.beneficiary.count({ where }),
        ]);
        return {
            items: rows.map((row) => (0, beneficiary_presenter_1.presentBeneficiary)(row, this.viewOptions(actor))),
            page: query.page,
            pageSize: query.pageSize,
            total,
        };
    }
    async summary(query) {
        const where = (0, beneficiary_query_1.buildBeneficiaryWhere)((0, beneficiary_query_1.summaryFilters)(query));
        const groups = await this.prisma.beneficiary.groupBy({
            by: ['status'],
            where,
            _count: { _all: true },
        });
        return (0, beneficiary_query_1.toStatusSummary)(groups.map((group) => ({ status: group.status, count: group._count._all })));
    }
    async getById(id, actor) {
        const row = await this.requireRecord(id);
        await this.audit.write({
            actorId: actor.id,
            action: 'BENEFICIARY_VIEW',
            resourceType: 'beneficiary',
            resourceId: id,
            metadata: { sensitive: actor.permissions.includes('beneficiaries.read.sensitive') },
        });
        return (0, beneficiary_presenter_1.presentBeneficiary)(row, this.viewOptions(actor));
    }
    async update(id, input, actor) {
        if (Object.values(input).every((value) => value === undefined)) {
            throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'ไม่มีข้อมูลที่ต้องการแก้ไข');
        }
        const existing = await this.requireRecord(id);
        this.assertEditable(existing.status);
        const identityType = input.identityType ?? existing.identityType;
        const identity = input.identityNumber !== undefined || input.identityType !== undefined
            ? (0, beneficiary_fields_1.readIdentity)(identityType, input.identityNumber ?? existing.identityNumber)
            : null;
        const dateOfBirth = input.dateOfBirth !== undefined ? (0, beneficiary_fields_1.readDateOfBirth)(input.dateOfBirth) : undefined;
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
                    include: beneficiary_presenter_1.beneficiaryInclude,
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
            return (0, beneficiary_presenter_1.presentBeneficiary)(updated, this.viewOptions(actor));
        }
        catch (error) {
            if ((0, prisma_error_1.isUniqueConflict)(error) !== null) {
                throw new app_exception_1.AppException(common_1.HttpStatus.CONFLICT, 'DUPLICATE_IDENTITY', 'เลขประจำตัวนี้มีในทะเบียนที่ยังใช้งานแล้ว');
            }
            throw error;
        }
    }
    async addConsent(id, input, actor) {
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
    async latestConsent(id, actor) {
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
    async requireRecord(id) {
        const row = await this.prisma.beneficiary.findFirst({
            where: { id, deletedAt: null },
            include: beneficiary_presenter_1.beneficiaryInclude,
        });
        if (row === null) {
            throw new app_exception_1.AppException(common_1.HttpStatus.NOT_FOUND, 'NOT_FOUND', 'ไม่พบทะเบียน');
        }
        return row;
    }
    assertEditable(status) {
        if (!(0, registry_rules_1.canEditRegistry)(status)) {
            throw new app_exception_1.AppException(common_1.HttpStatus.CONFLICT, 'INVALID_STATE', 'แก้ไขได้เฉพาะทะเบียนที่เป็นร่างหรือรอแก้ไข');
        }
    }
    viewOptions(actor) {
        return {
            revealIdentity: actor.permissions.includes('beneficiaries.read.sensitive'),
            revealAid: actor.permissions.includes('beneficiaries.aid.view'),
        };
    }
};
exports.BeneficiariesService = BeneficiariesService;
exports.BeneficiariesService = BeneficiariesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], BeneficiariesService);
//# sourceMappingURL=beneficiaries.service.js.map