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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsService = exports.STORAGE_ROOT = void 0;
const node_crypto_1 = require("node:crypto");
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const common_1 = require("@nestjs/common");
const audit_service_1 = require("../audit/audit.service");
const beneficiaries_service_1 = require("../beneficiaries/beneficiaries.service");
const app_exception_1 = require("../common/app.exception");
const prisma_service_1 = require("../prisma/prisma.service");
const file_signature_1 = require("./file-signature");
exports.STORAGE_ROOT = 'STORAGE_ROOT';
let DocumentsService = class DocumentsService {
    prisma;
    beneficiaries;
    audit;
    storageRoot;
    constructor(prisma, beneficiaries, audit, storageRoot) {
        this.prisma = prisma;
        this.beneficiaries = beneficiaries;
        this.audit = audit;
        this.storageRoot = storageRoot;
    }
    async list(beneficiaryId) {
        await this.beneficiaries.requireRecord(beneficiaryId);
        const rows = await this.prisma.beneficiaryDocument.findMany({
            where: { beneficiaryId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
        });
        return rows.map((row) => this.toView(row));
    }
    async upload(beneficiaryId, file, documentType, actor) {
        await this.beneficiaries.requireRecord(beneficiaryId);
        if (file === undefined) {
            throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'ข้อมูลไม่ถูกต้อง', [
                { field: 'file', message: 'กรุณาเลือกไฟล์' },
            ]);
        }
        const kind = (0, file_signature_1.detectAllowedFile)(file.buffer);
        if (kind === null) {
            throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'ข้อมูลไม่ถูกต้อง', [
                { field: 'file', message: 'รองรับเฉพาะไฟล์ pdf, jpg หรือ png ขนาดไม่เกิน 10 MB' },
            ]);
        }
        const originalFileName = safeOriginalName(file.originalname);
        const storageKey = `${beneficiaryId}/${(0, node_crypto_1.randomUUID)()}.${(0, file_signature_1.extensionForKind)(kind)}`;
        const fullPath = this.resolve(storageKey);
        await (0, promises_1.mkdir)(node_path_1.default.dirname(fullPath), { recursive: true });
        await (0, promises_1.writeFile)(fullPath, file.buffer);
        const row = await this.prisma.$transaction(async (tx) => {
            const created = await tx.beneficiaryDocument.create({
                data: {
                    beneficiaryId,
                    documentType,
                    originalFileName,
                    storageKey,
                    sizeBytes: file.buffer.length,
                    mimeType: (0, file_signature_1.mimeForKind)(kind),
                    uploadedById: actor.id,
                },
            });
            await this.audit.record(tx, {
                actorId: actor.id,
                action: 'DOCUMENT_UPLOAD',
                resourceType: 'beneficiary_document',
                resourceId: created.id,
                metadata: { beneficiaryId, kind, sizeBytes: file.buffer.length },
            });
            return created;
        });
        return this.toView(row);
    }
    async review(documentId, input, actor) {
        const existing = await this.findActive(documentId);
        const row = await this.prisma.$transaction(async (tx) => {
            const updated = await tx.beneficiaryDocument.update({
                where: { id: existing.id },
                data: {
                    status: input.status,
                    reviewNote: input.reviewNote ?? null,
                    reviewedById: actor.id,
                    reviewedAt: new Date(),
                },
            });
            await this.audit.record(tx, {
                actorId: actor.id,
                action: 'DOCUMENT_REVIEW',
                resourceType: 'beneficiary_document',
                resourceId: updated.id,
                metadata: { status: input.status },
            });
            return updated;
        });
        return this.toView(row);
    }
    async remove(documentId, actor) {
        const existing = await this.findActive(documentId);
        await this.prisma.$transaction(async (tx) => {
            await tx.beneficiaryDocument.update({
                where: { id: existing.id },
                data: { deletedAt: new Date() },
            });
            await this.audit.record(tx, {
                actorId: actor.id,
                action: 'DOCUMENT_DELETE',
                resourceType: 'beneficiary_document',
                resourceId: existing.id,
                metadata: { softDeleted: true },
            });
        });
        return { id: existing.id, deleted: true };
    }
    async readContent(documentId, actor) {
        const existing = await this.findActive(documentId);
        const fullPath = this.resolve(existing.storageKey);
        const bytes = await (0, promises_1.readFile)(fullPath);
        await this.audit.write({
            actorId: actor.id,
            action: 'DOCUMENT_DOWNLOAD',
            resourceType: 'beneficiary_document',
            resourceId: existing.id,
            metadata: { sizeBytes: bytes.length },
        });
        return {
            bytes,
            mimeType: existing.mimeType,
            fileName: existing.originalFileName,
        };
    }
    async findActive(documentId) {
        const row = await this.prisma.beneficiaryDocument.findFirst({
            where: { id: documentId, deletedAt: null },
        });
        if (row === null) {
            throw new app_exception_1.AppException(common_1.HttpStatus.NOT_FOUND, 'NOT_FOUND', 'ไม่พบเอกสาร');
        }
        return row;
    }
    resolve(storageKey) {
        if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|jpg|png)$/i.test(storageKey)) {
            throw new app_exception_1.AppException(common_1.HttpStatus.NOT_FOUND, 'NOT_FOUND', 'ไม่พบเอกสาร');
        }
        const root = node_path_1.default.resolve(this.storageRoot);
        const full = node_path_1.default.resolve(root, storageKey);
        if (!full.startsWith(root + node_path_1.default.sep)) {
            throw new app_exception_1.AppException(common_1.HttpStatus.NOT_FOUND, 'NOT_FOUND', 'ไม่พบเอกสาร');
        }
        return full;
    }
    toView(row) {
        return {
            id: row.id,
            beneficiaryId: row.beneficiaryId,
            documentType: row.documentType,
            originalFileName: row.originalFileName,
            sizeBytes: row.sizeBytes,
            mimeType: row.mimeType,
            status: row.status,
            createdAt: row.createdAt.toISOString(),
            reviewedAt: row.reviewedAt === null ? null : row.reviewedAt.toISOString(),
        };
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(exports.STORAGE_ROOT)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        beneficiaries_service_1.BeneficiariesService,
        audit_service_1.AuditService, String])
], DocumentsService);
function safeOriginalName(originalName) {
    const base = node_path_1.default.basename(originalName.replaceAll('\0', '')).slice(0, 255);
    if (base.length === 0 || base === '.' || base === '..') {
        throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'ข้อมูลไม่ถูกต้อง', [
            { field: 'file', message: 'ชื่อไฟล์ไม่ถูกต้อง' },
        ]);
    }
    return base;
}
//# sourceMappingURL=documents.service.js.map