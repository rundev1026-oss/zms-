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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../common/public.decorator");
const current_user_decorator_1 = require("../common/current-user.decorator");
const request_dto_1 = require("../common/request.dto");
const users_service_1 = require("../users/users.service");
const auth_service_1 = require("./auth.service");
let AuthController = class AuthController {
    auth;
    users;
    constructor(auth, users) {
        this.auth = auth;
        this.users = users;
    }
    async login(dto, ip, request, response) {
        const userAgent = request.headers['user-agent'];
        const result = await this.auth.login(dto.email, dto.password, ip, userAgent);
        if (result.mfaRequired) {
            return {
                mfaRequired: true,
                tempToken: result.tempToken,
                expiresIn: result.expiresIn,
                userId: result.userId,
                email: result.email,
            };
        }
        response.cookie(auth_service_1.REFRESH_COOKIE, result.refreshToken, this.auth.cookieOptions());
        return {
            mfaRequired: false,
            accessToken: result.accessToken,
            tokenType: 'Bearer',
            expiresIn: result.expiresIn,
            user: result.user,
        };
    }
    async verify2fa(dto, ip, request, response) {
        const userAgent = request.headers['user-agent'];
        const session = await this.auth.verify2fa(dto.tempToken, dto.code, ip, userAgent);
        response.cookie(auth_service_1.REFRESH_COOKIE, session.refreshToken, this.auth.cookieOptions());
        return {
            mfaRequired: false,
            accessToken: session.accessToken,
            tokenType: 'Bearer',
            expiresIn: session.expiresIn,
            user: session.user,
        };
    }
    async setup2fa(user) {
        return this.auth.setup2fa(user.id);
    }
    async enable2fa(user, dto) {
        return this.auth.enable2fa(user.id, dto.code, dto.secret, dto.recoveryCodes);
    }
    async disable2fa(user, dto) {
        return this.auth.disable2fa(user.id, dto.password, dto.code);
    }
    async forgotPassword(dto, ip) {
        return this.auth.forgotPassword(dto.email, ip);
    }
    async resetPassword(dto) {
        return this.auth.resetPassword(dto.token, dto.newPassword);
    }
    async refresh(request, csrf, response) {
        const raw = readRefreshCookie(request);
        const session = await this.auth.refresh(raw, csrf);
        response.cookie(auth_service_1.REFRESH_COOKIE, session.refreshToken, this.auth.cookieOptions());
        return {
            accessToken: session.accessToken,
            tokenType: 'Bearer',
            expiresIn: session.expiresIn,
            user: session.user,
        };
    }
    async logout(request, csrf, response) {
        await this.auth.logout(readRefreshCookie(request), csrf, null);
        const options = this.auth.cookieOptions();
        response.clearCookie(auth_service_1.REFRESH_COOKIE, {
            httpOnly: options.httpOnly,
            sameSite: options.sameSite,
            secure: options.secure,
            path: options.path,
        });
        return { loggedOut: true };
    }
    async me(user) {
        const profile = await this.users.findUserById(user.id);
        return this.users.toProfile(user, profile?.mfaEnabled ?? false);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'เข้าสู่ระบบ (รองรับ 2FA TOTP)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Ip)()),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [request_dto_1.LoginDto, String, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('2fa/verify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'ยืนยันรหัส 2FA TOTP หรือ Recovery code ในขั้นตอนเข้าสู่ระบบ' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Ip)()),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [request_dto_1.Verify2faDto, String, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verify2fa", null);
__decorate([
    (0, common_1.Get)('2fa/setup'),
    (0, swagger_1.ApiOperation)({ summary: 'สร้าง TOTP secret และ Recovery codes สำหรับตั้งค่า 2FA' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "setup2fa", null);
__decorate([
    (0, common_1.Post)('2fa/enable'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'ยืนยันและเปิดใช้งาน 2FA TOTP' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, request_dto_1.Enable2faDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "enable2fa", null);
__decorate([
    (0, common_1.Post)('2fa/disable'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'ยกเลิกการใช้งาน 2FA TOTP' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, request_dto_1.Disable2faDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "disable2fa", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('forgot-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'ขอรับลิงก์รีเซ็ตรหัสผ่านทางอีเมล' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [request_dto_1.ForgotPasswordDto, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('reset-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'ตั้งรหัสผ่านใหม่ด้วย Reset Token' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [request_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'หมุน refresh token จาก HttpOnly cookie' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('x-zms-csrf')),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'เพิกถอน refresh token ของเซสชันนี้' }),
    (0, swagger_1.ApiOkResponse)({ description: 'ออกจากระบบแล้ว' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('x-zms-csrf')),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiOperation)({ summary: 'ผู้ใช้ บทบาท และสิทธิ์จากฐานข้อมูล' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "me", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        users_service_1.UsersService])
], AuthController);
function readRefreshCookie(request) {
    const cookies = request.cookies;
    const value = cookies?.[auth_service_1.REFRESH_COOKIE];
    return typeof value === 'string' ? value : undefined;
}
//# sourceMappingURL=auth.controller.js.map