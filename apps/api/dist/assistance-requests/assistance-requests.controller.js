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
exports.AssistanceRequestsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const permissions_decorator_1 = require("../common/permissions.decorator");
const current_user_decorator_1 = require("../common/current-user.decorator");
const assistance_requests_service_1 = require("./assistance-requests.service");
const assessment_service_1 = require("../assessment/assessment.service");
const assessment_dto_1 = require("../assessment/dto/assessment.dto");
const assistance_request_dto_1 = require("./dto/assistance-request.dto");
let AssistanceRequestsController = class AssistanceRequestsController {
    assistanceService;
    assessmentService;
    constructor(assistanceService, assessmentService) {
        this.assistanceService = assistanceService;
        this.assessmentService = assessmentService;
    }
    checkBeneficiary(dto, user) {
        return this.assistanceService.checkBeneficiary(dto, user);
    }
    create(dto, user) {
        return this.assistanceService.create(dto, user);
    }
    list(query, user) {
        return this.assistanceService.list(query, user);
    }
    getById(id, user) {
        return this.assistanceService.getById(id, user);
    }
    updateStatus(id, dto, user) {
        return this.assistanceService.updateStatus(id, dto, user);
    }
    addDocument(id, dto, user) {
        return this.assistanceService.addDocument(id, dto, user);
    }
    submitAssessment(id, dto, user) {
        return this.assessmentService.submitAssessment(id, dto, user);
    }
    getAssessment(id) {
        return this.assessmentService.getAssessment(id);
    }
};
exports.AssistanceRequestsController = AssistanceRequestsController;
__decorate([
    (0, common_1.Post)('check-beneficiary'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'ตรวจสอบสิทธิ์และสถานะทะเบียนผู้มีสิทธิ์ก่อนยื่นคำร้อง' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [assistance_request_dto_1.CheckBeneficiaryDto, Object]),
    __metadata("design:returntype", void 0)
], AssistanceRequestsController.prototype, "checkBeneficiary", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.write'),
    (0, swagger_1.ApiOperation)({ summary: 'ยื่นคำร้องขอความช่วยเหลือใหม่' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [assistance_request_dto_1.CreateAssistanceRequestDto, Object]),
    __metadata("design:returntype", void 0)
], AssistanceRequestsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'ค้นหาและแสดงรายการคำร้องขอความช่วยเหลือ (แบ่งหน้า)' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [assistance_request_dto_1.QueryAssistanceRequestsDto, Object]),
    __metadata("design:returntype", void 0)
], AssistanceRequestsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'ดูรายละเอียดคำร้องขอความช่วยเหลือ ประวัติ และเอกสาร' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AssistanceRequestsController.prototype, "getById", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.write'),
    (0, swagger_1.ApiOperation)({ summary: 'ปรับปรุงสถานะคำร้องขอความช่วยเหลือ' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assistance_request_dto_1.UpdateRequestStatusDto, Object]),
    __metadata("design:returntype", void 0)
], AssistanceRequestsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)(':id/documents'),
    (0, permissions_decorator_1.RequirePermissions)('documents.write'),
    (0, swagger_1.ApiOperation)({ summary: 'แนบเอกสารประกอบคำร้องขอความช่วยเหลือ' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assistance_request_dto_1.AddApplicationDocumentDto, Object]),
    __metadata("design:returntype", void 0)
], AssistanceRequestsController.prototype, "addDocument", null);
__decorate([
    (0, common_1.Post)(':id/assessment'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.assess'),
    (0, swagger_1.ApiOperation)({ summary: 'บันทึกผลการประเมินสภาพความเป็นอยู่ของคำร้อง' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assessment_dto_1.SubmitAssessmentDto, Object]),
    __metadata("design:returntype", void 0)
], AssistanceRequestsController.prototype, "submitAssessment", null);
__decorate([
    (0, common_1.Get)(':id/assessment'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'เรียกดูผลการประเมินสภาพความเป็นอยู่ของคำร้อง' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AssistanceRequestsController.prototype, "getAssessment", null);
exports.AssistanceRequestsController = AssistanceRequestsController = __decorate([
    (0, swagger_1.ApiTags)('assistance-requests'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('assistance-requests'),
    __metadata("design:paramtypes", [assistance_requests_service_1.AssistanceRequestsService,
        assessment_service_1.AssessmentService])
], AssistanceRequestsController);
//# sourceMappingURL=assistance-requests.controller.js.map