import { BadRequestException, ValidationPipe, type ValidationError } from '@nestjs/common';
import type { ApiErrorDetail } from '@zms/shared';

function flatten(errors: ValidationError[], parent = ''): ApiErrorDetail[] {
  const details: ApiErrorDetail[] = [];
  for (const error of errors) {
    const field = parent.length > 0 ? `${parent}.${error.property}` : error.property;
    if (error.constraints) {
      for (const message of Object.values(error.constraints)) {
        details.push({ field, message });
      }
    }
    if (error.children && error.children.length > 0) {
      details.push(...flatten(error.children, field));
    }
  }
  return details;
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors: ValidationError[]) =>
      new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'ข้อมูลไม่ถูกต้อง',
        details: flatten(errors),
      }),
  });
}
