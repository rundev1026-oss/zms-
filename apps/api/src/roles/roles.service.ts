import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async listCatalog() {
    const roles = await this.prisma.role.findMany({
      orderBy: { code: 'asc' },
      include: { rolePermissions: { include: { permission: true } } },
    });
    return roles.map((role) => ({
      code: role.code,
      name: role.name,
      description: role.description,
      permissions: role.rolePermissions.map((link) => link.permission.code),
    }));
  }
}
