import { Controller, Get, Query, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { RequirePermissions } from '../common/permissions.decorator';
import { ExportBeneficiariesQueryDto } from './export.dto';
import { QueryReportDto } from './dto/reports.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('beneficiaries/export')
  @RequirePermissions('reports.export')
  @ApiOperation({
    summary:
      'ส่งออก Excel จากทะเบียนที่ตรงตัวกรองทั้งหมด ไม่จำกัดแค่หน้าปัจจุบัน',
  })
  async exportBeneficiaries(
    @Query() query: ExportBeneficiariesQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    const file = await this.reports.exportBeneficiaries(query, user);
    return new StreamableFile(file.bytes, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${file.fileName}"`,
    });
  }

  @Get('asnaf-distribution')
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'รายงานการกระจายเงินสงเคราะห์ตาม 8 กลุ่มอัสนาฟ' })
  getAsnafDistribution(@Query() query: QueryReportDto) {
    return this.reports.getAsnafDistributionReport(query);
  }

  @Get('financial-summary')
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'รายงานสรุปภาพรวมงบประมาณการเงินและกองทุน 3 ระดับ' })
  getFinancialSummary(@Query() query: QueryReportDto) {
    return this.reports.getFinancialSummaryReport(query);
  }

  @Get('monthly-trends')
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'รายงานแนวโน้มคำร้องและการเบิกจ่ายรายเดือน' })
  getMonthlyTrends(@Query() query: QueryReportDto) {
    return this.reports.getMonthlyTrendsReport(query);
  }

  @Get('demographics')
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'รายงานสถิติประชากรศาสตร์ผู้รับซะกาตและกลุ่มเปราะบาง' })
  getDemographics() {
    return this.reports.getDemographicsReport();
  }

  @Get('executive-dashboard')
  @RequirePermissions('beneficiaries.read')
  @ApiOperation({ summary: 'แดชบอร์ดดัชนีชี้วัดหลักของผู้บริหาร (Executive KPIs)' })
  getExecutiveDashboard() {
    return this.reports.getExecutiveKpiDashboard();
  }
}
