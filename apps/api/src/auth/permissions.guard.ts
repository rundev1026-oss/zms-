import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PermissionCode } from '@zms/shared';
import type { Request } from 'express';
import { AppException } from '../common/app.exception';
import type { AuthUser } from '../common/auth-user';
import { PERMISSIONS_KEY } from '../common/permissions.decorator';
import { IS_PUBLIC } from '../common/public.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const required =
      this.reflector.getAllAndOverride<PermissionCode[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    if (required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = request.user;
    if (user === undefined) {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'กรุณาเข้าสู่ระบบ');
    }

    const allowed = required.every((permission) => user.permissions.includes(permission));
    if (!allowed) {
      throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN', 'ไม่มีสิทธิ์ดำเนินการนี้');
    }
    return true;
  }
}
