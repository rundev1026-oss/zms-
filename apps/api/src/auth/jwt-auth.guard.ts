import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AppException } from '../common/app.exception';
import type { AuthUser } from '../common/auth-user';
import { IS_PUBLIC } from '../common/public.decorator';
import { UsersService } from '../users/users.service';

interface AccessPayload {
  sub: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = request.header('authorization');
    if (header === undefined || !header.startsWith('Bearer ')) {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'กรุณาเข้าสู่ระบบ');
    }

    let payload: AccessPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessPayload>(header.slice('Bearer '.length), {
        algorithms: ['HS256'],
      });
    } catch {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'กรุณาเข้าสู่ระบบ');
    }

    const user = await this.users.loadAuthUser(payload.sub);
    if (user === null) {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'กรุณาเข้าสู่ระบบ');
    }

    request.user = user;
    return true;
  }
}
