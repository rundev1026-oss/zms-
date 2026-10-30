import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AddressesModule } from './addresses/addresses.module';
import { AsnafModule } from './asnaf/asnaf.module';
import { AssessmentModule } from './assessment/assessment.module';
import { AssistanceRequestsModule } from './assistance-requests/assistance-requests.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { AssistanceModule } from './assistance/assistance.module';
import { FinanceModule } from './finance/finance.module';
import { ZakatCalculatorModule } from './zakat-calculator/zakat-calculator.module';
import { BankAccountsModule } from './bank-accounts/bank-accounts.module';
import { SettingsModule } from './settings/settings.module';
import { BackupModule } from './backup/backup.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BeneficiariesModule } from './beneficiaries/beneficiaries.module';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { DocumentsModule } from './documents/documents.module';
import { HealthModule } from './health/health.module';
import { HouseholdModule } from './household/household.module';
import { IncomeModule } from './income/income.module';
import { PrismaModule } from './prisma/prisma.module';
import { RegistryWorkflowModule } from './registry-workflow/registry-workflow.module';
import { ReportsModule } from './reports/reports.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    HealthModule,
    AuditModule,
    UsersModule,
    RolesModule,
    AuthModule,
    BeneficiariesModule,
    RegistryWorkflowModule,
    HouseholdModule,
    AddressesModule,
    AsnafModule,
    IncomeModule,
    DocumentsModule,
    ReportsModule,
    AssistanceRequestsModule,
    AssessmentModule,
    ApprovalsModule,
    FinanceModule,
    AssistanceModule,
    ZakatCalculatorModule,
    BankAccountsModule,
    SettingsModule,
    BackupModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}
