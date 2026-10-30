import { type HealthCheckResponse } from '@zms/shared';
import { PrismaService } from '../prisma/prisma.service';
export declare class HealthService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getHealth(): Promise<HealthCheckResponse>;
}
