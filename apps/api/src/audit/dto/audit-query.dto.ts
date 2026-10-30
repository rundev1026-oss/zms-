import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryAuditLogsDto {
  @ApiPropertyOptional({ description: 'หน้าที่ (Page)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'จำนวนรายการต่อหน้า (Limit)', default: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 15;

  @ApiPropertyOptional({ description: 'ประเภทเหตุการณ์ (Action)' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'ประเภททรัพยากร (Resource Type)' })
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiPropertyOptional({ description: 'รหัสทรัพยากร (Resource ID)' })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({ description: 'รหัสผู้ปฏิบัติการ (Actor ID)' })
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiPropertyOptional({ description: 'ค้นหาคำใน Action หรือ Resource' })
  @IsOptional()
  @IsString()
  search?: string;
}
