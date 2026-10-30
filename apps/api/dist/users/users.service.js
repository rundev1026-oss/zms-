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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findLoginAccount(email) {
        return this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: {
                id: true,
                email: true,
                passwordHash: true,
                isActive: true,
                mfaEnabled: true,
                mfaSecret: true,
                mfaRecoveryHash: true,
            },
        });
    }
    async findUserById(id) {
        return this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                displayName: true,
                isActive: true,
                mfaEnabled: true,
                mfaSecret: true,
                mfaRecoveryHash: true,
            },
        });
    }
    async findUserByEmail(email) {
        return this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: {
                id: true,
                email: true,
                displayName: true,
                isActive: true,
                mfaEnabled: true,
            },
        });
    }
    async loadAuthUser(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                userRoles: {
                    include: {
                        role: {
                            include: { rolePermissions: { include: { permission: true } } },
                        },
                    },
                },
            },
        });
        if (user === null || !user.isActive) {
            return null;
        }
        const roles = user.userRoles.map((link) => ({
            code: link.role.code,
            name: link.role.name,
        }));
        const permissions = [
            ...new Set(user.userRoles.flatMap((link) => link.role.rolePermissions.map((item) => item.permission.code))),
        ];
        return {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            roles,
            permissions,
        };
    }
    async updateMfa(userId, enabled, secret, recoveryHash) {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                mfaEnabled: enabled,
                mfaSecret: secret,
                mfaRecoveryHash: recoveryHash,
            },
        });
    }
    async updatePassword(userId, passwordHash) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash },
        });
    }
    async recordLoginAttempt(params) {
        await this.prisma.loginHistory.create({
            data: {
                userId: params.userId ?? null,
                email: params.email.toLowerCase(),
                ipAddress: params.ipAddress,
                userAgent: params.userAgent ?? 'Unknown',
                status: params.status,
            },
        });
        if (params.status === 'SUCCESS' && params.userId) {
            await this.prisma.user.update({
                where: { id: params.userId },
                data: { lastLoginAt: new Date() },
            });
        }
    }
    toProfile(user, mfaEnabled = false) {
        return {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            roles: user.roles,
            permissions: user.permissions,
            mfaEnabled,
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map