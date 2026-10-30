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
exports.AsnafProposalController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../common/current-user.decorator");
const permissions_decorator_1 = require("../common/permissions.decorator");
const asnaf_service_1 = require("./asnaf.service");
const proposal_dto_1 = require("./proposal.dto");
let AsnafProposalController = class AsnafProposalController {
    asnaf;
    constructor(asnaf) {
        this.asnaf = asnaf;
    }
    latest(beneficiaryId, user) {
        return this.asnaf.latestProposal(beneficiaryId, user);
    }
    propose(beneficiaryId, dto, user) {
        return this.asnaf.propose(beneficiaryId, dto, user);
    }
};
exports.AsnafProposalController = AsnafProposalController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'ข้อเสนอหมวดอัสนัฟล่าสุด ยังไม่ใช่ผลการตัดสินคุณสมบัติ' }),
    __param(0, (0, common_1.Param)('beneficiaryId', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AsnafProposalController.prototype, "latest", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.write'),
    (0, swagger_1.ApiOperation)({ summary: 'บันทึกข้อเสนอหมวดอัสนัฟแบบ PROPOSED โดยไม่เปลี่ยนสถานะทะเบียน' }),
    __param(0, (0, common_1.Param)('beneficiaryId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, proposal_dto_1.ProposeAsnafDto, Object]),
    __metadata("design:returntype", void 0)
], AsnafProposalController.prototype, "propose", null);
exports.AsnafProposalController = AsnafProposalController = __decorate([
    (0, swagger_1.ApiTags)('asnaf'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('beneficiaries/:beneficiaryId/asnaf-proposal'),
    __metadata("design:paramtypes", [asnaf_service_1.AsnafService])
], AsnafProposalController);
//# sourceMappingURL=asnaf-proposal.controller.js.map