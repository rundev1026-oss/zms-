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
exports.ApprovalsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const permissions_decorator_1 = require("../common/permissions.decorator");
const current_user_decorator_1 = require("../common/current-user.decorator");
const approvals_service_1 = require("./approvals.service");
const approval_dto_1 = require("./dto/approval.dto");
let ApprovalsController = class ApprovalsController {
    approvalsService;
    constructor(approvalsService) {
        this.approvalsService = approvalsService;
    }
    getPendingApprovals(query, user) {
        return this.approvalsService.getPendingApprovals(query, user);
    }
    getSummary() {
        return this.approvalsService.getSummary();
    }
    approve(id, dto, user) {
        return this.approvalsService.approve(id, dto, user);
    }
    reject(id, dto, user) {
        return this.approvalsService.reject(id, dto, user);
    }
    returnForCorrection(id, dto, user) {
        return this.approvalsService.returnForCorrection(id, dto, user);
    }
};
exports.ApprovalsController = ApprovalsController;
__decorate([
    (0, common_1.Get)('pending'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'รายการคำร้องขอความช่วยเหลือที่รอพิจารณาอนุมัติ' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [approval_dto_1.QueryPendingApprovalsDto, Object]),
    __metadata("design:returntype", void 0)
], ApprovalsController.prototype, "getPendingApprovals", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'สถิติภาพรวมการอนุมัติคำร้องขอความช่วยเหลือ' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ApprovalsController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.decide'),
    (0, swagger_1.ApiOperation)({ summary: 'พิจารณาอนุมัติคำร้อง จัดสรรกองทุน และกันงบประมาณผูกพัน' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, approval_dto_1.ApproveApplicationDto, Object]),
    __metadata("design:returntype", void 0)
], ApprovalsController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.decide'),
    (0, swagger_1.ApiOperation)({ summary: 'ไม่อนุมัติคำร้องขอความช่วยเหลือพร้อมระบุเหตุผล' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, approval_dto_1.RejectApplicationDto, Object]),
    __metadata("design:returntype", void 0)
], ApprovalsController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)(':id/return'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.decide'),
    (0, swagger_1.ApiOperation)({ summary: 'ส่งกลับคำร้องขอความช่วยเหลือเพื่อแก้ไขหรือขอข้อมูลเพิ่มเติม' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, approval_dto_1.ReturnApplicationDto, Object]),
    __metadata("design:returntype", void 0)
], ApprovalsController.prototype, "returnForCorrection", null);
exports.ApprovalsController = ApprovalsController = __decorate([
    (0, swagger_1.ApiTags)('approvals'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('approvals'),
    __metadata("design:paramtypes", [approvals_service_1.ApprovalsService])
], ApprovalsController);
//# sourceMappingURL=approvals.controller.js.map