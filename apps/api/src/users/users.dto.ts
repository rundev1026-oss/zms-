import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  username!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ example: 'ASSISTANCE_OFFICER' })
  @IsOptional()
  @IsString()
  roleCode?: string;

  @ApiPropertyOptional({ example: 'ASSISTANCE_OFFICER' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ enum: ['OWN', 'DEPARTMENT', 'BRANCH', 'ORGANIZATION'] })
  @IsOptional()
  @IsIn(['OWN', 'DEPARTMENT', 'BRANCH', 'ORGANIZATION'])
  dataScope?: 'OWN' | 'DEPARTMENT' | 'BRANCH' | 'ORGANIZATION';

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  approvalLimit?: number | null;
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'กรุณากรอกอีเมลให้ถูกต้อง' })
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleCode?: string;
}

export class UpdateUserStatusDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'SUSPENDED', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED', 'INACTIVE'])
  status?: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class PermissionOverrideItemDto {
  @ApiProperty()
  @IsString()
  permissionCode!: string;

  @ApiProperty({ enum: ['ALLOW', 'DENY', 'INHERIT'] })
  @IsIn(['ALLOW', 'DENY', 'INHERIT'])
  effect!: 'ALLOW' | 'DENY' | 'INHERIT';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateUserPermissionsDto {
  @ApiProperty({ type: [PermissionOverrideItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionOverrideItemDto)
  overrides!: PermissionOverrideItemDto[];

  @ApiPropertyOptional({ enum: ['OWN', 'DEPARTMENT', 'BRANCH', 'ORGANIZATION'] })
  @IsOptional()
  @IsIn(['OWN', 'DEPARTMENT', 'BRANCH', 'ORGANIZATION'])
  dataScope?: 'OWN' | 'DEPARTMENT' | 'BRANCH' | 'ORGANIZATION';

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  approvalLimit?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class QueryUsersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20;
}
