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
exports.UnifiedZakatCalculationDto = exports.UpdateGoldPriceDto = exports.CalculateLivestockZakatDto = exports.CalculateAgriZakatDto = exports.CalculateBusinessZakatDto = exports.CalculateIncomeZakatDto = exports.CalculateFinancialZakatDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class CalculateFinancialZakatDto {
    cash = 0;
    bankSavings = 0;
    goldBahtWeight = 0;
    goldGrams = 0;
    silverGrams = 0;
    sharesInvestments = 0;
    shortTermDebts = 0;
    isHawlComplete = true;
}
exports.CalculateFinancialZakatDto = CalculateFinancialZakatDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'เงินสดในมือ (Cash on hand)', default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculateFinancialZakatDto.prototype, "cash", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'เงินฝากธนาคารทุกบัญชี (Bank savings)', default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculateFinancialZakatDto.prototype, "bankSavings", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'น้ำหนักทองคำแท่ง/รูปพรรณ (หน่วย: บาททอง)', default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculateFinancialZakatDto.prototype, "goldBahtWeight", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'น้ำหนักทองคำ (หน่วย: กรัม)', default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculateFinancialZakatDto.prototype, "goldGrams", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'น้ำหนักเงินบริสุทธิ์ (หน่วย: กรัม)', default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculateFinancialZakatDto.prototype, "silverGrams", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'มูลค่าหุ้น กองทุนรวม สินทรัพย์ลงทุน (Shares & Investments)', default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculateFinancialZakatDto.prototype, "sharesInvestments", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'หนี้สินระยะสั้นที่ถึงกำหนดชำระในปีนี้ (Short-term debts)', default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculateFinancialZakatDto.prototype, "shortTermDebts", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ทรัพย์สินครอบครองครบรอบปีจันทรคติ (1 ปีฮาวล์)', default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CalculateFinancialZakatDto.prototype, "isHawlComplete", void 0);
class CalculateIncomeZakatDto {
    annualSalary;
    bonusOtherIncome = 0;
    personalDeductions = 0;
    annualDebtPayments = 0;
}
exports.CalculateIncomeZakatDto = CalculateIncomeZakatDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'เงินเดือนและค่าจ้างรวมทั้งปี (Annual salary)' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculateIncomeZakatDto.prototype, "annualSalary", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'โบนัส ค่าคอมมิชชัน และรายได้พิเศษอื่นๆ (Bonus & other income)', default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculateIncomeZakatDto.prototype, "bonusOtherIncome", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ค่าใช้จ่ายส่วนตัวและเลี้ยงดูครอบครัวตามเกณฑ์จำเป็น (Personal & family expenses)', default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculateIncomeZakatDto.prototype, "personalDeductions", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'หนี้สินจำเป็นที่ผ่อนชำระทั้งปี (Annual debt repayments)', default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculateIncomeZakatDto.prototype, "annualDebtPayments", void 0);
class CalculateBusinessZakatDto {
    currentAssets;
    inventoryValue;
    businessCash = 0;
    businessDebts = 0;
}
exports.CalculateBusinessZakatDto = CalculateBusinessZakatDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'สินทรัพย์หมุนเวียนและลูกหนี้การค้า (Current assets & receivables)' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculateBusinessZakatDto.prototype, "currentAssets", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'มูลค่าสต็อกสินค้าคงเหลือตามราคาตลาด (Inventory value)' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculateBusinessZakatDto.prototype, "inventoryValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'เงินสดและเงินฝากของกิจการ (Business cash)', default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculateBusinessZakatDto.prototype, "businessCash", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'เจ้าหนี้การค้าและหนี้สินระยะสั้นของธุรกิจ (Business liabilities)', default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculateBusinessZakatDto.prototype, "businessDebts", void 0);
class CalculateAgriZakatDto {
    cropKilos;
    cropPricePerKg;
    irrigationType;
}
exports.CalculateAgriZakatDto = CalculateAgriZakatDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ผลผลิตเกษตรกรรมที่เก็บเกี่ยวได้ (กิโลกรัม)' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculateAgriZakatDto.prototype, "cropKilos", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ราคาตลาดต่อกิโลกรัม ณ วันเก็บเกี่ยว (บาท)' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculateAgriZakatDto.prototype, "cropPricePerKg", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'รูปแบบการชลประทาน (rain: น้ำฝนธรรมชาติ 10%, irrigated: ชลประทาน/มีต้นทุน 5%)' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsIn)(['rain', 'irrigated']),
    __metadata("design:type", String)
], CalculateAgriZakatDto.prototype, "irrigationType", void 0);
class CalculateLivestockZakatDto {
    cattleCount = 0;
    goatCount = 0;
    calfPriceEstimate = 15000;
    heiferPriceEstimate = 22000;
    goatPriceEstimate = 4500;
}
exports.CalculateLivestockZakatDto = CalculateLivestockZakatDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'จำนวนวัวหรือควาย (Cattle count)', default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculateLivestockZakatDto.prototype, "cattleCount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'จำนวนแพะหรือแกะ (Goat / Sheep count)', default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculateLivestockZakatDto.prototype, "goatCount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ราคาประเมินลูกวัวอายุ 1 ปีต่อตัว (บาท)', default: 15000 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculateLivestockZakatDto.prototype, "calfPriceEstimate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ราคาประเมินวัวสาวอายุ 2 ปีต่อตัว (บาท)', default: 22000 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculateLivestockZakatDto.prototype, "heiferPriceEstimate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ราคาประเมินแพะ/แกะต่อตัว (บาท)', default: 4500 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculateLivestockZakatDto.prototype, "goatPriceEstimate", void 0);
class UpdateGoldPriceDto {
    goldPricePerBaht;
    goldPricePerGram;
    silverPricePerGram;
    sourceNotes;
}
exports.UpdateGoldPriceDto = UpdateGoldPriceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ราคาทองคำแท่งต่อบาท (15.244 กรัม) ในประเทศไทย' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1000),
    __metadata("design:type", Number)
], UpdateGoldPriceDto.prototype, "goldPricePerBaht", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ราคาทองคำบริสุทธิ์ต่อกรัม (บาท/กรัม)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(100),
    __metadata("design:type", Number)
], UpdateGoldPriceDto.prototype, "goldPricePerGram", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ราคาเงินบริสุทธิ์ต่อกรัม (บาท/กรัม)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UpdateGoldPriceDto.prototype, "silverPricePerGram", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'หมายเหตุหรือแหล่งที่มาของราคา' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateGoldPriceDto.prototype, "sourceNotes", void 0);
class UnifiedZakatCalculationDto {
    category;
    payload;
}
exports.UnifiedZakatCalculationDto = UnifiedZakatCalculationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'หมวดหมู่ซะกาต', enum: ['financial', 'income', 'business', 'agri', 'livestock'] }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsIn)(['financial', 'income', 'business', 'agri', 'livestock']),
    __metadata("design:type", String)
], UnifiedZakatCalculationDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ข้อมูลประกอบการคำนวณตามหมวดหมู่' }),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Object)
], UnifiedZakatCalculationDto.prototype, "payload", void 0);
//# sourceMappingURL=zakat-calculator.dto.js.map