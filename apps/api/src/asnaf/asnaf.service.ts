import { HttpStatus, Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { BeneficiariesService } from '../beneficiaries/beneficiaries.service';
import { AppException } from '../common/app.exception';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import type { ProposeAsnafDto } from './proposal.dto';

@Injectable()
export class AsnafService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly beneficiaries: BeneficiariesService,
    private readonly audit: AuditService,
  ) {}

  listActive() {
    return this.prisma.asnafCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, code: true, nameTh: true, sortOrder: true },
    });
  }

  async latestProposal(beneficiaryId: string, actor: AuthUser) {
    await this.beneficiaries.requireRecord(beneficiaryId);
    const row = await this.prisma.beneficiaryAsnafAssessment.findFirst({
      where: { beneficiaryId, decision: 'PROPOSED' },
      orderBy: { assessedAt: 'desc' },
      include: { category: true },
    });
    await this.audit.write({
      actorId: actor.id,
      action: 'ASNAF_PROPOSAL_VIEW',
      resourceType: 'beneficiary',
      resourceId: beneficiaryId,
      metadata: { present: row !== null },
    });
    return row === null ? null : this.toProposal(row);
  }

  async propose(beneficiaryId: string, input: ProposeAsnafDto, actor: AuthUser) {
    const beneficiary = await this.beneficiaries.requireRecord(beneficiaryId);
    this.beneficiaries.assertEditable(beneficiary.status);
    const category = await this.prisma.asnafCategory.findFirst({
      where: { id: input.categoryId, isActive: true },
    });
    if (category === null) {
      throw new AppException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'BUSINESS_RULE',
        'ไม่พบหมวดอัสนัฟที่เปิดใช้งาน',
      );
    }
    const saved = await this.prisma.$transaction(async (tx) => {
      const row = await tx.beneficiaryAsnafAssessment.create({
        data: {
          beneficiaryId,
          categoryId: category.id,
          rationale: input.rationale,
          supportingInfo: input.supportingInfo ?? null,
          recordedById: actor.id,
          assessedAt: new Date(),
          decision: 'PROPOSED',
        },
        include: { category: true },
      });
      await this.audit.record(tx, {
        actorId: actor.id,
        action: 'ASNAF_PROPOSAL',
        resourceType: 'beneficiary',
        resourceId: beneficiaryId,
        metadata: { decision: 'PROPOSED', categoryCode: category.code },
      });
      return row;
    });
    return this.toProposal(saved);
  }

  private toProposal(row: {
    id: string;
    categoryId: string;
    rationale: string;
    supportingInfo: string | null;
    decision: string;
    assessedAt: Date;
    category: { nameTh: string; code: string };
  }) {
    return {
      id: row.id,
      categoryId: row.categoryId,
      categoryCode: row.category.code,
      categoryNameTh: row.category.nameTh,
      rationale: row.rationale,
      supportingInfo: row.supportingInfo,
      decision: 'PROPOSED' as const,
      assessedAt: row.assessedAt.toISOString(),
    };
  }
}
