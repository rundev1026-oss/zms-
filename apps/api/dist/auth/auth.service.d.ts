import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { CookieOptions } from 'express';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginRateLimiter } from './login-rate-limiter';
export declare const REFRESH_COOKIE = "zms_refresh";
export interface SessionResult {
    accessToken: string;
    expiresIn: number;
    refreshToken: string;
    user: ReturnType<UsersService['toProfile']>;
}
export type LoginOutcome = ({
    mfaRequired: false;
} & SessionResult) | {
    mfaRequired: true;
    tempToken: string;
    expiresIn: number;
    userId: string;
    email: string;
};
export declare class AuthService {
    private readonly users;
    private readonly prisma;
    private readonly jwt;
    private readonly config;
    private readonly audit;
    private readonly rateLimiter;
    constructor(users: UsersService, prisma: PrismaService, jwt: JwtService, config: ConfigService, audit: AuditService, rateLimiter: LoginRateLimiter);
    cookieOptions(): CookieOptions;
    login(email: string, password: string, ip: string, userAgent?: string): Promise<LoginOutcome>;
    verify2fa(tempToken: string, code: string, ip: string, userAgent?: string): Promise<SessionResult>;
    setup2fa(userId: string): Promise<{
        secret: string;
        otpAuthUri: string;
        recoveryCodes: string[];
    }>;
    enable2fa(userId: string, code: string, secret: string, recoveryCodes: string[]): Promise<{
        enabled: boolean;
    }>;
    disable2fa(userId: string, password: string, code: string): Promise<{
        disabled: boolean;
    }>;
    forgotPassword(email: string, ip: string): Promise<{
        message: string;
        resetToken?: string;
    }>;
    resetPassword(rawToken: string, newPassword: string): Promise<{
        message: string;
    }>;
    refresh(rawToken: string | undefined, csrfHeader: string | undefined): Promise<SessionResult>;
    logout(rawToken: string | undefined, csrfHeader: string | undefined, actorId: string | null): Promise<void>;
    private session;
    private assertCsrf;
    private accessTtlSeconds;
    private refreshTtlSeconds;
    private refreshExpiry;
}
export declare function hashToken(token: string): string;
