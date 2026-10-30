import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { BeneficiariesService } from '../beneficiaries/beneficiaries.service';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';

export interface HouseholdMemberInput {
  fullName: string;
  relationship: string;
  dateOfBirth?: string;
  ageYears?: number;
  occupation?: string;
  isDependent: boolean;
  sortOrder?: number;
}

export interface HouseholdInput {
  memberCount?: number;
  householdIncome?: string;
  householdExpense?: string;
  debtAmount?: string;
  dependentCount?: number;
  additionalNotes?: string;
  members: HouseholdMemberInput[];
}

@Injectable()
export class HouseholdService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly beneficiaries: BeneficiariesService,
    private readonly audit: AuditService,
  ) {}

  async get(beneficiaryId: string, actor: AuthUser) {
    await this.beneficiaries.requireRecord(beneficiaryId);
    const household = await this.prisma.household.findUnique({
      where: { beneficiaryId },
      include: { members: { orderBy: { sortOrder: 'asc' } } },
    });
    await this.audit.write({
      actorId: actor.id,
      action: 'HOUSEHOLD_VIEW',
      resourceType: 'beneficiary',
      resourceId: beneficiaryId,
      metadata: { present: household !== null },
    });
    return household === null ? null : this.toView(household);
  }

  async replace(beneficiaryId: string, input: HouseholdInput, actor: AuthUser) {
    const beneficiary = await this.beneficiaries.requireRecord(beneficiaryId);
    this.beneficiaries.assertEditable(beneficiary.status);
    const saved = await this.prisma.$transaction(async (tx) => {
      const household = await tx.household.upsert({
        where: { beneficiaryId },
        create: {
          beneficiaryId,
          ...this.amounts(input),
          createdById: actor.id,
          updatedById: actor.id,
        },
        update: { ...this.amounts(input), updatedById: actor.id },
      });
      await tx.householdMember.deleteMany({ where: { householdId: household.id } });
      if (input.members.length > 0) {
        await tx.householdMember.createMany({
          data: input.members.map((member, index) => ({
            householdId: household.id,
            fullName: member.fullName,
            relationship: member.relationship,
            dateOfBirth: member.dateOfBirth === undefined ? null : new Date(member.dateOfBirth),
            ageYears: member.ageYears ?? null,
            occupation: member.occupation ?? null,
            isDependent: member.isDependent,
            sortOrder: member.sortOrder ?? index,
            createdById: actor.id,
            updatedById: actor.id,
          })),
        });
      }
      await this.audit.record(tx, {
        actorId: actor.id,
        action: 'HOUSEHOLD_UPDATE',
        resourceType: 'beneficiary',
        resourceId: beneficiaryId,
        metadata: { memberRows: input.members.length },
      });
      return tx.household.findUniqueOrThrow({
        where: { id: household.id },
        include: { members: { orderBy: { sortOrder: 'asc' } } },
      });
    });
    return this.toView(saved);
  }

  private amounts(input: HouseholdInput) {
    return {
      memberCount: input.memberCount ?? null,
      householdIncome: this.money(input.householdIncome),
      householdExpense: this.money(input.householdExpense),
      debtAmount: this.money(input.debtAmount),
      dependentCount: input.dependentCount ?? null,
      additionalNotes: input.additionalNotes ?? null,
    };
  }

  private money(value: string | undefined): Prisma.Decimal | null {
    return value === undefined ? null : new Prisma.Decimal(value);
  }

  private toView(household: {
    id: string;
    memberCount: number | null;
    householdIncome: Prisma.Decimal | null;
    householdExpense: Prisma.Decimal | null;
    debtAmount: Prisma.Decimal | null;
    dependentCount: number | null;
    additionalNotes: string | null;
    members: Array<{
      id: string;
      fullName: string;
      relationship: string;
      dateOfBirth: Date | null;
      ageYears: number | null;
      occupation: string | null;
      isDependent: boolean;
      sortOrder: number;
    }>;
  }) {
    return {
      id: household.id,
      memberCount: household.memberCount,
      householdIncome: household.householdIncome?.toFixed(2) ?? null,
      householdExpense: household.householdExpense?.toFixed(2) ?? null,
      debtAmount: household.debtAmount?.toFixed(2) ?? null,
      dependentCount: household.dependentCount,
      additionalNotes: household.additionalNotes,
      members: household.members.map((member) => ({
        ...member,
        dateOfBirth:
          member.dateOfBirth === null ? null : member.dateOfBirth.toISOString().slice(0, 10),
      })),
    };
  }
}
