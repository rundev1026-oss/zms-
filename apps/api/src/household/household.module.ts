import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BeneficiariesModule } from '../beneficiaries/beneficiaries.module';
import { HouseholdController } from './household.controller';
import { HouseholdService } from './household.service';

@Module({
  imports: [BeneficiariesModule, AuditModule],
  controllers: [HouseholdController],
  providers: [HouseholdService],
})
export class HouseholdModule {}
