import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RegistryStatus } from '@prisma/client';
import type { Request } from 'express';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { RequirePermissions } from '../common/permissions.decorator';
import { Roles } from '../common/roles.decorator';
import { BeneficiariesService } from './beneficiaries.service';
import {
  BeneficiaryListQueryDto,
  CreateBeneficiaryDto,
  CreateConsentDto,
  UpdateBeneficiaryDto,
  BeneficiarySummaryQueryDto,
} from './beneficiary.dto';
import {
  SoftDeleteBeneficiaryDto,
  RestoreBeneficiaryDto,
  QueryDeletedBeneficiariesDto,
} from './dto/soft-delete.dto';

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

  @Get('deleted')
  @Roles('SUPER_ADMIN')
  @RequirePermissions('beneficiaries.delete')
  @ApiOperation({ summary: 'รายการทะเบียนที่ถูกจำหน่าย/ลบ (เฉพาะ Super Admin)' })
  listDeleted(
    @Query() query: QueryDeletedBeneficiariesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.beneficiaries.listDeleted(query, user);
  }

  @Get(':id/delete-preview')
  @Roles('SUPER_ADMIN')
  @RequirePermissions('beneficiaries.delete')
  @ApiOperation({ summary: 'ตรวจสอบรายการผูกพันและเงื่อนไขก่อนลบทะเบียน' })
  getDeletePreview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.beneficiaries.getDeletePreview(id, user);
  }

  @Post(':id/soft-delete')
  @Roles('SUPER_ADMIN')
  @RequirePermissions('beneficiaries.delete')
  @ApiOperation({ summary: 'จำหน่าย/ลบข้อมูลทะเบียนแบบ Soft Delete (เฉพาะ Super Admin)' })
  softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SoftDeleteBeneficiaryDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || undefined;
    return this.beneficiaries.softDelete(id, dto, user, ip);
  }

  @Post(':id/restore')
  @Roles('SUPER_ADMIN')
  @RequirePermissions('beneficiaries.delete')
  @ApiOperation({ summary: 'กู้คืนทะเบียนที่ถูกจำหน่าย/ลบ (เฉพาะ Super Admin)' })
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RestoreBeneficiaryDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || undefined;
    return this.beneficiaries.restore(id, dto, user, ip);
  }

  @Get(':id/audit-history')
  @Roles('SUPER_ADMIN')
  @RequirePermissions('beneficiaries.delete')
  @ApiOperation({ summary: 'ประวัติ Audit Log สำหรับทะเบียนนี้ (เฉพาะ Super Admin)' })
  getAuditHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.beneficiaries.getAuditHistory(id, user);
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
