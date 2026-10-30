import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ description: 'ชื่อองค์กร (ภาษาไทย)' })
  @IsOptional()
  @IsString()
  organizationNameTh?: string;

  @ApiPropertyOptional({ description: 'ชื่อองค์กร (ภาษาอังกฤษ)' })
  @IsOptional()
  @IsString()
  organizationNameEn?: string;

  @ApiPropertyOptional({ description: 'เลขประจำตัวผู้เสียภาษี / เลขทะเบียนมูลนิธิ' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ description: 'ที่อยู่สำนักงานใหญ่' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'เบอร์โทรศัพท์ติดต่อ' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'อีเมลทางการ' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'ปีงบประมาณปัจจุบัน', default: '2569' })
  @IsOptional()
  @IsString()
  activeFiscalYear?: string;

  @ApiPropertyOptional({ description: 'สกุลเงินหลัก', default: 'THB' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'วงเงินอนุมัติขั้นที่ 1 (เจ้าหน้าที่ระดับต้น)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  approvalLimitTier1?: number;

  @ApiPropertyOptional({ description: 'วงเงินอนุมัติขั้นที่ 2 (หัวหน้าฝ่าย/คณะกรรมการย่อย)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  approvalLimitTier2?: number;

  @ApiPropertyOptional({ description: 'วงเงินอนุมัติขั้นที่ 3 (คณะกรรมการบริหาร)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  approvalLimitTier3?: number;
}

