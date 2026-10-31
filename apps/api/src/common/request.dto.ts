import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AddressType, AsnafDecision } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
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

export class ReasonDto {
  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'กรุณาระบุเหตุผล' })
  @MaxLength(1000, { message: 'เหตุผลยาวเกินไป' })
  reason!: string;
}

export class AssessmentDto {
  @ApiProperty()
  @IsUUID('4', { message: 'รหัสหมวดอัสนัฟไม่ถูกต้อง' })
  categoryId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'กรุณาระบุเหตุผลประกอบการจัดหมวด' })
  @MaxLength(4000)
  rationale!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  supportingInfo?: string;

  @ApiPropertyOptional({ enum: AsnafDecision })
  @IsOptional()
  @IsEnum(AsnafDecision, { message: 'ผลการพิจารณาไม่ถูกต้อง' })
  decision?: AsnafDecision;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewerNote?: string;
}

export class HouseholdMemberDto {
  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'กรุณากรอกชื่อสมาชิก' })
  @MaxLength(150)
  fullName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'กรุณากรอกความสัมพันธ์' })
  @MaxLength(80)
  relationship!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({}, { message: 'วันเกิดของสมาชิกไม่ถูกต้อง' })
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(130)
  ageYears?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  occupation?: string;

  @ApiProperty()
  @IsBoolean()
  isDependent!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'รายได้ต่อเดือนของสมาชิก' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyIncome?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  educationStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  healthStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  healthNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpsertHouseholdDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  memberCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'จำนวนเงินไม่ถูกต้อง' })
  householdIncome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'จำนวนเงินไม่ถูกต้อง' })
  householdExpense?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'จำนวนเงินไม่ถูกต้อง' })
  debtAmount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  dependentCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  additionalNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subdistrict?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  community?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  housingCondition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  housingNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  housingType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  landTitleType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  landTitleNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  livingScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  debtPurpose?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  incomeBreakdown?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expenseBreakdown?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pastAssistance?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  familySituationSummary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  urgentNeeds?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dependentBurdens?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coordinatorInfo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certifierInfo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  residenceAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  placeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationVerificationStatus?: string;

  @ApiPropertyOptional({ type: [HouseholdMemberDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HouseholdMemberDto)
  members?: HouseholdMemberDto[];
}

export class AddressItemDto {
  @ApiProperty({ enum: AddressType })
  @IsEnum(AddressType, { message: 'ประเภทที่อยู่ไม่ถูกต้อง' })
  addressType!: AddressType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  addressLine?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  community?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  subdistrict?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  province?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}

export class ReplaceAddressesDto {
  @ApiProperty({ type: [AddressItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressItemDto)
  addresses!: AddressItemDto[];
}

export class ReviewDocumentDto {
  @ApiProperty({ enum: ['ACCEPTED', 'REJECTED'] })
  @IsIn(['ACCEPTED', 'REJECTED'], { message: 'ผลการตรวจเอกสารไม่ถูกต้อง' })
  status!: 'ACCEPTED' | 'REJECTED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewNote?: string;
}

export class PageQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  resourceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  resourceId?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'registrar@zms.local' })
  @IsEmail({}, { message: 'กรุณากรอกอีเมลให้ถูกต้อง' })
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8, { message: 'กรุณากรอกรหัสผ่านอย่างน้อย 8 ตัวอักษร' })
  @MaxLength(200)
  password!: string;
}

export class UploadDocumentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'กรุณาระบุประเภทเอกสาร' })
  @MaxLength(80)
  documentType!: string;

  @ApiPropertyOptional({ description: 'รหัสเอกสารเดิมที่ถูกแทนที่' })
  @IsOptional()
  @IsUUID('4', { message: 'รหัสเอกสารเดิมไม่ถูกต้อง' })
  replacesDocumentId?: string;
}


export class Enable2faDto {
  @ApiProperty({ description: 'รหัส 6 หลักจากแอพ Authenticator' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'รหัส OTP ต้องเป็นตัวเลข 6 หลัก' })
  code!: string;

  @ApiProperty({ description: 'Secret key ที่ได้จาก /auth/2fa/setup' })
  @IsString()
  @MinLength(16)
  secret!: string;

  @ApiProperty({ description: 'ชุดรหัสกู้คืน' })
  @IsArray()
  recoveryCodes!: string[];
}

export class Disable2faDto {
  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ description: 'รหัส 6 หลัก หรือ Recovery code' })
  @IsString()
  code!: string;
}

export class Verify2faDto {
  @ApiProperty({ description: 'โทเค็นชั่วคราวจากขั้นตอน login' })
  @IsString()
  tempToken!: string;

  @ApiProperty({ description: 'รหัส 6 หลัก หรือ Recovery code' })
  @IsString()
  code!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'staff@zms.local' })
  @IsEmail({}, { message: 'กรุณากรอกอีเมลให้ถูกต้อง' })
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'โทเค็นสำหรับรีเซ็ตรหัสผ่าน' })
  @IsString()
  token!: string;

  @ApiProperty({ description: 'รหัสผ่านใหม่' })
  @IsString()
  @MinLength(8, { message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' })
  @MaxLength(200)
  newPassword!: string;
}
