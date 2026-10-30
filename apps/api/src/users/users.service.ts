import { Injectable } from '@nestjs/common';
import type { AuthRole, AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';

export interface LoginAccount {
  id: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
  mfaEnabled: boolean;
  mfaSecret: string | null;
  mfaRecoveryHash: string | null;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findLoginAccount(email: string): Promise<LoginAccount | null> {
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

  async findUserById(id: string) {
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

  async findUserByEmail(email: string) {
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

  async loadAuthUser(userId: string): Promise<AuthUser | null> {
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

    const roles: AuthRole[] = user.userRoles.map((link) => ({
      code: link.role.code,
      name: link.role.name,
    }));
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((link) =>
          link.role.rolePermissions.map((item) => item.permission.code),
        ),
      ),
    ];

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles,
      permissions,
    };
  }

  async updateMfa(
    userId: string,
    enabled: boolean,
    secret: string | null,
    recoveryHash: string | null,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: enabled,
        mfaSecret: secret,
        mfaRecoveryHash: recoveryHash,
      },
    });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async recordLoginAttempt(params: {
    userId?: string | null;
    email: string;
    ipAddress: string;
    userAgent?: string;
    status: 'SUCCESS' | 'FAILED_CREDENTIALS' | 'FAILED_MFA' | 'LOCKED';
  }): Promise<void> {
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

  toProfile(user: AuthUser, mfaEnabled = false) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles,
      permissions: user.permissions,
      mfaEnabled,
    };
  }
}
