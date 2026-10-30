import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'BRANCH_REGISTRY_OFFICER' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: 'เจ้าหน้าที่ทะเบียนสาขา' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}

export class CloneRoleDto {
  @ApiPropertyOptional({ example: 'BRANCH_APPROVER' })
  @IsOptional()
  @IsString()
  newCode?: string;

  @ApiPropertyOptional({ example: 'BRANCH_APPROVER' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 'ผู้อนุมัติระดับสาขา' })
  @IsOptional()
  @IsString()
  newName?: string;

  @ApiPropertyOptional({ example: 'ผู้อนุมัติระดับสาขา' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateRolePermissionsDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionCodes?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
