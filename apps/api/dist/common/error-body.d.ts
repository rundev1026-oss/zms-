import type { ApiErrorResponse } from '@zms/shared';
export declare function scrubSensitiveText(value: string): string;
export declare function toErrorBody(exception: unknown): {
    status: number;
    body: ApiErrorResponse;
};
