import { HttpException, HttpStatus } from '@nestjs/common';
import type { ApiErrorDetail } from '@zms/shared';

export class AppException extends HttpException {
  constructor(status: HttpStatus, code: string, message: string, details?: ApiErrorDetail[]) {
    super({ statusCode: status, code, message, details }, status);
  }
}
