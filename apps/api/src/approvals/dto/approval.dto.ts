import { IsNotEmpty, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveApplicationDto {
  @ApiProperty({ description: 'Approved assistance amount in THB', minimum: 1 })
  @IsNotEmpty({ message: 'กรุณาระบุวงเงินที่อนุมัติ' })
  @Type(() => Number)
  @IsNumber({}, { message: 'วงเงินที่อนุมัติจำต้องเป็นตัวเลข' })
  @Min(1, { message: 'วงเงินที่อนุมัติต้องมากกว่า 0 บาท' })
  approvedAmount!: number;

  @ApiProperty({ description: 'Primary Fund Account ID (Level 1)' })
  @IsNotEmpty({ message: 'กรุณาระบุบัญชีกองทุนหลัก (Fund Account)' })
  @IsString()
  fundId!: string;

  @ApiPropertyOptional({ description: 'Specific Sub-Fund ID (Level 2)' })
  @IsOptional()
  @IsString()
  specificFundId?: string;

  @ApiPropertyOptional({ description: 'Approval notes / decision remarks' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectApplicationDto {
  @ApiProperty({ description: 'Reason for rejecting application' })
  @IsNotEmpty({ message: 'กรุณาระบุเหตุผลการไม่อนุมัติคำร้อง' })
  @IsString()
  reason!: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReturnApplicationDto {
  @ApiProperty({ description: 'Notes on what needs correction or additional info' })
  @IsNotEmpty({ message: 'กรุณาระบุข้อมูลที่ต้องแก้ไขหรือเพิ่มเติม' })
  @IsString()
  notes!: string;

  @ApiPropertyOptional({ description: 'Target return status', default: 'need_info' })
  @IsOptional()
  @IsString()
  targetStatus?: string = 'need_info';
}

export class QueryPendingApprovalsDto {
  @ApiPropertyOptional({ description: 'Search query (application number, name, national ID)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by Asnaf Category' })
  @IsOptional()
  @IsString()
  asnafCategory?: string;

  @ApiPropertyOptional({ description: 'Filter by Urgency Level' })
  @IsOptional()
  @IsString()
  urgencyLevel?: string;

  @ApiPropertyOptional({ description: 'Filter by Branch ID' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Page limit', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;
}

