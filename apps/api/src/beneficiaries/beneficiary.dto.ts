import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IdentityType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
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
    /^(DRAFT|UNDER_REVIEW|QUALIFIED|NOT_QUALIFIED)$/,
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

export class CheckDuplicateNationalIdQueryDto {
  @ApiProperty({ description: 'เลขประจำตัวประชาชน 13 หลัก' })
  @IsString()
  @MaxLength(30)
  nationalId!: string;

  @ApiPropertyOptional({ description: 'UUID สมาชิกที่ต้องการยกเว้นกรณีแก้ไขข้อมูลตนเอง' })
  @IsOptional()
  @IsUUID('4')
  excludeId?: string;
}

export class DashboardMetricsQueryDto {
  @ApiPropertyOptional({ description: 'กรองตามรอบการประเมิน เช่น ประจำปี 2569' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  period?: string;
}

export class UpdateMemberStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'ARCHIVED'] })
  @IsString()
  @IsIn(['ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'ARCHIVED'], {
    message: 'สถานะสมาชิกไม่ถูกต้อง',
  })
  memberStatus!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
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

export class RegistryFieldChangeDto {
  @ApiProperty()
  @IsString()
  @MaxLength(80)
  field!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  fieldLabel!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  oldValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  newValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  material?: boolean;
}

export class RecordRevisionDto {
  @ApiProperty()
  @IsString()
  expectedUpdatedAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  ipAddress?: string;

  @ApiProperty({ type: [RegistryFieldChangeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegistryFieldChangeDto)
  changes!: RegistryFieldChangeDto[];
}
