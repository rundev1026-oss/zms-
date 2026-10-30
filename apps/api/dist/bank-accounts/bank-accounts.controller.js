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
exports.BankAccountsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../common/roles.decorator");
const permissions_decorator_1 = require("../common/permissions.decorator");
const current_user_decorator_1 = require("../common/current-user.decorator");
const bank_accounts_service_1 = require("./bank-accounts.service");
const bank_account_dto_1 = require("./dto/bank-account.dto");
let BankAccountsController = class BankAccountsController {
    bankAccountsService;
    constructor(bankAccountsService) {
        this.bankAccountsService = bankAccountsService;
    }
    getBankAccounts() {
        return this.bankAccountsService.getBankAccounts();
    }
    getReconciliations(query) {
        return this.bankAccountsService.getReconciliations(query);
    }
    getBankAccountById(id) {
        return this.bankAccountsService.getBankAccountById(id);
    }
    reconcileBankAccount(id, dto, user) {
        return this.bankAccountsService.reconcileBankAccount(id, dto, user);
    }
};
exports.BankAccountsController = BankAccountsController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'รายการบัญชีธนาคารทั้งหมดของมูลนิธิ' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BankAccountsController.prototype, "getBankAccounts", null);
__decorate([
    (0, common_1.Get)('reconciliations'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'รายการประวัติการกระทบยอดธนาคารทั้งหมด (Bank Reconciliations)' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bank_account_dto_1.QueryReconciliationsDto]),
    __metadata("design:returntype", void 0)
], BankAccountsController.prototype, "getReconciliations", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'รายละเอียดบัญชีธนาคารตามรหัส' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BankAccountsController.prototype, "getBankAccountById", null);
__decorate([
    (0, common_1.Post)(':id/reconcile'),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN', 'FINANCE_OFFICER', 'TREASURER', 'AUDITOR'),
    (0, swagger_1.ApiOperation)({ summary: 'บันทึกการกระทบยอดเงินฝากธนาคารประจำงวด (Bank Reconciliation)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, bank_account_dto_1.ReconcileBankAccountDto, Object]),
    __metadata("design:returntype", void 0)
], BankAccountsController.prototype, "reconcileBankAccount", null);
exports.BankAccountsController = BankAccountsController = __decorate([
    (0, swagger_1.ApiTags)('bank-accounts'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('bank-accounts'),
    __metadata("design:paramtypes", [bank_accounts_service_1.BankAccountsService])
], BankAccountsController);
//# sourceMappingURL=bank-accounts.controller.js.map