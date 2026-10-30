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
exports.QueryReconciliationsDto = exports.ReconcileBankAccountDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class ReconcileBankAccountDto {
    statementBalance;
    reconciliationDate;
    notes;
    proofUrl;
}
exports.ReconcileBankAccountDto = ReconcileBankAccountDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ยอดเงินคงเหลือตามใบแจ้งยอดธนาคาร (Bank Statement Ending Balance)' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({}, { message: 'ยอดเงินคงเหลือตามใบแจ้งยอดต้องเป็นตัวเลข' }),
    __metadata("design:type", Number)
], ReconcileBankAccountDto.prototype, "statementBalance", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'วันที่กระทบยอด (วว/ดด/ปปปป หรือ ISO)', default: '' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReconcileBankAccountDto.prototype, "reconciliationDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'หมายเหตุการกระทบยอด หรือสาเหตุข้อแตกต่าง (Discrepancy reason)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReconcileBankAccountDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ลิงก์ไฟล์เอกสารแนบใบแจ้งยอดธนาคาร (Statement Proof URL)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReconcileBankAccountDto.prototype, "proofUrl", void 0);
class QueryReconciliationsDto {
    bankAccountId;
    status;
    page = 1;
    limit = 10;
}
exports.QueryReconciliationsDto = QueryReconciliationsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'กรองตามรหัสบัญชีธนาคาร (Bank Account UUID or Legacy ID)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryReconciliationsDto.prototype, "bankAccountId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'สถานะ (balanced หรือ discrepancy)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryReconciliationsDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'หน้าที่ (Page)', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], QueryReconciliationsDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'จำนวนรายการต่อหน้า (Limit)', default: 10 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], QueryReconciliationsDto.prototype, "limit", void 0);
//# sourceMappingURL=bank-account.dto.js.map