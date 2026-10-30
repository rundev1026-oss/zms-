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
exports.FinanceController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const permissions_decorator_1 = require("../common/permissions.decorator");
const roles_decorator_1 = require("../common/roles.decorator");
const current_user_decorator_1 = require("../common/current-user.decorator");
const finance_service_1 = require("./finance.service");
const finance_dto_1 = require("./dto/finance.dto");
let FinanceController = class FinanceController {
    financeService;
    constructor(financeService) {
        this.financeService = financeService;
    }
    disburse(dto, user) {
        return this.financeService.disburse(dto, user);
    }
    listTransactions(query) {
        return this.financeService.listTransactions(query);
    }
    getTransactionById(id) {
        return this.financeService.getTransactionById(id);
    }
    getFunds() {
        return this.financeService.getFunds();
    }
    getBankAccounts() {
        return this.financeService.getBankAccounts();
    }
    getBudgetSummary() {
        return this.financeService.getBudgetSummary();
    }
};
exports.FinanceController = FinanceController;
__decorate([
    (0, common_1.Post)('disburse'),
    (0, roles_decorator_1.Roles)('FINANCE_OFFICER', 'TREASURER', 'SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'เบิกจ่ายเงินสงเคราะห์ผู้รับซะกาตตามคำร้องที่ได้รับอนุมัติ' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [finance_dto_1.DisburseAssistanceDto, Object]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "disburse", null);
__decorate([
    (0, common_1.Get)('transactions'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'เรียกดูรายการธุรกรรมการเงินและสมุดบัญชีแยกประเภท' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [finance_dto_1.QueryTransactionsDto]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "listTransactions", null);
__decorate([
    (0, common_1.Get)('transactions/:id'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'ดูรายละเอียดธุรกรรมการเงินตามรหัส' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "getTransactionById", null);
__decorate([
    (0, common_1.Get)('funds'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'รายการบัญชีกองทุนและยอดคงเหลือจัดสรรได้' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "getFunds", null);
__decorate([
    (0, common_1.Get)('bank-accounts'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'รายการบัญชีธนาคารมูลนิธิและยอดคงเหลือ' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "getBankAccounts", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'สรุปภาพรวมงบประมาณการเงิน 3 ระดับ' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "getBudgetSummary", null);
exports.FinanceController = FinanceController = __decorate([
    (0, swagger_1.ApiTags)('finance'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('finance'),
    __metadata("design:paramtypes", [finance_service_1.FinanceService])
], FinanceController);
//# sourceMappingURL=finance.controller.js.map