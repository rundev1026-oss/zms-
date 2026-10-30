import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class ExportBeneficiariesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(
    /^(DRAFT|PENDING_REVIEW|NEEDS_CORRECTION|UNDER_ASSESSMENT|ELIGIBLE|INELIGIBLE|SUSPENDED|ARCHIVED)$/,
    { message: 'สถานะทะเบียนไม่ถูกต้อง' },
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
