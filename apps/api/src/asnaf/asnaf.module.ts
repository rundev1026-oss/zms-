import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BeneficiariesModule } from '../beneficiaries/beneficiaries.module';
import { AsnafProposalController } from './asnaf-proposal.controller';
import { AsnafController } from './asnaf.controller';
import { AsnafService } from './asnaf.service';
import { BeneficiaryAssessmentsController } from './beneficiary-assessments.controller';

@Module({
  imports: [BeneficiariesModule, AuditModule],
  controllers: [AsnafController, AsnafProposalController, BeneficiaryAssessmentsController],
  providers: [AsnafService],
  exports: [AsnafService],
})
export class AsnafModule {}
