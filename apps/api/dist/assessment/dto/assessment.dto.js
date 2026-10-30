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
exports.SubmitAssessmentDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class SubmitAssessmentDto {
    livingScore;
    housingCondition;
    housingNotes;
    debtBurdenSummary;
    primaryHardship;
    officerRecommendation;
    recommendedAmount;
    recommendedFundId;
    recommendedSpecificFundId;
    generalNotes;
}
exports.SubmitAssessmentDto = SubmitAssessmentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Living score (0 - 100)', minimum: 0, maximum: 100 }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุคะแนนสภาพความเป็นอยู่ (0-100)' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({}, { message: 'คะแนนต้องเป็นตัวเลข' }),
    (0, class_validator_1.Min)(0, { message: 'คะแนนต้องไม่ต่ำกว่า 0' }),
    (0, class_validator_1.Max)(100, { message: 'คะแนนต้องไม่เกิน 100' }),
    __metadata("design:type", Number)
], SubmitAssessmentDto.prototype, "livingScore", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Housing condition assessment' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุสภาพที่อยู่อาศัย' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitAssessmentDto.prototype, "housingCondition", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Housing condition notes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitAssessmentDto.prototype, "housingNotes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Debt burden summary' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitAssessmentDto.prototype, "debtBurdenSummary", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Primary hardship identified' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitAssessmentDto.prototype, "primaryHardship", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Officer recommendation (e.g. recommend_full, recommend_partial, reject)' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุความเห็นเจ้าหน้าที่' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitAssessmentDto.prototype, "officerRecommendation", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Recommended assistance amount in THB', minimum: 0 }),
    (0, class_validator_1.IsNotEmpty)({ message: 'กรุณาระบุวงเงินช่วยเหลือที่เสนอ' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({}, { message: 'วงเงินช่วยเหลือต้องเป็นตัวเลข' }),
    (0, class_validator_1.Min)(0, { message: 'วงเงินช่วยเหลือต้องไม่ติดลบ' }),
    __metadata("design:type", Number)
], SubmitAssessmentDto.prototype, "recommendedAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Recommended Fund ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitAssessmentDto.prototype, "recommendedFundId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Recommended Specific Sub-fund ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitAssessmentDto.prototype, "recommendedSpecificFundId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'General assessment notes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitAssessmentDto.prototype, "generalNotes", void 0);
//# sourceMappingURL=assessment.dto.js.map