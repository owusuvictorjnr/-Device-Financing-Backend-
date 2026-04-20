import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DeviceSyncController } from './device-sync.controller';
import { DeviceSyncService } from './device-sync.service';

describe('DeviceSyncController', () => {
  let controller: DeviceSyncController;
  const deviceSyncServiceMock: {
    sync: jest.MockedFunction<
      (
        dto: {
          serialNumber: string;
          status?: string;
          lastSeen?: Date;
        },
        actor: { id: string; role: UserRole },
      ) => Promise<{ id: string }>
    >;
  } = {
    sync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: DeviceSyncService,
          useValue: deviceSyncServiceMock,
        },
        {
          provide: JwtService,
          useValue: { verify: jest.fn() },
        },
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn() },
        },
      ],
      controllers: [DeviceSyncController],
    }).compile();

    controller = module.get<DeviceSyncController>(DeviceSyncController);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('forwards sync requests to the service with authenticated actor context', async () => {
    const dto = {
      serialNumber: 'SN-001',
      status: 'ACTIVE' as const,
    };
    deviceSyncServiceMock.sync.mockResolvedValue({ id: 'device-1' });

    await controller.sync(dto, 'agent-user-1', UserRole.AGENT);

    expect(deviceSyncServiceMock.sync).toHaveBeenCalledWith(dto, {
      id: 'agent-user-1',
      role: UserRole.AGENT,
    });
  });

  it('rejects missing authenticated user context', () => {
    expect(() =>
      controller.sync({ serialNumber: 'SN-001' }, '', UserRole.ADMIN),
    ).toThrow(ForbiddenException);
  });
});
