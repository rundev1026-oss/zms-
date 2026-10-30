import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RegistryStatus } from '@prisma/client';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { RequirePermissions } from '../common/permissions.decorator';
import { BeneficiariesService } from './beneficiaries.service';
import {
  BeneficiaryListQueryDto,
  CreateBeneficiaryDto,
  CreateConsentDto,
  UpdateBeneficiaryDto,
  BeneficiarySummaryQueryDto,
} from './beneficiary.dto';

@ApiTags('beneficiaries')
@ApiBearerAuth()
@Controller('beneficiaries')
export class BeneficiariesController {
  constructor(private readonly beneficiaries: BeneficiariesService) {}

  @Post()
  @RequirePermissions('beneficiaries.write')
  @ApiOperation({ summary: 'สร้างร่างและออกเลขทะเบียนโดยระบบ' })
  create(@Body() dto: CreateBeneficiaryDto, @CurrentUser() user: AuthUser) {
    return this.beneficiaries.create(dto, user);
  }

  @Get()
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'รายการทะเบียนพร้อมตัวกรอง เรียงลำดับ และแบ่งหน้า' })
  list(@Query() query: BeneficiaryListQueryDto, @CurrentUser() user: AuthUser) {
    return this.beneficiaries.list(
      { ...query, status: query.status as RegistryStatus | undefined },
      user,
    );
  }

  @Get('summary')
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({
    summary: 'จำนวนทะเบียนตามสถานะ ด้วยเงื่อนไขค้นหาเดียวกับรายการ และไม่นับเฉพาะแถวในหน้าปัจจุบัน',
  })
  summary(@Query() query: BeneficiarySummaryQueryDto) {
    return this.beneficiaries.summary(query);
  }

  @Get(':id')
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'รายละเอียดทะเบียน เลขบัตรถูกปกปิดถ้าไม่มีสิทธิ์' })
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.beneficiaries.getById(id, user);
  }

  @Patch(':id')
  @RequirePermissions('beneficiaries.write')
  @ApiOperation({ summary: 'บันทึกร่าง ห้ามส่งสถานะหรือตัวตนของผู้ใช้มาจากไคลเอนต์' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBeneficiaryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.beneficiaries.update(id, dto, user);
  }

  @Get(':id/consents/latest')
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'ความยินยอมล่าสุดสำหรับเปิดร่างต่อ ไม่ทับประวัติเดิม' })
  latestConsent(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.beneficiaries.latestConsent(id, user);
  }

  @Post(':id/consents')
  @RequirePermissions('beneficiaries.write')
  @ApiOperation({ summary: 'เพิ่มแถวความยินยอมใหม่โดยไม่ทับแถวเดิม' })
  consent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateConsentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.beneficiaries.addConsent(id, dto, user);
  }
}
