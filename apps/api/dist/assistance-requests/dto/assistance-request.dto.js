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
exports.AddApplicationDocumentDto = exports.CheckBeneficiaryDto = exports.UpdateRequestStatusDto = exports.QueryAssistanceRequestsDto = exports.CreateAssistanceRequestDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class CreateAssistanceRequestDto {
    beneficiaryId;
    asnafCategory;
    requestedAmount;
    urgencyLevel;
    assistanceTypeId;
    assistanceGroup;
    hardshipReasons;
    necessityDetails;
    specificFundId;
    specificFundCode;
    specificFundName;
    branchId;
    branchName;
}
exports.CreateAssistanceRequestDto = CreateAssistanceRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Beneficiary UUID, National ID, or Registry Number' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุผู้ขอรับความช่วยเหลือ' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssistanceRequestDto.prototype, "beneficiaryId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Asnaf Category code (e.g. faqir, miskin, gharimin)' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุหมวดอัสนัฟ' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssistanceRequestDto.prototype, "asnafCategory", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Requested Amount in THB' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุจำนวนเงินที่ขอความช่วยเหลือ' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({}, { message: 'จำนวนเงินต้องเป็นตัวเลข' }),
    (0, class_validator_1.Min)(1, { message: 'จำนวนเงินต้องมากกว่า 0 บาท' }),
    __metadata("design:type", Number)
], CreateAssistanceRequestDto.prototype, "requestedAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Urgency Level (normal, high, urgent)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssistanceRequestDto.prototype, "urgencyLevel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Assistance Type ID or code' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssistanceRequestDto.prototype, "assistanceTypeId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Assistance Group (e.g. core, development)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssistanceRequestDto.prototype, "assistanceGroup", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Hardship reasons / details' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssistanceRequestDto.prototype, "hardshipReasons", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Necessity details' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssistanceRequestDto.prototype, "necessityDetails", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Specific Sub Fund ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssistanceRequestDto.prototype, "specificFundId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Specific Sub Fund Code' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssistanceRequestDto.prototype, "specificFundCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Specific Sub Fund Name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssistanceRequestDto.prototype, "specificFundName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Branch ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssistanceRequestDto.prototype, "branchId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Branch Name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssistanceRequestDto.prototype, "branchName", void 0);
class QueryAssistanceRequestsDto {
    search;
    status;
    asnafCategory;
    branchId;
    page = 1;
    limit = 20;
}
exports.QueryAssistanceRequestsDto = QueryAssistanceRequestsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Search by application number, applicant name, or national ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryAssistanceRequestsDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by application status' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryAssistanceRequestsDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by Asnaf category' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryAssistanceRequestsDto.prototype, "asnafCategory", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by Branch ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryAssistanceRequestsDto.prototype, "branchId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Page number', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], QueryAssistanceRequestsDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Page size limit', default: 20 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], QueryAssistanceRequestsDto.prototype, "limit", void 0);
class UpdateRequestStatusDto {
    status;
    notes;
}
exports.UpdateRequestStatusDto = UpdateRequestStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Target status' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุสถานะ' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateRequestStatusDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notes or reason for status change' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateRequestStatusDto.prototype, "notes", void 0);
class CheckBeneficiaryDto {
    nationalId;
    registrationNo;
    beneficiaryId;
}
exports.CheckBeneficiaryDto = CheckBeneficiaryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: '13-digit Thai National ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CheckBeneficiaryDto.prototype, "nationalId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Beneficiary Registry Number (REG-... or ZMS-...)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CheckBeneficiaryDto.prototype, "registrationNo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Beneficiary UUID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CheckBeneficiaryDto.prototype, "beneficiaryId", void 0);
class AddApplicationDocumentDto {
    name;
    category;
    fileUrl;
    mimeType;
    fileSize;
    isConfidential;
}
exports.AddApplicationDocumentDto = AddApplicationDocumentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Document name or title' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุชื่อเอกสาร' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddApplicationDocumentDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Document category (e.g. id_card, house_reg, medical, income)' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุหมวดหมู่เอกสาร' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddApplicationDocumentDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Document URL or path' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุ URL หรือที่เก็บเอกสาร' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddApplicationDocumentDto.prototype, "fileUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'MIME Type (e.g. application/pdf, image/jpeg)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddApplicationDocumentDto.prototype, "mimeType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'File size in bytes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], AddApplicationDocumentDto.prototype, "fileSize", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Confidentiality flag', default: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], AddApplicationDocumentDto.prototype, "isConfidential", void 0);
//# sourceMappingURL=assistance-request.dto.js.map