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
const shared_1 = require("@zms/shared");
const audit_service_1 = require("../audit/audit.service");
const app_exception_1 = require("../common/app.exception");
const pagination_1 = require("../common/pagination");
const prisma_error_1 = require("../common/prisma-error");
const prisma_service_1 = require("../prisma/prisma.service");
const registry_rules_1 = require("../registry-workflow/registry-rules");
const password_hash_1 = require("../security/password-hash");
const beneficiary_query_1 = require("./beneficiary-query");
const beneficiary_fields_1 = require("./beneficiary-fields");
const beneficiary_presenter_1 = require("./beneficiary.presenter");
const mask_identity_1 = require("./mask-identity");
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
            throw await this.duplicateIdentityConflict(identity.identityNumberNormalized);
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
                throw await this.duplicateIdentityConflict(identity?.identityNumberNormalized ?? existing.identityNumberNormalized);
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
    async recordSurveyPrint(id, actor) {
        const row = await this.requireRecord(id);
        await this.audit.write({
            actorId: actor.id,
            action: 'REGISTRY_SURVEY_PRINT',
            resourceType: 'beneficiary',
            resourceId: row.id,
            metadata: { registryNumber: row.registryNumber },
        });
        return { recorded: true, registryNumber: row.registryNumber };
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
        if (!(0, registry_rules_1.canReviseRegistry)(status)) {
            throw new app_exception_1.AppException(common_1.HttpStatus.CONFLICT, 'INVALID_STATE', 'ทะเบียนที่เก็บถาวรแล้วแก้ไขไม่ได้');
        }
    }
    async getDeletePreview(id, _actor) {
        const row = await this.prisma.beneficiary.findUnique({
            where: { id },
            include: {
                household: { include: { members: true } },
                applications: true,
                disbursementItems: true,
                documents: { where: { deletedAt: null } },
                followUpRecords: true,
            },
        });
        if (!row) {
            throw new app_exception_1.AppException(common_1.HttpStatus.NOT_FOUND, 'NOT_FOUND', 'ไม่พบทะเบียนผู้มีสิทธิ์รับซะกาต');
        }
        if (row.deletedAt !== null) {
            throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'ALREADY_DELETED', 'ทะเบียนนี้อยู่ในสถานะถูกจำหน่าย/ลบแล้ว');
        }
        const blockers = [];
        const activeAppStatuses = ['draft', 'submitted', 'under_review', 'pending_approval', 'approved', 'pending_disbursement'];
        const activeApps = row.applications.filter((a) => activeAppStatuses.includes((a.status || '').toLowerCase()));
        if (activeApps.length > 0) {
            const statuses = [...new Set(activeApps.map((a) => a.status))].join(', ');
            blockers.push(`มีคำขอความช่วยเหลือที่อยู่ระหว่างดำเนินการ ${activeApps.length} รายการ (สถานะ: ${statuses})`);
        }
        const activeDisbursements = row.disbursementItems.filter((d) => ['draft', 'pending'].includes((d.status || '').toLowerCase()));
        if (activeDisbursements.length > 0) {
            blockers.push(`มีรายการเบิกจ่ายเงินสดที่อยู่ระหว่างดำเนินการ ${activeDisbursements.length} รายการ`);
        }
        const completedAidCount = row.applications.filter((a) => ['completed', 'disbursed'].includes((a.status || '').toLowerCase())).length;
        return {
            canDelete: blockers.length === 0,
            blockers,
            summary: {
                id: row.id,
                registryNumber: row.registryNumber,
                fullName: (0, shared_1.formatPersonName)({ prefix: row.title, firstName: row.firstName, lastName: row.lastName }),
                identityType: row.identityType,
                identityNumberMasked: (0, mask_identity_1.maskIdentityNumber)(row.identityNumber),
                status: row.status,
                phone: row.phone,
                createdAt: row.createdAt.toISOString(),
                counts: {
                    applications: row.applications.length,
                    activeApplications: activeApps.length,
                    completedAid: completedAidCount,
                    disbursements: row.disbursementItems.length,
                    followups: row.followUpRecords.length,
                    documents: row.documents.length,
                    householdMembers: row.household?.members?.length ?? 0,
                },
            },
        };
    }
    async softDelete(id, dto, actor, ip) {
        const preview = await this.getDeletePreview(id, actor);
        if (!preview.canDelete) {
            throw new app_exception_1.AppException(common_1.HttpStatus.CONFLICT, 'ACTIVE_WORKFLOW_EXISTS', `ไม่สามารถลบทะเบียนได้เนื่องจากมีกระบวนการค้างอยู่: ${preview.blockers.join('; ')}`);
        }
        if (dto.passwordConfirm) {
            const user = await this.prisma.user.findUnique({ where: { id: actor.id } });
            if (!user || !(0, password_hash_1.verifyPassword)(dto.passwordConfirm, user.passwordHash)) {
                throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'INVALID_PASSWORD', 'รหัสผ่านยืนยันไม่ถูกต้อง');
            }
        }
        const deleted = await this.prisma.$transaction(async (tx) => {
            const row = await tx.beneficiary.update({
                where: { id },
                data: {
                    deletedAt: new Date(),
                    deletedById: actor.id,
                    deletionReason: dto.reason,
                    deletionReference: dto.reference ?? null,
                    deletionStatus: true,
                    updatedById: actor.id,
                },
                include: beneficiary_presenter_1.beneficiaryInclude,
            });
            await tx.registryStatusHistory.create({
                data: {
                    beneficiaryId: id,
                    fromStatus: row.status,
                    toStatus: row.status,
                    reason: `[จำหน่าย/ลบข้อมูลทะเบียน] ${dto.reason}${dto.reference ? ` (อ้างอิง: ${dto.reference})` : ''}`,
                    actedById: actor.id,
                },
            });
            await this.audit.record(tx, {
                actorId: actor.id,
                action: 'BENEFICIARY_SOFT_DELETE',
                resourceType: 'beneficiary',
                resourceId: id,
                metadata: {
                    registryNumber: row.registryNumber,
                    reason: dto.reason,
                    reference: dto.reference ?? null,
                    status: row.status,
                    deletedBy: actor.displayName,
                    ipAddress: ip ?? null,
                },
            });
            return row;
        });
        return (0, beneficiary_presenter_1.presentBeneficiary)(deleted, this.viewOptions(actor));
    }
    async listDeleted(query, actor) {
        const where = (0, beneficiary_query_1.buildDeletedBeneficiaryWhere)(query);
        const page = Math.max(1, Number(query.page) || 1);
        const pageSize = Math.max(1, Math.min(100, Number(query.pageSize) || 20));
        const { skip, take } = (0, pagination_1.pageWindow)(page, pageSize);
        const [rows, total] = await Promise.all([
            this.prisma.beneficiary.findMany({
                where,
                orderBy: { deletedAt: 'desc' },
                skip,
                take,
                include: {
                    ...beneficiary_presenter_1.beneficiaryInclude,
                    _count: {
                        select: {
                            applications: true,
                            disbursementItems: true,
                            followUpRecords: true,
                            documents: true,
                        },
                    },
                },
            }),
            this.prisma.beneficiary.count({ where }),
        ]);
        return {
            items: rows.map((row) => ({
                ...(0, beneficiary_presenter_1.presentBeneficiary)(row, this.viewOptions(actor)),
                counts: row._count,
            })),
            page,
            pageSize,
            total,
        };
    }
    async restore(id, dto, actor, ip) {
        const existing = await this.prisma.beneficiary.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new app_exception_1.AppException(common_1.HttpStatus.NOT_FOUND, 'NOT_FOUND', 'ไม่พบทะเบียน');
        }
        if (existing.deletedAt === null) {
            throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'NOT_DELETED', 'ทะเบียนนี้ไม่ได้อยู่ในสถานะถูกจำหน่าย/ลบ');
        }
        if (existing.identityType === 'THAI_NATIONAL_ID' && existing.identityNumberNormalized) {
            const activeCollision = await this.prisma.beneficiary.findFirst({
                where: {
                    identityType: 'THAI_NATIONAL_ID',
                    identityNumberNormalized: existing.identityNumberNormalized,
                    deletedAt: null,
                    id: { not: id },
                },
            });
            if (activeCollision) {
                throw new app_exception_1.AppException(common_1.HttpStatus.CONFLICT, 'DUPLICATE_IDENTITY', `ไม่สามารถกู้คืนได้ เนื่องจากมีทะเบียน ${activeCollision.registryNumber} ใช้งานเลขประจำตัวประชาชนนี้อยู่แล้ว`);
            }
        }
        const restored = await this.prisma.$transaction(async (tx) => {
            const row = await tx.beneficiary.update({
                where: { id },
                data: {
                    deletedAt: null,
                    deletedById: null,
                    deletionReason: null,
                    deletionReference: null,
                    deletionStatus: false,
                    updatedById: actor.id,
                },
                include: beneficiary_presenter_1.beneficiaryInclude,
            });
            await tx.registryStatusHistory.create({
                data: {
                    beneficiaryId: id,
                    fromStatus: row.status,
                    toStatus: row.status,
                    reason: `[กู้คืนทะเบียน] ${dto.reason}${dto.reference ? ` (อ้างอิง: ${dto.reference})` : ''}`,
                    actedById: actor.id,
                },
            });
            await this.audit.record(tx, {
                actorId: actor.id,
                action: 'BENEFICIARY_RESTORE',
                resourceType: 'beneficiary',
                resourceId: id,
                metadata: {
                    registryNumber: row.registryNumber,
                    reason: dto.reason,
                    reference: dto.reference ?? null,
                    status: row.status,
                    restoredBy: actor.displayName,
                    ipAddress: ip ?? null,
                },
            });
            return row;
        });
        return (0, beneficiary_presenter_1.presentBeneficiary)(restored, this.viewOptions(actor));
    }
    async recordRevision(id, input, actor) {
        const existing = await this.requireRecord(id);
        this.assertEditable(existing.status);
        const baseline = existing.updatedAt.toISOString();
        if (input.expectedUpdatedAt && input.expectedUpdatedAt !== baseline) {
            throw new app_exception_1.AppException(common_1.HttpStatus.CONFLICT, 'VERSION_CONFLICT', 'มีผู้อื่นบันทึกทะเบียนนี้ไปแล้ว กรุณาโหลดข้อมูลล่าสุดก่อนแก้ไขอีกครั้ง');
        }
        const materialFields = new Set([
            'address',
            'province',
            'district',
            'monthlyIncome',
            'monthlyExpense',
            'debtAmount',
            'debtType',
            'creditorName',
            'disabilityNotes',
            'illnessNotes',
            'livingLimitations',
            'nationalId',
            'householdMembers',
            'householdMemberNames',
            'incomeBreakdown',
            'expenseBreakdown',
        ]);
        const material = input.changes.some((change) => materialFields.has(change.field));
        const sendBack = (0, registry_rules_1.revisionRequiresReview)(existing.status) && material;
        if (sendBack && (input.reason ?? '').trim().length < 5) {
            throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'REASON_REQUIRED', 'การแก้ไขข้อมูลที่มีผลต่อคุณสมบัติต้องระบุเหตุผลอย่างน้อย 5 ตัวอักษร');
        }
        const changes = input.changes.map((change) => ({
            field: change.field,
            fieldLabel: change.fieldLabel,
            oldValue: change.field === 'nationalId' ? maskHistoryValue(change.oldValue) : change.oldValue ?? '',
            newValue: change.field === 'nationalId' ? maskHistoryValue(change.newValue) : change.newValue ?? '',
        }));
        await this.prisma.$transaction(async (tx) => {
            if (sendBack) {
                await tx.beneficiary.update({
                    where: { id },
                    data: { status: 'NEEDS_CORRECTION', updatedById: actor.id },
                });
                await tx.registryStatusHistory.create({
                    data: {
                        beneficiaryId: id,
                        fromStatus: existing.status,
                        toStatus: 'NEEDS_CORRECTION',
                        reason: input.reason?.trim() || 'แก้ไขข้อมูลที่มีผลต่อคุณสมบัติ',
                        actedById: actor.id,
                    },
                });
            }
            else if (changes.length > 0) {
                await tx.beneficiary.update({
                    where: { id },
                    data: { updatedById: actor.id },
                });
            }
            if (changes.length > 0) {
                await tx.beneficiaryEditHistory.create({
                    data: {
                        beneficiaryId: id,
                        editedById: actor.id,
                        editedByName: actor.displayName || actor.email,
                        editedByRole: actor.roles[0]?.name || actor.roles[0]?.code || 'เจ้าหน้าที่',
                        timestamp: new Date().toISOString(),
                        changesSummary: changes.map((change) => change.fieldLabel).join(', ').slice(0, 500),
                        changesDetail: JSON.stringify(changes),
                        notes: [input.reason?.trim(), input.ipAddress ? `อุปกรณ์: ${input.ipAddress}` : '']
                            .filter(Boolean)
                            .join(' | ')
                            .slice(0, 2000),
                    },
                });
                await this.audit.record(tx, {
                    actorId: actor.id,
                    action: 'BENEFICIARY_REVISED',
                    resourceType: 'beneficiary',
                    resourceId: id,
                    metadata: {
                        fields: changes.map((change) => change.field).join(','),
                        reReview: sendBack,
                    },
                });
            }
        });
        const fresh = await this.requireRecord(id);
        return {
            reReview: sendBack,
            status: fresh.status,
            updatedAt: fresh.updatedAt.toISOString(),
        };
    }
    async listRevisions(id, _actor) {
        await this.requireRecord(id);
        const rows = await this.prisma.beneficiaryEditHistory.findMany({
            where: { beneficiaryId: id },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        return rows.map((row) => ({
            id: row.id,
            beneficiaryId: row.beneficiaryId,
            editedById: row.editedById,
            editedByName: row.editedByName,
            editedByRole: row.editedByRole,
            timestamp: row.timestamp,
            changesSummary: row.changesSummary,
            changesDetail: parseHistoryDetail(row.changesDetail),
            notes: row.notes,
            createdAt: row.createdAt.toISOString(),
        }));
    }
    async getAuditHistory(id, _actor) {
        const logs = await this.prisma.auditLog.findMany({
            where: {
                resourceType: 'beneficiary',
                resourceId: id,
            },
            orderBy: { createdAt: 'desc' },
            include: {
                actor: {
                    select: {
                        id: true,
                        displayName: true,
                        email: true,
                    },
                },
            },
        });
        return logs.map((log) => ({
            id: log.id,
            action: log.action,
            actorId: log.actorId,
            actorName: log.actor?.displayName ?? 'ระบบ',
            actorEmail: log.actor?.email ?? null,
            metadata: log.metadata,
            createdAt: log.createdAt.toISOString(),
        }));
    }
    async duplicateIdentityConflict(identityNumberNormalized) {
        let registryNumber;
        if (identityNumberNormalized) {
            const existing = await this.prisma.beneficiary.findFirst({
                where: {
                    identityType: 'THAI_NATIONAL_ID',
                    identityNumberNormalized,
                    deletedAt: null,
                },
                select: { registryNumber: true },
            });
            registryNumber = existing?.registryNumber;
        }
        return new app_exception_1.AppException(common_1.HttpStatus.CONFLICT, 'DUPLICATE_IDENTITY', registryNumber
            ? `เลขประจำตัวนี้มีในทะเบียนที่ยังใช้งานแล้ว (รหัส ${registryNumber}) กรุณาเปิดทะเบียนเดิมแทนการสร้างซ้ำ`
            : 'เลขประจำตัวนี้มีในทะเบียนที่ยังใช้งานแล้ว กรุณาเปิดทะเบียนเดิมแทนการสร้างซ้ำ');
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
function maskHistoryValue(value) {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (digits.length !== 13)
        return value ? 'ปกปิด' : '';
    return `${digits[0]}-••••-•••••-••-${digits[12]}`;
}
function parseHistoryDetail(raw) {
    if (!raw)
        return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=beneficiaries.service.js.map