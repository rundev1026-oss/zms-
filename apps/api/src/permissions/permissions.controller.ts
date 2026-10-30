import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MODULE_PERMISSION_CATALOG } from '@zms/shared';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('permissions')
@ApiBearerAuth()
@UseGuards(RolesGuard, PermissionsGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'รายการแคตตาล็อกสิทธิ์ทั้ง 15 โมดูลและ Action ทั้งหมด' })
  getCatalog() {
    return {
      success: true,
      modules: MODULE_PERMISSION_CATALOG,
      totalModules: MODULE_PERMISSION_CATALOG.length,
      totalActions: MODULE_PERMISSION_CATALOG.reduce((acc, m) => acc + m.actions.length, 0),
    };
  }

  @Get('audit-logs')
  @Roles('SUPER_ADMIN', 'ADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'ประวัติการเปลี่ยนแปลงสิทธิ์ (Permission Audit Logs)' })
  async getAuditLogs(
    @Query('targetUserId') targetUserId?: string,
    @Query('targetRoleId') targetRoleId?: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
  ) {
    const p = Math.max(1, Number(page) || 1);
    const ps = Math.max(1, Math.min(100, Number(pageSize) || 50));
    const where: any = {};
    if (targetUserId) where.targetUserId = targetUserId;
    if (targetRoleId) where.targetRoleId = targetRoleId;

    const [total, logs] = await Promise.all([
      this.prisma.permissionAuditLog.count({ where }),
      this.prisma.permissionAuditLog.findMany({
        where,
        skip: (p - 1) * ps,
        take: ps,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, displayName: true, email: true, username: true } },
          targetUser: { select: { id: true, displayName: true, email: true, username: true } },
          targetRole: { select: { id: true, code: true, name: true } },
        },
      }),
    ]);

    return {
      success: true,
      items: logs,
      data: logs,
      total,
      page: p,
      pageSize: ps,
      totalPages: Math.ceil(total / ps) || 1,
    };
  }
}
