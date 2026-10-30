import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditModule } from '../audit/audit.module';
import { BeneficiariesModule } from '../beneficiaries/beneficiaries.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService, STORAGE_ROOT } from './documents.service';

@Module({
  imports: [BeneficiariesModule, AuditModule],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    {
      provide: STORAGE_ROOT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.get<string>('STORAGE_DIR') ?? 'storage',
    },
  ],
})
export class DocumentsModule {}
