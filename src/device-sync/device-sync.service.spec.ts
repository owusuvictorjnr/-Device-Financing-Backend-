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
    agent: {
      findFirst: AsyncMock;
    };
    customer: {
      findFirst: AsyncMock;
    };
    device: {
      findUnique: AsyncMock;
      updateMany: AsyncMock;
    };
  } = {
    agent: {
      findFirst: jest.fn() as AsyncMock,
    },
    customer: {
      findFirst: jest.fn() as AsyncMock,
    },
    device: {
      findUnique: jest.fn() as AsyncMock,
      updateMany: jest.fn() as AsyncMock,
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

    prismaMock.device.findUnique
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
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
    prismaMock.agent.findFirst.mockResolvedValue({ id: 'agent-profile-1' });
    prismaMock.customer.findFirst.mockResolvedValue({
      id: 'customer-1',
      agent_id: 'agent-profile-1',
    });
    prismaMock.device.updateMany.mockResolvedValue({ count: 1 });

    try {
      const result = await service.sync(
        { serialNumber: 'SN-001' },
        { id: 'agent-user-1', role: UserRole.AGENT },
      );

      expect(prismaMock.device.updateMany).toHaveBeenCalledWith({
        where: { id: 'device-1', deleted_at: null },
        data: { last_seen: now },
      });
      expect(result.serialNumber).toBe('SN-001');
      expect(result.lastSeen).toEqual(now);
    } finally {
      jest.useRealTimers();
    }
  });

  it('allows AGENT sync for unassigned devices', async () => {
    const now = new Date('2026-01-10T00:00:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    prismaMock.device.findUnique
      .mockResolvedValueOnce({
        id: 'device-2',
        serial_number: 'SN-002',
        device_type: DeviceType.ANDROID_PHONE,
        platform: DevicePlatform.ANDROID,
        model: 'Model Y',
        status: DeviceStatus.ACTIVE,
        customer_id: null,
        last_seen: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })
      .mockResolvedValueOnce({
        id: 'device-2',
        serial_number: 'SN-002',
        device_type: DeviceType.ANDROID_PHONE,
        platform: DevicePlatform.ANDROID,
        model: 'Model Y',
        status: DeviceStatus.ACTIVE,
        customer_id: null,
        last_seen: now,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
    prismaMock.agent.findFirst.mockResolvedValue({ id: 'agent-profile-1' });
    prismaMock.device.updateMany.mockResolvedValue({ count: 1 });

    try {
      const result = await service.sync(
        { serialNumber: 'SN-002' },
        { id: 'agent-user-1', role: UserRole.AGENT },
      );

      expect(prismaMock.customer.findFirst).not.toHaveBeenCalled();
      expect(result.customerId).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('persists provided status in updateMany payload', async () => {
    const now = new Date('2026-01-13T00:00:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    prismaMock.device.findUnique
      .mockResolvedValueOnce({
        id: 'device-5',
        serial_number: 'SN-005',
        device_type: DeviceType.ANDROID_PHONE,
        platform: DevicePlatform.ANDROID,
        model: 'Model B',
        status: DeviceStatus.ACTIVE,
        customer_id: null,
        last_seen: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })
      .mockResolvedValueOnce({
        id: 'device-5',
        serial_number: 'SN-005',
        device_type: DeviceType.ANDROID_PHONE,
        platform: DevicePlatform.ANDROID,
        model: 'Model B',
        status: DeviceStatus.LOCKED,
        customer_id: null,
        last_seen: now,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
    prismaMock.device.updateMany.mockResolvedValue({ count: 1 });

    try {
      await service.sync(
        { serialNumber: 'SN-005', status: DeviceStatus.LOCKED },
        { id: 'admin-user-1', role: UserRole.ADMIN },
      );

      expect(prismaMock.device.updateMany).toHaveBeenCalledWith({
        where: { id: 'device-5', deleted_at: null },
        data: {
          last_seen: now,
          status: DeviceStatus.LOCKED,
        },
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('uses explicit lastSeen instead of system time', async () => {
    const now = new Date('2026-01-14T00:00:00.000Z');
    const explicitLastSeen = new Date('2026-01-01T12:30:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    prismaMock.device.findUnique
      .mockResolvedValueOnce({
        id: 'device-6',
        serial_number: 'SN-006',
        device_type: DeviceType.ANDROID_PHONE,
        platform: DevicePlatform.ANDROID,
        model: 'Model C',
        status: DeviceStatus.ACTIVE,
        customer_id: null,
        last_seen: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })
      .mockResolvedValueOnce({
        id: 'device-6',
        serial_number: 'SN-006',
        device_type: DeviceType.ANDROID_PHONE,
        platform: DevicePlatform.ANDROID,
        model: 'Model C',
        status: DeviceStatus.ACTIVE,
        customer_id: null,
        last_seen: explicitLastSeen,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
    prismaMock.device.updateMany.mockResolvedValue({ count: 1 });

    try {
      await service.sync(
        { serialNumber: 'SN-006', lastSeen: explicitLastSeen },
        { id: 'admin-user-1', role: UserRole.ADMIN },
      );

      expect(prismaMock.device.updateMany).toHaveBeenCalledWith({
        where: { id: 'device-6', deleted_at: null },
        data: {
          last_seen: explicitLastSeen,
        },
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('rejects AGENT sync for devices assigned to another agent customer', async () => {
    const now = new Date('2026-01-11T00:00:00.000Z');

    prismaMock.device.findUnique.mockResolvedValue({
      id: 'device-3',
      serial_number: 'SN-003',
      device_type: DeviceType.ANDROID_PHONE,
      platform: DevicePlatform.ANDROID,
      model: 'Model Z',
      status: DeviceStatus.ACTIVE,
      customer_id: 'customer-3',
      last_seen: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
    prismaMock.agent.findFirst.mockResolvedValue({ id: 'agent-profile-1' });
    prismaMock.customer.findFirst.mockResolvedValue({
      id: 'customer-3',
      agent_id: 'agent-profile-2',
    });

    await expect(
      service.sync(
        { serialNumber: 'SN-003' },
        { id: 'agent-user-1', role: UserRole.AGENT },
      ),
    ).rejects.toThrow('Agents can only sync devices for their customers');

    expect(prismaMock.device.updateMany).not.toHaveBeenCalled();
  });

  it('treats sync as not found when guarded updateMany affects no rows', async () => {
    const now = new Date('2026-01-12T00:00:00.000Z');

    prismaMock.device.findUnique.mockResolvedValue({
      id: 'device-4',
      serial_number: 'SN-004',
      device_type: DeviceType.ANDROID_PHONE,
      platform: DevicePlatform.ANDROID,
      model: 'Model A',
      status: DeviceStatus.ACTIVE,
      customer_id: null,
      last_seen: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
    prismaMock.agent.findFirst.mockResolvedValue({ id: 'agent-profile-1' });
    prismaMock.device.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.sync(
        { serialNumber: 'SN-004' },
        { id: 'agent-user-1', role: UserRole.AGENT },
      ),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.device.findUnique).toHaveBeenCalledTimes(1);
  });

  it('rejects missing device when syncing', async () => {
    prismaMock.device.findUnique.mockResolvedValue(null);

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
