import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/app.exception';
import type { AuthUser } from '../common/auth-user';
import {
  ReconcileBankAccountDto,
  QueryReconciliationsDto,
} from './dto/bank-account.dto';

@Injectable()
export class BankAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * List all foundation bank accounts
   */
  async getBankAccounts() {
    const accounts = await this.prisma.bankAccount.findMany({
      orderBy: { isDefault: 'desc' },
    });

    return accounts.map((a) => ({
      ...a,
      openingBalance: Number(a.openingBalance),
      currentBalance: Number(a.currentBalance),
      reconciledBalance: Number(a.reconciledBalance),
    }));
  }

  /**
   * Get bank account details by ID or legacy ID
   */
  async getBankAccountById(id: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const account = await this.prisma.bankAccount.findFirst({
      where: isUuid ? { id } : { OR: [{ accountNumber: id }, { legacyId: id }] },
      include: {
        reconciliations: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!account) {
      throw new AppException(HttpStatus.NOT_FOUND, 'BANK_ACCOUNT_NOT_FOUND', `ไม่พบบัญชีธนาคารรหัส ${id}`);
    }

    return {
      ...account,
      openingBalance: Number(account.openingBalance),
      currentBalance: Number(account.currentBalance),
      reconciledBalance: Number(account.reconciledBalance),
      reconciliations: account.reconciliations.map((r) => ({
        ...r,
        systemBalance: Number(r.systemBalance),
        statementBalance: Number(r.statementBalance),
        difference: Number(r.difference),
      })),
    };
  }

  /**
   * Execute bank reconciliation matching statement balance against GL system balance
   */
  async reconcileBankAccount(id: string, dto: ReconcileBankAccountDto, user: AuthUser) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const bank = await this.prisma.bankAccount.findFirst({
      where: isUuid ? { id } : { OR: [{ accountNumber: id }, { legacyId: id }] },
    });

    if (!bank) {
      throw new AppException(HttpStatus.NOT_FOUND, 'BANK_ACCOUNT_NOT_FOUND', `ไม่พบบัญชีธนาคารรหัส ${id}`);
    }

    const systemBalance = Number(bank.currentBalance);
    const statementBalance = dto.statementBalance;
    const rawDiff = systemBalance - statementBalance;
    const difference = Math.round(rawDiff * 100) / 100;
    const isBalanced = Math.abs(difference) < 0.01;
    const status = isBalanced ? 'balanced' : 'discrepancy';

    const nowIso = new Date().toISOString();
    const dateStr = dto.reconciliationDate || new Date().toLocaleDateString('th-TH');

    const statementDecimal = new Prisma.Decimal(statementBalance);
    const systemDecimal = new Prisma.Decimal(systemBalance);
    const diffDecimal = new Prisma.Decimal(difference);

    return await this.prisma.$transaction(async (tx) => {
      // 1. Create Bank Reconciliation record
      const recon = await tx.bankReconciliation.create({
        data: {
          bankAccountId: bank.id,
          reconciliationDate: dateStr,
          systemBalance: systemDecimal,
          statementBalance: statementDecimal,
          difference: diffDecimal,
          status,
          notes: dto.notes || (isBalanced ? 'กระทบยอดตรงกันสมบูรณ์' : `พบข้อแตกต่าง ฿${Math.abs(difference).toLocaleString()} บาท`),
          proofUrl: dto.proofUrl || null,
          auditorId: user.id,
          auditorName: user.displayName,
        },
      });

      // 2. Update Bank Account reconciled balance and audit timestamp
      await tx.bankAccount.update({
        where: { id: bank.id },
        data: {
          reconciledBalance: statementDecimal,
          lastReconciledAt: nowIso,
          lastReconciledBy: user.displayName,
          updatedAt: new Date(),
        },
      });

      // 3. Record Audit Log
      await this.audit.record(tx, {
        actorId: user.id,
        action: 'BANK_RECONCILIATION',
        resourceType: 'bank_reconciliation',
        resourceId: recon.id,
        metadata: {
          bankAccountId: bank.id,
          accountName: bank.accountName,
          accountNumber: bank.accountNumber,
          systemBalance,
          statementBalance,
          difference,
          status,
          auditor: user.displayName,
        },
      });

      return {
        id: recon.id,
        bankAccountId: bank.id,
        accountName: bank.accountName,
        accountNumber: bank.accountNumber,
        reconciliationDate: recon.reconciliationDate,
        systemBalance,
        statementBalance,
        difference,
        status,
        notes: recon.notes,
        proofUrl: recon.proofUrl,
        auditorName: recon.auditorName,
        createdAt: recon.createdAt,
      };
    });
  }

  /**
   * Query all bank reconciliations with pagination and filtering
   */
  async getReconciliations(query: QueryReconciliationsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.BankReconciliationWhereInput = {};
    if (query.bankAccountId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query.bankAccountId);
      if (isUuid) {
        where.bankAccountId = query.bankAccountId;
      } else {
        where.bankAccount = { OR: [{ accountNumber: query.bankAccountId }, { legacyId: query.bankAccountId }] };
      }
    }

    if (query.status) {
      where.status = query.status;
    }

    const [total, items] = await Promise.all([
      this.prisma.bankReconciliation.count({ where }),
      this.prisma.bankReconciliation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          bankAccount: {
            select: {
              id: true,
              accountName: true,
              bankName: true,
              accountNumber: true,
            },
          },
        },
      }),
    ]);

    return {
      items: items.map((r) => ({
        ...r,
        systemBalance: Number(r.systemBalance),
        statementBalance: Number(r.statementBalance),
        difference: Number(r.difference),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

