import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { RequirePermissions } from '../common/permissions.decorator';
import { UpsertIncomeProfileDto } from './income.dto';
import { IncomeService } from './income.service';

@ApiTags('income')
@ApiBearerAuth()
@Controller('beneficiaries/:beneficiaryId/income-profile')
export class IncomeController {
  constructor(private readonly income: IncomeService) {}

  @Get()
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'รายได้และสภาพความเป็นอยู่ ระบบไม่ใช้ข้อมูลนี้ตัดสินคุณสมบัติ' })
  get(@Param('beneficiaryId', ParseUUIDPipe) beneficiaryId: string, @CurrentUser() user: AuthUser) {
    return this.income.get(beneficiaryId, user);
  }

  @Put()
  @RequirePermissions('beneficiaries.write')
  @ApiOperation({ summary: 'บันทึกรายได้และสภาพความเป็นอยู่' })
  replace(
    @Param('beneficiaryId', ParseUUIDPipe) beneficiaryId: string,
    @Body() dto: UpsertIncomeProfileDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.income.replace(beneficiaryId, dto, user);
  }
}
