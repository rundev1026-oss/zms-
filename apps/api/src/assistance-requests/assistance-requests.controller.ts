import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/permissions.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import type { AuthUser } from '../common/auth-user';
import { AssistanceRequestsService } from './assistance-requests.service';
import { AssessmentService } from '../assessment/assessment.service';
import { SubmitAssessmentDto } from '../assessment/dto/assessment.dto';
import {
  CreateAssistanceRequestDto,
  QueryAssistanceRequestsDto,
  UpdateRequestStatusDto,
  CheckBeneficiaryDto,
  AddApplicationDocumentDto,
} from './dto/assistance-request.dto';

@ApiTags('assistance-requests')
@ApiBearerAuth()
@Controller('assistance-requests')
export class AssistanceRequestsController {
  constructor(
    private readonly assistanceService: AssistanceRequestsService,
    private readonly assessmentService: AssessmentService,
  ) {}

  @Post('check-beneficiary')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'ตรวจสอบสิทธิ์และสถานะทะเบียนผู้มีสิทธิ์ก่อนยื่นคำร้อง' })
  checkBeneficiary(@Body() dto: CheckBeneficiaryDto, @CurrentUser() user: AuthUser) {
    return this.assistanceService.checkBeneficiary(dto, user);
  }

  @Post()
  @RequirePermissions('beneficiaries.write')
  @ApiOperation({ summary: 'ยื่นคำร้องขอความช่วยเหลือใหม่' })
  create(@Body() dto: CreateAssistanceRequestDto, @CurrentUser() user: AuthUser) {
    return this.assistanceService.create(dto, user);
  }

  @Get()
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'ค้นหาและแสดงรายการคำร้องขอความช่วยเหลือ (แบ่งหน้า)' })
  list(@Query() query: QueryAssistanceRequestsDto, @CurrentUser() user: AuthUser) {
    return this.assistanceService.list(query, user);
  }

  @Get(':id')
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'ดูรายละเอียดคำร้องขอความช่วยเหลือ ประวัติ และเอกสาร' })
  getById(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.assistanceService.getById(id, user);
  }

  @Patch(':id/status')
  @RequirePermissions('beneficiaries.write')
  @ApiOperation({ summary: 'ปรับปรุงสถานะคำร้องขอความช่วยเหลือ' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRequestStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assistanceService.updateStatus(id, dto, user);
  }

  @Post(':id/documents')
  @RequirePermissions('documents.write')
  @ApiOperation({ summary: 'แนบเอกสารประกอบคำร้องขอความช่วยเหลือ' })
  addDocument(
    @Param('id') id: string,
    @Body() dto: AddApplicationDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assistanceService.addDocument(id, dto, user);
  }

  @Post(':id/assessment')
  @RequirePermissions('beneficiaries.assess')
  @ApiOperation({ summary: 'บันทึกผลการประเมินสภาพความเป็นอยู่ของคำร้อง' })
  submitAssessment(
    @Param('id') id: string,
    @Body() dto: SubmitAssessmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assessmentService.submitAssessment(id, dto, user);
  }

  @Get(':id/assessment')
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'เรียกดูผลการประเมินสภาพความเป็นอยู่ของคำร้อง' })
  getAssessment(@Param('id') id: string) {
    return this.assessmentService.getAssessment(id);
  }
}
