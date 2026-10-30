import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BeneficiariesModule } from '../beneficiaries/beneficiaries.module';
import { AsnafProposalController } from './asnaf-proposal.controller';
import { AsnafController } from './asnaf.controller';
import { AsnafService } from './asnaf.service';

@Module({
  imports: [BeneficiariesModule, AuditModule],
  controllers: [AsnafController, AsnafProposalController],
  providers: [AsnafService],
  exports: [AsnafService],
})
export class AsnafModule {}
