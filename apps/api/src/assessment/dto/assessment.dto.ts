import { IsNotEmpty, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitAssessmentDto {
  @ApiProperty({ description: 'Living score (0 - 100)', minimum: 0, maximum: 100 })
  @IsNotEmpty({ message: 'กรุณาระบุคะแนนสภาพความเป็นอยู่' })
  @Type(() => Number)
  @IsNumber({}, { message: 'คะแนนประเมินต้องเป็นตัวเลข' })
  @Min(0, { message: 'คะแนนประเมินต้องอยู่ระหว่าง 0–100' })
  @Max(100, { message: 'คะแนนประเมินต้องอยู่ระหว่าง 0–100' })
  livingScore!: number;

  @ApiProperty({ description: 'Housing condition assessment' })
  @IsNotEmpty({ message: 'กรุณาระบุสภาพที่อยู่อาศัย' })
  @IsString({ message: 'สภาพที่อยู่อาศัยต้องเป็นข้อความ' })
  housingCondition!: string;

  @ApiPropertyOptional({ description: 'Housing condition notes' })
  @IsOptional()
  @IsString({ message: 'หมายเหตุสภาพที่อยู่อาศัยต้องเป็นข้อความ' })
  housingNotes?: string;

  @ApiPropertyOptional({ description: 'Debt burden summary' })
  @IsOptional()
  @IsString({ message: 'สรุปภาระหนี้สินต้องเป็นข้อความ' })
  debtBurdenSummary?: string;

  @ApiPropertyOptional({ description: 'Primary hardship identified' })
  @IsOptional()
  @IsString({ message: 'สภาพปัญหาหลักต้องเป็นข้อความ' })
  primaryHardship?: string;

  @ApiProperty({ description: 'Officer recommendation (e.g. recommend_full, recommend_partial, reject)' })
  @IsNotEmpty({ message: 'กรุณาระบุความเห็นและข้อเสนอแนะของเจ้าหน้าที่' })
  @IsString({ message: 'ข้อเสนอแนะของเจ้าหน้าที่ต้องเป็นข้อความ' })
  officerRecommendation!: string;

  @ApiProperty({ description: 'Recommended assistance amount in THB', minimum: 0 })
  @IsNotEmpty({ message: 'กรุณาระบุวงเงินที่เสนอพิจารณา' })
  @Type(() => Number)
  @IsNumber({}, { message: 'วงเงินที่เสนอพิจารณาต้องเป็นตัวเลข' })
  @Min(0, { message: 'วงเงินที่เสนอพิจารณาต้องไม่ติดลบ' })
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

  // Tolerated optional client-side metadata (for backwards compatibility)
  @ApiPropertyOptional({ description: 'Assessment ID (server-generated)' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ description: 'Assessed By (derived from token)' })
  @IsOptional()
  @IsString()
  assessedBy?: string;

  @ApiPropertyOptional({ description: 'Assessed Date (server-timestamped)' })
  @IsOptional()
  @IsString()
  assessedDate?: string;
}
