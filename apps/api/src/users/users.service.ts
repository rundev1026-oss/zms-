import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MODULE_PERMISSION_CATALOG } from '@zms/shared';
import type { AuthRole, AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from '../security/password-hash';
import {
  CreateUserDto,
  PermissionOverrideItemDto,
  QueryUsersDto,
  UpdateUserDto,
  UpdateUserPermissionsDto,
  UpdateUserStatusDto,
} from './users.dto';

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
        username: true,
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
        username: true,
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
        permissionOverrides: true,
        dataScope: true,
      },
    });
    if (user === null || !user.isActive) {
      return null;
    }

    const roles: AuthRole[] = user.userRoles.map((link) => ({
      code: link.role.code,
      name: link.role.name,
    }));

    // 1. Role base permissions
    const rolePerms = new Set(
      user.userRoles.flatMap((link) =>
        link.role.rolePermissions.map((item) => item.permission.code),
      ),
    );

    // 2. Apply User Overrides: ALLOW adds, DENY removes
    const overrides = user.permissionOverrides || [];
    for (const ov of overrides) {
      if (ov.effect === 'ALLOW') {
        rolePerms.add(ov.permissionCode);
      } else if (ov.effect === 'DENY') {
        rolePerms.delete(ov.permissionCode);
      }
    }

    const permissions = Array.from(rolePerms);

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      username: user.username || undefined,
      branchId: user.branchId,
      departmentId: user.departmentId,
      position: user.position,
      dataScope: user.dataScope?.scope || 'BRANCH',
      approvalLimit: user.dataScope?.approvalLimit
        ? Number(user.dataScope.approvalLimit)
        : null,
      roles,
      permissions,
    };
  }

  async findAllUsers(query: QueryUsersDto) {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.max(1, Math.min(100, query.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (query.search && query.search.trim() !== '') {
      const q = query.search.trim().toLowerCase();
      where.OR = [
        { displayName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ];
    }

    if (query.role && query.role !== 'all') {
      where.userRoles = {
        some: {
          role: {
            code: { equals: query.role, mode: 'insensitive' },
          },
        },
      };
    }

    if (query.branchId && query.branchId !== 'all') {
      where.branchId = query.branchId;
    }

    if (query.departmentId && query.departmentId !== 'all') {
      where.departmentId = query.departmentId;
    }

    if (query.status && query.status !== 'all') {
      if (query.status === 'ACTIVE' || query.status === 'active') {
        where.isActive = true;
      } else if (query.status === 'INACTIVE' || query.status === 'inactive') {
        where.isActive = false;
      }
    }

    const [total, users, totalAll, activeCount, inactiveCount, rolesCount, pendingScopeCount] =
      await Promise.all([
        this.prisma.user.count({ where }),
        this.prisma.user.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
            dataScope: true,
            permissionOverrides: true,
          },
        }),
        this.prisma.user.count(),
        this.prisma.user.count({ where: { isActive: true } }),
        this.prisma.user.count({ where: { isActive: false } }),
        this.prisma.role.count({ where: { status: 'ACTIVE' } }),
        this.prisma.user.count({ where: { dataScope: null } }),
      ]);

    const items = users.map((u) => {
      const primaryRole = u.userRoles[0]?.role;
      return {
        id: u.id,
        email: u.email,
        username: u.username || u.email.split('@')[0],
        displayName: u.displayName,
        phone: u.phone || '-',
        position: u.position || '-',
        branch: u.branch || 'สำนักงานใหญ่',
        branchId: u.branchId || 'br-hq',
        departmentId: u.departmentId || 'dept-social',
        isActive: u.isActive,
        status: u.isActive ? 'ACTIVE' : 'INACTIVE',
        mfaEnabled: u.mfaEnabled,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        roles: u.userRoles.map((ur) => ({
          id: ur.role.id,
          code: ur.role.code,
          name: ur.role.name,
        })),
        primaryRoleCode: primaryRole?.code || 'PUBLIC',
        primaryRoleName: primaryRole?.name || 'ผู้ใช้งาน',
        dataScope: u.dataScope?.scope || 'BRANCH',
        approvalLimit: u.dataScope?.approvalLimit ? Number(u.dataScope.approvalLimit) : null,
        overridesCount: u.permissionOverrides.length,
      };
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
      stats: {
        totalUsers: totalAll,
        activeUsers: activeCount,
        inactiveUsers: inactiveCount,
        suspendedUsers: inactiveCount,
        totalRoles: rolesCount,
        pendingPermissions: pendingScopeCount,
      },
    };
  }

  async getUserDetail(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        },
        dataScope: true,
        permissionOverrides: true,
      },
    });

    if (!u) {
      throw new NotFoundException('ไม่พบผู้ใช้งานนี้ในระบบ');
    }

    const rolePerms = new Set(
      u.userRoles.flatMap((ur) =>
        ur.role.rolePermissions.map((rp) => rp.permission.code),
      ),
    );

    const overrides = u.permissionOverrides || [];
    const effective = new Set(rolePerms);
    for (const ov of overrides) {
      if (ov.effect === 'ALLOW') effective.add(ov.permissionCode);
      else if (ov.effect === 'DENY') effective.delete(ov.permissionCode);
    }

    return {
      id: u.id,
      email: u.email,
      username: u.username || u.email.split('@')[0],
      displayName: u.displayName,
      phone: u.phone,
      position: u.position,
      branch: u.branch,
      branchId: u.branchId,
      departmentId: u.departmentId,
      isActive: u.isActive,
      mfaEnabled: u.mfaEnabled,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      roles: u.userRoles.map((ur) => ({
        id: ur.role.id,
        code: ur.role.code,
        name: ur.role.name,
        isSystem: ur.role.isSystem,
      })),
      dataScope: u.dataScope
        ? {
            scope: u.dataScope.scope,
            branchId: u.dataScope.branchId,
            departmentId: u.dataScope.departmentId,
            approvalLimit: u.dataScope.approvalLimit
              ? Number(u.dataScope.approvalLimit)
              : null,
          }
        : { scope: 'BRANCH', approvalLimit: null },
      rolePermissions: Array.from(rolePerms),
      overrides: overrides.map((o) => ({
        permissionCode: o.permissionCode,
        effect: o.effect,
        reason: o.reason,
        createdAt: o.createdAt,
      })),
      effectivePermissions: Array.from(effective),
    };
  }

  async createUser(dto: CreateUserDto, actorId: string, ipAddress?: string) {
    const email = dto.email.toLowerCase().trim();
    const username = dto.username.toLowerCase().trim();

    const existingEmail = await this.prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new ConflictException(`อีเมล ${email} มีผู้ใช้งานในระบบแล้ว`);
    }

    const existingUser = await this.prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      throw new ConflictException(`ชื่อผู้ใช้ (Username) ${username} มีผู้ใช้งานในระบบแล้ว`);
    }

    const rawRoleCode = (dto.roleCode || dto.role || 'ASSISTANCE_OFFICER').toUpperCase().trim();
    const normalizedRole = 
      rawRoleCode === 'OFFICER' ? 'ASSISTANCE_OFFICER' :
      rawRoleCode === 'FINANCE' ? 'FINANCE_OFFICER' :
      rawRoleCode;

    const role = await this.prisma.role.findFirst({
      where: {
        OR: [
          { code: normalizedRole },
          { code: rawRoleCode },
        ],
      },
    });
    if (!role) {
      throw new NotFoundException(`ไม่พบบทบาท ${rawRoleCode} ในระบบ`);
    }

    const rawPassword = dto.password || 'ZmsEnterprise2026!';
    const passwordHash = hashPassword(rawPassword);

    const displayName =
      dto.displayName ||
      `${dto.firstName || ''} ${dto.lastName || ''}`.trim() ||
      username;

    return this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          username,
          displayName,
          passwordHash,
          phone: dto.phone || null,
          position: dto.position || null,
          branchId: dto.branchId || 'br-hq',
          departmentId: dto.departmentId || 'dept-social',
          isActive: true,
        },
      });

      await tx.userRole.create({
        data: {
          userId: newUser.id,
          roleId: role.id,
        },
      });

      await tx.userDataScope.create({
        data: {
          userId: newUser.id,
          scope: dto.dataScope || 'BRANCH',
          branchId: dto.branchId || 'br-hq',
          departmentId: dto.departmentId || 'dept-social',
          approvalLimit: dto.approvalLimit ? Number(dto.approvalLimit) : null,
        },
      });

      await tx.permissionAuditLog.create({
        data: {
          actorId,
          targetUserId: newUser.id,
          action: 'USER_CREATE',
          details: {
            username,
            email,
            roleCode: role.code,
            dataScope: dto.dataScope || 'BRANCH',
          },
          reason: 'เพิ่มผู้ใช้งานใหม่เข้าสู่ระบบ',
          ipAddress: ipAddress || null,
        },
      });

      return {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        displayName: newUser.displayName,
        role: role.code,
        dataScope: dto.dataScope || 'BRANCH',
        message: 'สร้างผู้ใช้งานสำเร็จ',
      };
    });
  }

  async updateUser(userId: string, dto: UpdateUserDto, actorId: string, ipAddress?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!existing) {
      throw new NotFoundException('ไม่พบผู้ใช้งานนี้ในระบบ');
    }

    return this.prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (dto.displayName !== undefined) updateData.displayName = dto.displayName;
      if (dto.phone !== undefined) updateData.phone = dto.phone;
      if (dto.position !== undefined) updateData.position = dto.position;
      if (dto.branchId !== undefined) updateData.branchId = dto.branchId;
      if (dto.departmentId !== undefined) updateData.departmentId = dto.departmentId;

      if (dto.roleCode) {
        const newRole = await tx.role.findUnique({
          where: { code: dto.roleCode.toUpperCase() },
        });
        if (!newRole) {
          throw new NotFoundException(`ไม่พบบทบาท ${dto.roleCode}`);
        }

        const isCurrentlySuperAdmin = existing.userRoles.some(
          (ur) => ur.role.code === 'SUPER_ADMIN',
        );

        if (isCurrentlySuperAdmin && newRole.code !== 'SUPER_ADMIN') {
          // Count other active Super Admins
          const otherSuperAdmins = await tx.userRole.count({
            where: {
              role: { code: 'SUPER_ADMIN' },
              userId: { not: userId },
              user: { isActive: true },
            },
          });
          if (otherSuperAdmins === 0) {
            throw new BadRequestException(
              'ไม่สามารถลดบทบาทผู้ดูแลระบบสูงสุดคนสุดท้ายได้ (Last Super Admin Protection)',
            );
          }
        }

        // Replace user roles
        await tx.userRole.deleteMany({ where: { userId } });
        await tx.userRole.create({
          data: { userId, roleId: newRole.id },
        });
      }

      await tx.user.update({
        where: { id: userId },
        data: updateData,
      });

      await tx.permissionAuditLog.create({
        data: {
          actorId,
          targetUserId: userId,
          action: 'USER_UPDATE',
          details: { updatedFields: Object.keys(updateData), roleCode: dto.roleCode },
          reason: 'แก้ไขข้อมูลผู้ใช้',
          ipAddress: ipAddress || null,
        },
      });

      return { success: true, message: 'ปรับปรุงข้อมูลผู้ใช้งานเรียบร้อย' };
    });
  }

  async updateUserStatus(
    userId: string,
    dto: UpdateUserStatusDto,
    actorId: string,
    ipAddress?: string,
  ) {
    if (userId === actorId) {
      throw new ForbiddenException('ไม่สามารถระงับหรือปิดการใช้งานบัญชีของตนเองได้');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) {
      throw new NotFoundException('ไม่พบผู้ใช้งานนี้ในระบบ');
    }

    const isActive =
      dto.isActive !== undefined
        ? dto.isActive
        : dto.status === 'ACTIVE';

    if (!isActive) {
      const isSuperAdmin = user.userRoles.some((ur) => ur.role.code === 'SUPER_ADMIN');
      if (isSuperAdmin) {
        const otherActiveSuperAdmins = await this.prisma.userRole.count({
          where: {
            role: { code: 'SUPER_ADMIN' },
            userId: { not: userId },
            user: { isActive: true },
          },
        });
        if (otherActiveSuperAdmins === 0) {
          throw new BadRequestException(
            'ไม่สามารถระงับบัญชีผู้ดูแลระบบสูงสุดคนสุดท้ายได้ (Last Super Admin Protection)',
          );
        }
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { isActive },
      });

      await tx.permissionAuditLog.create({
        data: {
          actorId,
          targetUserId: userId,
          action: 'USER_STATUS_CHANGE',
          details: { oldStatus: user.isActive, newStatus: isActive },
          reason: dto.reason || (isActive ? 'เปิดใช้งานบัญชี' : 'ระงับการใช้งานบัญชี'),
          ipAddress: ipAddress || null,
        },
      });
    });

    return {
      success: true,
      isActive,
      message: isActive ? 'เปิดใช้งานบัญชีสำเร็จ' : 'ระงับบัญชีผู้ใช้สำเร็จ',
    };
  }

  async getUserPermissions(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        },
        dataScope: true,
        permissionOverrides: true,
      },
    });

    if (!u) {
      throw new NotFoundException('ไม่พบผู้ใช้งานในระบบ');
    }

    const rolePermissions = Array.from(
      new Set(
        u.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code),
        ),
      ),
    );

    const overridesMap = new Map<string, string>();
    u.permissionOverrides.forEach((o) => overridesMap.set(o.permissionCode, o.effect));

    // Calculate effective permissions
    const effectiveSet = new Set(rolePermissions);
    u.permissionOverrides.forEach((o) => {
      if (o.effect === 'ALLOW') effectiveSet.add(o.permissionCode);
      else if (o.effect === 'DENY') effectiveSet.delete(o.permissionCode);
    });

    return {
      userId: u.id,
      displayName: u.displayName,
      email: u.email,
      username: u.username,
      roles: u.userRoles.map((ur) => ({ code: ur.role.code, name: ur.role.name })),
      dataScope: u.dataScope?.scope || 'BRANCH',
      approvalLimit: u.dataScope?.approvalLimit ? Number(u.dataScope.approvalLimit) : null,
      rolePermissions,
      overrides: u.permissionOverrides.map((o) => ({
        permissionCode: o.permissionCode,
        effect: o.effect,
        reason: o.reason,
      })),
      effectivePermissions: Array.from(effectiveSet),
      catalog: MODULE_PERMISSION_CATALOG,
    };
  }

  async updateUserPermissions(
    userId: string,
    dto: UpdateUserPermissionsDto,
    actorId: string,
    ipAddress?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) {
      throw new NotFoundException('ไม่พบผู้ใช้งานนี้ในระบบ');
    }

    // Security check: self-elevation prevention
    if (userId === actorId) {
      const actorUser = await this.loadAuthUser(actorId);
      if (actorUser) {
        const actorPerms = new Set(actorUser.permissions);
        for (const ov of dto.overrides) {
          if (ov.effect === 'ALLOW' && !actorPerms.has(ov.permissionCode)) {
            throw new ForbiddenException(
              `ไม่อนุญาตให้เพิ่มสิทธิ์ (${ov.permissionCode}) ให้ตนเองนอกเหนือจากสิทธิ์ที่มีอยู่`,
            );
          }
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Process overrides
      for (const item of dto.overrides) {
        if (item.effect === 'INHERIT') {
          await tx.userPermissionOverride.deleteMany({
            where: { userId, permissionCode: item.permissionCode },
          });
        } else {
          await tx.userPermissionOverride.upsert({
            where: {
              userId_permissionCode: {
                userId,
                permissionCode: item.permissionCode,
              },
            },
            update: {
              effect: item.effect,
              reason: item.reason || dto.reason || null,
              grantedBy: actorId,
            },
            create: {
              userId,
              permissionCode: item.permissionCode,
              effect: item.effect,
              reason: item.reason || dto.reason || null,
              grantedBy: actorId,
            },
          });
        }
      }

      // 2. Process data scope and approval limit
      if (dto.dataScope !== undefined || dto.approvalLimit !== undefined) {
        const approvalLimitVal = 
          dto.approvalLimit === null 
            ? null 
            : (dto.approvalLimit !== undefined ? Number(dto.approvalLimit) : undefined);

        await tx.userDataScope.upsert({
          where: { userId },
          update: {
            scope: dto.dataScope,
            approvalLimit: approvalLimitVal,
          },
          create: {
            userId,
            scope: dto.dataScope || 'BRANCH',
            approvalLimit: approvalLimitVal ?? null,
          },
        });
      }

      // 3. Log Audit
      await tx.permissionAuditLog.create({
        data: {
          actorId,
          targetUserId: userId,
          action: 'USER_OVERRIDE_PERM',
          details: JSON.parse(
            JSON.stringify({
              overridesCount: dto.overrides.length,
              overrides: dto.overrides,
              dataScope: dto.dataScope,
              approvalLimit: dto.approvalLimit,
            }),
          ) as any,
          reason: dto.reason || 'ปรับปรุงสิทธิ์และการควบคุมเฉพาะบุคคล (Manual Override)',
          ipAddress: ipAddress || null,
        },
      });

      return {
        success: true,
        message: 'บันทึกการกำหนดสิทธิ์เฉพาะบุคคลสำเร็จ',
      };
    });
  }

  async getEffectivePermissionsPreview(
    userId: string,
    proposedOverrides: PermissionOverrideItemDto[],
    proposedRoleCode?: string,
  ) {
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
    if (!user) {
      throw new NotFoundException('ไม่พบผู้ใช้งาน');
    }

    let rolePerms: Set<string>;
    if (proposedRoleCode) {
      const pRole = await this.prisma.role.findUnique({
        where: { code: proposedRoleCode },
        include: { rolePermissions: { include: { permission: true } } },
      });
      rolePerms = new Set(pRole ? pRole.rolePermissions.map((rp) => rp.permission.code) : []);
    } else {
      rolePerms = new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code),
        ),
      );
    }

    const effective = new Set(rolePerms);
    for (const ov of proposedOverrides) {
      if (ov.effect === 'ALLOW') effective.add(ov.permissionCode);
      else if (ov.effect === 'DENY') effective.delete(ov.permissionCode);
    }

    return {
      userId,
      rolePermissions: Array.from(rolePerms),
      effectivePermissions: Array.from(effective),
      effectiveCount: effective.size,
    };
  }

  async resetUserPassword(userId: string, actorId: string, newPassword?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('ไม่พบผู้ใช้งาน');

    const rawPw = newPassword || 'ZmsEnterprise2026!';
    const hash = hashPassword(rawPw);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: hash },
      });
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.permissionAuditLog.create({
        data: {
          actorId,
          targetUserId: userId,
          action: 'USER_PASSWORD_RESET',
          reason: 'ผู้ดูแลระบบสั่งรีเซ็ตรหัสผ่าน',
        },
      });
    });

    return { success: true, message: 'รีเซ็ตรหัสผ่านและยกเลิก Session เก่าสำเร็จ' };
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
      username: user.username,
      roles: user.roles,
      permissions: user.permissions,
      branchId: user.branchId,
      departmentId: user.departmentId,
      dataScope: user.dataScope,
      approvalLimit: user.approvalLimit,
      mfaEnabled,
    };
  }
}
