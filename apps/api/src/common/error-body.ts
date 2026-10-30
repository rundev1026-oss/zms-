import { HttpException, HttpStatus } from '@nestjs/common';
import type { ApiErrorDetail, ApiErrorResponse } from '@zms/shared';

export function scrubSensitiveText(value: string): string {
  return value.replace(/\d{13}/g, '[redacted]');
}

export function toErrorBody(exception: unknown): { status: number; body: ApiErrorResponse } {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const response = exception.getResponse();
    if (typeof response === 'object' && response !== null && 'code' in response) {
      const record = response as {
        code?: unknown;
        message?: unknown;
        details?: ApiErrorDetail[];
      };
      const message = typeof record.message === 'string' ? record.message : 'คำขอไม่ถูกต้อง';
      return {
        status,
        body: {
          statusCode: status,
          code: typeof record.code === 'string' ? record.code : 'REQUEST_ERROR',
          message: scrubSensitiveText(message),
          details: record.details?.map((detail) => ({
            field: detail.field,
            message: scrubSensitiveText(detail.message),
          })),
        },
      };
    }

    return {
      status,
      body: {
        statusCode: status,
        code: status === HttpStatus.BAD_REQUEST ? 'VALIDATION_ERROR' : 'REQUEST_ERROR',
        message: status === HttpStatus.BAD_REQUEST ? 'ข้อมูลไม่ถูกต้อง' : 'คำขอไม่ถูกต้อง',
      },
    };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    body: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'เกิดข้อผิดพลาดภายในระบบ',
    },
  };
}
