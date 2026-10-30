import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { RequirePermissions } from '../common/permissions.decorator';
import { ReplaceAddressesDto } from '../common/request.dto';
import { AddressesService } from './addresses.service';

@ApiTags('addresses')
@ApiBearerAuth()
@Controller('beneficiaries/:beneficiaryId/addresses')
export class AddressesController {
  constructor(private readonly addresses: AddressesService) {}

  @Get()
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'ที่อยู่ตามทะเบียนบ้านและที่อยู่ปัจจุบัน' })
  list(
    @Param('beneficiaryId', ParseUUIDPipe) beneficiaryId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.addresses.list(beneficiaryId, user);
  }

  @Put()
  @RequirePermissions('beneficiaries.write')
  @ApiOperation({ summary: 'บันทึกที่อยู่' })
  replace(
    @Param('beneficiaryId', ParseUUIDPipe) beneficiaryId: string,
    @Body() dto: ReplaceAddressesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.addresses.replace(beneficiaryId, dto.addresses, user);
  }
}
