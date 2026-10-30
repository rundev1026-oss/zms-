import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AssessmentModule } from '../assessment/assessment.module';
import { AssistanceRequestsService } from './assistance-requests.service';
import { AssistanceRequestsController } from './assistance-requests.controller';

@Module({
  imports: [AuditModule, AssessmentModule],
  controllers: [AssistanceRequestsController],
  providers: [AssistanceRequestsService],
  exports: [AssistanceRequestsService],
})
export class AssistanceRequestsModule {}
