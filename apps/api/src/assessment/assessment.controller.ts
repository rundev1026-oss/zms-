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
import { AssessmentService } from './assessment.service';
import { SubmitAssessmentDto } from './dto/assessment.dto';

@ApiTags('assessments')
@ApiBearerAuth()
@Controller('assessments')
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  @Post(':applicationId')
  @RequirePermissions('beneficiaries.assess')
  @ApiOperation({ summary: 'บันทึกผลการประเมินสภาพความเป็นอยู่และข้อเสนอแนะเจ้าหน้าที่' })
  submit(
    @Param('applicationId') applicationId: string,
    @Body() dto: SubmitAssessmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assessmentService.submitAssessment(applicationId, dto, user);
  }

  @Get(':applicationId')
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'เรียกดูผลการประเมินสภาพความเป็นอยู่ของคำร้อง' })
  get(@Param('applicationId') applicationId: string) {
    return this.assessmentService.getAssessment(applicationId);
  }
}
