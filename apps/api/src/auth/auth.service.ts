import { createHash, randomBytes } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { CookieOptions } from 'express';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/app.exception';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword, verifyPassword } from '../security/password-hash';
import {
  generateBase32Secret,
  generateOtpAuthUri,
  generateRecoveryCodes,
  verifyTotp,
} from '../security/totp';
import { UsersService } from '../users/users.service';
import { LoginRateLimiter } from './login-rate-limiter';

export const REFRESH_COOKIE = 'zms_refresh';

export interface SessionResult {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  user: ReturnType<UsersService['toProfile']>;
}

export type LoginOutcome =
  | ({ mfaRequired: false } & SessionResult)
  | {
      mfaRequired: true;
      tempToken: string;
      expiresIn: number;
      userId: string;
      email: string;
    };

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly rateLimiter: LoginRateLimiter,
  ) {}

  cookieOptions(): CookieOptions {
    const prefix = (this.config.get<string>('API_PREFIX') ?? 'api/v1').replace(/^\/+|\/+$/g, '');
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get<string>('NODE_ENV') === 'production',
      path: `/${prefix}/auth`,
      maxAge: this.refreshTtlSeconds() * 1000,
    };
  }

  async login(
    email: string,
    password: string,
    ip: string,
    userAgent?: string,
  ): Promise<LoginOutcome> {
    const rateLimitKey = `${ip}:${email.toLowerCase()}`;
    this.rateLimiter.assertAllowed(rateLimitKey);
    const account = await this.users.findLoginAccount(email);
    const valid =
      account !== null && account.isActive && verifyPassword(password, account.passwordHash);

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
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHORIZED',
        'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
      );
    }

    this.rateLimiter.recordSuccess(rateLimitKey);

    // Check if 2FA is required for this account
    if (account.mfaEnabled && account.mfaSecret) {
      const tempExpiresIn = 300; // 5 minutes to verify 2FA
      const tempToken = await this.jwt.signAsync(
        { sub: account.id, mfaPending: true },
        { expiresIn: tempExpiresIn, algorithm: 'HS256' },
      );
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
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHORIZED',
        'บัญชีผู้ใช้งานไม่พร้อมใช้งาน',
      );
    }

    const refreshToken = randomBytes(32).toString('base64url');
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

  async verify2fa(
    tempToken: string,
    code: string,
    ip: string,
    userAgent?: string,
  ): Promise<SessionResult> {
    let payload: { sub: string; mfaPending?: boolean };
    try {
      payload = await this.jwt.verifyAsync(tempToken);
    } catch {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        'TEMP_TOKEN_EXPIRED',
        'โทเค็นยืนยัน 2FA หมดอายุ กรุณาเข้าสู่ระบบใหม่',
      );
    }

    if (!payload.mfaPending || !payload.sub) {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'INVALID_TOKEN', 'โทเค็นไม่ถูกต้อง');
    }

    const account = await this.users.findUserById(payload.sub);
    if (!account || !account.isActive || !account.mfaSecret) {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'บัญชีไม่ถูกต้อง');
    }

    // Verify 6-digit TOTP
    const cleanCode = code.trim().replace(/\s|-/g, '');
    let isValid = verifyTotp(cleanCode, account.mfaSecret);

    // If TOTP fails, check recovery codes if stored
    if (!isValid && account.mfaRecoveryHash) {
      const formattedCode = code.trim().toUpperCase();
      const storedHashes: string[] = account.mfaRecoveryHash.split(',');
      const codeHash = hashToken(formattedCode);
      const matchedIdx = storedHashes.indexOf(codeHash);
      if (matchedIdx !== -1) {
        isValid = true;
        // Consume this recovery code
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
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        'MFA_CODE_INVALID',
        'รหัสยืนยัน 2FA หรือ Recovery Code ไม่ถูกต้อง',
      );
    }

    const user = await this.users.loadAuthUser(account.id);
    if (user === null) {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'ไม่พบข้อมูลผู้ใช้งาน');
    }

    const refreshToken = randomBytes(32).toString('base64url');
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

  async setup2fa(userId: string) {
    const user = await this.users.findUserById(userId);
    if (!user) {
      throw new AppException(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'ไม่พบผู้ใช้');
    }

    const secret = generateBase32Secret(20);
    const otpAuthUri = generateOtpAuthUri(user.email, 'ZMS Foundation', secret);
    const recoveryCodes = generateRecoveryCodes(8);

    return {
      secret,
      otpAuthUri,
      recoveryCodes,
    };
  }

  async enable2fa(
    userId: string,
    code: string,
    secret: string,
    recoveryCodes: string[],
  ): Promise<{ enabled: boolean }> {
    const cleanCode = code.trim().replace(/\s|-/g, '');
    const valid = verifyTotp(cleanCode, secret);
    if (!valid) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'INVALID_OTP',
        'รหัสยืนยัน 6 หลักไม่ถูกต้อง ไม่สามารถเปิดใช้งาน 2FA ได้',
      );
    }

    // Hash each recovery code individually with SHA-256
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

  async disable2fa(
    userId: string,
    password: string,
    code: string,
  ): Promise<{ disabled: boolean }> {
    const account = await this.users.findUserById(userId);
    const loginAccount = await this.users.findLoginAccount(account?.email ?? '');
    if (!account || !loginAccount || !verifyPassword(password, loginAccount.passwordHash)) {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'รหัสผ่านไม่ถูกต้อง');
    }

    if (account.mfaSecret) {
      const cleanCode = code.trim().replace(/\s|-/g, '');
      const valid = verifyTotp(cleanCode, account.mfaSecret);
      if (!valid) {
        throw new AppException(HttpStatus.BAD_REQUEST, 'INVALID_OTP', 'รหัส OTP ไม่ถูกต้อง');
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

  async forgotPassword(
    email: string,
    ip: string,
  ): Promise<{ message: string; resetToken?: string }> {
    this.rateLimiter.assertAllowed(ip);
    const user = await this.users.findUserByEmail(email);

    let rawToken: string | undefined = undefined;
    if (user && user.isActive) {
      rawToken = randomBytes(32).toString('hex');
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 3600_000); // 1 hour

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

    // OWASP: Always return uniform message to prevent account enumeration
    const isDev = this.config.get<string>('NODE_ENV') !== 'production';
    return {
      message: 'หากอีเมลนี้อยู่ในระบบ ท่านจะได้รับคำแนะนำในการรีเซ็ตรหัสผ่าน',
      ...(isDev && rawToken ? { resetToken: rawToken } : {}),
    };
  }

  async resetPassword(
    rawToken: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    if (newPassword.length < 8) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'PASSWORD_TOO_SHORT',
        'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร',
      );
    }

    const tokenHash = hashToken(rawToken);
    const resetRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !resetRecord ||
      resetRecord.usedAt !== null ||
      resetRecord.expiresAt.getTime() <= Date.now()
    ) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'INVALID_RESET_TOKEN',
        'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว',
      );
    }

    const newHash = hashPassword(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash: newHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all existing sessions for this user
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

  async refresh(
    rawToken: string | undefined,
    csrfHeader: string | undefined,
  ): Promise<SessionResult> {
    this.assertCsrf(csrfHeader);
    if (rawToken === undefined || rawToken.length === 0) {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'เซสชันหมดอายุ');
    }

    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
    });
    if (existing === null || existing.expiresAt.getTime() <= Date.now()) {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'เซสชันหมดอายุ');
    }
    if (existing.revokedAt !== null) {
      // Token reuse detected! Revoke all tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: { userId: existing.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'เซสชันหมดอายุ');
    }

    const user = await this.users.loadAuthUser(existing.userId);
    if (user === null) {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'เซสชันหมดอายุ');
    }

    const refreshToken = randomBytes(32).toString('base64url');
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

  async logout(
    rawToken: string | undefined,
    csrfHeader: string | undefined,
    actorId: string | null,
  ): Promise<void> {
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

  private async session(user: AuthUser, refreshToken: string): Promise<SessionResult> {
    const expiresIn = this.accessTtlSeconds();
    const accessToken = await this.jwt.signAsync(
      { sub: user.id },
      { expiresIn, algorithm: 'HS256' },
    );
    const profile = await this.users.findUserById(user.id);
    return {
      accessToken,
      expiresIn,
      refreshToken,
      user: this.users.toProfile(user, profile?.mfaEnabled ?? false),
    };
  }

  private assertCsrf(header: string | undefined): void {
    if (header !== '1') {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'CSRF_REJECTED',
        'คำขอไม่ผ่านการตรวจสอบความปลอดภัย',
      );
    }
  }

  private accessTtlSeconds(): number {
    return Number(this.config.get<string>('JWT_ACCESS_TTL_SECONDS') ?? 900);
  }

  private refreshTtlSeconds(): number {
    return Number(this.config.get<string>('REFRESH_TTL_SECONDS') ?? 604800);
  }

  private refreshExpiry(): Date {
    return new Date(Date.now() + this.refreshTtlSeconds() * 1000);
  }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
