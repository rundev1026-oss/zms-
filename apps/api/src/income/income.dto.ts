import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpsertIncomeProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'จำนวนเงินไม่ถูกต้อง' })
  personalIncome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'จำนวนเงินไม่ถูกต้อง' })
  regularExpense?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'จำนวนเงินไม่ถูกต้อง' })
  debtBurden?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'สภาพที่อยู่ยาวเกินไป' })
  housingCondition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'ข้อจำกัดในการดำรงชีวิตยาวเกินไป' })
  livingConstraints?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'ความต้องการความช่วยเหลือยาวเกินไป' })
  assistanceNeeds?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  otherAgencyAssistance?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  priorAssistanceHistory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  officerNote?: string;
}
