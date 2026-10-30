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
exports.PermissionsGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_exception_1 = require("../common/app.exception");
const permissions_decorator_1 = require("../common/permissions.decorator");
const public_decorator_1 = require("../common/public.decorator");
let PermissionsGuard = class PermissionsGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        const required = this.reflector.getAllAndOverride(permissions_decorator_1.PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]) ?? [];
        if (required.length === 0) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (user === undefined) {
            throw new app_exception_1.AppException(common_1.HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'กรุณาเข้าสู่ระบบ');
        }
        const allowed = required.every((permission) => user.permissions.includes(permission));
        if (!allowed) {
            throw new app_exception_1.AppException(common_1.HttpStatus.FORBIDDEN, 'FORBIDDEN', 'ไม่มีสิทธิ์ดำเนินการนี้');
        }
        return true;
    }
};
exports.PermissionsGuard = PermissionsGuard;
exports.PermissionsGuard = PermissionsGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], PermissionsGuard);
//# sourceMappingURL=permissions.guard.js.map