import { IsNotEmpty, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordExecutionDto {
  @ApiProperty({ description: 'Assistance Application ID' })
  @IsNotEmpty({ message: 'กรุณาระบุรหัสคำร้อง' })
  @IsString()
  applicationId!: string;

  @ApiProperty({ description: 'Assistance Type (cash, supplies, medical, education)' })
  @IsNotEmpty({ message: 'กรุณาระบุประเภทความช่วยเหลือ' })
  @IsString()
  assistanceType!: string;

  @ApiProperty({ description: 'Actual disbursed or delivered monetary amount', minimum: 0 })
  @IsNotEmpty({ message: 'กรุณาระบุจำนวนเงินหรือมูลค่าที่ส่งมอบ' })
  @Type(() => Number)
  @IsNumber({}, { message: 'จำนวนเงินต้องเป็นตัวเลข' })
  @Min(0, { message: 'จำนวนเงินต้องไม่ติดลบ' })
  actualDisbursedAmount!: number;

  @ApiPropertyOptional({ description: 'Actual assistance valuation', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  actualAssistanceValue?: number;

  @ApiProperty({ description: 'Assistance outcome (e.g. completed, received_full, partial)' })
  @IsNotEmpty({ message: 'กรุณาระบุผลสัมฤทธิ์การให้ความช่วยเหลือ' })
  @IsString()
  assistanceOutcome!: string;

  @ApiPropertyOptional({ description: 'Execution details / handover remarks' })
  @IsOptional()
  @IsString()
  details?: string;

  @ApiPropertyOptional({ description: 'Proof photo or delivery receipt URL' })
  @IsOptional()
  @IsString()
  proofUrl?: string;

  @ApiPropertyOptional({ description: 'Installment number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  installmentNo?: number = 1;

  @ApiPropertyOptional({ description: 'Total installments', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalInstallments?: number = 1;
}

export class ConfirmExecutionDto {
  @ApiPropertyOptional({ description: 'Confirmation statement' })
  @IsOptional()
  @IsString()
  confirmationStatement?: string;

  @ApiPropertyOptional({ description: 'Proof URL' })
  @IsOptional()
  @IsString()
  proofUrl?: string;
}

