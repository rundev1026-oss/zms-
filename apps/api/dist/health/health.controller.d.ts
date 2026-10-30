import type { Response } from 'express';
import { HealthService } from './health.service';
export declare class HealthController {
    private readonly healthService;
    constructor(healthService: HealthService);
    getHealth(): Promise<import("@zms/shared").HealthCheckResponse>;
    ready(response: Response): Promise<import("@zms/shared").HealthCheckResponse>;
}
