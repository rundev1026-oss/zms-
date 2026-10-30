import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AssistanceService } from './assistance.service';
import { AssistanceController } from './assistance.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [AssistanceController],
  providers: [AssistanceService],
  exports: [AssistanceService],
})
export class AssistanceModule {}

