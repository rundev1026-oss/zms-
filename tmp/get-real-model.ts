import { PrismaClient } from '../apps/api/node_modules/@prisma/client';
import { buildSurveyPrintModel } from '../src/lib/surveyPrint/model';
import { writeFileSync } from 'fs';

const prisma = new PrismaClient();

async function main() {
  const b = await prisma.beneficiary.findFirst({
    where: { registryNumber: 'ZMS-2026-000012' },
    include: {
      household: { include: { members: true } },
      incomeProfile: true,
      addresses: true,
      documents: true,
      applications: true,
      consents: { orderBy: { recordedAt: 'desc' }, take: 1 }
    }
  });

  if (!b) throw new Error('Beneficiary not found');
  const model = buildSurveyPrintModel({
    beneficiary: b,
    documents: b.documents || [],
    applications: b.applications || [],
    applicationsNote: null,
    consent: b.consents?.[0] || null,
    images: [],
    printedBy: 'ผู้ดูแลระบบ',
  });

  writeFileSync('tmp/zms-12-model.json', JSON.stringify(model, null, 2), 'utf8');
  console.log('Model generated successfully. Members count:', model.members.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
