import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { BeneficiariesService } from '../beneficiaries/beneficiaries.service';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import type { UpsertIncomeProfileDto } from './income.dto';

@Injectable()
export class IncomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly beneficiaries: BeneficiariesService,
    private readonly audit: AuditService,
  ) {}

  async get(beneficiaryId: string, actor: AuthUser) {
    await this.beneficiaries.requireRecord(beneficiaryId);
    const row = await this.prisma.incomeExpenseProfile.findUnique({ where: { beneficiaryId } });
    await this.audit.write({
      actorId: actor.id,
      action: 'INCOME_PROFILE_VIEW',
      resourceType: 'beneficiary',
      resourceId: beneficiaryId,
      metadata: { present: row !== null },
    });
    return row === null ? null : this.toView(row);
  }

  async replace(beneficiaryId: string, input: UpsertIncomeProfileDto, actor: AuthUser) {
    const beneficiary = await this.beneficiaries.requireRecord(beneficiaryId);
    this.beneficiaries.assertEditable(beneficiary.status);
    const data = this.fields(input);
    const saved = await this.prisma.$transaction(async (tx) => {
      const row = await tx.incomeExpenseProfile.upsert({
        where: { beneficiaryId },
        create: { beneficiaryId, ...data, createdById: actor.id, updatedById: actor.id },
        update: { ...data, updatedById: actor.id },
      });
      await this.audit.record(tx, {
        actorId: actor.id,
        action: 'INCOME_PROFILE_UPDATE',
        resourceType: 'beneficiary',
        resourceId: beneficiaryId,
        metadata: { updated: true },
      });
      return row;
    });
    return this.toView(saved);
  }

  private fields(input: UpsertIncomeProfileDto) {
    const data: Record<string, unknown> = {};
    const assign = (key: string, value: unknown) => {
      if (value !== undefined) data[key] = value;
    };
    assign('personalIncome', this.money(input.personalIncome));
    assign('regularExpense', this.money(input.regularExpense));
    assign('debtBurden', this.money(input.debtBurden));
    assign('housingCondition', input.housingCondition);
    assign('livingConstraints', input.livingConstraints);
    assign('assistanceNeeds', input.assistanceNeeds);
    assign('otherAgencyAssistance', input.otherAgencyAssistance);
    assign('priorAssistanceHistory', input.priorAssistanceHistory);
    assign('officerNote', input.officerNote);
    return data;
  }

  private money(value: string | undefined): Prisma.Decimal | undefined {
    return value === undefined ? undefined : new Prisma.Decimal(value);
  }

  private toView(row: {
    id: string;
    personalIncome: Prisma.Decimal | null;
    regularExpense: Prisma.Decimal | null;
    debtBurden: Prisma.Decimal | null;
    housingCondition: string | null;
    livingConstraints: string | null;
    assistanceNeeds: string | null;
    otherAgencyAssistance: string | null;
    priorAssistanceHistory: string | null;
    officerNote: string | null;
  }) {
    return {
      id: row.id,
      personalIncome: row.personalIncome?.toFixed(2) ?? null,
      regularExpense: row.regularExpense?.toFixed(2) ?? null,
      debtBurden: row.debtBurden?.toFixed(2) ?? null,
      housingCondition: row.housingCondition,
      livingConstraints: row.livingConstraints,
      assistanceNeeds: row.assistanceNeeds,
      otherAgencyAssistance: row.otherAgencyAssistance,
      priorAssistanceHistory: row.priorAssistanceHistory,
      officerNote: row.officerNote,
    };
  }
}
