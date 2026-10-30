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
exports.AssistanceController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const permissions_decorator_1 = require("../common/permissions.decorator");
const current_user_decorator_1 = require("../common/current-user.decorator");
const assistance_service_1 = require("./assistance.service");
const assistance_dto_1 = require("./dto/assistance.dto");
let AssistanceController = class AssistanceController {
    assistanceService;
    constructor(assistanceService) {
        this.assistanceService = assistanceService;
    }
    recordExecution(dto, user) {
        return this.assistanceService.recordExecution(dto, user);
    }
    confirmExecution(id, dto, user) {
        return this.assistanceService.confirmExecution(id, dto, user);
    }
    getExecutionsByApplication(applicationId) {
        return this.assistanceService.getExecutionsByApplication(applicationId);
    }
};
exports.AssistanceController = AssistanceController;
__decorate([
    (0, common_1.Post)('executions'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.write'),
    (0, swagger_1.ApiOperation)({ summary: 'บันทึกการส่งมอบความช่วยเหลือแก่ผู้มีสิทธิ์' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [assistance_dto_1.RecordExecutionDto, Object]),
    __metadata("design:returntype", void 0)
], AssistanceController.prototype, "recordExecution", null);
__decorate([
    (0, common_1.Post)('executions/:id/confirm'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.write'),
    (0, swagger_1.ApiOperation)({ summary: 'ยืนยันการรับมอบความช่วยเหลือพร้อมหลักฐาน' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assistance_dto_1.ConfirmExecutionDto, Object]),
    __metadata("design:returntype", void 0)
], AssistanceController.prototype, "confirmExecution", null);
__decorate([
    (0, common_1.Get)('executions/:applicationId'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'เรียกดูประวัติการส่งมอบความช่วยเหลือตามรหัสคำร้อง' }),
    __param(0, (0, common_1.Param)('applicationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AssistanceController.prototype, "getExecutionsByApplication", null);
exports.AssistanceController = AssistanceController = __decorate([
    (0, swagger_1.ApiTags)('assistance'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('assistance'),
    __metadata("design:paramtypes", [assistance_service_1.AssistanceService])
], AssistanceController);
//# sourceMappingURL=assistance.controller.js.map