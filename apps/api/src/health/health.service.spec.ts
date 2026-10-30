import { API_SERVICE_NAME, APP_VERSION } from '@zms/shared';
import { HealthService } from './health.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('HealthService', () => {
  it('returns ok when the database ping succeeds', async () => {
    const prisma = {
      ping: jest.fn().mockResolvedValue({ connected: true, message: 'PostgreSQL reachable' }),
    };
    const service = new HealthService(prisma as unknown as PrismaService);

    const result = await service.getHealth();

    expect(result.status).toBe('ok');
    expect(result.service).toBe(API_SERVICE_NAME);
    expect(result.version).toBe(APP_VERSION);
    expect(result.database.connected).toBe(true);
  });

  it('returns degraded when the database is unavailable', async () => {
    const prisma = {
      ping: jest.fn().mockResolvedValue({ connected: false, message: 'ECONNREFUSED' }),
    };
    const service = new HealthService(prisma as unknown as PrismaService);

    const result = await service.getHealth();

    expect(result.status).toBe('degraded');
    expect(result.database.connected).toBe(false);
  });
});
