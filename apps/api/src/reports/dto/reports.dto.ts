import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryReportDto {
  @ApiPropertyOptional({ description: 'ปีงบประมาณ เช่น 2569', default: '2569' })
  @IsOptional()
  @IsString()
  fiscalYear?: string = '2569';

  @ApiPropertyOptional({ description: 'วันที่เริ่มต้น (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'วันที่สิ้นสุด (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'รูปแบบการส่งออกข้อมูล (json หรือ csv)', default: 'json' })
  @IsOptional()
  @IsString()
  format?: 'json' | 'csv' = 'json';
}

