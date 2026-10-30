"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginRateLimiter = void 0;
const common_1 = require("@nestjs/common");
const app_exception_1 = require("../common/app.exception");
const WINDOW_MS = 60_000;
const LIMIT = 5;
let LoginRateLimiter = class LoginRateLimiter {
    failures = new Map();
    assertAllowed(key, now = Date.now()) {
        const recent = (this.failures.get(key) ?? []).filter((hit) => now - hit < WINDOW_MS);
        if (recent.length >= LIMIT) {
            throw new app_exception_1.AppException(common_1.HttpStatus.TOO_MANY_REQUESTS, 'RATE_LIMITED', 'พยายามเข้าสู่ระบบผิดพลาดบ่อยเกินไป กรุณารอสักครู่ (1 นาที)');
        }
    }
    recordFailure(key, now = Date.now()) {
        const recent = (this.failures.get(key) ?? []).filter((hit) => now - hit < WINDOW_MS);
        recent.push(now);
        this.failures.set(key, recent);
    }
    recordSuccess(key) {
        this.failures.delete(key);
    }
    reset() {
        this.failures.clear();
    }
};
exports.LoginRateLimiter = LoginRateLimiter;
exports.LoginRateLimiter = LoginRateLimiter = __decorate([
    (0, common_1.Injectable)()
], LoginRateLimiter);
//# sourceMappingURL=login-rate-limiter.js.map