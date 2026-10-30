import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BeneficiariesModule } from '../beneficiaries/beneficiaries.module';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service';

@Module({
  imports: [BeneficiariesModule, AuditModule],
  controllers: [AddressesController],
  providers: [AddressesService],
})
export class AddressesModule {}
