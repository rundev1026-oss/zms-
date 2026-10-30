import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BeneficiariesModule } from '../beneficiaries/beneficiaries.module';
import { IncomeController } from './income.controller';
import { IncomeService } from './income.service';

@Module({
  imports: [BeneficiariesModule, AuditModule],
  controllers: [IncomeController],
  providers: [IncomeService],
})
export class IncomeModule {}
