const path = require('path');
const { PrismaClient } = require(path.resolve(__dirname, '../apps/api/node_modules/.prisma/client'));
const prisma = new PrismaClient();

async function check() {
  const bens = await prisma.beneficiary.findMany({
    select: { id: true, memberId: true, registryNumber: true, firstName: true, lastName: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log('Real Beneficiaries in DB:', bens);
  await prisma.$disconnect();
}

check();

