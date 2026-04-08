import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

interface HealthResponse {
  status: 'success';
  data: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
  };
}

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth(): Promise<HealthResponse> {
    return this.healthService.getHealth();
  }
}
