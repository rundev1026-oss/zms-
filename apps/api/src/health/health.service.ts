import { Injectable } from '@nestjs/common';
import { API_SERVICE_NAME, APP_VERSION, type HealthCheckResponse } from '@zms/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<HealthCheckResponse> {
    const database = await this.prisma.ping();
    const status = database.connected ? 'ok' : 'degraded';

    return {
      status,
      service: API_SERVICE_NAME,
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
      database,
    };
  }
}
