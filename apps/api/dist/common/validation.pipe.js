"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createValidationPipe = createValidationPipe;
const common_1 = require("@nestjs/common");
function flatten(errors, parent = '') {
    const details = [];
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
function createValidationPipe() {
    return new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: (errors) => new common_1.BadRequestException({
            code: 'VALIDATION_ERROR',
            message: 'ข้อมูลไม่ถูกต้อง',
            details: flatten(errors),
        }),
    });
}
//# sourceMappingURL=validation.pipe.js.map