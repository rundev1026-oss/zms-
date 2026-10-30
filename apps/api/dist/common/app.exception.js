"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppException = void 0;
const common_1 = require("@nestjs/common");
class AppException extends common_1.HttpException {
    constructor(status, code, message, details) {
        super({ statusCode: status, code, message, details }, status);
    }
}
exports.AppException = AppException;
//# sourceMappingURL=app.exception.js.map