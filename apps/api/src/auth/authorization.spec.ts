import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { AuthUser } from '../common/auth-user';
import { PERMISSIONS_KEY } from '../common/permissions.decorator';
import { IS_PUBLIC } from '../common/public.decorator';
import type { UsersService } from '../users/users.service';
import type { ConfigService } from '@nestjs/config';
import { hashPassword } from '../security/password-hash';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginRateLimiter } from './login-rate-limiter';
import { PermissionsGuard } from './permissions.guard';
import { AuthService } from './auth.service';
import { AppException } from '../common/app.exception';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('authorization', () => {
  const user: AuthUser = {
    id: 'user-1',
    email: 'registrar@zms.local',
    displayName: 'เจ้าหน้าที่',
    roles: [{ code: 'REGISTRAR', name: 'เจ้าหน้าที่ทะเบียน' }],
    permissions: ['beneficiaries.read'],
  };

  it('loads the user from the token subject and ignores a client user id', async () => {
    const loadAuthUser = jest.fn().mockResolvedValue(user);
    const guard = new JwtAuthGuard(
      reflector({ [IS_PUBLIC]: false }),
      {
        verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-1', role: 'SUPER_ADMIN' }),
      } as unknown as JwtService,
      { loadAuthUser } as unknown as UsersService,
    );
    const request = {
      header: (name: string) => (name === 'authorization' ? 'Bearer token' : undefined),
      body: { userId: 'attacker', role: 'SUPER_ADMIN' },
    };
    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(loadAuthUser).toHaveBeenCalledWith('user-1');
    expect(request).toMatchObject({ user });
  });

  it('forbids a route when the database permissions do not include it', () => {
    const guard = new PermissionsGuard(
      reflector({ [IS_PUBLIC]: false, [PERMISSIONS_KEY]: ['beneficiaries.decide'] }),
    );
    const request = { user };
    expect(() => guard.canActivate(context(request))).toThrow(AppException);
  });

  it('limits repeated login attempts', () => {
    const limiter = new LoginRateLimiter();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      limiter.recordFailure('127.0.0.1', 1_000);
    }
    expect(() => limiter.assertAllowed('127.0.0.1', 1_000)).toThrow(AppException);
  });

  it('does not confirm a wrong password and revokes a reused refresh token', async () => {
    const audits: Array<Record<string, unknown>> = [];
    const updateMany = jest.fn();
    const account = {
      id: 'user-1',
      isActive: true,
      passwordHash: hashPassword('LocalDev-Only-1'),
    };
    const users = {
      findLoginAccount: jest.fn().mockResolvedValue(account),
      loadAuthUser: jest.fn().mockResolvedValue(user),
      toProfile: jest.fn().mockReturnValue({ id: 'user-1' }),
      recordLoginAttempt: jest.fn().mockResolvedValue(undefined),
    };
    const prisma = {
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({
          id: 'token-1',
          userId: 'user-1',
          revokedAt: new Date(),
          expiresAt: new Date(Date.now() + 60_000),
        }),
        updateMany,
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    const service = new AuthService(
      users as unknown as UsersService,
      prisma as unknown as PrismaService,
      { signAsync: jest.fn().mockResolvedValue('access') } as unknown as JwtService,
      { get: jest.fn().mockReturnValue('test') } as unknown as ConfigService,
      {
        write: jest.fn(async (entry: Record<string, unknown>) => void audits.push(entry)),
      } as unknown as AuditService,
      new LoginRateLimiter(),
    );

    await expect(
      service.login('registrar@zms.local', 'wrong-password-1', '10.0.0.1'),
    ).rejects.toBeInstanceOf(AppException);
    expect(JSON.stringify(audits)).not.toContain('wrong-password-1');

    await expect(service.refresh('raw-token', '1')).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
    });
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', revokedAt: null } }),
    );
  });
});

function reflector(values: Record<string, unknown>): Reflector {
  return {
    getAllAndOverride: (key: string) => values[key],
  } as unknown as Reflector;
}

function context(request: object): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}
