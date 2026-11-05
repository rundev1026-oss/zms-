import { IsOptional, IsString, IsNumber, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSettingsDto {
  // A. ข้อมูลองค์กร
  @ApiPropertyOptional({ description: 'ชื่อองค์กร (ภาษาไทย)' })
  @IsOptional()
  @IsString()
  organizationNameTh?: string;

  @ApiPropertyOptional({ description: 'ชื่อองค์กร (ภาษาอังกฤษ)' })
  @IsOptional()
  @IsString()
  organizationNameEn?: string;

  @ApiPropertyOptional({ description: 'เลขประจำตัวผู้เสียภาษี / เลขทะเบียนมูลนิธิ' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ description: 'ที่อยู่สำนักงานใหญ่' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'เบอร์โทรศัพท์ติดต่อ' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'อีเมลทางการ' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'เว็บไซต์องค์กร' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ description: 'URL โลโก้องค์กร' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  // B. การตั้งค่าระบบ
  @ApiPropertyOptional({ description: 'ปีงบประมาณปัจจุบัน', default: '2569' })
  @IsOptional()
  @IsString()
  activeFiscalYear?: string;

  @ApiPropertyOptional({ description: 'สกุลเงินหลัก', default: 'THB' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'ประเภทปฏิทินที่ใช้ (buddhist / gregorian)', default: 'buddhist' })
  @IsOptional()
  @IsString()
  calendarType?: string;

  @ApiPropertyOptional({ description: 'รูปแบบการแสดงผลวันที่', default: 'DD/MM/YYYY' })
  @IsOptional()
  @IsString()
  dateFormat?: string;

  @ApiPropertyOptional({ description: 'เขตเวลา (Timezone)', default: 'Asia/Bangkok' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'จำนวนรายการต่อหน้าเริ่มต้น', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(5)
  pageSize?: number;

  // C. วงเงินอนุมัติ
  @ApiPropertyOptional({ description: 'วงเงินอนุมัติขั้นที่ 1 (เจ้าหน้าที่ระดับต้น)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  approvalLimitTier1?: number;

  @ApiPropertyOptional({ description: 'วงเงินอนุมัติขั้นที่ 2 (หัวหน้าฝ่าย/คณะกรรมการย่อย)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  approvalLimitTier2?: number;

  @ApiPropertyOptional({ description: 'วงเงินอนุมัติขั้นที่ 3 (คณะกรรมการบริหาร)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  approvalLimitTier3?: number;

  // D. การตั้งค่าเอกสาร
  @ApiPropertyOptional({ description: 'รูปแบบรหัสสมาชิกผู้มีสิทธิ์', default: 'MB-{YYYY}-{SEQ:6}' })
  @IsOptional()
  @IsString()
  memberIdPattern?: string;

  @ApiPropertyOptional({ description: 'รูปแบบรหัสคำร้องขอความช่วยเหลือ', default: 'REQ-{YYYY}-{SEQ:5}' })
  @IsOptional()
  @IsString()
  requestIdPattern?: string;

  @ApiPropertyOptional({ description: 'ข้อความหัวกระดาษเอกสารทางการ' })
  @IsOptional()
  @IsString()
  docHeader?: string;

  @ApiPropertyOptional({ description: 'ข้อความท้ายกระดาษเอกสารทางการ' })
  @IsOptional()
  @IsString()
  docFooter?: string;

  // E. การแจ้งเตือน
  @ApiPropertyOptional({ description: 'แจ้งเตือนเมื่อมีคำร้องใหม่', default: true })
  @IsOptional()
  @IsBoolean()
  notifyNewRequest?: boolean;

  @ApiPropertyOptional({ description: 'แจ้งเตือนเมื่องานรอการอนุมัติ', default: true })
  @IsOptional()
  @IsBoolean()
  notifyPendingApproval?: boolean;

  @ApiPropertyOptional({ description: 'แจ้งเตือนงานติดตามผล', default: true })
  @IsOptional()
  @IsBoolean()
  notifyFollowUp?: boolean;

  // F. นโยบายความปลอดภัย
  @ApiPropertyOptional({ description: 'ระยะเวลา Session หมดอายุ (นาที)', default: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(5)
  sessionTimeoutMinutes?: number;

  @ApiPropertyOptional({ description: 'จำนวนครั้งสูงสุดที่รหัสผ่านผิดก่อนล็อค', default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(3)
  maxFailedLogins?: number;

  @ApiPropertyOptional({ description: 'ความยาวรหัสผ่านขั้นต่ำ', default: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(6)
  passwordMinLength?: number;

  @ApiPropertyOptional({ description: 'บังคับใช้ 2FA สำหรับผู้ดูแลระบบ', default: false })
  @IsOptional()
  @IsBoolean()
  requireMfa?: boolean;
}

