import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IdentityType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { REGISTRY_STATUSES } from '@zms/shared';

export class CreateBeneficiaryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  title?: string;

  @ApiProperty({ example: 'สมมติ' })
  @IsString({ message: 'กรุณากรอกชื่อ' })
  @MinLength(1, { message: 'กรุณากรอกชื่อ' })
  @MaxLength(100, { message: 'ชื่อยาวเกินไป' })
  firstName!: string;

  @ApiProperty({ example: 'ทดสอบ' })
  @IsString({ message: 'กรุณากรอกนามสกุล' })
  @MinLength(1, { message: 'กรุณากรอกนามสกุล' })
  @MaxLength(100, { message: 'นามสกุลยาวเกินไป' })
  lastName!: string;

  @ApiProperty({ enum: IdentityType })
  @IsEnum(IdentityType, { message: 'ประเภทเลขประจำตัวไม่ถูกต้อง' })
  identityType!: IdentityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  identityNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({}, { message: 'วันเกิดไม่ถูกต้อง' })
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s]{8,20}$/, { message: 'หมายเลขโทรศัพท์ไม่ถูกต้อง' })
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  occupation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  maritalStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  registrationNote?: string;
}

export class BeneficiaryListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'หน้าต้องเริ่มที่ 1' })
  page = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100, { message: 'จำนวนต่อหน้าต้องไม่เกิน 100' })
  pageSize = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: REGISTRY_STATUSES })
  @IsOptional()
  @IsString()
  @Matches(
    /^(DRAFT|PENDING_REVIEW|NEEDS_CORRECTION|UNDER_ASSESSMENT|ELIGIBLE|INELIGIBLE|SUSPENDED|ARCHIVED)$/,
    {
      message: 'สถานะทะเบียนไม่ถูกต้อง',
    },
  )
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'รหัสหมวดอัสนัฟไม่ถูกต้อง' })
  asnafCategoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @ApiPropertyOptional({ example: 'createdAt:desc' })
  @IsOptional()
  @Matches(/^(createdAt|registryNumber|lastName|status):(asc|desc)$/, {
    message: 'การเรียงลำดับไม่ถูกต้อง',
  })
  sort?: string;
}

export class BeneficiarySummaryQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'รหัสหมวดอัสนัฟไม่ถูกต้อง' })
  asnafCategoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;
}

export class CreateConsentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'กรุณาระบุรุ่นข้อความยินยอม' })
  @MaxLength(40)
  consentTextVersion!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'กรุณาระบุรุ่นประกาศความเป็นส่วนตัว' })
  @MaxLength(40)
  privacyNoticeVersion!: string;

  @ApiProperty()
  @IsBoolean({ message: 'กรุณาระบุว่ายินยอมหรือไม่' })
  accepted!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  channel?: string;
}

export class UpdateBeneficiaryDto extends PartialType(CreateBeneficiaryDto) {}
