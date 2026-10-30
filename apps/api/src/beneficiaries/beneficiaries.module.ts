import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BeneficiariesController } from './beneficiaries.controller';
import { BeneficiariesService } from './beneficiaries.service';

@Module({
  imports: [AuditModule],
  controllers: [BeneficiariesController],
  providers: [BeneficiariesService],
  exports: [BeneficiariesService],
})
export class BeneficiariesModule {}
