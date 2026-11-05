import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { RequirePermissions } from '../common/permissions.decorator';
import { AsnafService } from './asnaf.service';
import {
  CreatePeriodicAssessmentDto,
  UpdatePeriodicAssessmentStatusDto,
} from './periodic-assessment.dto';

@ApiTags('beneficiary-assessments')
@ApiBearerAuth()
@Controller('beneficiaries/:beneficiaryId/assessments')
export class BeneficiaryAssessmentsController {
  constructor(private readonly asnaf: AsnafService) {}

  @Get()
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({
    summary: 'ประวัติการประเมินสิทธิ์ทั้งหมดของสมาชิก พร้อม Snapshot ข้อมูล ณ วันประเมิน',
  })
  list(
    @Param('beneficiaryId', ParseUUIDPipe) beneficiaryId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.asnaf.listAssessments(beneficiaryId, user);
  }

  @Post()
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({
    summary: 'บันทึกผลการประเมินสิทธิ์รอบใหม่โดยไม่สร้างทะเบียนบุคคลซ้ำและไม่เปลี่ยน Member ID',
  })
  create(
    @Param('beneficiaryId', ParseUUIDPipe) beneficiaryId: string,
    @Body() dto: CreatePeriodicAssessmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.asnaf.createPeriodicAssessment(beneficiaryId, dto, user);
  }

  @Patch(':assessmentId/status')
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({
    summary: 'ปรับสถานะหรืออนุมัติผลการประเมินสิทธิ์โดยไม่แก้ไข Snapshot ย้อนหลัง',
  })
  updateStatus(
    @Param('beneficiaryId', ParseUUIDPipe) beneficiaryId: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Body() dto: UpdatePeriodicAssessmentStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.asnaf.updateAssessmentStatus(beneficiaryId, assessmentId, dto, user);
  }
}

