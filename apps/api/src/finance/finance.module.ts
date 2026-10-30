import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}

