"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrubSensitiveText = scrubSensitiveText;
exports.toErrorBody = toErrorBody;
const common_1 = require("@nestjs/common");
function scrubSensitiveText(value) {
    return value.replace(/\d{13}/g, '[redacted]');
}
function toErrorBody(exception) {
    if (exception instanceof common_1.HttpException) {
        const status = exception.getStatus();
        const response = exception.getResponse();
        if (typeof response === 'object' && response !== null && 'code' in response) {
            const record = response;
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
                code: status === common_1.HttpStatus.BAD_REQUEST ? 'VALIDATION_ERROR' : 'REQUEST_ERROR',
                message: status === common_1.HttpStatus.BAD_REQUEST ? 'ข้อมูลไม่ถูกต้อง' : 'คำขอไม่ถูกต้อง',
            },
        };
    }
    return {
        status: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
        body: {
            statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            code: 'INTERNAL_ERROR',
            message: 'เกิดข้อผิดพลาดภายในระบบ',
        },
    };
}
//# sourceMappingURL=error-body.js.map