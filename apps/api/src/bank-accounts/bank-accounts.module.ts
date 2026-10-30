import { Module } from '@nestjs/common';
import { BankAccountsController } from './bank-accounts.controller';
import { BankAccountsService } from './bank-accounts.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [BankAccountsController],
  providers: [BankAccountsService],
  exports: [BankAccountsService],
})
export class BankAccountsModule {}

