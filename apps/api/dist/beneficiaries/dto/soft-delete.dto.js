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
exports.QueryDeletedBeneficiariesDto = exports.RestoreBeneficiaryDto = exports.SoftDeleteBeneficiaryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class SoftDeleteBeneficiaryDto {
    reason;
    reference;
    passwordConfirm;
}
exports.SoftDeleteBeneficiaryDto = SoftDeleteBeneficiaryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'เหตุผลในการลบ/จำหน่ายทะเบียน', example: 'ย้ายถิ่นฐานออกนอกพื้นที่ดูแล' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุเหตุผลในการลบ' }),
    (0, class_validator_1.MinLength)(5, { message: 'เหตุผลต้องมีความยาวอย่างน้อย 5 ตัวอักษร' }),
    __metadata("design:type", String)
], SoftDeleteBeneficiaryDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'เลขที่เอกสารอ้างอิงหรือคำสั่ง', example: 'คำสั่งที่ 12/2569' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SoftDeleteBeneficiaryDto.prototype, "reference", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'รหัสผ่าน Super Admin เพื่อยืนยันความปลอดภัย' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SoftDeleteBeneficiaryDto.prototype, "passwordConfirm", void 0);
class RestoreBeneficiaryDto {
    reason;
    reference;
}
exports.RestoreBeneficiaryDto = RestoreBeneficiaryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'เหตุผลในการกู้คืนทะเบียน', example: 'ตรวจสอบพบเอกสารหลักฐานเพิ่มเติม' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุเหตุผลในการกู้คืน' }),
    (0, class_validator_1.MinLength)(5, { message: 'เหตุผลต้องมีความยาวอย่างน้อย 5 ตัวอักษร' }),
    __metadata("design:type", String)
], RestoreBeneficiaryDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'เลขที่เอกสารอ้างอิงหรือคำสั่ง', example: 'คำสั่งที่ 13/2569' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RestoreBeneficiaryDto.prototype, "reference", void 0);
class QueryDeletedBeneficiariesDto {
    page;
    pageSize;
    q;
    dateFrom;
    dateTo;
}
exports.QueryDeletedBeneficiariesDto = QueryDeletedBeneficiariesDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 1 }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], QueryDeletedBeneficiariesDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 20 }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], QueryDeletedBeneficiariesDto.prototype, "pageSize", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'คำค้นหา (เลขทะเบียน, ชื่อ, นามสกุล, เลขประจำตัว)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryDeletedBeneficiariesDto.prototype, "q", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'วันที่ลบเริ่มต้น (YYYY-MM-DD)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryDeletedBeneficiariesDto.prototype, "dateFrom", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'วันที่ลบสิ้นสุด (YYYY-MM-DD)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryDeletedBeneficiariesDto.prototype, "dateTo", void 0);
//# sourceMappingURL=soft-delete.dto.js.map