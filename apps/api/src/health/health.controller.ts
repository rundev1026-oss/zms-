import { Controller, Get, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../common/public.decorator';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness: the API process is running' })
  @ApiOkResponse({ description: 'HTTP 200 even when the database is unavailable' })
  getHealth() {
    return this.healthService.getHealth();
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness: PostgreSQL must answer' })
  @ApiOkResponse({ description: 'HTTP 200 when the database is reachable, otherwise 503' })
  async ready(@Res({ passthrough: true }) response: Response) {
    const health = await this.healthService.getHealth();
    response.status(health.database.connected ? 200 : 503);
    return health;
  }
}
