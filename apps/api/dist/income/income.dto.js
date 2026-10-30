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
exports.UpsertIncomeProfileDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class UpsertIncomeProfileDto {
    personalIncome;
    regularExpense;
    debtBurden;
    housingCondition;
    livingConstraints;
    assistanceNeeds;
    otherAgencyAssistance;
    priorAssistanceHistory;
    officerNote;
}
exports.UpsertIncomeProfileDto = UpsertIncomeProfileDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^\d+(\.\d{1,2})?$/, { message: 'จำนวนเงินไม่ถูกต้อง' }),
    __metadata("design:type", String)
], UpsertIncomeProfileDto.prototype, "personalIncome", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^\d+(\.\d{1,2})?$/, { message: 'จำนวนเงินไม่ถูกต้อง' }),
    __metadata("design:type", String)
], UpsertIncomeProfileDto.prototype, "regularExpense", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^\d+(\.\d{1,2})?$/, { message: 'จำนวนเงินไม่ถูกต้อง' }),
    __metadata("design:type", String)
], UpsertIncomeProfileDto.prototype, "debtBurden", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000, { message: 'สภาพที่อยู่ยาวเกินไป' }),
    __metadata("design:type", String)
], UpsertIncomeProfileDto.prototype, "housingCondition", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000, { message: 'ข้อจำกัดในการดำรงชีวิตยาวเกินไป' }),
    __metadata("design:type", String)
], UpsertIncomeProfileDto.prototype, "livingConstraints", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000, { message: 'ความต้องการความช่วยเหลือยาวเกินไป' }),
    __metadata("design:type", String)
], UpsertIncomeProfileDto.prototype, "assistanceNeeds", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], UpsertIncomeProfileDto.prototype, "otherAgencyAssistance", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], UpsertIncomeProfileDto.prototype, "priorAssistanceHistory", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], UpsertIncomeProfileDto.prototype, "officerNote", void 0);
//# sourceMappingURL=income.dto.js.map