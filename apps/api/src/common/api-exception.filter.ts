import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { toErrorBody } from './error-body';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, body } = toErrorBody(exception);
    if (status >= 500) {
      console.error('[ApiExceptionFilter Error]', exception);
    }
    response.status(status).json(body);
  }
}
