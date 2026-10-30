import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/permissions.decorator';
import { QueryAuditLogsDto } from './dto/audit-query.dto';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermissions('audit.read')
  @ApiOperation({ summary: 'ค้นหาและเรียกดูประวัติการปฏิบัติงาน (Audit Trail)' })
  list(@Query() query: QueryAuditLogsDto) {
    return this.audit.list(query);
  }

  @Get('summary')
  @RequirePermissions('audit.read')
  @ApiOperation({ summary: 'สรุปภาพรวมสถิติการปฏิบัติงานตามประเภทกิจกรรม' })
  getSummary() {
    return this.audit.getSummary();
  }

  @Get(':id')
  @RequirePermissions('audit.read')
  @ApiOperation({ summary: 'ดูรายละเอียดบันทึกประวัติการทำงานตามรหัส' })
  getById(@Param('id') id: string) {
    return this.audit.getById(id);
  }
}
