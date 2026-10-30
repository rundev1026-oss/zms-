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
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const sanitize_metadata_1 = require("./sanitize-metadata");
const app_exception_1 = require("../common/app.exception");
let AuditService = class AuditService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    write(entry) {
        return this.record(this.prisma, entry);
    }
    async record(writer, entry) {
        await writer.auditLog.create({
            data: {
                actorId: entry.actorId,
                action: entry.action,
                resourceType: entry.resourceType,
                resourceId: entry.resourceId,
                metadata: (0, sanitize_metadata_1.sanitizeMetadata)(entry.metadata),
            },
        });
    }
    async list(query) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.max(1, Math.min(100, Number(query.limit) || 15));
        const skip = (page - 1) * limit;
        const where = {};
        if (query.action) {
            where.action = { contains: query.action, mode: 'insensitive' };
        }
        if (query.resourceType) {
            where.resourceType = query.resourceType;
        }
        if (query.resourceId) {
            where.resourceId = query.resourceId;
        }
        if (query.actorId) {
            where.actorId = query.actorId;
        }
        if (query.search) {
            where.OR = [
                { action: { contains: query.search, mode: 'insensitive' } },
                { resourceType: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        const [total, items] = await Promise.all([
            this.prisma.auditLog.count({ where }),
            this.prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    actor: {
                        select: {
                            id: true,
                            displayName: true,
                            email: true,
                        },
                    },
                },
            }),
        ]);
        return {
            items: items.map((item) => ({
                ...item,
                createdAt: item.createdAt.toISOString(),
            })),
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getById(id) {
        const log = await this.prisma.auditLog.findUnique({
            where: { id },
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
        if (!log) {
            throw new app_exception_1.AppException(common_1.HttpStatus.NOT_FOUND, 'AUDIT_LOG_NOT_FOUND', `ไม่พบบันทึกประวัติการทำงานรหัส ${id}`);
        }
        return {
            ...log,
            createdAt: log.createdAt.toISOString(),
        };
    }
    async getSummary() {
        const [totalLogs, topActions] = await Promise.all([
            this.prisma.auditLog.count(),
            this.prisma.auditLog.groupBy({
                by: ['action'],
                _count: { action: true },
                orderBy: { _count: { action: 'desc' } },
                take: 8,
            }),
        ]);
        return {
            totalAuditLogs: totalLogs,
            topActions: topActions.map((a) => ({
                action: a.action,
                count: a._count.action,
            })),
            timestamp: new Date().toISOString(),
        };
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
//# sourceMappingURL=audit.service.js.map