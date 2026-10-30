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
exports.UpdateSettingsDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class UpdateSettingsDto {
    organizationNameTh;
    organizationNameEn;
    taxId;
    address;
    phone;
    email;
    activeFiscalYear;
    currency;
    approvalLimitTier1;
    approvalLimitTier2;
    approvalLimitTier3;
}
exports.UpdateSettingsDto = UpdateSettingsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ชื่อองค์กร (ภาษาไทย)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSettingsDto.prototype, "organizationNameTh", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ชื่อองค์กร (ภาษาอังกฤษ)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSettingsDto.prototype, "organizationNameEn", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'เลขประจำตัวผู้เสียภาษี / เลขทะเบียนมูลนิธิ' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSettingsDto.prototype, "taxId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ที่อยู่สำนักงานใหญ่' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSettingsDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'เบอร์โทรศัพท์ติดต่อ' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSettingsDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'อีเมลทางการ' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSettingsDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ปีงบประมาณปัจจุบัน', default: '2569' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSettingsDto.prototype, "activeFiscalYear", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'สกุลเงินหลัก', default: 'THB' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSettingsDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'วงเงินอนุมัติขั้นที่ 1 (เจ้าหน้าที่ระดับต้น)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateSettingsDto.prototype, "approvalLimitTier1", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'วงเงินอนุมัติขั้นที่ 2 (หัวหน้าฝ่าย/คณะกรรมการย่อย)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateSettingsDto.prototype, "approvalLimitTier2", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'วงเงินอนุมัติขั้นที่ 3 (คณะกรรมการบริหาร)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateSettingsDto.prototype, "approvalLimitTier3", void 0);
//# sourceMappingURL=settings.dto.js.map