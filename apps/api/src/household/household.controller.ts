import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { RequirePermissions } from '../common/permissions.decorator';
import { UpsertHouseholdDto } from '../common/request.dto';
import { HouseholdService } from './household.service';

@ApiTags('household')
@ApiBearerAuth()
@Controller('beneficiaries/:beneficiaryId/household')
export class HouseholdController {
  constructor(private readonly household: HouseholdService) {}

  @Get()
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'ข้อมูลครัวเรือน' })
  get(@Param('beneficiaryId', ParseUUIDPipe) beneficiaryId: string, @CurrentUser() user: AuthUser) {
    return this.household.get(beneficiaryId, user);
  }

  @Put()
  @RequirePermissions('beneficiaries.write')
  @ApiOperation({ summary: 'บันทึกครัวเรือนทั้งชุด' })
  replace(
    @Param('beneficiaryId', ParseUUIDPipe) beneficiaryId: string,
    @Body() dto: UpsertHouseholdDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.household.replace(beneficiaryId, dto, user);
  }
}
