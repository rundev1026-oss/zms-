import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RolesGuard } from '../auth/roles.guard';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import {
  CreateUserDto,
  PermissionOverrideItemDto,
  QueryUsersDto,
  UpdateUserDto,
  UpdateUserPermissionsDto,
  UpdateUserStatusDto,
} from './users.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(RolesGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'โปรไฟล์เจ้าหน้าที่จากโทเคน' })
  me(@CurrentUser() user: AuthUser) {
    return this.users.toProfile(user);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'รายการผู้ใช้งานทั้งหมด พร้อมตัวกรองและสรุปสถิติ' })
  findAll(@Query() query: QueryUsersDto) {
    return this.users.findAllUsers(query);
  }

  @Post()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'สร้างผู้ใช้งานใหม่ (เฉพาะ Super Admin)' })
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.users.createUser(dto, actor.id, ip);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'ดูรายละเอียดผู้ใช้งานรายบุคคล' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.getUserDetail(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'แก้ไขข้อมูลผู้ใช้งานและบทบาท' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.users.updateUser(id, dto, actor.id, ip);
  }

  @Patch(':id/status')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'ระงับหรือเปิดใช้งานบัญชีผู้ใช้ (มีระบบป้องกัน Super Admin Lockout)' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.users.updateUserStatus(id, dto, actor.id, ip);
  }

  @Post(':id/reset-password')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'รีเซ็ตรหัสผ่านผู้ใช้งานโดยผู้ดูแลระบบ' })
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('newPassword') newPassword: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.users.resetUserPassword(id, actor.id, newPassword);
  }

  @Get(':id/permissions')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'เรียกดูสิทธิ์ Role, Overrides และ Effective Permissions ของผู้ใช้' })
  getUserPermissions(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.getUserPermissions(id);
  }

  @Get(':id/effective-permissions')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'คำนวณและสรุปสิทธิ์สุทธิ (Effective Permissions) ของผู้ใช้' })
  async getEffectivePermissions(@Param('id', ParseUUIDPipe) id: string) {
    const detail = await this.users.getUserDetail(id);
    return {
      userId: detail.id,
      roles: detail.roles,
      permissions: detail.effectivePermissions,
      dataScope: detail.dataScope.scope,
      approvalLimit: detail.dataScope.approvalLimit,
    };
  }

  @Put(':id/permissions')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'กำหนดสิทธิ์เฉพาะบุคคล (ALLOW/DENY/INHERIT), Data Scope และวงเงินอนุมัติ' })
  updateUserPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserPermissionsDto,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.users.updateUserPermissions(id, dto, actor.id, ip);
  }

  @Post(':id/effective-permissions/preview')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'คำนวณและพรีวิว Effective Permissions ก่อนบันทึกจริง' })
  previewEffectivePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { overrides: PermissionOverrideItemDto[]; roleCode?: string },
  ) {
    return this.users.getEffectivePermissionsPreview(id, body.overrides, body.roleCode);
  }
}
