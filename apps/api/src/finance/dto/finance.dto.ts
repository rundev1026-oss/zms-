import { IsNotEmpty, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DisburseAssistanceDto {
  @ApiProperty({ description: 'Assistance Application ID (UUID or Application No)' })
  @IsNotEmpty({ message: 'กรุณาระบุรหัสคำร้องขอความช่วยเหลือ' })
  @IsString()
  applicationId!: string;

  @ApiPropertyOptional({ description: 'Disbursement amount in THB (defaults to full approved amount)', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'จำนวนเงินเบิกจ่ายต้องเป็นตัวเลข' })
  @Min(1, { message: 'จำนวนเงินเบิกจ่ายต้องมากกว่า 0 บาท' })
  amount?: number;

  @ApiProperty({ description: 'Bank transfer reference or slip number' })
  @IsNotEmpty({ message: 'กรุณาระบุหมายเลขอ้างอิงการโอนเงิน (Payment Reference)' })
  @IsString()
  paymentRef!: string;

  @ApiPropertyOptional({ description: 'Bank Account ID used for payment' })
  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @ApiPropertyOptional({ description: 'Payment method (bank_transfer, cash, promptpay)', default: 'bank_transfer' })
  @IsOptional()
  @IsString()
  paymentMethod?: string = 'bank_transfer';

  @ApiPropertyOptional({ description: 'Proof slip image/document URL' })
  @IsOptional()
  @IsString()
  proofUrl?: string;

  @ApiPropertyOptional({ description: 'Disbursement remarks / notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Installment number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  installmentNo?: number = 1;
}

export class CreateTransactionDto {
  @ApiProperty({ description: 'Transaction type (disbursement, donation, transfer, expense)' })
  @IsNotEmpty({ message: 'กรุณาระบุประเภทธุรกรรม' })
  @IsString()
  type!: string;

  @ApiProperty({ description: 'Target Fund Account ID' })
  @IsNotEmpty({ message: 'กรุณาระบุกองทุน' })
  @IsString()
  fundId!: string;

  @ApiProperty({ description: 'Transaction amount in THB', minimum: 1 })
  @IsNotEmpty({ message: 'กรุณาระบุจำนวนเงิน' })
  @Type(() => Number)
  @IsNumber({}, { message: 'จำนวนเงินต้องเป็นตัวเลข' })
  @Min(1, { message: 'จำนวนเงินต้องมากกว่า 0 บาท' })
  amount!: number;

  @ApiProperty({ description: 'Payment method' })
  @IsNotEmpty({ message: 'กรุณาระบุช่องทางการชำระเงิน' })
  @IsString()
  paymentMethod!: string;

  @ApiProperty({ description: 'Payer or Payee name' })
  @IsNotEmpty({ message: 'กรุณาระบุชื่อผู้รับหรือผู้จ่าย' })
  @IsString()
  payerOrPayee!: string;

  @ApiProperty({ description: 'Payment reference or receipt number' })
  @IsNotEmpty({ message: 'กรุณาระบุเลขอ้างอิง' })
  @IsString()
  referenceNo!: string;

  @ApiPropertyOptional({ description: 'Transaction category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Slip or receipt URL' })
  @IsOptional()
  @IsString()
  slipUrl?: string;

  @ApiPropertyOptional({ description: 'Transaction notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Linked application ID' })
  @IsOptional()
  @IsString()
  applicationId?: string;

  @ApiPropertyOptional({ description: 'Linked beneficiary ID' })
  @IsOptional()
  @IsString()
  beneficiaryId?: string;

  @ApiPropertyOptional({ description: 'Linked specific sub-fund ID' })
  @IsOptional()
  @IsString()
  specificFundId?: string;

  @ApiPropertyOptional({ description: 'Asnaf Category' })
  @IsOptional()
  @IsString()
  asnafCategory?: string;

  @ApiPropertyOptional({ description: 'Bank Account ID' })
  @IsOptional()
  @IsString()
  bankAccountId?: string;
}

export class QueryTransactionsDto {
  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by Fund ID' })
  @IsOptional()
  @IsString()
  fundId?: string;

  @ApiPropertyOptional({ description: 'Filter by transaction type' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Filter by transaction status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Page size limit', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;
}

