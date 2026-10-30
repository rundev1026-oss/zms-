import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReconcileBankAccountDto {
  @ApiProperty({ description: 'ยอดเงินคงเหลือตามใบแจ้งยอดธนาคาร (Bank Statement Ending Balance)' })
  @Type(() => Number)
  @IsNumber({}, { message: 'ยอดเงินคงเหลือตามใบแจ้งยอดต้องเป็นตัวเลข' })
  statementBalance!: number;

  @ApiPropertyOptional({ description: 'วันที่กระทบยอด (วว/ดด/ปปปป หรือ ISO)', default: '' })
  @IsOptional()
  @IsString()
  reconciliationDate?: string;

  @ApiPropertyOptional({ description: 'หมายเหตุการกระทบยอด หรือสาเหตุข้อแตกต่าง (Discrepancy reason)' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'ลิงก์ไฟล์เอกสารแนบใบแจ้งยอดธนาคาร (Statement Proof URL)' })
  @IsOptional()
  @IsString()
  proofUrl?: string;
}

export class QueryReconciliationsDto {
  @ApiPropertyOptional({ description: 'กรองตามรหัสบัญชีธนาคาร (Bank Account UUID or Legacy ID)' })
  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @ApiPropertyOptional({ description: 'สถานะ (balanced หรือ discrepancy)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'หน้าที่ (Page)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'จำนวนรายการต่อหน้า (Limit)', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;
}
