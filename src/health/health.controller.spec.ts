import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: { getHealth: jest.Mock };

  beforeEach(async () => {
    healthService = {
      getHealth: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: healthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health data from service', async () => {
    const healthPayload = {
      status: 'success' as const,
      data: {
        database: 'up' as const,
        redis: 'down' as const,
      },
    };

    healthService.getHealth.mockResolvedValue(healthPayload);

    await expect(controller.getHealth()).resolves.toEqual(healthPayload);
    expect(healthService.getHealth).toHaveBeenCalledTimes(1);
  });

  it('should throw 503 when overall health is error', async () => {
    healthService.getHealth.mockResolvedValue({
      status: 'error',
      data: {
        database: 'down',
        redis: 'up',
      },
    });

    await expect(controller.getHealth()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(healthService.getHealth).toHaveBeenCalledTimes(1);
  });
});
