import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BeneficiariesModule } from '../beneficiaries/beneficiaries.module';
import { RegistryWorkflowController } from './registry-workflow.controller';
import { RegistryWorkflowService } from './registry-workflow.service';

@Module({
  imports: [BeneficiariesModule, AuditModule],
  controllers: [RegistryWorkflowController],
  providers: [RegistryWorkflowService],
})
export class RegistryWorkflowModule {}
