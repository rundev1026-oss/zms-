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
exports.AssessmentController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const permissions_decorator_1 = require("../common/permissions.decorator");
const current_user_decorator_1 = require("../common/current-user.decorator");
const assessment_service_1 = require("./assessment.service");
const assessment_dto_1 = require("./dto/assessment.dto");
let AssessmentController = class AssessmentController {
    assessmentService;
    constructor(assessmentService) {
        this.assessmentService = assessmentService;
    }
    submit(applicationId, dto, user) {
        return this.assessmentService.submitAssessment(applicationId, dto, user);
    }
    get(applicationId) {
        return this.assessmentService.getAssessment(applicationId);
    }
};
exports.AssessmentController = AssessmentController;
__decorate([
    (0, common_1.Post)(':applicationId'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.assess'),
    (0, swagger_1.ApiOperation)({ summary: 'บันทึกผลการประเมินสภาพความเป็นอยู่และข้อเสนอแนะเจ้าหน้าที่' }),
    __param(0, (0, common_1.Param)('applicationId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assessment_dto_1.SubmitAssessmentDto, Object]),
    __metadata("design:returntype", void 0)
], AssessmentController.prototype, "submit", null);
__decorate([
    (0, common_1.Get)(':applicationId'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'เรียกดูผลการประเมินสภาพความเป็นอยู่ของคำร้อง' }),
    __param(0, (0, common_1.Param)('applicationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AssessmentController.prototype, "get", null);
exports.AssessmentController = AssessmentController = __decorate([
    (0, swagger_1.ApiTags)('assessments'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('assessments'),
    __metadata("design:paramtypes", [assessment_service_1.AssessmentService])
], AssessmentController);
//# sourceMappingURL=assessment.controller.js.map