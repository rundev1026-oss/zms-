import { Module } from '@nestjs/common';
import { ZakatCalculatorController } from './zakat-calculator.controller';
import { ZakatCalculatorService } from './zakat-calculator.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ZakatCalculatorController],
  providers: [ZakatCalculatorService],
  exports: [ZakatCalculatorService],
})
export class ZakatCalculatorModule {}

