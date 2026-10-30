import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AssessmentService } from './assessment.service';
import { AssessmentController } from './assessment.controller';

@Module({
  imports: [AuditModule],
  controllers: [AssessmentController],
  providers: [AssessmentService],
  exports: [AssessmentService],
})
export class AssessmentModule {}
