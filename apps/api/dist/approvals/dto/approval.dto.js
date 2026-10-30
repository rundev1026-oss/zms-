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
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryPendingApprovalsDto = exports.ReturnApplicationDto = exports.RejectApplicationDto = exports.ApproveApplicationDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class ApproveApplicationDto {
    approvedAmount;
    fundId;
    specificFundId;
    notes;
}
exports.ApproveApplicationDto = ApproveApplicationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Approved assistance amount in THB', minimum: 1 }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุวงเงินที่อนุมัติ' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({}, { message: 'วงเงินที่อนุมัติจำต้องเป็นตัวเลข' }),
    (0, class_validator_1.Min)(1, { message: 'วงเงินที่อนุมัติต้องมากกว่า 0 บาท' }),
    __metadata("design:type", Number)
], ApproveApplicationDto.prototype, "approvedAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Primary Fund Account ID (Level 1)' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุบัญชีกองทุนหลัก (Fund Account)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApproveApplicationDto.prototype, "fundId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Specific Sub-Fund ID (Level 2)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApproveApplicationDto.prototype, "specificFundId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Approval notes / decision remarks' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApproveApplicationDto.prototype, "notes", void 0);
class RejectApplicationDto {
    reason;
    notes;
}
exports.RejectApplicationDto = RejectApplicationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Reason for rejecting application' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุเหตุผลการไม่อนุมัติคำร้อง' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RejectApplicationDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Additional notes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RejectApplicationDto.prototype, "notes", void 0);
class ReturnApplicationDto {
    notes;
    targetStatus = 'need_info';
}
exports.ReturnApplicationDto = ReturnApplicationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Notes on what needs correction or additional info' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุข้อมูลที่ต้องแก้ไขหรือเพิ่มเติม' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReturnApplicationDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Target return status', default: 'need_info' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReturnApplicationDto.prototype, "targetStatus", void 0);
class QueryPendingApprovalsDto {
    search;
    asnafCategory;
    urgencyLevel;
    branchId;
    page = 1;
    limit = 20;
}
exports.QueryPendingApprovalsDto = QueryPendingApprovalsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Search query (application number, name, national ID)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryPendingApprovalsDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by Asnaf Category' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryPendingApprovalsDto.prototype, "asnafCategory", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by Urgency Level' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryPendingApprovalsDto.prototype, "urgencyLevel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by Branch ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryPendingApprovalsDto.prototype, "branchId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Page number', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], QueryPendingApprovalsDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Page limit', default: 20 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], QueryPendingApprovalsDto.prototype, "limit", void 0);
//# sourceMappingURL=approval.dto.js.map