import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/permissions.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import type { AuthUser } from '../common/auth-user';
import { ApprovalsService } from './approvals.service';
import {
  ApproveApplicationDto,
  RejectApplicationDto,
  ReturnApplicationDto,
  QueryPendingApprovalsDto,
} from './dto/approval.dto';

@ApiTags('approvals')
@ApiBearerAuth()
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get('pending')
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'รายการคำร้องขอความช่วยเหลือที่รอพิจารณาอนุมัติ' })
  getPendingApprovals(
    @Query() query: QueryPendingApprovalsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.approvalsService.getPendingApprovals(query, user);
  }

  @Get('summary')
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'สถิติภาพรวมการอนุมัติคำร้องขอความช่วยเหลือ' })
  getSummary() {
    return this.approvalsService.getSummary();
  }

  @Post(':id/approve')
  @RequirePermissions('beneficiaries.decide')
  @ApiOperation({ summary: 'พิจารณาอนุมัติคำร้อง จัดสรรกองทุน และกันงบประมาณผูกพัน' })
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveApplicationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.approvalsService.approve(id, dto, user);
  }

  @Post(':id/reject')
  @RequirePermissions('beneficiaries.decide')
  @ApiOperation({ summary: 'ไม่อนุมัติคำร้องขอความช่วยเหลือพร้อมระบุเหตุผล' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectApplicationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.approvalsService.reject(id, dto, user);
  }

  @Post(':id/return')
  @RequirePermissions('beneficiaries.decide')
  @ApiOperation({ summary: 'ส่งกลับคำร้องขอความช่วยเหลือเพื่อแก้ไขหรือขอข้อมูลเพิ่มเติม' })
  returnForCorrection(
    @Param('id') id: string,
    @Body() dto: ReturnApplicationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.approvalsService.returnForCorrection(id, dto, user);
  }
}

