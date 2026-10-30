"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const addresses_module_1 = require("./addresses/addresses.module");
const asnaf_module_1 = require("./asnaf/asnaf.module");
const assessment_module_1 = require("./assessment/assessment.module");
const assistance_requests_module_1 = require("./assistance-requests/assistance-requests.module");
const approvals_module_1 = require("./approvals/approvals.module");
const assistance_module_1 = require("./assistance/assistance.module");
const finance_module_1 = require("./finance/finance.module");
const zakat_calculator_module_1 = require("./zakat-calculator/zakat-calculator.module");
const bank_accounts_module_1 = require("./bank-accounts/bank-accounts.module");
const settings_module_1 = require("./settings/settings.module");
const backup_module_1 = require("./backup/backup.module");
const audit_module_1 = require("./audit/audit.module");
const auth_module_1 = require("./auth/auth.module");
const beneficiaries_module_1 = require("./beneficiaries/beneficiaries.module");
const api_exception_filter_1 = require("./common/api-exception.filter");
const documents_module_1 = require("./documents/documents.module");
const health_module_1 = require("./health/health.module");
const household_module_1 = require("./household/household.module");
const income_module_1 = require("./income/income.module");
const prisma_module_1 = require("./prisma/prisma.module");
const registry_workflow_module_1 = require("./registry-workflow/registry-workflow.module");
const reports_module_1 = require("./reports/reports.module");
const roles_module_1 = require("./roles/roles.module");
const users_module_1 = require("./users/users.module");
const permissions_module_1 = require("./permissions/permissions.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env', '../../.env'],
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    name: 'short',
                    ttl: 1000,
                    limit: 100,
                },
                {
                    name: 'medium',
                    ttl: 10000,
                    limit: 500,
                },
                {
                    name: 'long',
                    ttl: 60000,
                    limit: 2000,
                },
            ]),
            prisma_module_1.PrismaModule,
            health_module_1.HealthModule,
            audit_module_1.AuditModule,
            users_module_1.UsersModule,
            roles_module_1.RolesModule,
            permissions_module_1.PermissionsModule,
            auth_module_1.AuthModule,
            beneficiaries_module_1.BeneficiariesModule,
            registry_workflow_module_1.RegistryWorkflowModule,
            household_module_1.HouseholdModule,
            addresses_module_1.AddressesModule,
            asnaf_module_1.AsnafModule,
            income_module_1.IncomeModule,
            documents_module_1.DocumentsModule,
            reports_module_1.ReportsModule,
            assistance_requests_module_1.AssistanceRequestsModule,
            assessment_module_1.AssessmentModule,
            approvals_module_1.ApprovalsModule,
            finance_module_1.FinanceModule,
            assistance_module_1.AssistanceModule,
            zakat_calculator_module_1.ZakatCalculatorModule,
            bank_accounts_module_1.BankAccountsModule,
            settings_module_1.SettingsModule,
            backup_module_1.BackupModule,
        ],
        providers: [
            { provide: core_1.APP_FILTER, useClass: api_exception_filter_1.ApiExceptionFilter },
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map