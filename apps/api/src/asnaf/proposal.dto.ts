import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class ProposeAsnafDto {
  @ApiProperty()
  @IsUUID('4', { message: 'รหัสหมวดอัสนัฟไม่ถูกต้อง' })
  categoryId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'กรุณาระบุเหตุผลประกอบการจัดหมวด' })
  @MaxLength(4000, { message: 'เหตุผลยาวเกินไป' })
  rationale!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000, { message: 'ข้อมูลประกอบยาวเกินไป' })
  supportingInfo?: string;
}
