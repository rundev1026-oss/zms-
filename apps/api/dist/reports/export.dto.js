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
exports.ExportBeneficiariesQueryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class ExportBeneficiariesQueryDto {
    q;
    status;
    asnafCategoryId;
    province;
    sort;
}
exports.ExportBeneficiariesQueryDto = ExportBeneficiariesQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], ExportBeneficiariesQueryDto.prototype, "q", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^(DRAFT|PENDING_REVIEW|NEEDS_CORRECTION|UNDER_ASSESSMENT|ELIGIBLE|INELIGIBLE|SUSPENDED|ARCHIVED)$/, { message: 'สถานะทะเบียนไม่ถูกต้อง' }),
    __metadata("design:type", String)
], ExportBeneficiariesQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4', { message: 'รหัสหมวดอัสนัฟไม่ถูกต้อง' }),
    __metadata("design:type", String)
], ExportBeneficiariesQueryDto.prototype, "asnafCategoryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], ExportBeneficiariesQueryDto.prototype, "province", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'createdAt:desc' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^(createdAt|registryNumber|lastName|status):(asc|desc)$/, {
        message: 'การเรียงลำดับไม่ถูกต้อง',
    }),
    __metadata("design:type", String)
], ExportBeneficiariesQueryDto.prototype, "sort", void 0);
//# sourceMappingURL=export.dto.js.map