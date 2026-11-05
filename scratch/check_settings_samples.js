const path = require('path');
const { PrismaClient } = require(path.resolve(__dirname, '../apps/api/node_modules/.prisma/client'));
const prisma = new PrismaClient();

async function showSamples() {
  const settings = await prisma.systemSetting.findMany();
  console.log('=== SYSTEM SETTINGS ===');
  console.log(settings);

  const assistTypes = await prisma.assistanceType.findMany({ take: 5 });
  console.log('=== ASSISTANCE TYPES SAMPLE (5 of 23) ===');
  console.log(assistTypes);
  await prisma.$disconnect();
}
showSamples();

