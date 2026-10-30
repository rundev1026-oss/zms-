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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZakatCalculatorController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../common/roles.decorator");
const current_user_decorator_1 = require("../common/current-user.decorator");
const zakat_calculator_service_1 = require("./zakat-calculator.service");
const zakat_calculator_dto_1 = require("./dto/zakat-calculator.dto");
let ZakatCalculatorController = class ZakatCalculatorController {
    zakatService;
    constructor(zakatService) {
        this.zakatService = zakatService;
    }
    getNisabConfig() {
        return this.zakatService.getNisabConfig();
    }
    getFormulas() {
        return this.zakatService.getFormulas();
    }
    calculateUnified(dto) {
        return this.zakatService.calculateUnified(dto);
    }
    calculateFinancial(dto) {
        return this.zakatService.calculateFinancialZakat(dto);
    }
    calculateIncome(dto) {
        return this.zakatService.calculateIncomeZakat(dto);
    }
    calculateBusiness(dto) {
        return this.zakatService.calculateBusinessZakat(dto);
    }
    calculateAgri(dto) {
        return this.zakatService.calculateAgriZakat(dto);
    }
    calculateLivestock(dto) {
        return this.zakatService.calculateLivestockZakat(dto);
    }
    updateGoldPrice(dto, user) {
        return this.zakatService.updateGoldPrice(dto, user);
    }
};
exports.ZakatCalculatorController = ZakatCalculatorController;
__decorate([
    (0, common_1.Get)('nisab-config'),
    (0, swagger_1.ApiOperation)({ summary: 'เกณฑ์นิศอบ (Nisab) และราคาทองคำ/เงินอ้างอิงปัจจุบัน' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ZakatCalculatorController.prototype, "getNisabConfig", null);
__decorate([
    (0, common_1.Get)('formulas'),
    (0, swagger_1.ApiOperation)({ summary: 'สูตรและอัตราการคำนวณซะกาต 5 หมวดที่ผ่านการรับรองทางชะรีอะฮ์' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ZakatCalculatorController.prototype, "getFormulas", null);
__decorate([
    (0, common_1.Post)('calculate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'คำนวณซะกาตตามหมวดหมู่ (Unified Calculation Endpoint)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [zakat_calculator_dto_1.UnifiedZakatCalculationDto]),
    __metadata("design:returntype", void 0)
], ZakatCalculatorController.prototype, "calculateUnified", null);
__decorate([
    (0, common_1.Post)('calculate/financial'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'คำนวณซะกาตทรัพย์สินทางการเงินและเงินออม' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [zakat_calculator_dto_1.CalculateFinancialZakatDto]),
    __metadata("design:returntype", void 0)
], ZakatCalculatorController.prototype, "calculateFinancial", null);
__decorate([
    (0, common_1.Post)('calculate/income'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'คำนวณซะกาตรายได้และเงินเดือนสะสม' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [zakat_calculator_dto_1.CalculateIncomeZakatDto]),
    __metadata("design:returntype", void 0)
], ZakatCalculatorController.prototype, "calculateIncome", null);
__decorate([
    (0, common_1.Post)('calculate/business'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'คำนวณซะกาตธุรกิจการค้าและสินค้าคงเหลือ' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [zakat_calculator_dto_1.CalculateBusinessZakatDto]),
    __metadata("design:returntype", void 0)
], ZakatCalculatorController.prototype, "calculateBusiness", null);
__decorate([
    (0, common_1.Post)('calculate/agri'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'คำนวณซะกาตผลผลิตเกษตรกรรมและพืชพันธุ์' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [zakat_calculator_dto_1.CalculateAgriZakatDto]),
    __metadata("design:returntype", void 0)
], ZakatCalculatorController.prototype, "calculateAgri", null);
__decorate([
    (0, common_1.Post)('calculate/livestock'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'คำนวณซะกาตปศุสัตว์ (วัว ควาย แพะ แกะ)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [zakat_calculator_dto_1.CalculateLivestockZakatDto]),
    __metadata("design:returntype", void 0)
], ZakatCalculatorController.prototype, "calculateLivestock", null);
__decorate([
    (0, common_1.Patch)('gold-price'),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN', 'FINANCE_OFFICER', 'TREASURER'),
    (0, swagger_1.ApiOperation)({ summary: 'อัปเดตราคาทองคำจริงและปรับเกณฑ์นิศอบอัตโนมัติ' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [zakat_calculator_dto_1.UpdateGoldPriceDto, Object]),
    __metadata("design:returntype", void 0)
], ZakatCalculatorController.prototype, "updateGoldPrice", null);
exports.ZakatCalculatorController = ZakatCalculatorController = __decorate([
    (0, swagger_1.ApiTags)('zakat'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('zakat'),
    __metadata("design:paramtypes", [zakat_calculator_service_1.ZakatCalculatorService])
], ZakatCalculatorController);
//# sourceMappingURL=zakat-calculator.controller.js.map