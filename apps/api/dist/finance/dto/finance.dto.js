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
exports.QueryTransactionsDto = exports.CreateTransactionDto = exports.DisburseAssistanceDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class DisburseAssistanceDto {
    applicationId;
    amount;
    paymentRef;
    bankAccountId;
    paymentMethod = 'bank_transfer';
    proofUrl;
    notes;
    installmentNo = 1;
}
exports.DisburseAssistanceDto = DisburseAssistanceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Assistance Application ID (UUID or Application No)' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุรหัสคำร้องขอความช่วยเหลือ' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DisburseAssistanceDto.prototype, "applicationId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Disbursement amount in THB (defaults to full approved amount)', minimum: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({}, { message: 'จำนวนเงินเบิกจ่ายต้องเป็นตัวเลข' }),
    (0, class_validator_1.Min)(1, { message: 'จำนวนเงินเบิกจ่ายต้องมากกว่า 0 บาท' }),
    __metadata("design:type", Number)
], DisburseAssistanceDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Bank transfer reference or slip number' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุหมายเลขอ้างอิงการโอนเงิน (Payment Reference)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DisburseAssistanceDto.prototype, "paymentRef", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Bank Account ID used for payment' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DisburseAssistanceDto.prototype, "bankAccountId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Payment method (bank_transfer, cash, promptpay)', default: 'bank_transfer' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DisburseAssistanceDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Proof slip image/document URL' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DisburseAssistanceDto.prototype, "proofUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Disbursement remarks / notes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DisburseAssistanceDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Installment number', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], DisburseAssistanceDto.prototype, "installmentNo", void 0);
class CreateTransactionDto {
    type;
    fundId;
    amount;
    paymentMethod;
    payerOrPayee;
    referenceNo;
    category;
    slipUrl;
    notes;
    applicationId;
    beneficiaryId;
    specificFundId;
    asnafCategory;
    bankAccountId;
}
exports.CreateTransactionDto = CreateTransactionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Transaction type (disbursement, donation, transfer, expense)' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุประเภทธุรกรรม' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTransactionDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Target Fund Account ID' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุกองทุน' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTransactionDto.prototype, "fundId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Transaction amount in THB', minimum: 1 }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุจำนวนเงิน' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({}, { message: 'จำนวนเงินต้องเป็นตัวเลข' }),
    (0, class_validator_1.Min)(1, { message: 'จำนวนเงินต้องมากกว่า 0 บาท' }),
    __metadata("design:type", Number)
], CreateTransactionDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Payment method' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุช่องทางการชำระเงิน' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTransactionDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Payer or Payee name' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุชื่อผู้รับหรือผู้จ่าย' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTransactionDto.prototype, "payerOrPayee", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Payment reference or receipt number' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุเลขอ้างอิง' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTransactionDto.prototype, "referenceNo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Transaction category' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTransactionDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Slip or receipt URL' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTransactionDto.prototype, "slipUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Transaction notes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTransactionDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Linked application ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTransactionDto.prototype, "applicationId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Linked beneficiary ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTransactionDto.prototype, "beneficiaryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Linked specific sub-fund ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTransactionDto.prototype, "specificFundId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Asnaf Category' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTransactionDto.prototype, "asnafCategory", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Bank Account ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTransactionDto.prototype, "bankAccountId", void 0);
class QueryTransactionsDto {
    search;
    fundId;
    type;
    status;
    page = 1;
    limit = 20;
}
exports.QueryTransactionsDto = QueryTransactionsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Search query' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryTransactionsDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by Fund ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryTransactionsDto.prototype, "fundId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by transaction type' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryTransactionsDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by transaction status' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryTransactionsDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Page number', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], QueryTransactionsDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Page size limit', default: 20 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], QueryTransactionsDto.prototype, "limit", void 0);
//# sourceMappingURL=finance.dto.js.map