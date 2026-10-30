import {
  Controller,
  Get,
  Post,
  Body,
  Param,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/permissions.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import type { AuthUser } from '../common/auth-user';
import { AssistanceService } from './assistance.service';
import { RecordExecutionDto, ConfirmExecutionDto } from './dto/assistance.dto';

@ApiTags('assistance')
@ApiBearerAuth()
@Controller('assistance')
export class AssistanceController {
  constructor(private readonly assistanceService: AssistanceService) {}

  @Post('executions')
  @RequirePermissions('beneficiaries.write')
  @ApiOperation({ summary: 'บันทึกการส่งมอบความช่วยเหลือแก่ผู้มีสิทธิ์' })
  recordExecution(
    @Body() dto: RecordExecutionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assistanceService.recordExecution(dto, user);
  }

  @Post('executions/:id/confirm')
  @RequirePermissions('beneficiaries.write')
  @ApiOperation({ summary: 'ยืนยันการรับมอบความช่วยเหลือพร้อมหลักฐาน' })
  confirmExecution(
    @Param('id') id: string,
    @Body() dto: ConfirmExecutionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assistanceService.confirmExecution(id, dto, user);
  }

  @Get('executions/:applicationId')
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'เรียกดูประวัติการส่งมอบความช่วยเหลือตามรหัสคำร้อง' })
  getExecutionsByApplication(@Param('applicationId') applicationId: string) {
    return this.assistanceService.getExecutionsByApplication(applicationId);
  }
}

