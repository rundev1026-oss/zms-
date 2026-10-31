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
exports.RecordRevisionDto = exports.RegistryFieldChangeDto = exports.UpdateBeneficiaryDto = exports.CreateConsentDto = exports.BeneficiarySummaryQueryDto = exports.BeneficiaryListQueryDto = exports.CreateBeneficiaryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const shared_1 = require("@zms/shared");
class CreateBeneficiaryDto {
    title;
    firstName;
    lastName;
    identityType;
    identityNumber;
    dateOfBirth;
    phone;
    occupation;
    maritalStatus;
    registrationNote;
}
exports.CreateBeneficiaryDto = CreateBeneficiaryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(40),
    __metadata("design:type", String)
], CreateBeneficiaryDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'สมมติ' }),
    (0, class_validator_1.IsString)({ message: 'กรุณากรอกชื่อ' }),
    (0, class_validator_1.MinLength)(1, { message: 'กรุณากรอกชื่อ' }),
    (0, class_validator_1.MaxLength)(100, { message: 'ชื่อยาวเกินไป' }),
    __metadata("design:type", String)
], CreateBeneficiaryDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'ทดสอบ' }),
    (0, class_validator_1.IsString)({ message: 'กรุณากรอกนามสกุล' }),
    (0, class_validator_1.MinLength)(1, { message: 'กรุณากรอกนามสกุล' }),
    (0, class_validator_1.MaxLength)(100, { message: 'นามสกุลยาวเกินไป' }),
    __metadata("design:type", String)
], CreateBeneficiaryDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.IdentityType }),
    (0, class_validator_1.IsEnum)(client_1.IdentityType, { message: 'ประเภทเลขประจำตัวไม่ถูกต้อง' }),
    __metadata("design:type", String)
], CreateBeneficiaryDto.prototype, "identityType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], CreateBeneficiaryDto.prototype, "identityNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)({}, { message: 'วันเกิดไม่ถูกต้อง' }),
    __metadata("design:type", String)
], CreateBeneficiaryDto.prototype, "dateOfBirth", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[0-9+\-\s]{8,20}$/, { message: 'หมายเลขโทรศัพท์ไม่ถูกต้อง' }),
    __metadata("design:type", String)
], CreateBeneficiaryDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], CreateBeneficiaryDto.prototype, "occupation", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], CreateBeneficiaryDto.prototype, "maritalStatus", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], CreateBeneficiaryDto.prototype, "registrationNote", void 0);
class BeneficiaryListQueryDto {
    page = 1;
    pageSize = 20;
    q;
    status;
    asnafCategoryId;
    province;
    sort;
}
exports.BeneficiaryListQueryDto = BeneficiaryListQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1, { message: 'หน้าต้องเริ่มที่ 1' }),
    __metadata("design:type", Object)
], BeneficiaryListQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 20 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100, { message: 'จำนวนต่อหน้าต้องไม่เกิน 100' }),
    __metadata("design:type", Object)
], BeneficiaryListQueryDto.prototype, "pageSize", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], BeneficiaryListQueryDto.prototype, "q", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: shared_1.REGISTRY_STATUSES }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^(DRAFT|PENDING_REVIEW|NEEDS_CORRECTION|UNDER_ASSESSMENT|ELIGIBLE|INELIGIBLE|SUSPENDED|ARCHIVED)$/, {
        message: 'สถานะทะเบียนไม่ถูกต้อง',
    }),
    __metadata("design:type", String)
], BeneficiaryListQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4', { message: 'รหัสหมวดอัสนัฟไม่ถูกต้อง' }),
    __metadata("design:type", String)
], BeneficiaryListQueryDto.prototype, "asnafCategoryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], BeneficiaryListQueryDto.prototype, "province", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'createdAt:desc' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^(createdAt|registryNumber|lastName|status):(asc|desc)$/, {
        message: 'การเรียงลำดับไม่ถูกต้อง',
    }),
    __metadata("design:type", String)
], BeneficiaryListQueryDto.prototype, "sort", void 0);
class BeneficiarySummaryQueryDto {
    q;
    asnafCategoryId;
    province;
}
exports.BeneficiarySummaryQueryDto = BeneficiarySummaryQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], BeneficiarySummaryQueryDto.prototype, "q", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4', { message: 'รหัสหมวดอัสนัฟไม่ถูกต้อง' }),
    __metadata("design:type", String)
], BeneficiarySummaryQueryDto.prototype, "asnafCategoryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], BeneficiarySummaryQueryDto.prototype, "province", void 0);
class CreateConsentDto {
    consentTextVersion;
    privacyNoticeVersion;
    accepted;
    channel;
}
exports.CreateConsentDto = CreateConsentDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'กรุณาระบุรุ่นข้อความยินยอม' }),
    (0, class_validator_1.MaxLength)(40),
    __metadata("design:type", String)
], CreateConsentDto.prototype, "consentTextVersion", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'กรุณาระบุรุ่นประกาศความเป็นส่วนตัว' }),
    (0, class_validator_1.MaxLength)(40),
    __metadata("design:type", String)
], CreateConsentDto.prototype, "privacyNoticeVersion", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsBoolean)({ message: 'กรุณาระบุว่ายินยอมหรือไม่' }),
    __metadata("design:type", Boolean)
], CreateConsentDto.prototype, "accepted", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(40),
    __metadata("design:type", String)
], CreateConsentDto.prototype, "channel", void 0);
class UpdateBeneficiaryDto extends (0, swagger_1.PartialType)(CreateBeneficiaryDto) {
}
exports.UpdateBeneficiaryDto = UpdateBeneficiaryDto;
class RegistryFieldChangeDto {
    field;
    fieldLabel;
    oldValue;
    newValue;
    material;
}
exports.RegistryFieldChangeDto = RegistryFieldChangeDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], RegistryFieldChangeDto.prototype, "field", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], RegistryFieldChangeDto.prototype, "fieldLabel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], RegistryFieldChangeDto.prototype, "oldValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], RegistryFieldChangeDto.prototype, "newValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], RegistryFieldChangeDto.prototype, "material", void 0);
class RecordRevisionDto {
    expectedUpdatedAt;
    reason;
    ipAddress;
    changes;
}
exports.RecordRevisionDto = RecordRevisionDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordRevisionDto.prototype, "expectedUpdatedAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], RecordRevisionDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], RecordRevisionDto.prototype, "ipAddress", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [RegistryFieldChangeDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => RegistryFieldChangeDto),
    __metadata("design:type", Array)
], RecordRevisionDto.prototype, "changes", void 0);
//# sourceMappingURL=beneficiary.dto.js.map