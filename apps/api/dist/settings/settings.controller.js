"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../common/roles.decorator");
const permissions_decorator_1 = require("../common/permissions.decorator");
const current_user_decorator_1 = require("../common/current-user.decorator");
const settings_service_1 = require("./settings.service");
const settings_dto_1 = require("./dto/settings.dto");
let SettingsController = class SettingsController {
    settingsService;
    constructor(settingsService) {
        this.settingsService = settingsService;
    }
    getSettings() {
        return this.settingsService.getSettings();
    }
    updateSettings(dto, user) {
        return this.settingsService.updateSettings(dto, user);
    }
};
exports.SettingsController = SettingsController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'เรียกดูข้อมูลองค์กรและพารามิเตอร์การตั้งค่าระบบ' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Patch)(),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'ปรับปรุงข้อมูลองค์กรและเกณฑ์การตั้งค่าระบบ' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [settings_dto_1.UpdateSettingsDto, Object]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "updateSettings", null);
exports.SettingsController = SettingsController = __decorate([
    (0, swagger_1.ApiTags)('settings'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('settings'),
    __metadata("design:paramtypes", [settings_service_1.SettingsService])
], SettingsController);
//# sourceMappingURL=settings.controller.js.map