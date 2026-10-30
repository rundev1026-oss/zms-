"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankAccountsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const app_exception_1 = require("../common/app.exception");
let BankAccountsService = class BankAccountsService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
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
    async getBankAccountById(id) {
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
            throw new app_exception_1.AppException(common_1.HttpStatus.NOT_FOUND, 'BANK_ACCOUNT_NOT_FOUND', `ไม่พบบัญชีธนาคารรหัส ${id}`);
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
    async reconcileBankAccount(id, dto, user) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const bank = await this.prisma.bankAccount.findFirst({
            where: isUuid ? { id } : { OR: [{ accountNumber: id }, { legacyId: id }] },
        });
        if (!bank) {
            throw new app_exception_1.AppException(common_1.HttpStatus.NOT_FOUND, 'BANK_ACCOUNT_NOT_FOUND', `ไม่พบบัญชีธนาคารรหัส ${id}`);
        }
        const systemBalance = Number(bank.currentBalance);
        const statementBalance = dto.statementBalance;
        const rawDiff = systemBalance - statementBalance;
        const difference = Math.round(rawDiff * 100) / 100;
        const isBalanced = Math.abs(difference) < 0.01;
        const status = isBalanced ? 'balanced' : 'discrepancy';
        const nowIso = new Date().toISOString();
        const dateStr = dto.reconciliationDate || new Date().toLocaleDateString('th-TH');
        const statementDecimal = new client_1.Prisma.Decimal(statementBalance);
        const systemDecimal = new client_1.Prisma.Decimal(systemBalance);
        const diffDecimal = new client_1.Prisma.Decimal(difference);
        return await this.prisma.$transaction(async (tx) => {
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
            await tx.bankAccount.update({
                where: { id: bank.id },
                data: {
                    reconciledBalance: statementDecimal,
                    lastReconciledAt: nowIso,
                    lastReconciledBy: user.displayName,
                    updatedAt: new Date(),
                },
            });
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
    async getReconciliations(query) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
        const skip = (page - 1) * limit;
        const where = {};
        if (query.bankAccountId) {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query.bankAccountId);
            if (isUuid) {
                where.bankAccountId = query.bankAccountId;
            }
            else {
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
};
exports.BankAccountsService = BankAccountsService;
exports.BankAccountsService = BankAccountsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], BankAccountsService);
//# sourceMappingURL=bank-accounts.service.js.map