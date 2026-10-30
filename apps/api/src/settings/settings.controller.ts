import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/roles.decorator';
import { RequirePermissions } from '../common/permissions.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import type { AuthUser } from '../common/auth-user';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/settings.dto';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'เรียกดูข้อมูลองค์กรและพารามิเตอร์การตั้งค่าระบบ' })
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'ปรับปรุงข้อมูลองค์กรและเกณฑ์การตั้งค่าระบบ' })
  updateSettings(
    @Body() dto: UpdateSettingsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.settingsService.updateSettings(dto, user);
  }
}
