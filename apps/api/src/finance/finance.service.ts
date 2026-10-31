import { Injectable, HttpStatus } from '@nestjs/common';
import { formatPersonName } from '@zms/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/app.exception';
import type { AuthUser } from '../common/auth-user';
import {
  DisburseAssistanceDto,
  QueryTransactionsDto,
} from './dto/finance.dto';

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Disburse assistance funds for an approved application
   */
  async disburse(dto: DisburseAssistanceDto, user: AuthUser) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dto.applicationId);
    const app = await this.prisma.assistanceApplication.findFirst({
      where: isUuid
        ? { id: dto.applicationId }
        : { OR: [{ applicationNo: dto.applicationId }, { legacyId: dto.applicationId }] },
      include: {
        beneficiary: true,
      },
    });

    if (!app) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        'APPLICATION_NOT_FOUND',
        `ไม่พบคำร้องขอความช่วยเหลือรหัส ${dto.applicationId}`,
      );
    }

    // Segregation of Duties (SoD) Check: Approver cannot disburse their own approved application
    const userRoleCodes = (user.roles || []).map((r: any) => (typeof r === 'string' ? r : r.code));
    const isSuperAdmin = userRoleCodes.includes('SUPER_ADMIN');

    if (!isSuperAdmin && app.approvedById && app.approvedById === user.id) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'SOD_VIOLATION',
        `การละเมิดหลักการแบ่งแยกหน้าที่ (Segregation of Duties): ผู้อนุมัติคำร้อง (${user.displayName}) ไม่มีสิทธิ์ทำรายการเบิกจ่ายเงินด้วยตนเอง กรุณาให้เจ้าหน้าที่การเงินท่านอื่นดำเนินการ`,
      );
    }

    // Idempotency / Duplicate Check on Payment Reference (Must run first to prevent double-spending/replay)
    const cleanPaymentRef = dto.paymentRef.trim();
    if (!cleanPaymentRef) {
      throw new AppException(HttpStatus.BAD_REQUEST, 'PAYMENT_REF_REQUIRED', 'กรุณาระบุหมายเลขอ้างอิงการโอนเงิน');
    }

    const existingTx = await this.prisma.financialTransaction.findFirst({
      where: {
        referenceNo: cleanPaymentRef,
        status: { not: 'reversed' },
      },
    });

    if (existingTx) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'DUPLICATE_TRANSACTION_REF',
        `ตรวจพบธุรกรรมซ้ำ! หมายเลขอ้างอิงการโอนเงิน "${cleanPaymentRef}" เคยถูกบันทึกไว้ในระบบแล้ว (รายการเลขที่ ${existingTx.transactionNo})`,
      );
    }

    // State Check: Must be in 'wait_disbursement' or 'approved'
    if (!['wait_disbursement', 'approved'].includes(app.status)) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'INVALID_STATE',
        `คำร้องไม่อยู่ในสถานะรอเบิกจ่ายเงิน (สถานะปัจจุบัน: "${app.status}")`,
      );
    }

    const disburseAmount = dto.amount || Number(app.approvedAmount || app.requestedAmount);
    if (disburseAmount <= 0) {
      throw new AppException(HttpStatus.BAD_REQUEST, 'INVALID_AMOUNT', 'จำนวนเงินเบิกจ่ายต้องมากกว่า 0 บาท');
    }

    // Resolve Fund Account (Level 1)
    const targetFundId = app.approvedFundId || 'fund-1';
    const isFundUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetFundId);
    const fund = await this.prisma.fundAccount.findFirst({
      where: {
        OR: [
          ...(isFundUuid ? [{ id: targetFundId }] : []),
          { code: targetFundId },
          { legacyId: targetFundId },
        ],
      },
    });

    if (!fund) {
      throw new AppException(HttpStatus.NOT_FOUND, 'FUND_NOT_FOUND', `ไม่พบบัญชีกองทุนรหัส ${targetFundId}`);
    }

    // Resolve Specific Sub-Fund (Level 2)
    const specificFundId = app.approvedSpecificFundId || app.specificFundId || undefined;
    let subFund: any = null;
    if (specificFundId) {
      const isSubUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(specificFundId);
      subFund = await this.prisma.faqirMiskinSubFund.findFirst({
        where: {
          OR: [
            ...(isSubUuid ? [{ id: specificFundId }] : []),
            { code: specificFundId },
            { fundCode: specificFundId },
            { legacyId: specificFundId },
          ],
        },
      });
    }

    const fiscalYear = app.fiscalYear || '2569';
    const disburseDecimal = new Prisma.Decimal(disburseAmount);
    const nowIso = new Date().toISOString();
    const disbursementDateStr = new Date().toLocaleDateString('th-TH');
    const benFullName = app.beneficiary
      ? formatPersonName({
          prefix: app.beneficiary.title,
          firstName: app.beneficiary.firstName,
          lastName: app.beneficiary.lastName,
        })
      : 'ผู้รับซะกาต';

    return await this.prisma.$transaction(async (tx) => {
      // 1) Multi-Tier Updates: Release commitment, increment disbursement
      // A) Fund Account
      await tx.fundAccount.update({
        where: { id: fund.id },
        data: {
          committedAmount: { decrement: disburseDecimal },
          disbursedAmount: { increment: disburseDecimal },
          updatedAt: new Date(),
        },
      });

      // B) Specific Sub-Fund if present
      if (subFund) {
        await tx.faqirMiskinSubFund.update({
          where: { id: subFund.id },
          data: {
            committedAmount: { decrement: disburseDecimal },
            disbursedAmount: { increment: disburseDecimal },
            updatedAt: new Date(),
          },
        });
      }

      // C) Asnaf Allocation if present
      const asnafAlloc = await tx.asnafAllocation.findFirst({
        where: { asnafCode: app.asnafCategory, fiscalYear },
      });
      if (asnafAlloc) {
        await tx.asnafAllocation.update({
          where: { id: asnafAlloc.id },
          data: {
            committedAmount: { decrement: disburseDecimal },
            disbursedAmount: { increment: disburseDecimal },
            updatedAt: new Date(),
          },
        });
      }

      // D) Deduct Bank Account balance if specified
      if (dto.bankAccountId) {
        const bank = await tx.bankAccount.findUnique({ where: { id: dto.bankAccountId } });
        if (bank) {
          await tx.bankAccount.update({
            where: { id: bank.id },
            data: {
              currentBalance: { decrement: disburseDecimal },
              updatedAt: new Date(),
            },
          });
        }
      }

      // 2) Generate sequential transaction number: TXN-DISB-YYYY-######
      const prefix = `TXN-DISB-${fiscalYear}-`;
      const existingTxns = await tx.financialTransaction.findMany({
        where: { transactionNo: { startsWith: prefix } },
        select: { transactionNo: true },
      });

      let maxSeq = 0;
      for (const t of existingTxns) {
        const parts = t.transactionNo.split('-');
        if (parts[3]) {
          const num = parseInt(parts[3], 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      }

      let nextSeq = maxSeq + 1;
      let transactionNo = `${prefix}${nextSeq.toString().padStart(6, '0')}`;
      while (existingTxns.some((t) => t.transactionNo === transactionNo)) {
        nextSeq++;
        transactionNo = `${prefix}${nextSeq.toString().padStart(6, '0')}`;
      }

      // 3) Create Financial Transaction (General Ledger Record)
      const txn = await tx.financialTransaction.create({
        data: {
          transactionNo,
          date: nowIso,
          type: 'disbursement',
          fundId: fund.id,
          fundName: fund.name,
          category: `จ่ายเงินสงเคราะห์ผู้รับซะกาต (${app.applicationNo})`,
          amount: disburseDecimal,
          paymentMethod: dto.paymentMethod || 'bank_transfer',
          payerOrPayee: `${benFullName} (ผู้รับซะกาต)`,
          referenceNo: cleanPaymentRef,
          slipUrl: dto.proofUrl || '/slips/default-slip.jpg',
          status: 'completed',
          recordedById: user.id,
          recordedByName: user.displayName,
          notes: dto.notes || `จ่ายเงินสงเคราะห์คำร้อง ${app.applicationNo}`,
          applicationId: app.id,
          beneficiaryId: app.beneficiaryId,
          asnafCategory: app.asnafCategory,
          specificFundId: subFund?.id || null,
          bankAccountId: dto.bankAccountId || null,
          zakatYear: fiscalYear,
        },
      });

      // 4) Update Application Status to 'disbursed'
      const updatedApp = await tx.assistanceApplication.update({
        where: { id: app.id },
        data: {
          status: 'disbursed',
          disbursedAmount: disburseDecimal,
          disbursedById: user.id,
          disbursedByName: user.displayName,
          disbursementDate: disbursementDateStr,
          disbursementRef: cleanPaymentRef,
          disbursementProofUrl: dto.proofUrl || '/slips/default-slip.jpg',
          disbursementNotes: dto.notes || 'จ่ายเงินสงเคราะห์เรียบร้อย',
          updatedAt: new Date(),
        },
      });

      // 5) Record Application History
      await tx.applicationHistory.create({
        data: {
          applicationId: app.id,
          status: 'disbursed',
          timestamp: nowIso,
          changedById: user.id,
          changedByName: user.displayName,
          notes: `ฝ่ายการเงินเบิกจ่ายเงินสงเคราะห์จำนวน ฿${disburseDecimal.toFixed(2)} บาท เข้าบัญชีเรียบร้อย เลขอ้างอิง ${cleanPaymentRef} (รายการ ${transactionNo})`,
        },
      });

      // 6) Record Audit Log
      await this.audit.record(tx, {
        actorId: user.id,
        action: 'ASSISTANCE_DISBURSEMENT',
        resourceType: 'assistance_application',
        resourceId: app.id,
        metadata: {
          applicationNo: app.applicationNo,
          amount: disburseDecimal.toFixed(2),
          transactionNo,
          referenceNo: cleanPaymentRef,
          fundId: fund.id,
        },
      });

      return {
        applicationId: updatedApp.id,
        applicationNo: updatedApp.applicationNo,
        status: updatedApp.status,
        disbursedAmount: Number(updatedApp.disbursedAmount),
        transactionNo: txn.transactionNo,
        referenceNo: txn.referenceNo,
        disbursedByName: user.displayName,
        disbursementDate: disbursementDateStr,
      };
    });
  }

  /**
   * List financial transactions with pagination & filters
   */
  async listTransactions(query: QueryTransactionsDto) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(query.limit || 20)));
    const skip = (page - 1) * limit;

    const where: Prisma.FinancialTransactionWhereInput = {};

    if (query.fundId) where.fundId = query.fundId;
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;

    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { transactionNo: { contains: q, mode: 'insensitive' } },
        { referenceNo: { contains: q, mode: 'insensitive' } },
        { payerOrPayee: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.financialTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.financialTransaction.count({ where }),
    ]);

    const formatted = items.map((t) => ({
      ...t,
      amount: Number(t.amount),
    }));

    return {
      items: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get single transaction by ID or transactionNo
   */
  async getTransactionById(id: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const txn = await this.prisma.financialTransaction.findFirst({
      where: isUuid ? { id } : { OR: [{ transactionNo: id }, { legacyId: id }] },
    });

    if (!txn) {
      throw new AppException(HttpStatus.NOT_FOUND, 'TRANSACTION_NOT_FOUND', `ไม่พบรายการธุรกรรมรหัส ${id}`);
    }

    let beneficiary: any = null;
    if (txn.beneficiaryId) {
      const isBenUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(txn.beneficiaryId);
      beneficiary = await this.prisma.beneficiary.findFirst({
        where: isBenUuid ? { id: txn.beneficiaryId } : { OR: [{ registryNumber: txn.beneficiaryId }, { legacyId: txn.beneficiaryId }] },
        select: {
          id: true,
          registryNumber: true,
          firstName: true,
          lastName: true,
          title: true,
          phone: true,
          status: true,
        },
      });
    }

    return {
      ...txn,
      amount: Number(txn.amount),
      beneficiary,
    };
  }

  /**
   * Get list of fund accounts with dynamic balances
   */
  async getFunds() {
    const funds = await this.prisma.fundAccount.findMany({
      orderBy: { code: 'asc' },
    });

    return funds.map((f) => ({
      ...f,
      totalReceived: Number(f.totalReceived),
      committedAmount: Number(f.committedAmount),
      disbursedAmount: Number(f.disbursedAmount),
      availableAmount: Number(f.availableAmount),
      targetGoal: f.targetGoal ? Number(f.targetGoal) : null,
    }));
  }

  /**
   * Get bank accounts
   */
  async getBankAccounts() {
    const banks = await this.prisma.bankAccount.findMany({
      orderBy: { accountNumber: 'asc' },
    });

    return banks.map((b) => ({
      ...b,
      currentBalance: Number(b.currentBalance),
      openingBalance: Number(b.openingBalance),
    }));
  }

  /**
   * Get 3-tier financial budget summary
   */
  async getBudgetSummary() {
    const [funds, subFunds, allocations, txns] = await Promise.all([
      this.prisma.fundAccount.findMany(),
      this.prisma.faqirMiskinSubFund.findMany({ where: { isActive: true } }),
      this.prisma.asnafAllocation.findMany({ where: { fiscalYear: '2569' } }),
      this.prisma.financialTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'disbursement', status: 'completed' },
      }),
    ]);

    const totalAvailable = funds.reduce((sum, f) => sum + Number(f.availableAmount), 0);
    const totalCommitted = funds.reduce((sum, f) => sum + Number(f.committedAmount), 0);
    const totalDisbursed = funds.reduce((sum, f) => sum + Number(f.disbursedAmount), 0);
    const totalReceived = funds.reduce((sum, f) => sum + Number(f.totalReceived), 0);

    return {
      totalReceived,
      totalAvailable,
      totalCommitted,
      totalDisbursed,
      fundsCount: funds.length,
      subFundsCount: subFunds.length,
      asnafAllocationsCount: allocations.length,
      totalDisbursedTransactionsAmount: Number(txns._sum.amount || 0),
    };
  }
}
