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
exports.AssistanceRequestsService = void 0;
const common_1 = require("@nestjs/common");
const shared_1 = require("@zms/shared");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const app_exception_1 = require("../common/app.exception");
const mask_identity_1 = require("../beneficiaries/mask-identity");
let AssistanceRequestsService = class AssistanceRequestsService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async checkBeneficiary(dto, user) {
        const nationalId = dto.nationalId ? dto.nationalId.replace(/[^0-9]/g, '') : undefined;
        const registrationNo = dto.registrationNo ? dto.registrationNo.trim() : undefined;
        const beneficiaryId = dto.beneficiaryId ? dto.beneficiaryId.trim() : undefined;
        if (!nationalId && !registrationNo && !beneficiaryId) {
            throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'INVALID_INPUT', 'กรุณาระบุเลขประจำตัวประชาชน หรือเลขทะเบียนผู้มีสิทธิ์');
        }
        const isUuid = beneficiaryId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(beneficiaryId);
        const orClauses = [];
        if (isUuid) {
            orClauses.push({ id: beneficiaryId });
        }
        if (nationalId && nationalId.length === 13) {
            orClauses.push({ identityNumberNormalized: nationalId });
        }
        if (registrationNo) {
            orClauses.push({ registryNumber: registrationNo });
        }
        const beneficiary = await this.prisma.beneficiary.findFirst({
            where: orClauses.length > 0 ? { OR: orClauses } : { id: beneficiaryId },
            include: {
                household: true,
                addresses: true,
                assessments: {
                    include: { category: true },
                    orderBy: { assessedAt: 'desc' },
                    take: 1,
                },
            },
        });
        if (!beneficiary) {
            throw new app_exception_1.AppException(common_1.HttpStatus.NOT_FOUND, 'BENEFICIARY_NOT_FOUND', 'เลขบัตรประชาชนหรือทะเบียนนี้ยังไม่ได้ขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต กรุณาดำเนินการขึ้นทะเบียนก่อนยื่นคำร้อง');
        }
        const statusUpper = String(beneficiary.status || '').toUpperCase();
        if (statusUpper === 'SUSPENDED' || statusUpper === 'INELIGIBLE' || statusUpper === 'DISQUALIFIED') {
            const statusLabel = statusUpper === 'SUSPENDED' ? 'ระงับทะเบียน' : 'ไม่มีคุณสมบัติตามเกณฑ์';
            throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'BENEFICIARY_INELIGIBLE', `ทะเบียนนี้อยู่ในสถานะ "${statusLabel}" จึงไม่สามารถยื่นคำร้องขอความช่วยเหลือได้`);
        }
        const fullName = (0, shared_1.formatPersonName)({
            prefix: beneficiary.title,
            firstName: beneficiary.firstName,
            lastName: beneficiary.lastName,
        });
        const idNum = beneficiary.identityNumberNormalized || beneficiary.identityNumber || '';
        const canSeeSensitive = user?.permissions?.includes('beneficiaries.read.sensitive') ?? true;
        const currentAddr = beneficiary.addresses?.find((a) => a.addressType === 'CURRENT') || beneficiary.addresses?.[0];
        const asnafCode = beneficiary.assessments?.[0]?.category?.code || 'miskin';
        return {
            found: true,
            canApply: true,
            beneficiary: {
                id: beneficiary.id,
                registrationNo: beneficiary.registryNumber,
                fullName,
                nationalId: canSeeSensitive ? idNum : (0, mask_identity_1.maskIdentityNumber)(idNum),
                nationalIdMasked: (0, mask_identity_1.maskIdentityNumber)(idNum),
                phone: beneficiary.phone ?? '',
                email: '',
                asnafCategory: asnafCode,
                branchId: 'br-hq',
                branchName: 'สำนักงานใหญ่ กรุงเทพมหานคร',
                registrationStatus: beneficiary.status,
                address: currentAddr?.addressLine ?? beneficiary.household?.address ?? '',
                province: currentAddr?.province ?? beneficiary.household?.province ?? '',
                district: currentAddr?.district ?? beneficiary.household?.district ?? '',
                community: currentAddr?.community ?? beneficiary.household?.community ?? '',
            },
        };
    }
    async create(dto, user) {
        if (!dto.requestedAmount || dto.requestedAmount <= 0) {
            throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'INVALID_AMOUNT', 'จำนวนเงินที่ขอความช่วยเหลือต้องมากกว่า 0 บาท');
        }
        const benInput = dto.beneficiaryId.trim();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(benInput);
        const cleanId = benInput.replace(/[^0-9]/g, '');
        const orClauses = [];
        if (isUuid)
            orClauses.push({ id: benInput });
        if (cleanId.length === 13)
            orClauses.push({ identityNumberNormalized: cleanId });
        orClauses.push({ registryNumber: benInput });
        const beneficiary = await this.prisma.beneficiary.findFirst({
            where: { OR: orClauses },
            include: {
                assessments: {
                    include: { category: true },
                    orderBy: { assessedAt: 'desc' },
                    take: 1,
                },
            },
        });
        if (!beneficiary) {
            throw new app_exception_1.AppException(common_1.HttpStatus.NOT_FOUND, 'BENEFICIARY_NOT_FOUND', 'ไม่พบข้อมูลผู้ขอรับความช่วยเหลือในระบบ กรุณาตรวจสอบเลขบัตรประชาชนหรือรหัสผู้มีสิทธิ์');
        }
        const statusUpper = String(beneficiary.status || '').toUpperCase();
        if (statusUpper === 'SUSPENDED' || statusUpper === 'INELIGIBLE' || statusUpper === 'DISQUALIFIED') {
            throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'BENEFICIARY_INELIGIBLE', 'ผู้ขอรับความช่วยเหลืออยู่ในสถานะถูกระงับสิทธิ์หรือไม่ผ่านเกณฑ์');
        }
        const fiscalYear = (new Date().getFullYear() + 543).toString();
        const prefix = `APP-${fiscalYear}-`;
        const nowIso = new Date().toISOString();
        const actorId = user?.id ?? null;
        const actorName = user?.displayName ?? 'เจ้าหน้าที่ฝ่ายสงเคราะห์';
        return await this.prisma.$transaction(async (tx) => {
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
            const requestedDecimal = new client_1.Prisma.Decimal(dto.requestedAmount);
            const defaultAsnaf = beneficiary.assessments?.[0]?.category?.code || 'miskin';
            const application = await tx.assistanceApplication.create({
                data: {
                    applicationNo,
                    beneficiaryId: beneficiary.id,
                    asnafCategory: dto.asnafCategory || defaultAsnaf,
                    requestedAmount: requestedDecimal,
                    urgencyLevel: dto.urgencyLevel || 'normal',
                    status: 'submitted',
                    appliedDate: nowIso,
                    branchId: dto.branchId || 'br-hq',
                    branchName: dto.branchName || 'สำนักงานใหญ่ กรุงเทพมหานคร',
                    hardshipReasons: dto.hardshipReasons || null,
                    necessityDetails: dto.necessityDetails || null,
                    assistanceTypeId: dto.assistanceTypeId || null,
                    assistanceGroup: dto.assistanceGroup || 'core',
                    specificFundId: dto.specificFundId || null,
                    specificFundCode: dto.specificFundCode || null,
                    specificFundName: dto.specificFundName || null,
                    fiscalYear,
                    registrationNo: beneficiary.registryNumber,
                },
            });
            await tx.applicationHistory.create({
                data: {
                    applicationId: application.id,
                    status: 'submitted',
                    timestamp: nowIso,
                    changedById: actorId || 'system',
                    changedByName: actorName,
                    notes: `ยื่นคำร้องขอความช่วยเหลือ วงเงิน ฿${requestedDecimal.toFixed(2)}`,
                },
            });
            await this.audit.record(tx, {
                actorId,
                action: 'ASSISTANCE_REQUEST_CREATE',
                resourceType: 'assistance_application',
                resourceId: application.id,
                metadata: {
                    applicationNo: application.applicationNo,
                    beneficiaryId: beneficiary.id,
                    requestedAmount: requestedDecimal.toFixed(2),
                },
            });
            return {
                ...application,
                requestedAmount: Number(application.requestedAmount),
                approvedAmount: application.approvedAmount ? Number(application.approvedAmount) : null,
            };
        });
    }
    async list(query, user) {
        const page = Math.max(1, Number(query.page || 1));
        const limit = Math.max(1, Math.min(100, Number(query.limit || 20)));
        const skip = (page - 1) * limit;
        const where = {};
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
                            registryNumber: true,
                            phone: true,
                        },
                    },
                    documents: {
                        select: {
                            id: true,
                            name: true,
                            category: true,
                            status: true,
                            fileUrl: true,
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
            const fullName = ben ? (0, shared_1.formatPersonName)({ prefix: ben.title, firstName: ben.firstName, lastName: ben.lastName }) : '';
            const idNum = ben?.identityNumberNormalized || ben?.identityNumber || '';
            return {
                ...app,
                requestedAmount: Number(app.requestedAmount),
                approvedAmount: app.approvedAmount ? Number(app.approvedAmount) : null,
                disbursedAmount: app.disbursedAmount ? Number(app.disbursedAmount) : null,
                beneficiary: ben
                    ? {
                        id: ben.id,
                        fullName,
                        registryNumber: ben.registryNumber,
                        phone: ben.phone,
                        identityNumber: canSeeSensitive ? idNum : (0, mask_identity_1.maskIdentityNumber)(idNum),
                        identityNumberMasked: (0, mask_identity_1.maskIdentityNumber)(idNum),
                        thaiNationalId: canSeeSensitive ? idNum : (0, mask_identity_1.maskIdentityNumber)(idNum),
                        thaiNationalIdMasked: (0, mask_identity_1.maskIdentityNumber)(idNum),
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
    async getById(id, user) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const where = isUuid
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
                    },
                },
                documents: true,
                history: {
                    orderBy: { createdAt: 'asc' },
                },
                legacyAssessment: true,
                executionRecords: true,
            },
        });
        if (!app) {
            throw new app_exception_1.AppException(common_1.HttpStatus.NOT_FOUND, 'APPLICATION_NOT_FOUND', `ไม่พบคำร้องขอความช่วยเหลือรหัส ${id}`);
        }
        const canSeeSensitive = user?.permissions?.includes('beneficiaries.read.sensitive') ?? true;
        const ben = app.beneficiary;
        const fullName = ben ? (0, shared_1.formatPersonName)({ prefix: ben.title, firstName: ben.firstName, lastName: ben.lastName }) : '';
        const idNum = ben?.identityNumberNormalized || ben?.identityNumber || '';
        return {
            ...app,
            requestedAmount: Number(app.requestedAmount),
            approvedAmount: app.approvedAmount ? Number(app.approvedAmount) : null,
            disbursedAmount: app.disbursedAmount ? Number(app.disbursedAmount) : null,
            beneficiary: ben
                ? {
                    ...ben,
                    fullName,
                    identityNumber: canSeeSensitive ? idNum : (0, mask_identity_1.maskIdentityNumber)(idNum),
                    identityNumberMasked: (0, mask_identity_1.maskIdentityNumber)(idNum),
                    thaiNationalId: canSeeSensitive ? idNum : (0, mask_identity_1.maskIdentityNumber)(idNum),
                    thaiNationalIdMasked: (0, mask_identity_1.maskIdentityNumber)(idNum),
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
    async updateStatus(id, dto, user) {
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
            throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'INVALID_STATUS', `สถานะ "${dto.status}" ไม่ถูกต้องตามขั้นตอนการดำเนินงาน`);
        }
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const existing = await this.prisma.assistanceApplication.findFirst({
            where: isUuid ? { id } : { OR: [{ applicationNo: id }, { legacyId: id }] },
        });
        if (!existing) {
            throw new app_exception_1.AppException(common_1.HttpStatus.NOT_FOUND, 'APPLICATION_NOT_FOUND', `ไม่พบคำร้องขอความช่วยเหลือรหัส ${id}`);
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
    async addDocument(id, dto, user) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const app = await this.prisma.assistanceApplication.findFirst({
            where: isUuid ? { id } : { OR: [{ applicationNo: id }, { legacyId: id }] },
        });
        if (!app) {
            throw new app_exception_1.AppException(common_1.HttpStatus.NOT_FOUND, 'APPLICATION_NOT_FOUND', `ไม่พบคำร้องขอความช่วยเหลือรหัส ${id}`);
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
};
exports.AssistanceRequestsService = AssistanceRequestsService;
exports.AssistanceRequestsService = AssistanceRequestsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], AssistanceRequestsService);
//# sourceMappingURL=assistance-requests.service.js.map