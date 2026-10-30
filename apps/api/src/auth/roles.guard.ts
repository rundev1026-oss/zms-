import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppException } from '../common/app.exception';
import type { AuthUser } from '../common/auth-user';
import { IS_PUBLIC } from '../common/public.decorator';
import { ROLES_KEY, SystemRole } from '../common/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredRoles =
      this.reflector.getAllAndOverride<(SystemRole | string)[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = request.user;
    if (user === undefined) {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'กรุณาเข้าสู่ระบบ');
    }

    // Check if user has at least one of the required roles
    const userRoleCodes = (user.roles || []).map((r: any) =>
      typeof r === 'string' ? r : r.code,
    );
    const hasRole = requiredRoles.some((role) => userRoleCodes.includes(role));

    if (!hasRole) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN_ROLE',
        `ไม่อนุญาต: สิทธิ์การเข้าถึงสำหรับบทบาท [${requiredRoles.join(', ')}] เท่านั้น`
      );
    }

    return true;
  }
}
