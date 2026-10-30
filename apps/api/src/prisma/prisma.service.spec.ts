import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('reports disconnected before a successful ping', () => {
    const prisma = new PrismaService();
    expect(prisma.isConnected()).toBe(false);
  });
});
