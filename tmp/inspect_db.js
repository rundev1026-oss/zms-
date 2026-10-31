const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, username: true, displayName: true } });
  console.log('Users:', users);
  const ben = await prisma.beneficiary.findFirst({
    where: { registrationNo: 'ZMS-2026-000012' },
    include: {
      household: {
        include: { members: true }
      },
      incomeProfile: true,
      addresses: true,
      documents: true,
      assistanceRequests: true
    }
  });
  console.log('Found Beneficiary:', ben ? {
    id: ben.id,
    registrationNo: ben.registrationNo,
    firstName: ben.firstName,
    lastName: ben.lastName,
    nationalId: ben.nationalId,
    phone: ben.phone,
    household: ben.household,
    incomeProfile: ben.incomeProfile,
    addresses: ben.addresses,
    documentsCount: ben.documents?.length,
    requestsCount: ben.assistanceRequests?.length
  } : 'NOT FOUND');
}

main().catch(console.error).finally(() => prisma.$disconnect());

