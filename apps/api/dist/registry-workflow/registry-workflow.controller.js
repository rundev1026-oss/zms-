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
exports.RegistryWorkflowController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../common/current-user.decorator");
const permissions_decorator_1 = require("../common/permissions.decorator");
const request_dto_1 = require("../common/request.dto");
const registry_workflow_service_1 = require("./registry-workflow.service");
let RegistryWorkflowController = class RegistryWorkflowController {
    workflow;
    constructor(workflow) {
        this.workflow = workflow;
    }
    submit(id, user) {
        return this.workflow.submit(id, user);
    }
    requestCorrection(id, dto, user) {
        return this.workflow.requestCorrection(id, dto.reason, user);
    }
    assess(id, dto, user) {
        return this.workflow.assess(id, dto, user);
    }
    approve(id, dto, user) {
        return this.workflow.approve(id, dto.reason, user);
    }
    reject(id, dto, user) {
        return this.workflow.reject(id, dto.reason, user);
    }
    suspend(id, dto, user) {
        return this.workflow.suspend(id, dto.reason, user);
    }
    archive(id, dto, user) {
        return this.workflow.archive(id, dto.reason, user);
    }
    history(id) {
        return this.workflow.history(id);
    }
};
exports.RegistryWorkflowController = RegistryWorkflowController;
__decorate([
    (0, common_1.Post)(':id/submit'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.submit'),
    (0, swagger_1.ApiOperation)({ summary: 'ส่งตรวจ ตรวจความครบที่เซิร์ฟเวอร์ และกันคำขอซ้ำ' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RegistryWorkflowController.prototype, "submit", null);
__decorate([
    (0, common_1.Post)(':id/request-correction'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.review'),
    (0, swagger_1.ApiOperation)({ summary: 'ขอให้แก้ไขข้อมูล' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, request_dto_1.ReasonDto, Object]),
    __metadata("design:returntype", void 0)
], RegistryWorkflowController.prototype, "requestCorrection", null);
__decorate([
    (0, common_1.Post)(':id/assess'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.assess'),
    (0, swagger_1.ApiOperation)({ summary: 'บันทึกการประเมินโดยเจ้าหน้าที่ ไม่คำนวณคุณสมบัติอัตโนมัติ' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, request_dto_1.AssessmentDto, Object]),
    __metadata("design:returntype", void 0)
], RegistryWorkflowController.prototype, "assess", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.decide'),
    (0, swagger_1.ApiOperation)({ summary: 'เจ้าหน้าที่ยืนยันว่ามีคุณสมบัติ' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, request_dto_1.ReasonDto, Object]),
    __metadata("design:returntype", void 0)
], RegistryWorkflowController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.decide'),
    (0, swagger_1.ApiOperation)({ summary: 'เจ้าหน้าที่บันทึกว่าไม่มีคุณสมบัติ' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, request_dto_1.ReasonDto, Object]),
    __metadata("design:returntype", void 0)
], RegistryWorkflowController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)(':id/suspend'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.decide'),
    (0, swagger_1.ApiOperation)({ summary: 'ระงับทะเบียนที่มีคุณสมบัติ ไม่ใช่สถานะของคำร้อง' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, request_dto_1.ReasonDto, Object]),
    __metadata("design:returntype", void 0)
], RegistryWorkflowController.prototype, "suspend", null);
__decorate([
    (0, common_1.Post)(':id/archive'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.decide'),
    (0, swagger_1.ApiOperation)({ summary: 'เก็บถาวรทะเบียนที่ปิดผลแล้ว ไม่ใช่สถานะของคำร้อง' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, request_dto_1.ReasonDto, Object]),
    __metadata("design:returntype", void 0)
], RegistryWorkflowController.prototype, "archive", null);
__decorate([
    (0, common_1.Get)(':id/history'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'ประวัติการเปลี่ยนสถานะทะเบียน' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RegistryWorkflowController.prototype, "history", null);
exports.RegistryWorkflowController = RegistryWorkflowController = __decorate([
    (0, swagger_1.ApiTags)('registry-workflow'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('beneficiaries'),
    __metadata("design:paramtypes", [registry_workflow_service_1.RegistryWorkflowService])
], RegistryWorkflowController);
//# sourceMappingURL=registry-workflow.controller.js.map