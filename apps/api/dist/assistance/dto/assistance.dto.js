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
exports.ConfirmExecutionDto = exports.RecordExecutionDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class RecordExecutionDto {
    applicationId;
    assistanceType;
    actualDisbursedAmount;
    actualAssistanceValue;
    assistanceOutcome;
    details;
    proofUrl;
    installmentNo = 1;
    totalInstallments = 1;
}
exports.RecordExecutionDto = RecordExecutionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Assistance Application ID' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุรหัสคำร้อง' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordExecutionDto.prototype, "applicationId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Assistance Type (cash, supplies, medical, education)' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุประเภทความช่วยเหลือ' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordExecutionDto.prototype, "assistanceType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Actual disbursed or delivered monetary amount', minimum: 0 }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุจำนวนเงินหรือมูลค่าที่ส่งมอบ' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({}, { message: 'จำนวนเงินต้องเป็นตัวเลข' }),
    (0, class_validator_1.Min)(0, { message: 'จำนวนเงินต้องไม่ติดลบ' }),
    __metadata("design:type", Number)
], RecordExecutionDto.prototype, "actualDisbursedAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Actual assistance valuation', minimum: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], RecordExecutionDto.prototype, "actualAssistanceValue", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Assistance outcome (e.g. completed, received_full, partial)' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุผลสัมฤทธิ์การให้ความช่วยเหลือ' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordExecutionDto.prototype, "assistanceOutcome", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Execution details / handover remarks' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordExecutionDto.prototype, "details", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Proof photo or delivery receipt URL' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordExecutionDto.prototype, "proofUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Installment number', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], RecordExecutionDto.prototype, "installmentNo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Total installments', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], RecordExecutionDto.prototype, "totalInstallments", void 0);
class ConfirmExecutionDto {
    confirmationStatement;
    proofUrl;
}
exports.ConfirmExecutionDto = ConfirmExecutionDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Confirmation statement' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConfirmExecutionDto.prototype, "confirmationStatement", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Proof URL' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConfirmExecutionDto.prototype, "proofUrl", void 0);
//# sourceMappingURL=assistance.dto.js.map