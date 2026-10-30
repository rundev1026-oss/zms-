import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CloneRoleDto,
  CreateRoleDto,
  UpdateRoleDto,
  UpdateRolePermissionsDto,
} from './roles.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async listCatalog() {
    const roles = await this.prisma.role.findMany({
      orderBy: [{ isSystem: 'desc' }, { code: 'asc' }],
      include: {
        _count: {
          select: {
            userRoles: true,
            rolePermissions: true,
          },
        },
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return roles.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      isCustom: role.isCustom,
      status: role.status,
      userCount: role._count.userRoles,
      permissionCount: role._count.rolePermissions,
      permissions: role.rolePermissions.map((rp) => rp.permission.code),
    }));
  }

  async getRole(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                email: true,
                username: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('ไม่พบบทบาทนี้ในระบบ');
    }

    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      isCustom: role.isCustom,
      status: role.status,
      permissions: role.rolePermissions.map((rp) => rp.permission.code),
      users: role.userRoles.map((ur) => ur.user),
    };
  }

  async createRole(dto: CreateRoleDto, actorId: string, ipAddress?: string) {
    const code = dto.code.toUpperCase().trim();
    const existing = await this.prisma.role.findUnique({ where: { code } });
    if (existing) {
      throw new BadRequestException(`รหัสบทบาท ${code} มีอยู่ในระบบแล้ว`);
    }

    return this.prisma.$transaction(async (tx) => {
      const newRole = await tx.role.create({
        data: {
          code,
          name: dto.name.trim(),
          description: dto.description || null,
          isCustom: true,
          isSystem: false,
          status: 'ACTIVE',
        },
      });

      if (dto.permissions && dto.permissions.length > 0) {
        const perms = await tx.permission.findMany({
          where: { code: { in: dto.permissions } },
        });

        for (const p of perms) {
          await tx.rolePermission.create({
            data: {
              roleId: newRole.id,
              permissionId: p.id,
            },
          });
        }
      }

      await tx.permissionAuditLog.create({
        data: {
          actorId,
          targetRoleId: newRole.id,
          action: 'ROLE_CREATE',
          details: { code, name: dto.name, permissionsCount: dto.permissions?.length || 0 },
          reason: 'สร้างบทบาทใหม่ในระบบ',
          ipAddress: ipAddress || null,
        },
      });

      return {
        id: newRole.id,
        code: newRole.code,
        name: newRole.name,
        isCustom: newRole.isCustom,
        isSystem: newRole.isSystem,
        status: newRole.status,
        message: 'สร้างบทบาทใหม่สำเร็จ',
      };
    });
  }

  async updateRole(
    id: string,
    dto: UpdateRoleDto,
    actorId: string,
    ipAddress?: string,
  ) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException('ไม่พบบทบาทนี้');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.role.update({
        where: { id },
        data: {
          name: dto.name !== undefined ? dto.name.trim() : undefined,
          description: dto.description !== undefined ? dto.description : undefined,
          status: dto.status !== undefined ? dto.status : undefined,
        },
      });

      await tx.permissionAuditLog.create({
        data: {
          actorId,
          targetRoleId: id,
          action: 'ROLE_UPDATE',
          details: { oldStatus: role.status, newStatus: updated.status, name: updated.name },
          reason: 'แก้ไขข้อมูลบทบาท',
          ipAddress: ipAddress || null,
        },
      });

      return { success: true, message: 'ปรับปรุงบทบาทเรียบร้อย' };
    });
  }

  async cloneRole(
    sourceRoleId: string,
    dto: CloneRoleDto,
    actorId: string,
    ipAddress?: string,
  ) {
    const sourceRole = await this.prisma.role.findUnique({
      where: { id: sourceRoleId },
      include: { rolePermissions: true },
    });
    if (!sourceRole) {
      throw new NotFoundException('ไม่พบบทบาทต้นแบบ');
    }

    const code = (dto.newCode || dto.code || '').toUpperCase().trim();
    const name = (dto.newName || dto.name || '').trim();

    if (!code || !name) {
      throw new BadRequestException('กรุณาระบุรหัสบทบาทและชื่อบทบาทใหม่');
    }

    const existing = await this.prisma.role.findUnique({ where: { code } });
    if (existing) {
      throw new BadRequestException(`รหัสบทบาท ${code} มีอยู่ในระบบแล้ว`);
    }

    return this.prisma.$transaction(async (tx) => {
      const clonedRole = await tx.role.create({
        data: {
          code,
          name,
          description:
            dto.description || `คัดลอกจาก ${sourceRole.name} (${sourceRole.code})`,
          isCustom: true,
          isSystem: false,
          status: 'ACTIVE',
        },
      });

      // Copy all permissions
      for (const rp of sourceRole.rolePermissions) {
        await tx.rolePermission.create({
          data: {
            roleId: clonedRole.id,
            permissionId: rp.permissionId,
          },
        });
      }

      await tx.permissionAuditLog.create({
        data: {
          actorId,
          targetRoleId: clonedRole.id,
          action: 'ROLE_CREATE',
          details: {
            clonedFrom: sourceRole.code,
            newCode: code,
            copiedPermissionsCount: sourceRole.rolePermissions.length,
          },
          reason: `คัดลอกบทบาทจาก ${sourceRole.code}`,
          ipAddress: ipAddress || null,
        },
      });

      return {
        id: clonedRole.id,
        code: clonedRole.code,
        name: clonedRole.name,
        isCustom: clonedRole.isCustom,
        isSystem: clonedRole.isSystem,
        status: clonedRole.status,
        message: 'คัดลอกบทบาทสำเร็จ',
      };
    });
  }

  async updateRolePermissions(
    roleId: string,
    dto: UpdateRolePermissionsDto,
    actorId: string,
    ipAddress?: string,
  ) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('ไม่พบบทบาทนี้');
    }

    return this.prisma.$transaction(async (tx) => {
      // Clear existing
      await tx.rolePermission.deleteMany({ where: { roleId } });

      // Find valid permissions
      const targetCodes = dto.permissionCodes || dto.permissions || [];
      const perms = await tx.permission.findMany({
        where: { code: { in: targetCodes } },
      });

      for (const p of perms) {
        await tx.rolePermission.create({
          data: {
            roleId,
            permissionId: p.id,
          },
        });
      }

      await tx.permissionAuditLog.create({
        data: {
          actorId,
          targetRoleId: roleId,
          action: 'ROLE_ASSIGN_PERM',
          details: {
            roleCode: role.code,
            permissionsCount: perms.length,
            permissions: perms.map((p) => p.code),
          },
          reason: dto.reason || 'ปรับปรุงรายการสิทธิ์ของบทบาท',
          ipAddress: ipAddress || null,
        },
      });

      return {
        success: true,
        assignedCount: perms.length,
        message: 'บันทึกการกำหนดสิทธิ์ให้บทบาทสำเร็จ',
      };
    });
  }
}
