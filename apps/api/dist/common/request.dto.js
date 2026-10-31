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
exports.ResetPasswordDto = exports.ForgotPasswordDto = exports.Verify2faDto = exports.Disable2faDto = exports.Enable2faDto = exports.UploadDocumentDto = exports.LoginDto = exports.PageQueryDto = exports.ReviewDocumentDto = exports.ReplaceAddressesDto = exports.AddressItemDto = exports.UpsertHouseholdDto = exports.HouseholdMemberDto = exports.AssessmentDto = exports.ReasonDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class ReasonDto {
    reason;
}
exports.ReasonDto = ReasonDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'กรุณาระบุเหตุผล' }),
    (0, class_validator_1.MaxLength)(1000, { message: 'เหตุผลยาวเกินไป' }),
    __metadata("design:type", String)
], ReasonDto.prototype, "reason", void 0);
class AssessmentDto {
    categoryId;
    rationale;
    supportingInfo;
    decision;
    reviewerNote;
}
exports.AssessmentDto = AssessmentDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)('4', { message: 'รหัสหมวดอัสนัฟไม่ถูกต้อง' }),
    __metadata("design:type", String)
], AssessmentDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'กรุณาระบุเหตุผลประกอบการจัดหมวด' }),
    (0, class_validator_1.MaxLength)(4000),
    __metadata("design:type", String)
], AssessmentDto.prototype, "rationale", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(4000),
    __metadata("design:type", String)
], AssessmentDto.prototype, "supportingInfo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.AsnafDecision }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.AsnafDecision, { message: 'ผลการพิจารณาไม่ถูกต้อง' }),
    __metadata("design:type", String)
], AssessmentDto.prototype, "decision", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], AssessmentDto.prototype, "reviewerNote", void 0);
class HouseholdMemberDto {
    fullName;
    relationship;
    dateOfBirth;
    ageYears;
    occupation;
    isDependent;
    sortOrder;
}
exports.HouseholdMemberDto = HouseholdMemberDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'กรุณากรอกชื่อสมาชิก' }),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], HouseholdMemberDto.prototype, "fullName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'กรุณากรอกความสัมพันธ์' }),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], HouseholdMemberDto.prototype, "relationship", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)({}, { message: 'วันเกิดของสมาชิกไม่ถูกต้อง' }),
    __metadata("design:type", String)
], HouseholdMemberDto.prototype, "dateOfBirth", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(130),
    __metadata("design:type", Number)
], HouseholdMemberDto.prototype, "ageYears", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], HouseholdMemberDto.prototype, "occupation", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], HouseholdMemberDto.prototype, "isDependent", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], HouseholdMemberDto.prototype, "sortOrder", void 0);
class UpsertHouseholdDto {
    memberCount;
    householdIncome;
    householdExpense;
    debtAmount;
    dependentCount;
    additionalNotes;
    address;
    province;
    district;
    subdistrict;
    community;
    housingCondition;
    housingNotes;
    housingType;
    landTitleType;
    landTitleNotes;
    livingScore;
    debtPurpose;
    incomeBreakdown;
    expenseBreakdown;
    pastAssistance;
    familySituationSummary;
    urgentNeeds;
    dependentBurdens;
    coordinatorInfo;
    certifierInfo;
    latitude;
    longitude;
    residenceAddress;
    placeName;
    locationVerificationStatus;
    members;
}
exports.UpsertHouseholdDto = UpsertHouseholdDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpsertHouseholdDto.prototype, "memberCount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^\d+(\.\d{1,2})?$/, { message: 'จำนวนเงินไม่ถูกต้อง' }),
    __metadata("design:type", String)
], UpsertHouseholdDto.prototype, "householdIncome", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^\d+(\.\d{1,2})?$/, { message: 'จำนวนเงินไม่ถูกต้อง' }),
    __metadata("design:type", String)
], UpsertHouseholdDto.prototype, "householdExpense", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^\d+(\.\d{1,2})?$/, { message: 'จำนวนเงินไม่ถูกต้อง' }),
    __metadata("design:type", String)
], UpsertHouseholdDto.prototype, "debtAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpsertHouseholdDto.prototype, "dependentCount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(4000),
    __metadata("design:type", String)
], UpsertHouseholdDto.prototype, "additionalNotes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertHouseholdDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertHouseholdDto.prototype, "province", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertHouseholdDto.prototype, "district", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertHouseholdDto.prototype, "subdistrict", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertHouseholdDto.prototype, "community", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertHouseholdDto.prototype, "housingCondition", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertHouseholdDto.prototype, "housingNotes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertHouseholdDto.prototype, "housingType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertHouseholdDto.prototype, "landTitleType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertHouseholdDto.prototype, "landTitleNotes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpsertHouseholdDto.prototype, "livingScore", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertHouseholdDto.prototype, "debtPurpose", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertHouseholdDto.prototype, "incomeBreakdown", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertHouseholdDto.prototype, "expenseBreakdown", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertHouseholdDto.prototype, "pastAssistance", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertHouseholdDto.prototype, "familySituationSummary", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertHouseholdDto.prototype, "urgentNeeds", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertHouseholdDto.prototype, "dependentBurdens", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertHouseholdDto.prototype, "coordinatorInfo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertHouseholdDto.prototype, "certifierInfo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpsertHouseholdDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpsertHouseholdDto.prototype, "longitude", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertHouseholdDto.prototype, "residenceAddress", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertHouseholdDto.prototype, "placeName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertHouseholdDto.prototype, "locationVerificationStatus", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [HouseholdMemberDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => HouseholdMemberDto),
    __metadata("design:type", Array)
], UpsertHouseholdDto.prototype, "members", void 0);
class AddressItemDto {
    addressType;
    addressLine;
    community;
    subdistrict;
    district;
    province;
    postalCode;
    latitude;
    longitude;
}
exports.AddressItemDto = AddressItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.AddressType }),
    (0, class_validator_1.IsEnum)(client_1.AddressType, { message: 'ประเภทที่อยู่ไม่ถูกต้อง' }),
    __metadata("design:type", String)
], AddressItemDto.prototype, "addressType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(300),
    __metadata("design:type", String)
], AddressItemDto.prototype, "addressLine", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], AddressItemDto.prototype, "community", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], AddressItemDto.prototype, "subdistrict", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], AddressItemDto.prototype, "district", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], AddressItemDto.prototype, "province", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(10),
    __metadata("design:type", String)
], AddressItemDto.prototype, "postalCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-90),
    (0, class_validator_1.Max)(90),
    __metadata("design:type", Number)
], AddressItemDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-180),
    (0, class_validator_1.Max)(180),
    __metadata("design:type", Number)
], AddressItemDto.prototype, "longitude", void 0);
class ReplaceAddressesDto {
    addresses;
}
exports.ReplaceAddressesDto = ReplaceAddressesDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [AddressItemDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => AddressItemDto),
    __metadata("design:type", Array)
], ReplaceAddressesDto.prototype, "addresses", void 0);
class ReviewDocumentDto {
    status;
    reviewNote;
}
exports.ReviewDocumentDto = ReviewDocumentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['ACCEPTED', 'REJECTED'] }),
    (0, class_validator_1.IsIn)(['ACCEPTED', 'REJECTED'], { message: 'ผลการตรวจเอกสารไม่ถูกต้อง' }),
    __metadata("design:type", String)
], ReviewDocumentDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], ReviewDocumentDto.prototype, "reviewNote", void 0);
class PageQueryDto {
    page = 1;
    pageSize = 20;
    resourceType;
    resourceId;
}
exports.PageQueryDto = PageQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], PageQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Object)
], PageQueryDto.prototype, "pageSize", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], PageQueryDto.prototype, "resourceType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], PageQueryDto.prototype, "resourceId", void 0);
class LoginDto {
    email;
    password;
}
exports.LoginDto = LoginDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'registrar@zms.local' }),
    (0, class_validator_1.IsEmail)({}, { message: 'กรุณากรอกอีเมลให้ถูกต้อง' }),
    __metadata("design:type", String)
], LoginDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: 'กรุณากรอกรหัสผ่านอย่างน้อย 8 ตัวอักษร' }),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
class UploadDocumentDto {
    documentType;
}
exports.UploadDocumentDto = UploadDocumentDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'กรุณาระบุประเภทเอกสาร' }),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], UploadDocumentDto.prototype, "documentType", void 0);
class Enable2faDto {
    code;
    secret;
    recoveryCodes;
}
exports.Enable2faDto = Enable2faDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'รหัส 6 หลักจากแอพ Authenticator' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{6}$/, { message: 'รหัส OTP ต้องเป็นตัวเลข 6 หลัก' }),
    __metadata("design:type", String)
], Enable2faDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Secret key ที่ได้จาก /auth/2fa/setup' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(16),
    __metadata("design:type", String)
], Enable2faDto.prototype, "secret", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ชุดรหัสกู้คืน' }),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], Enable2faDto.prototype, "recoveryCodes", void 0);
class Disable2faDto {
    password;
    code;
}
exports.Disable2faDto = Disable2faDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], Disable2faDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'รหัส 6 หลัก หรือ Recovery code' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], Disable2faDto.prototype, "code", void 0);
class Verify2faDto {
    tempToken;
    code;
}
exports.Verify2faDto = Verify2faDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'โทเค็นชั่วคราวจากขั้นตอน login' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], Verify2faDto.prototype, "tempToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'รหัส 6 หลัก หรือ Recovery code' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], Verify2faDto.prototype, "code", void 0);
class ForgotPasswordDto {
    email;
}
exports.ForgotPasswordDto = ForgotPasswordDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'staff@zms.local' }),
    (0, class_validator_1.IsEmail)({}, { message: 'กรุณากรอกอีเมลให้ถูกต้อง' }),
    __metadata("design:type", String)
], ForgotPasswordDto.prototype, "email", void 0);
class ResetPasswordDto {
    token;
    newPassword;
}
exports.ResetPasswordDto = ResetPasswordDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'โทเค็นสำหรับรีเซ็ตรหัสผ่าน' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "token", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'รหัสผ่านใหม่' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' }),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "newPassword", void 0);
//# sourceMappingURL=request.dto.js.map