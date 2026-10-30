import { IsNotEmpty, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAssistanceRequestDto {
  @ApiProperty({ description: 'Beneficiary UUID, National ID, or Registry Number' })
  @IsNotEmpty({ message: 'กรุณาระบุผู้ขอรับความช่วยเหลือ' })
  @IsString()
  beneficiaryId!: string;

  @ApiProperty({ description: 'Asnaf Category code (e.g. faqir, miskin, gharimin)' })
  @IsNotEmpty({ message: 'กรุณาระบุหมวดอัสนัฟ' })
  @IsString()
  asnafCategory!: string;

  @ApiProperty({ description: 'Requested Amount in THB' })
  @IsNotEmpty({ message: 'กรุณาระบุจำนวนเงินที่ขอความช่วยเหลือ' })
  @Type(() => Number)
  @IsNumber({}, { message: 'จำนวนเงินต้องเป็นตัวเลข' })
  @Min(1, { message: 'จำนวนเงินต้องมากกว่า 0 บาท' })
  requestedAmount!: number;

  @ApiPropertyOptional({ description: 'Urgency Level (normal, high, urgent)' })
  @IsOptional()
  @IsString()
  urgencyLevel?: string;

  @ApiPropertyOptional({ description: 'Assistance Type ID or code' })
  @IsOptional()
  @IsString()
  assistanceTypeId?: string;

  @ApiPropertyOptional({ description: 'Assistance Group (e.g. core, development)' })
  @IsOptional()
  @IsString()
  assistanceGroup?: string;

  @ApiPropertyOptional({ description: 'Hardship reasons / details' })
  @IsOptional()
  @IsString()
  hardshipReasons?: string;

  @ApiPropertyOptional({ description: 'Necessity details' })
  @IsOptional()
  @IsString()
  necessityDetails?: string;

  @ApiPropertyOptional({ description: 'Specific Sub Fund ID' })
  @IsOptional()
  @IsString()
  specificFundId?: string;

  @ApiPropertyOptional({ description: 'Specific Sub Fund Code' })
  @IsOptional()
  @IsString()
  specificFundCode?: string;

  @ApiPropertyOptional({ description: 'Specific Sub Fund Name' })
  @IsOptional()
  @IsString()
  specificFundName?: string;

  @ApiPropertyOptional({ description: 'Branch ID' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Branch Name' })
  @IsOptional()
  @IsString()
  branchName?: string;
}

export class QueryAssistanceRequestsDto {
  @ApiPropertyOptional({ description: 'Search by application number, applicant name, or national ID' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by application status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by Asnaf category' })
  @IsOptional()
  @IsString()
  asnafCategory?: string;

  @ApiPropertyOptional({ description: 'Filter by Branch ID' })
  @IsOptional()
  @IsString()
  branchId?: string;

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

export class UpdateRequestStatusDto {
  @ApiProperty({ description: 'Target status' })
  @IsNotEmpty({ message: 'กรุณาระบุสถานะ' })
  @IsString()
  status!: string;

  @ApiPropertyOptional({ description: 'Notes or reason for status change' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CheckBeneficiaryDto {
  @ApiPropertyOptional({ description: '13-digit Thai National ID' })
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiPropertyOptional({ description: 'Beneficiary Registry Number (REG-... or ZMS-...)' })
  @IsOptional()
  @IsString()
  registrationNo?: string;

  @ApiPropertyOptional({ description: 'Beneficiary UUID' })
  @IsOptional()
  @IsString()
  beneficiaryId?: string;
}

export class AddApplicationDocumentDto {
  @ApiProperty({ description: 'Document name or title' })
  @IsNotEmpty({ message: 'กรุณาระบุชื่อเอกสาร' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Document category (e.g. id_card, house_reg, medical, income)' })
  @IsNotEmpty({ message: 'กรุณาระบุหมวดหมู่เอกสาร' })
  @IsString()
  category!: string;

  @ApiProperty({ description: 'Document URL or path' })
  @IsNotEmpty({ message: 'กรุณาระบุ URL หรือที่เก็บเอกสาร' })
  @IsString()
  fileUrl!: string;

  @ApiPropertyOptional({ description: 'MIME Type (e.g. application/pdf, image/jpeg)' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fileSize?: number;

  @ApiPropertyOptional({ description: 'Confidentiality flag', default: true })
  @IsOptional()
  isConfidential?: boolean;
}
