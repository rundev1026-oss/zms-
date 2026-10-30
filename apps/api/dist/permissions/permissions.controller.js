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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const shared_1 = require("@zms/shared");
const permissions_guard_1 = require("../auth/permissions.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../common/roles.decorator");
const prisma_service_1 = require("../prisma/prisma.service");
let PermissionsController = class PermissionsController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    getCatalog() {
        return {
            success: true,
            modules: shared_1.MODULE_PERMISSION_CATALOG,
            totalModules: shared_1.MODULE_PERMISSION_CATALOG.length,
            totalActions: shared_1.MODULE_PERMISSION_CATALOG.reduce((acc, m) => acc + m.actions.length, 0),
        };
    }
    async getAuditLogs(targetUserId, targetRoleId, page = 1, pageSize = 50) {
        const p = Math.max(1, Number(page) || 1);
        const ps = Math.max(1, Math.min(100, Number(pageSize) || 50));
        const where = {};
        if (targetUserId)
            where.targetUserId = targetUserId;
        if (targetRoleId)
            where.targetRoleId = targetRoleId;
        const [total, logs] = await Promise.all([
            this.prisma.permissionAuditLog.count({ where }),
            this.prisma.permissionAuditLog.findMany({
                where,
                skip: (p - 1) * ps,
                take: ps,
                orderBy: { createdAt: 'desc' },
                include: {
                    actor: { select: { id: true, displayName: true, email: true, username: true } },
                    targetUser: { select: { id: true, displayName: true, email: true, username: true } },
                    targetRole: { select: { id: true, code: true, name: true } },
                },
            }),
        ]);
        return {
            success: true,
            items: logs,
            data: logs,
            total,
            page: p,
            pageSize: ps,
            totalPages: Math.ceil(total / ps) || 1,
        };
    }
};
exports.PermissionsController = PermissionsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'รายการแคตตาล็อกสิทธิ์ทั้ง 15 โมดูลและ Action ทั้งหมด' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PermissionsController.prototype, "getCatalog", null);
__decorate([
    (0, common_1.Get)('audit-logs'),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN', 'ADMIN', 'AUDITOR'),
    (0, swagger_1.ApiOperation)({ summary: 'ประวัติการเปลี่ยนแปลงสิทธิ์ (Permission Audit Logs)' }),
    __param(0, (0, common_1.Query)('targetUserId')),
    __param(1, (0, common_1.Query)('targetRoleId')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], PermissionsController.prototype, "getAuditLogs", null);
exports.PermissionsController = PermissionsController = __decorate([
    (0, swagger_1.ApiTags)('permissions'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, common_1.Controller)('permissions'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PermissionsController);
//# sourceMappingURL=permissions.controller.js.map