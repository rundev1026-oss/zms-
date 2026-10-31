import { Injectable } from '@nestjs/common';
import type { RegistryStatus } from '@prisma/client';
import { formatPersonName, type RegistryStatusCode } from '@zms/shared';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { buildBeneficiaryOrder, buildBeneficiaryWhere } from '../beneficiaries/beneficiary-query';
import {
  beneficiaryInclude,
  presentBeneficiary,
  type BeneficiaryView,
} from '../beneficiaries/beneficiary.presenter';
import { buildXlsx } from './xlsx-workbook';
import type { ExportBeneficiariesQueryDto } from './export.dto';

const STATUS_LABELS: Record<RegistryStatusCode, string> = {
  DRAFT: 'ร่าง',
  PENDING_REVIEW: 'รอตรวจสอบ',
  NEEDS_CORRECTION: 'รอแก้ไข',
  UNDER_ASSESSMENT: 'อยู่ระหว่างประเมิน',
  ELIGIBLE: 'มีคุณสมบัติ',
  INELIGIBLE: 'ไม่มีคุณสมบัติ',
  SUSPENDED: 'ระงับ',
  ARCHIVED: 'เก็บถาวร',
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async exportBeneficiaries(query: ExportBeneficiariesQueryDto, actor: AuthUser) {
    const filters = {
      q: query.q,
      status: query.status as RegistryStatus | undefined,
      asnafCategoryId: query.asnafCategoryId,
      province: query.province,
      sort: query.sort,
    };
    const rows = await this.prisma.beneficiary.findMany({
      where: buildBeneficiaryWhere(filters),
      orderBy: buildBeneficiaryOrder(filters.sort),
      include: beneficiaryInclude,
    });
    const revealAid = actor.permissions.includes('beneficiaries.aid.view');
    const views = rows.map((row) =>
      presentBeneficiary(row, {
        revealIdentity: actor.permissions.includes('beneficiaries.read.sensitive'),
        revealAid,
      }),
    );
    await this.audit.write({
      actorId: actor.id,
      action: 'BENEFICIARY_EXPORT',
      resourceType: 'beneficiary',
      resourceId: null,
      metadata: { rowCount: views.length, revealAid },
    });
    return {
      fileName: 'zms-beneficiaries.xlsx',
      bytes: buildXlsx(sheetRows(views, revealAid)),
    };
  }

  /**
   * 1. Asnaf Distribution Report
   */
  async getAsnafDistributionReport(query?: { fiscalYear?: string }) {
    const fiscalYear = query?.fiscalYear || '2569';

    const applications = await this.prisma.assistanceApplication.findMany({
      where: { fiscalYear },
      select: {
        id: true,
        asnafCategory: true,
        status: true,
        disbursedAmount: true,
        approvedAmount: true,
        requestedAmount: true,
      },
    });

    const asnafNames: Record<string, string> = {
      faqir: 'คนยากจน (Faqir)',
      miskin: 'คนขัดสน (Miskin)',
      amil: 'เจ้าหน้าที่ผู้จัดเก็บและจ่าย (Amil)',
      muallaf: 'ผู้มีจิตใจโน้มเอียงสู่อิสลาม (Muallaf)',
      riqab: 'ทาส/การปลดปล่อย (Riqab)',
      gharimin: 'ผู้มีหนี้สินล้นพ้นตัว (Gharimin)',
      fisabilillah: 'ในหนทางของอัลลอฮ์ (Fisabilillah)',
      ibnus_sabil: 'ผู้เดินทางขาดแคลน (Ibnus Sabil)',
    };

    const categoryMap = new Map<string, { count: number; totalDisbursed: number; totalApproved: number }>();
    for (const code of Object.keys(asnafNames)) {
      categoryMap.set(code, { count: 0, totalDisbursed: 0, totalApproved: 0 });
    }

    let grandTotalDisbursed = 0;
    let grandTotalCount = 0;

    const normalizeAsnaf = (cat?: string): string => {
      const c = (cat || '').toLowerCase().trim();
      if (c === 'fakir' || c === 'faqir') return 'faqir';
      if (c === 'miskin') return 'miskin';
      if (c === 'amil') return 'amil';
      if (c === 'muallaf') return 'muallaf';
      if (c === 'riqab') return 'riqab';
      if (c === 'gharimin') return 'gharimin';
      if (c === 'fisabilillah') return 'fisabilillah';
      if (c === 'ibnus_sabil' || c === 'ibnussabil' || c === 'ibnusabil') return 'ibnus_sabil';
      return 'faqir';
    };

    for (const app of applications) {
      const cat = normalizeAsnaf(app.asnafCategory);
      const entry = categoryMap.get(cat) || { count: 0, totalDisbursed: 0, totalApproved: 0 };
      entry.count += 1;
      const disbursed = Number(app.disbursedAmount || 0);
      const approved = Number(app.approvedAmount || 0);
      entry.totalDisbursed += disbursed;
      entry.totalApproved += approved;
      categoryMap.set(cat, entry);

      grandTotalDisbursed += disbursed;
      grandTotalCount += 1;
    }

    const items = Array.from(categoryMap.entries()).map(([code, stats]) => ({
      asnafCode: code,
      asnafNameTh: asnafNames[code] || code,
      applicationCount: stats.count,
      totalDisbursedAmount: Math.round(stats.totalDisbursed * 100) / 100,
      totalApprovedAmount: Math.round(stats.totalApproved * 100) / 100,
      percentage: grandTotalDisbursed > 0
        ? Math.round((stats.totalDisbursed / grandTotalDisbursed) * 10000) / 100
        : 0,
    }));

    return {
      fiscalYear,
      grandTotalDisbursed: Math.round(grandTotalDisbursed * 100) / 100,
      grandTotalApplications: grandTotalCount,
      items,
    };
  }

  /**
   * 2. Financial Summary Report
   */
  async getFinancialSummaryReport(query?: { fiscalYear?: string }) {
    const fiscalYear = query?.fiscalYear || '2569';

    const [funds, subFunds, bankAccounts, txnsAgg] = await Promise.all([
      this.prisma.fundAccount.findMany({ orderBy: { code: 'asc' } }),
      this.prisma.faqirMiskinSubFund.findMany({ orderBy: { code: 'asc' } }),
      this.prisma.bankAccount.findMany({ orderBy: { isDefault: 'desc' } }),
      this.prisma.financialTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'disbursement', status: 'completed' },
      }),
    ]);

    const totalReceived = funds.reduce((sum, f) => sum + Number(f.totalReceived), 0);
    const totalCommitted = funds.reduce((sum, f) => sum + Number(f.committedAmount), 0);
    const totalDisbursed = funds.reduce((sum, f) => sum + Number(f.disbursedAmount), 0);
    const totalAvailable = funds.reduce((sum, f) => sum + Number(f.availableAmount), 0);
    const totalBankBalance = bankAccounts.reduce((sum, b) => sum + Number(b.currentBalance), 0);

    return {
      fiscalYear,
      totalReceived: Math.round(totalReceived * 100) / 100,
      totalCommitted: Math.round(totalCommitted * 100) / 100,
      totalDisbursed: Math.round(totalDisbursed * 100) / 100,
      totalAvailable: Math.round(totalAvailable * 100) / 100,
      totalBankBalance: Math.round(totalBankBalance * 100) / 100,
      totalRecordedDisbursements: Number(txnsAgg._sum.amount || 0),
      funds: funds.map((f) => ({
        id: f.id,
        code: f.code,
        name: f.name,
        totalReceived: Number(f.totalReceived),
        committedAmount: Number(f.committedAmount),
        disbursedAmount: Number(f.disbursedAmount),
        availableAmount: Number(f.availableAmount),
      })),
      subFunds: subFunds.map((sf) => ({
        id: sf.id,
        code: sf.code,
        name: sf.name,
        allocatedAmount: Number(sf.allocatedAmount),
        committedAmount: Number(sf.committedAmount),
        disbursedAmount: Number(sf.disbursedAmount),
        availableAmount: Number(sf.remainingAmount),
      })),
      bankAccounts: bankAccounts.map((b) => ({
        id: b.id,
        bankName: b.bankName,
        accountName: b.accountName,
        accountNumber: b.accountNumber,
        currentBalance: Number(b.currentBalance),
        reconciledBalance: Number(b.reconciledBalance),
        status: b.status,
      })),
    };
  }

  /**
   * 3. Monthly Trends Report
   */
  async getMonthlyTrendsReport(query?: { fiscalYear?: string }) {
    const fiscalYear = query?.fiscalYear || '2569';

    const applications = await this.prisma.assistanceApplication.findMany({
      where: { fiscalYear },
      select: {
        createdAt: true,
        status: true,
        requestedAmount: true,
        approvedAmount: true,
        disbursedAmount: true,
      },
    });

    const months = [
      'ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.',
      'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.'
    ];

    const monthlyData = months.map((m, idx) => ({
      monthIndex: idx + 1,
      monthName: m,
      applicationsCount: 0,
      approvedCount: 0,
      disbursedCount: 0,
      totalDisbursedAmount: 0,
    }));

    for (const app of applications) {
      const month = app.createdAt.getMonth();
      const mData = monthlyData[month % 12];
      mData.applicationsCount += 1;
      if (['approved', 'wait_disbursement', 'disbursed'].includes(app.status)) {
        mData.approvedCount += 1;
      }
      if (app.status === 'disbursed') {
        mData.disbursedCount += 1;
        mData.totalDisbursedAmount += Number(app.disbursedAmount || 0);
      }
    }

    return {
      fiscalYear,
      monthlyData: monthlyData.map((m) => ({
        ...m,
        totalDisbursedAmount: Math.round(m.totalDisbursedAmount * 100) / 100,
      })),
    };
  }

  /**
   * 4. Demographics Report
   */
  async getDemographicsReport() {
    const [beneficiaries, addresses] = await Promise.all([
      this.prisma.beneficiary.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          status: true,
          dateOfBirth: true,
          maritalStatus: true,
        },
      }),
      this.prisma.beneficiaryAddress.findMany({
        select: {
          beneficiaryId: true,
          province: true,
        },
      }),
    ]);

    const provinceCounts: Record<string, number> = {};
    for (const addr of addresses) {
      const prov = addr.province || 'ไม่ระบุ';
      provinceCounts[prov] = (provinceCounts[prov] || 0) + 1;
    }

    const statusCounts: Record<string, number> = {};
    for (const b of beneficiaries) {
      statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
    }

    const now = new Date();
    const ageGroups = {
      under18: 0,
      age18To35: 0,
      age36To60: 0,
      over60: 0,
      unknown: 0,
    };

    for (const b of beneficiaries) {
      if (!b.dateOfBirth) {
        ageGroups.unknown += 1;
      } else {
        const age = Math.floor((now.getTime() - new Date(b.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000));
        if (age < 18) ageGroups.under18 += 1;
        else if (age <= 35) ageGroups.age18To35 += 1;
        else if (age <= 60) ageGroups.age36To60 += 1;
        else ageGroups.over60 += 1;
      }
    }

    return {
      totalBeneficiaries: beneficiaries.length,
      byProvince: Object.entries(provinceCounts).map(([province, count]) => ({ province, count })),
      byStatus: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
      byAgeGroup: ageGroups,
    };
  }

  /**
   * 5. High-Level Executive Dashboard KPIs
   */
  async getExecutiveKpiDashboard() {
    const [
      beneficiaryCount,
      totalDisbursedAgg,
      totalAppsCount,
      pendingApprovalsCount,
      funds,
    ] = await Promise.all([
      this.prisma.beneficiary.count({ where: { deletedAt: null } }),
      this.prisma.financialTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'disbursement', status: 'completed' },
      }),
      this.prisma.assistanceApplication.count(),
      this.prisma.assistanceApplication.count({ where: { status: 'pending_approval' } }),
      this.prisma.fundAccount.findMany({ select: { availableAmount: true } }),
    ]);

    const totalAvailableFunds = funds.reduce((acc, f) => acc + Number(f.availableAmount), 0);

    return {
      totalBeneficiaries: beneficiaryCount,
      totalAssistanceDisbursed: Number(totalDisbursedAgg._sum.amount || 0),
      totalApplications: totalAppsCount,
      pendingApprovalsCount,
      totalAvailableFunds: Math.round(totalAvailableFunds * 100) / 100,
      timestamp: new Date().toISOString(),
    };
  }
}

function sheetRows(views: BeneficiaryView[], revealAid: boolean): string[][] {
  const headers = [
    'เลขทะเบียน',
    'ชื่อ-นามสกุล',
    'เลขประจำตัว',
    'สถานะ',
    'อัสนัฟ',
    'จังหวัด',
    'ชุมชน',
    'โทรศัพท์',
    'คำร้อง',
  ];
  if (revealAid) {
    headers.push('ยอดช่วยเหลือ');
  }
  headers.push('วันที่บันทึก');
  return [
    headers,
    ...views.map((view) => {
      const values = [
        view.registryNumber,
        formatPersonName({ prefix: view.title, firstName: view.firstName, lastName: view.lastName }),
        view.identityNumber ?? '',
        statusLabel(view.status as RegistryStatusCode),
        view.asnaf?.nameTh ?? '',
        view.province ?? '',
        view.community ?? '',
        view.phone ?? '',
        String(view.requestCount),
      ];
      if (revealAid) {
        values.push(view.aidTotal ?? '');
      }
      values.push(view.createdAt ?? '');
      return values;
    }),
  ];
}

function statusLabel(status: RegistryStatusCode): string {
  return STATUS_LABELS[status] ?? status;
}
