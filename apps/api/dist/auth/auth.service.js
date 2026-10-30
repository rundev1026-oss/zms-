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
exports.AuthService = exports.REFRESH_COOKIE = void 0;
exports.hashToken = hashToken;
const node_crypto_1 = require("node:crypto");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const audit_service_1 = require("../audit/audit.service");
const app_exception_1 = require("../common/app.exception");
const prisma_service_1 = require("../prisma/prisma.service");
const password_hash_1 = require("../security/password-hash");
const totp_1 = require("../security/totp");
const users_service_1 = require("../users/users.service");
const login_rate_limiter_1 = require("./login-rate-limiter");
exports.REFRESH_COOKIE = 'zms_refresh';
let AuthService = class AuthService {
    users;
    prisma;
    jwt;
    config;
    audit;
    rateLimiter;
    constructor(users, prisma, jwt, config, audit, rateLimiter) {
        this.users = users;
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
        this.audit = audit;
        this.rateLimiter = rateLimiter;
    }
    cookieOptions() {
        const prefix = (this.config.get('API_PREFIX') ?? 'api/v1').replace(/^\/+|\/+$/g, '');
        return {
            httpOnly: true,
            sameSite: 'lax',
            secure: this.config.get('NODE_ENV') === 'production',
            path: `/${prefix}/auth`,
            maxAge: this.refreshTtlSeconds() * 1000,
        };
    }
    async login(email, password, ip, userAgent) {
        const rateLimitKey = `${ip}:${email.toLowerCase()}`;
        this.rateLimiter.assertAllowed(rateLimitKey);
        const account = await this.users.findLoginAccount(email);
        const valid = account !== null && account.isActive && (0, password_hash_1.verifyPassword)(password, account.passwordHash);
        if (!valid || account === null) {
            this.rateLimiter.recordFailure(rateLimitKey);
            await this.users.recordLoginAttempt({
                userId: account?.id ?? null,
                email,
                ipAddress: ip,
                userAgent,
                status: 'FAILED_CREDENTIALS',
            });
            await this.audit.write({
                actorId: null,
                action: 'AUTH_LOGIN_FAILED',
                resourceType: 'auth',
                resourceId: null,
                metadata: { email, outcome: 'rejected_credentials' },
            });
            throw new app_exception_1.AppException(common_1.HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        }
        this.rateLimiter.recordSuccess(rateLimitKey);
        if (account.mfaEnabled && account.mfaSecret) {
            const tempExpiresIn = 300;
            const tempToken = await this.jwt.signAsync({ sub: account.id, mfaPending: true }, { expiresIn: tempExpiresIn, algorithm: 'HS256' });
            return {
                mfaRequired: true,
                tempToken,
                expiresIn: tempExpiresIn,
                userId: account.id,
                email: account.email,
            };
        }
        const user = await this.users.loadAuthUser(account.id);
        if (user === null) {
            throw new app_exception_1.AppException(common_1.HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'บัญชีผู้ใช้งานไม่พร้อมใช้งาน');
        }
        const refreshToken = (0, node_crypto_1.randomBytes)(32).toString('base64url');
        await this.prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash: hashToken(refreshToken),
                expiresAt: this.refreshExpiry(),
            },
        });
        await this.users.recordLoginAttempt({
            userId: user.id,
            email: user.email,
            ipAddress: ip,
            userAgent,
            status: 'SUCCESS',
        });
        await this.audit.write({
            actorId: user.id,
            action: 'AUTH_LOGIN',
            resourceType: 'user',
            resourceId: user.id,
            metadata: { outcome: 'success', mfa: false },
        });
        const sessionData = await this.session(user, refreshToken);
        return {
            mfaRequired: false,
            ...sessionData,
        };
    }
    async verify2fa(tempToken, code, ip, userAgent) {
        let payload;
        try {
            payload = await this.jwt.verifyAsync(tempToken);
        }
        catch {
            throw new app_exception_1.AppException(common_1.HttpStatus.UNAUTHORIZED, 'TEMP_TOKEN_EXPIRED', 'โทเค็นยืนยัน 2FA หมดอายุ กรุณาเข้าสู่ระบบใหม่');
        }
        if (!payload.mfaPending || !payload.sub) {
            throw new app_exception_1.AppException(common_1.HttpStatus.UNAUTHORIZED, 'INVALID_TOKEN', 'โทเค็นไม่ถูกต้อง');
        }
        const account = await this.users.findUserById(payload.sub);
        if (!account || !account.isActive || !account.mfaSecret) {
            throw new app_exception_1.AppException(common_1.HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'บัญชีไม่ถูกต้อง');
        }
        const cleanCode = code.trim().replace(/\s|-/g, '');
        let isValid = (0, totp_1.verifyTotp)(cleanCode, account.mfaSecret);
        if (!isValid && account.mfaRecoveryHash) {
            const formattedCode = code.trim().toUpperCase();
            const storedHashes = account.mfaRecoveryHash.split(',');
            const codeHash = hashToken(formattedCode);
            const matchedIdx = storedHashes.indexOf(codeHash);
            if (matchedIdx !== -1) {
                isValid = true;
                storedHashes.splice(matchedIdx, 1);
                await this.prisma.user.update({
                    where: { id: account.id },
                    data: { mfaRecoveryHash: storedHashes.join(',') },
                });
            }
        }
        if (!isValid) {
            await this.users.recordLoginAttempt({
                userId: account.id,
                email: account.email,
                ipAddress: ip,
                userAgent,
                status: 'FAILED_MFA',
            });
            throw new app_exception_1.AppException(common_1.HttpStatus.UNAUTHORIZED, 'MFA_CODE_INVALID', 'รหัสยืนยัน 2FA หรือ Recovery Code ไม่ถูกต้อง');
        }
        const user = await this.users.loadAuthUser(account.id);
        if (user === null) {
            throw new app_exception_1.AppException(common_1.HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'ไม่พบข้อมูลผู้ใช้งาน');
        }
        const refreshToken = (0, node_crypto_1.randomBytes)(32).toString('base64url');
        await this.prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash: hashToken(refreshToken),
                expiresAt: this.refreshExpiry(),
            },
        });
        await this.users.recordLoginAttempt({
            userId: user.id,
            email: user.email,
            ipAddress: ip,
            userAgent,
            status: 'SUCCESS',
        });
        await this.audit.write({
            actorId: user.id,
            action: 'AUTH_LOGIN_2FA',
            resourceType: 'user',
            resourceId: user.id,
            metadata: { outcome: 'success', mfa: true },
        });
        return this.session(user, refreshToken);
    }
    async setup2fa(userId) {
        const user = await this.users.findUserById(userId);
        if (!user) {
            throw new app_exception_1.AppException(common_1.HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'ไม่พบผู้ใช้');
        }
        const secret = (0, totp_1.generateBase32Secret)(20);
        const otpAuthUri = (0, totp_1.generateOtpAuthUri)(user.email, 'ZMS Foundation', secret);
        const recoveryCodes = (0, totp_1.generateRecoveryCodes)(8);
        return {
            secret,
            otpAuthUri,
            recoveryCodes,
        };
    }
    async enable2fa(userId, code, secret, recoveryCodes) {
        const cleanCode = code.trim().replace(/\s|-/g, '');
        const valid = (0, totp_1.verifyTotp)(cleanCode, secret);
        if (!valid) {
            throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'INVALID_OTP', 'รหัสยืนยัน 6 หลักไม่ถูกต้อง ไม่สามารถเปิดใช้งาน 2FA ได้');
        }
        const recoveryHash = recoveryCodes.map((c) => hashToken(c.trim().toUpperCase())).join(',');
        await this.users.updateMfa(userId, true, secret, recoveryHash);
        await this.audit.write({
            actorId: userId,
            action: 'AUTH_2FA_ENABLED',
            resourceType: 'user',
            resourceId: userId,
            metadata: { outcome: 'success' },
        });
        return { enabled: true };
    }
    async disable2fa(userId, password, code) {
        const account = await this.users.findUserById(userId);
        const loginAccount = await this.users.findLoginAccount(account?.email ?? '');
        if (!account || !loginAccount || !(0, password_hash_1.verifyPassword)(password, loginAccount.passwordHash)) {
            throw new app_exception_1.AppException(common_1.HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'รหัสผ่านไม่ถูกต้อง');
        }
        if (account.mfaSecret) {
            const cleanCode = code.trim().replace(/\s|-/g, '');
            const valid = (0, totp_1.verifyTotp)(cleanCode, account.mfaSecret);
            if (!valid) {
                throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'INVALID_OTP', 'รหัส OTP ไม่ถูกต้อง');
            }
        }
        await this.users.updateMfa(userId, false, null, null);
        await this.audit.write({
            actorId: userId,
            action: 'AUTH_2FA_DISABLED',
            resourceType: 'user',
            resourceId: userId,
            metadata: { outcome: 'success' },
        });
        return { disabled: true };
    }
    async forgotPassword(email, ip) {
        this.rateLimiter.assertAllowed(ip);
        const user = await this.users.findUserByEmail(email);
        let rawToken = undefined;
        if (user && user.isActive) {
            rawToken = (0, node_crypto_1.randomBytes)(32).toString('hex');
            const tokenHash = hashToken(rawToken);
            const expiresAt = new Date(Date.now() + 3600_000);
            await this.prisma.passwordResetToken.create({
                data: {
                    userId: user.id,
                    tokenHash,
                    expiresAt,
                },
            });
            await this.audit.write({
                actorId: user.id,
                action: 'AUTH_FORGOT_PASSWORD_REQUEST',
                resourceType: 'user',
                resourceId: user.id,
                metadata: { email: user.email },
            });
        }
        const isDev = this.config.get('NODE_ENV') !== 'production';
        return {
            message: 'หากอีเมลนี้อยู่ในระบบ ท่านจะได้รับคำแนะนำในการรีเซ็ตรหัสผ่าน',
            ...(isDev && rawToken ? { resetToken: rawToken } : {}),
        };
    }
    async resetPassword(rawToken, newPassword) {
        if (newPassword.length < 8) {
            throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'PASSWORD_TOO_SHORT', 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
        }
        const tokenHash = hashToken(rawToken);
        const resetRecord = await this.prisma.passwordResetToken.findUnique({
            where: { tokenHash },
            include: { user: true },
        });
        if (!resetRecord ||
            resetRecord.usedAt !== null ||
            resetRecord.expiresAt.getTime() <= Date.now()) {
            throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'INVALID_RESET_TOKEN', 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว');
        }
        const newHash = (0, password_hash_1.hashPassword)(newPassword);
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: resetRecord.userId },
                data: { passwordHash: newHash },
            }),
            this.prisma.passwordResetToken.update({
                where: { id: resetRecord.id },
                data: { usedAt: new Date() },
            }),
            this.prisma.refreshToken.updateMany({
                where: { userId: resetRecord.userId, revokedAt: null },
                data: { revokedAt: new Date() },
            }),
        ]);
        await this.audit.write({
            actorId: resetRecord.userId,
            action: 'AUTH_PASSWORD_RESET_SUCCESS',
            resourceType: 'user',
            resourceId: resetRecord.userId,
            metadata: { outcome: 'success' },
        });
        return { message: 'ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่' };
    }
    async refresh(rawToken, csrfHeader) {
        this.assertCsrf(csrfHeader);
        if (rawToken === undefined || rawToken.length === 0) {
            throw new app_exception_1.AppException(common_1.HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'เซสชันหมดอายุ');
        }
        const existing = await this.prisma.refreshToken.findUnique({
            where: { tokenHash: hashToken(rawToken) },
        });
        if (existing === null || existing.expiresAt.getTime() <= Date.now()) {
            throw new app_exception_1.AppException(common_1.HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'เซสชันหมดอายุ');
        }
        if (existing.revokedAt !== null) {
            await this.prisma.refreshToken.updateMany({
                where: { userId: existing.userId, revokedAt: null },
                data: { revokedAt: new Date() },
            });
            throw new app_exception_1.AppException(common_1.HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'เซสชันหมดอายุ');
        }
        const user = await this.users.loadAuthUser(existing.userId);
        if (user === null) {
            throw new app_exception_1.AppException(common_1.HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'เซสชันหมดอายุ');
        }
        const refreshToken = (0, node_crypto_1.randomBytes)(32).toString('base64url');
        await this.prisma.$transaction([
            this.prisma.refreshToken.update({
                where: { id: existing.id },
                data: { revokedAt: new Date() },
            }),
            this.prisma.refreshToken.create({
                data: {
                    userId: user.id,
                    tokenHash: hashToken(refreshToken),
                    expiresAt: this.refreshExpiry(),
                },
            }),
        ]);
        return this.session(user, refreshToken);
    }
    async logout(rawToken, csrfHeader, actorId) {
        this.assertCsrf(csrfHeader);
        if (rawToken !== undefined && rawToken.length > 0) {
            await this.prisma.refreshToken.updateMany({
                where: { tokenHash: hashToken(rawToken), revokedAt: null },
                data: { revokedAt: new Date() },
            });
        }
        await this.audit.write({
            actorId,
            action: 'AUTH_LOGOUT',
            resourceType: 'auth',
            resourceId: actorId,
            metadata: { outcome: 'success' },
        });
    }
    async session(user, refreshToken) {
        const expiresIn = this.accessTtlSeconds();
        const accessToken = await this.jwt.signAsync({ sub: user.id }, { expiresIn, algorithm: 'HS256' });
        const profile = await this.users.findUserById(user.id);
        return {
            accessToken,
            expiresIn,
            refreshToken,
            user: this.users.toProfile(user, profile?.mfaEnabled ?? false),
        };
    }
    assertCsrf(header) {
        if (header !== '1') {
            throw new app_exception_1.AppException(common_1.HttpStatus.FORBIDDEN, 'CSRF_REJECTED', 'คำขอไม่ผ่านการตรวจสอบความปลอดภัย');
        }
    }
    accessTtlSeconds() {
        return Number(this.config.get('JWT_ACCESS_TTL_SECONDS') ?? 900);
    }
    refreshTtlSeconds() {
        return Number(this.config.get('REFRESH_TTL_SECONDS') ?? 604800);
    }
    refreshExpiry() {
        return new Date(Date.now() + this.refreshTtlSeconds() * 1000);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        audit_service_1.AuditService,
        login_rate_limiter_1.LoginRateLimiter])
], AuthService);
function hashToken(token) {
    return (0, node_crypto_1.createHash)('sha256').update(token).digest('hex');
}
//# sourceMappingURL=auth.service.js.map