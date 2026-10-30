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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const permissions_guard_1 = require("../auth/permissions.guard");
const roles_guard_1 = require("../auth/roles.guard");
const current_user_decorator_1 = require("../common/current-user.decorator");
const roles_decorator_1 = require("../common/roles.decorator");
const users_dto_1 = require("./users.dto");
const users_service_1 = require("./users.service");
let UsersController = class UsersController {
    users;
    constructor(users) {
        this.users = users;
    }
    me(user) {
        return this.users.toProfile(user);
    }
    findAll(query) {
        return this.users.findAllUsers(query);
    }
    create(dto, actor, ip) {
        return this.users.createUser(dto, actor.id, ip);
    }
    findOne(id) {
        return this.users.getUserDetail(id);
    }
    update(id, dto, actor, ip) {
        return this.users.updateUser(id, dto, actor.id, ip);
    }
    updateStatus(id, dto, actor, ip) {
        return this.users.updateUserStatus(id, dto, actor.id, ip);
    }
    resetPassword(id, newPassword, actor) {
        return this.users.resetUserPassword(id, actor.id, newPassword);
    }
    getUserPermissions(id) {
        return this.users.getUserPermissions(id);
    }
    async getEffectivePermissions(id) {
        const detail = await this.users.getUserDetail(id);
        return {
            userId: detail.id,
            roles: detail.roles,
            permissions: detail.effectivePermissions,
            dataScope: detail.dataScope.scope,
            approvalLimit: detail.dataScope.approvalLimit,
        };
    }
    updateUserPermissions(id, dto, actor, ip) {
        return this.users.updateUserPermissions(id, dto, actor.id, ip);
    }
    previewEffectivePermissions(id, body) {
        return this.users.getEffectivePermissionsPreview(id, body.overrides, body.roleCode);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiOperation)({ summary: 'โปรไฟล์เจ้าหน้าที่จากโทเคน' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "me", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN', 'ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'รายการผู้ใช้งานทั้งหมด พร้อมตัวกรองและสรุปสถิติ' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [users_dto_1.QueryUsersDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'สร้างผู้ใช้งานใหม่ (เฉพาะ Super Admin)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [users_dto_1.CreateUserDto, Object, String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN', 'ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'ดูรายละเอียดผู้ใช้งานรายบุคคล' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'แก้ไขข้อมูลผู้ใช้งานและบทบาท' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, users_dto_1.UpdateUserDto, Object, String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'ระงับหรือเปิดใช้งานบัญชีผู้ใช้ (มีระบบป้องกัน Super Admin Lockout)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, users_dto_1.UpdateUserStatusDto, Object, String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)(':id/reset-password'),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'รีเซ็ตรหัสผ่านผู้ใช้งานโดยผู้ดูแลระบบ' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)('newPassword')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Get)(':id/permissions'),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN', 'ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'เรียกดูสิทธิ์ Role, Overrides และ Effective Permissions ของผู้ใช้' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getUserPermissions", null);
__decorate([
    (0, common_1.Get)(':id/effective-permissions'),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN', 'ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'คำนวณและสรุปสิทธิ์สุทธิ (Effective Permissions) ของผู้ใช้' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getEffectivePermissions", null);
__decorate([
    (0, common_1.Put)(':id/permissions'),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'กำหนดสิทธิ์เฉพาะบุคคล (ALLOW/DENY/INHERIT), Data Scope และวงเงินอนุมัติ' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, users_dto_1.UpdateUserPermissionsDto, Object, String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateUserPermissions", null);
__decorate([
    (0, common_1.Post)(':id/effective-permissions/preview'),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'คำนวณและพรีวิว Effective Permissions ก่อนบันทึกจริง' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "previewEffectivePermissions", null);
exports.UsersController = UsersController = __decorate([
    (0, swagger_1.ApiTags)('users'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map