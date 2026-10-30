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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RolesGuard } from '../auth/roles.guard';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import {
  CloneRoleDto,
  CreateRoleDto,
  UpdateRoleDto,
  UpdateRolePermissionsDto,
} from './roles.dto';
import { RolesService } from './roles.service';

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(RolesGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'รายการบทบาทและสิทธิ์จากฐานข้อมูล' })
  list() {
    return this.roles.listCatalog();
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'ดูรายละเอียดบทบาท สิทธิ์ และรายชื่อผู้ใช้งานที่ผูกกับบทบาท' })
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.roles.getRole(id);
  }

  @Post()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'สร้างบทบาทใหม่ (Custom Role)' })
  create(
    @Body() dto: CreateRoleDto,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.roles.createRole(dto, actor.id, ip);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'แก้ไขชื่อ คำอธิบาย หรือสถานะบทบาท' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.roles.updateRole(id, dto, actor.id, ip);
  }

  @Post(':id/clone')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'คัดลอกบทบาท (Clone Role) พร้อมสิทธิ์ทั้งหมด' })
  clone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloneRoleDto,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.roles.cloneRole(id, dto, actor.id, ip);
  }

  @Put(':id/permissions')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'กำหนดสิทธิ์ให้บทบาท (Assign Permissions to Role)' })
  updatePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRolePermissionsDto,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.roles.updateRolePermissions(id, dto, actor.id, ip);
  }
}
