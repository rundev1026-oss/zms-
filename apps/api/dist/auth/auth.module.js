"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const audit_module_1 = require("../audit/audit.module");
const users_module_1 = require("../users/users.module");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
const login_rate_limiter_1 = require("./login-rate-limiter");
const permissions_guard_1 = require("./permissions.guard");
const roles_guard_1 = require("./roles.guard");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            users_module_1.UsersModule,
            audit_module_1.AuditModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    secret: config.getOrThrow('JWT_ACCESS_SECRET'),
                    signOptions: { algorithm: 'HS256' },
                }),
            }),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [
            auth_service_1.AuthService,
            login_rate_limiter_1.LoginRateLimiter,
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
            { provide: core_1.APP_GUARD, useClass: roles_guard_1.RolesGuard },
            { provide: core_1.APP_GUARD, useClass: permissions_guard_1.PermissionsGuard },
        ],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map