import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from './auth-user';

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
  return request.user;
});
