import { HttpException, HttpStatus } from '@nestjs/common';
import type { ApiErrorDetail } from '@zms/shared';
export declare class AppException extends HttpException {
    constructor(status: HttpStatus, code: string, message: string, details?: ApiErrorDetail[]);
}
