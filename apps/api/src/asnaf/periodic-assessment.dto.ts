import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  ASSESSMENT_TYPES,
  ASSESSMENT_WORKFLOW_STATUSES,
  ELIGIBILITY_RESULTS,
} from './assessment-snapshot';

export class CreatePeriodicAssessmentDto {
  @ApiPropertyOptional({ description: 'AsnafCategory UUID (optional if asnafCode is provided)' })
  @IsOptional()
  @IsUUID('4', { message: 'รหัสหมวดอัสนัฟไม่ถูกต้อง' })
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Asnaf category code, e.g. faqir, miskin, gharimin' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  asnafCode?: string;

  @ApiPropertyOptional({ enum: ASSESSMENT_TYPES, default: 'PERIODIC' })
  @IsOptional()
  @IsString()
  @IsIn(ASSESSMENT_TYPES as unknown as string[], { message: 'ประเภทการประเมินไม่ถูกต้อง' })
  assessmentType?: string;

  @ApiPropertyOptional({ description: 'รอบการประเมิน เช่น ประจำปี 2569 รอบที่ 2' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  assessmentPeriod?: string;

  @ApiPropertyOptional({ description: 'วันที่ประเมิน YYYY-MM-DD หรือ ISO' })
  @IsOptional()
  @IsString()
  assessmentDate?: string;

  @ApiPropertyOptional({ description: 'รายละเอียดการตรวจสอบข้อมูลที่เปลี่ยนแปลงและการลงพื้นที่' })
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  assessmentDetails?: string;

  @ApiProperty({ description: 'เหตุผลประกอบการพิจารณาสิทธิ์' })
  @IsString()
  @MinLength(1, { message: 'กรุณาระบุเหตุผลประกอบการประเมินสิทธิ์' })
  @MaxLength(4000, { message: 'เหตุผลยาวเกินไป' })
  rationale!: string;

  @ApiPropertyOptional({ description: 'ข้อเสนอแนะสำหรับความช่วยเหลือหรือการติดตามผล' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  recommendations?: string;

  @ApiPropertyOptional({ description: 'ข้อมูลประกอบเพิ่มเติม' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  supportingInfo?: string;

  @ApiPropertyOptional({ enum: ELIGIBILITY_RESULTS })
  @IsOptional()
  @IsString()
  @IsIn(ELIGIBILITY_RESULTS as unknown as string[], { message: 'ผลการประเมินสิทธิ์ไม่ถูกต้อง' })
  eligibilityResult?: string;

  @ApiPropertyOptional({ enum: ASSESSMENT_WORKFLOW_STATUSES, default: 'UNDER_REVIEW' })
  @IsOptional()
  @IsString()
  @IsIn(ASSESSMENT_WORKFLOW_STATUSES as unknown as string[], { message: 'สถานะการประเมินไม่ถูกต้อง' })
  status?: string;

  @ApiPropertyOptional({ description: 'วันนัดประเมินสิทธิ์รอบถัดไป YYYY-MM-DD' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'รูปแบบวันนัดประเมินรอบถัดไปต้องเป็น YYYY-MM-DD' })
  nextAssessmentDate?: string;

  @ApiPropertyOptional({ description: 'รายการตรวจสอบคุณสมบัติ (Checklist JSON)' })
  @IsOptional()
  @IsObject()
  checklist?: Record<string, unknown>;
}

export class UpdatePeriodicAssessmentStatusDto {
  @ApiProperty({ enum: ASSESSMENT_WORKFLOW_STATUSES })
  @IsString()
  @IsIn(ASSESSMENT_WORKFLOW_STATUSES as unknown as string[], { message: 'สถานะการประเมินไม่ถูกต้อง' })
  status!: string;

  @ApiPropertyOptional({ enum: ELIGIBILITY_RESULTS })
  @IsOptional()
  @IsString()
  @IsIn(ELIGIBILITY_RESULTS as unknown as string[], { message: 'ผลการประเมินสิทธิ์ไม่ถูกต้อง' })
  eligibilityResult?: string;

  @ApiPropertyOptional({ description: 'หมายเหตุผู้อนุมัติ/ผู้ทบทวน' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  reviewerNote?: string;

  @ApiPropertyOptional({ description: 'ข้อเสนอแนะเพิ่มเติม' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  recommendations?: string;

  @ApiPropertyOptional({ description: 'วันนัดประเมินสิทธิ์รอบถัดไป YYYY-MM-DD' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'รูปแบบวันนัดประเมินรอบถัดไปต้องเป็น YYYY-MM-DD' })
  nextAssessmentDate?: string;
}

