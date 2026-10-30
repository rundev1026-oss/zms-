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
exports.RolesGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_exception_1 = require("../common/app.exception");
const public_decorator_1 = require("../common/public.decorator");
const roles_decorator_1 = require("../common/roles.decorator");
let RolesGuard = class RolesGuard {
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
        const requiredRoles = this.reflector.getAllAndOverride(roles_decorator_1.ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]) ?? [];
        if (requiredRoles.length === 0) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (user === undefined) {
            throw new app_exception_1.AppException(common_1.HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'กรุณาเข้าสู่ระบบ');
        }
        const userRoleCodes = (user.roles || []).map((r) => typeof r === 'string' ? r : r.code);
        const hasRole = requiredRoles.some((role) => userRoleCodes.includes(role));
        if (!hasRole) {
            throw new app_exception_1.AppException(common_1.HttpStatus.FORBIDDEN, 'FORBIDDEN_ROLE', `ไม่อนุญาต: สิทธิ์การเข้าถึงสำหรับบทบาท [${requiredRoles.join(', ')}] เท่านั้น`);
        }
        return true;
    }
};
exports.RolesGuard = RolesGuard;
exports.RolesGuard = RolesGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], RolesGuard);
//# sourceMappingURL=roles.guard.js.map