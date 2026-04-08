import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';
import type { HealthResponse } from './health.types';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth(): Promise<HealthResponse> {
    const health = await this.healthService.getHealth();

    if (health.status === 'error') {
      throw new ServiceUnavailableException({
        message: ['One or more health checks failed'],
        errors: [
          ...(health.data.database === 'down' ? ['Database is down'] : []),
          ...(health.data.redis === 'down' ? ['Redis is down'] : []),
        ],
      });
    }

    return health;
  }
}
