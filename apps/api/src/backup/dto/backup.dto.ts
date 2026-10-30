import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBackupDto {
  @ApiPropertyOptional({ description: 'ประเภทการสำรองข้อมูล (snapshot หรือ full)', default: 'snapshot' })
  @IsOptional()
  @IsIn(['snapshot', 'full'])
  backupType?: 'snapshot' | 'full' = 'snapshot';

  @ApiPropertyOptional({ description: 'หมายเหตุการสำรองข้อมูล' })
  @IsOptional()
  @IsString()
  notes?: string;
}
