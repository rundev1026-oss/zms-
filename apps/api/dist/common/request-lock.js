"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestLock = void 0;
const common_1 = require("@nestjs/common");
const app_exception_1 = require("./app.exception");
class RequestLock {
    keys = new Set();
    async run(key, work) {
        if (this.keys.has(key)) {
            throw new app_exception_1.AppException(common_1.HttpStatus.CONFLICT, 'DUPLICATE_REQUEST', 'คำขอนี้กำลังดำเนินการ');
        }
        this.keys.add(key);
        try {
            return await work();
        }
        finally {
            this.keys.delete(key);
        }
    }
}
exports.RequestLock = RequestLock;
//# sourceMappingURL=request-lock.js.map