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
exports.RolesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const permissions_guard_1 = require("../auth/permissions.guard");
const roles_guard_1 = require("../auth/roles.guard");
const current_user_decorator_1 = require("../common/current-user.decorator");
const roles_decorator_1 = require("../common/roles.decorator");
const roles_dto_1 = require("./roles.dto");
const roles_service_1 = require("./roles.service");
let RolesController = class RolesController {
    roles;
    constructor(roles) {
        this.roles = roles;
    }
    list() {
        return this.roles.listCatalog();
    }
    getOne(id) {
        return this.roles.getRole(id);
    }
    create(dto, actor, ip) {
        return this.roles.createRole(dto, actor.id, ip);
    }
    update(id, dto, actor, ip) {
        return this.roles.updateRole(id, dto, actor.id, ip);
    }
    clone(id, dto, actor, ip) {
        return this.roles.cloneRole(id, dto, actor.id, ip);
    }
    updatePermissions(id, dto, actor, ip) {
        return this.roles.updateRolePermissions(id, dto, actor.id, ip);
    }
};
exports.RolesController = RolesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'รายการบทบาทและสิทธิ์จากฐานข้อมูล' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RolesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN', 'ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'ดูรายละเอียดบทบาท สิทธิ์ และรายชื่อผู้ใช้งานที่ผูกกับบทบาท' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RolesController.prototype, "getOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'สร้างบทบาทใหม่ (Custom Role)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [roles_dto_1.CreateRoleDto, Object, String]),
    __metadata("design:returntype", void 0)
], RolesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'แก้ไขชื่อ คำอธิบาย หรือสถานะบทบาท' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, roles_dto_1.UpdateRoleDto, Object, String]),
    __metadata("design:returntype", void 0)
], RolesController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/clone'),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'คัดลอกบทบาท (Clone Role) พร้อมสิทธิ์ทั้งหมด' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, roles_dto_1.CloneRoleDto, Object, String]),
    __metadata("design:returntype", void 0)
], RolesController.prototype, "clone", null);
__decorate([
    (0, common_1.Put)(':id/permissions'),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'กำหนดสิทธิ์ให้บทบาท (Assign Permissions to Role)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, roles_dto_1.UpdateRolePermissionsDto, Object, String]),
    __metadata("design:returntype", void 0)
], RolesController.prototype, "updatePermissions", null);
exports.RolesController = RolesController = __decorate([
    (0, swagger_1.ApiTags)('roles'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, common_1.Controller)('roles'),
    __metadata("design:paramtypes", [roles_service_1.RolesService])
], RolesController);
//# sourceMappingURL=roles.controller.js.map