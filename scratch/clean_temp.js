const path = require('path');
const { PrismaClient } = require(path.resolve(__dirname, '../apps/api/node_modules/.prisma/client'));
const prisma = new PrismaClient();

async function cleanup() {
  await prisma.applicationDocument.deleteMany({ where: { application: { applicationNo: { startsWith: 'APP-2569-' } } } });
  const delApps = await prisma.assistanceApplication.deleteMany({ where: { applicationNo: { startsWith: 'APP-2569-' } } });
  console.log('Deleted test apps:', delApps.count);
  const delAsms = await prisma.beneficiaryAsnafAssessment.deleteMany({ where: { assessmentNumber: { startsWith: 'ASM-2024-' } } });
  console.log('Deleted old test assessments:', delAsms.count);
  await prisma.$disconnect();
}

cleanup();

