import { PrismaClient } from '../apps/api/node_modules/@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const users = await prisma.user.findMany({
    include: {
      userRoles: {
        include: { role: true },
      },
    },
  });
  console.log("PostgreSQL Users:", users.length);
  for (const u of users) {
    console.log(`- ${u.id} | ${u.email} | ${u.displayName} | roles: ${u.userRoles.map(r => r.role.code).join(', ')}`);
  }
  await prisma.$disconnect();
}

main().catch(console.error);

