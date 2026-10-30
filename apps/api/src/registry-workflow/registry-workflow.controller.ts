import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { RequirePermissions } from '../common/permissions.decorator';
import { AssessmentDto, ReasonDto } from '../common/request.dto';
import { RegistryWorkflowService } from './registry-workflow.service';

@ApiTags('registry-workflow')
@ApiBearerAuth()
@Controller('beneficiaries')
export class RegistryWorkflowController {
  constructor(private readonly workflow: RegistryWorkflowService) {}

  @Post(':id/submit')
  @RequirePermissions('beneficiaries.submit')
  @ApiOperation({ summary: 'ส่งตรวจ ตรวจความครบที่เซิร์ฟเวอร์ และกันคำขอซ้ำ' })
  submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.workflow.submit(id, user);
  }

  @Post(':id/request-correction')
  @RequirePermissions('beneficiaries.review')
  @ApiOperation({ summary: 'ขอให้แก้ไขข้อมูล' })
  requestCorrection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workflow.requestCorrection(id, dto.reason, user);
  }

  @Post(':id/assess')
  @RequirePermissions('beneficiaries.assess')
  @ApiOperation({ summary: 'บันทึกการประเมินโดยเจ้าหน้าที่ ไม่คำนวณคุณสมบัติอัตโนมัติ' })
  assess(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssessmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workflow.assess(id, dto, user);
  }

  @Post(':id/approve')
  @RequirePermissions('beneficiaries.decide')
  @ApiOperation({ summary: 'เจ้าหน้าที่ยืนยันว่ามีคุณสมบัติ' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workflow.approve(id, dto.reason, user);
  }

  @Post(':id/reject')
  @RequirePermissions('beneficiaries.decide')
  @ApiOperation({ summary: 'เจ้าหน้าที่บันทึกว่าไม่มีคุณสมบัติ' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workflow.reject(id, dto.reason, user);
  }

  @Post(':id/suspend')
  @RequirePermissions('beneficiaries.decide')
  @ApiOperation({ summary: 'ระงับทะเบียนที่มีคุณสมบัติ ไม่ใช่สถานะของคำร้อง' })
  suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workflow.suspend(id, dto.reason, user);
  }

  @Post(':id/archive')
  @RequirePermissions('beneficiaries.decide')
  @ApiOperation({ summary: 'เก็บถาวรทะเบียนที่ปิดผลแล้ว ไม่ใช่สถานะของคำร้อง' })
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workflow.archive(id, dto.reason, user);
  }

  @Get(':id/history')
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'ประวัติการเปลี่ยนสถานะทะเบียน' })
  history(@Param('id', ParseUUIDPipe) id: string) {
    return this.workflow.history(id);
  }
}
