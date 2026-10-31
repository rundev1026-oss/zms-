import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class SoftDeleteBeneficiaryDto {
  @ApiProperty({ description: 'เหตุผลในการลบ/จำหน่ายทะเบียน', example: 'ย้ายถิ่นฐานออกนอกพื้นที่ดูแล' })
  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุเหตุผลในการลบ' })
  @MinLength(5, { message: 'เหตุผลต้องมีความยาวอย่างน้อย 5 ตัวอักษร' })
  reason!: string;

  @ApiPropertyOptional({ description: 'เลขที่เอกสารอ้างอิงหรือคำสั่ง', example: 'คำสั่งที่ 12/2569' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ description: 'รหัสผ่าน Super Admin เพื่อยืนยันความปลอดภัย' })
  @IsOptional()
  @IsString()
  passwordConfirm?: string;
}

export class RestoreBeneficiaryDto {
  @ApiProperty({ description: 'เหตุผลในการกู้คืนทะเบียน', example: 'ตรวจสอบพบเอกสารหลักฐานเพิ่มเติม' })
  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุเหตุผลในการกู้คืน' })
  @MinLength(5, { message: 'เหตุผลต้องมีความยาวอย่างน้อย 5 ตัวอักษร' })
  reason!: string;

  @ApiPropertyOptional({ description: 'เลขที่เอกสารอ้างอิงหรือคำสั่ง', example: 'คำสั่งที่ 13/2569' })
  @IsOptional()
  @IsString()
  reference?: string;
}

export class QueryDeletedBeneficiariesDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({ description: 'คำค้นหา (เลขทะเบียน, ชื่อ, นามสกุล, เลขประจำตัว)' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'วันที่ลบเริ่มต้น (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'วันที่ลบสิ้นสุด (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  dateTo?: string;
}

