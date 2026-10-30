import { IsNotEmpty, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitAssessmentDto {
  @ApiProperty({ description: 'Living score (0 - 100)', minimum: 0, maximum: 100 })
  @IsNotEmpty({ message: 'กรุณาระบุคะแนนสภาพความเป็นอยู่ (0-100)' })
  @Type(() => Number)
  @IsNumber({}, { message: 'คะแนนต้องเป็นตัวเลข' })
  @Min(0, { message: 'คะแนนต้องไม่ต่ำกว่า 0' })
  @Max(100, { message: 'คะแนนต้องไม่เกิน 100' })
  livingScore!: number;

  @ApiProperty({ description: 'Housing condition assessment' })
  @IsNotEmpty({ message: 'กรุณาระบุสภาพที่อยู่อาศัย' })
  @IsString()
  housingCondition!: string;

  @ApiPropertyOptional({ description: 'Housing condition notes' })
  @IsOptional()
  @IsString()
  housingNotes?: string;

  @ApiPropertyOptional({ description: 'Debt burden summary' })
  @IsOptional()
  @IsString()
  debtBurdenSummary?: string;

  @ApiPropertyOptional({ description: 'Primary hardship identified' })
  @IsOptional()
  @IsString()
  primaryHardship?: string;

  @ApiProperty({ description: 'Officer recommendation (e.g. recommend_full, recommend_partial, reject)' })
  @IsNotEmpty({ message: 'กรุณาระบุความเห็นเจ้าหน้าที่' })
  @IsString()
  officerRecommendation!: string;

  @ApiProperty({ description: 'Recommended assistance amount in THB', minimum: 0 })
  @IsNotEmpty({ message: 'กรุณาระบุวงเงินช่วยเหลือที่เสนอ' })
  @Type(() => Number)
  @IsNumber({}, { message: 'วงเงินช่วยเหลือต้องเป็นตัวเลข' })
  @Min(0, { message: 'วงเงินช่วยเหลือต้องไม่ติดลบ' })
  recommendedAmount!: number;

  @ApiPropertyOptional({ description: 'Recommended Fund ID' })
  @IsOptional()
  @IsString()
  recommendedFundId?: string;

  @ApiPropertyOptional({ description: 'Recommended Specific Sub-fund ID' })
  @IsOptional()
  @IsString()
  recommendedSpecificFundId?: string;

  @ApiPropertyOptional({ description: 'General assessment notes' })
  @IsOptional()
  @IsString()
  generalNotes?: string;
}
