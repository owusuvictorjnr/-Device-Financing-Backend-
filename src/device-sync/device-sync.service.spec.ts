import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  DevicePlatform,
  DeviceStatus,
  DeviceType,
  UserRole,
} from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from '../database/prisma.service';
import { DeviceSyncService } from './device-sync.service';

describe('DeviceSyncService', () => {
  let service: DeviceSyncService;
  type AsyncMock = jest.MockedFunction<(...args: any[]) => Promise<any>>;

  const prismaMock: {
    device: {
      findFirst: AsyncMock;
      update: AsyncMock;
    };
  } = {
    device: {
      findFirst: jest.fn() as AsyncMock,
      update: jest.fn() as AsyncMock,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceSyncService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<DeviceSyncService>(DeviceSyncService);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('syncs a device heartbeat and updates last_seen', async () => {
    const now = new Date('2026-01-09T00:00:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    prismaMock.device.findFirst.mockResolvedValue({
      id: 'device-1',
      serial_number: 'SN-001',
      device_type: DeviceType.ANDROID_PHONE,
      platform: DevicePlatform.ANDROID,
      model: 'Model X',
      status: DeviceStatus.ACTIVE,
      customer_id: 'customer-1',
      last_seen: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
    prismaMock.device.update.mockResolvedValue({
      id: 'device-1',
      serial_number: 'SN-001',
      device_type: DeviceType.ANDROID_PHONE,
      platform: DevicePlatform.ANDROID,
      model: 'Model X',
      status: DeviceStatus.ACTIVE,
      customer_id: 'customer-1',
      last_seen: now,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });

    try {
      const result = await service.sync(
        { serialNumber: 'SN-001' },
        { id: 'agent-user-1', role: UserRole.AGENT },
      );

      expect(prismaMock.device.update).toHaveBeenCalledWith({
        where: { id: 'device-1' },
        data: { last_seen: now },
      });
      expect(result.serialNumber).toBe('SN-001');
      expect(result.lastSeen).toEqual(now);
    } finally {
      jest.useRealTimers();
    }
  });

  it('rejects missing device when syncing', async () => {
    prismaMock.device.findFirst.mockResolvedValue(null);

    await expect(
      service.sync(
        { serialNumber: 'SN-404' },
        { id: 'admin-user-1', role: UserRole.ADMIN },
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects CUSTOMER sync requests', async () => {
    await expect(
      service.sync(
        { serialNumber: 'SN-001' },
        { id: 'customer-user-1', role: UserRole.CUSTOMER },
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
