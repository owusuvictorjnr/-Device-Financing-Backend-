import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  DevicePlatform,
  DeviceStatus,
  DeviceType,
  UserRole,
} from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { DevicesService } from './devices.service';

describe('DevicesService', () => {
  let service: DevicesService;
  const prismaMock = {
    agent: {
      findFirst: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
    },
    device: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const deviceRecord = {
    id: 'device-1',
    serial_number: 'SN-001',
    device_type: DeviceType.ANDROID_PHONE,
    platform: DevicePlatform.ANDROID,
    model: 'Model X',
    status: DeviceStatus.ACTIVE,
    customer_id: 'customer-1',
    last_seen: new Date('2026-01-01T00:00:00.000Z'),
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-02T00:00:00.000Z'),
    deleted_at: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a device with optional customer assignment for admin', async () => {
    prismaMock.customer.findFirst.mockResolvedValue({
      id: 'customer-1',
      agent_id: 'agent-1',
    });
    prismaMock.device.create.mockResolvedValue(deviceRecord);

    const result = await service.create(
      {
        serialNumber: 'SN-001',
        deviceType: DeviceType.ANDROID_PHONE,
        platform: DevicePlatform.ANDROID,
        model: 'Model X',
        customerId: 'customer-1',
      },
      { id: 'admin-1', role: UserRole.ADMIN },
    );

    expect(prismaMock.device.create).toHaveBeenCalledWith({
      data: {
        serial_number: 'SN-001',
        device_type: DeviceType.ANDROID_PHONE,
        platform: DevicePlatform.ANDROID,
        model: 'Model X',
        status: DeviceStatus.ACTIVE,
        customer_id: 'customer-1',
        last_seen: null,
      },
    });
    expect(result).toEqual({
      id: deviceRecord.id,
      serialNumber: deviceRecord.serial_number,
      deviceType: deviceRecord.device_type,
      platform: deviceRecord.platform,
      model: deviceRecord.model,
      status: deviceRecord.status,
      customerId: deviceRecord.customer_id,
      lastSeen: deviceRecord.last_seen,
      createdAt: deviceRecord.created_at,
      updatedAt: deviceRecord.updated_at,
      deletedAt: deviceRecord.deleted_at,
    });
  });

  it('allows AGENT to create unassigned devices (inventory)', async () => {
    const unassignedDeviceRecord = { ...deviceRecord, customer_id: null };
    prismaMock.device.create.mockResolvedValue(unassignedDeviceRecord);

    const result = await service.create(
      {
        serialNumber: 'SN-002',
        deviceType: DeviceType.TV,
        platform: DevicePlatform.IOT,
        model: 'Model Y',
        // customerId intentionally omitted
      },
      { id: 'agent-user-1', role: UserRole.AGENT },
    );

    expect(prismaMock.device.create).toHaveBeenCalledWith({
      data: {
        serial_number: 'SN-002',
        device_type: DeviceType.TV,
        platform: DevicePlatform.IOT,
        model: 'Model Y',
        status: DeviceStatus.ACTIVE,
        customer_id: null,
        last_seen: null,
      },
    });
    expect(result.customerId).toBeNull();
  });

  it('rejects AGENT create requests for customers outside their portfolio', async () => {
    prismaMock.customer.findFirst.mockResolvedValue({
      id: 'customer-1',
      agent_id: 'agent-2',
    });
    prismaMock.agent.findFirst.mockResolvedValue({ id: 'agent-1' });

    await expect(
      service.create(
        {
          serialNumber: 'SN-002',
          deviceType: DeviceType.TV,
          platform: DevicePlatform.IOT,
          model: 'Model Y',
          customerId: 'customer-1',
        },
        { id: 'agent-user-1', role: UserRole.AGENT },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows AGENT to view both assigned devices and unassigned inventory', async () => {
    prismaMock.agent.findFirst.mockResolvedValue({ id: 'agent-1' });
    prismaMock.device.findMany.mockResolvedValue([deviceRecord]);

    await service.findAll(
      { skip: 0, take: 10 },
      { id: 'agent-user-1', role: UserRole.AGENT },
    );

    expect(prismaMock.device.findMany).toHaveBeenCalledWith({
      where: {
        deleted_at: null,
        OR: [
          { customer_id: null },
          {
            customer: {
              deleted_at: null,
              agent_id: 'agent-1',
            },
          },
        ],
      },
      skip: 0,
      take: 10,
      orderBy: { created_at: 'desc' },
    });
  });

  it('scopes customer visibility to their own devices', async () => {
    prismaMock.customer.findFirst.mockResolvedValue({ id: 'customer-1' });
    prismaMock.device.findMany.mockResolvedValue([deviceRecord]);

    await service.findAll(
      { skip: 0, take: 10 },
      { id: 'customer-user-1', role: UserRole.CUSTOMER },
    );

    expect(prismaMock.device.findMany).toHaveBeenCalledWith({
      where: {
        deleted_at: null,
        customer_id: 'customer-1',
      },
      skip: 0,
      take: 10,
      orderBy: { created_at: 'desc' },
    });
  });

  it('allows AGENT to access unassigned devices (inventory)', async () => {
    const unassignedDevice = { ...deviceRecord, customer_id: null };
    prismaMock.device.findUnique.mockResolvedValue(unassignedDevice);
    prismaMock.agent.findFirst.mockResolvedValue({ id: 'agent-1' });

    const result = await service.findOne('device-1', {
      id: 'agent-user-1',
      role: UserRole.AGENT,
    });

    expect(result.customerId).toBeNull();
  });

  it('rejects device lookup when the customer does not own it', async () => {
    prismaMock.device.findUnique.mockResolvedValue(deviceRecord);
    prismaMock.customer.findFirst.mockResolvedValue({ id: 'customer-2' });

    await expect(
      service.findOne('device-1', {
        id: 'customer-user-1',
        role: UserRole.CUSTOMER,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('soft-deletes a device and returns a success message', async () => {
    type UpdateManyArgs = {
      where: { id: string; deleted_at: null };
      data: { deleted_at: Date };
    };

    let capturedUpdateManyArgs: UpdateManyArgs | undefined;

    prismaMock.device.findUnique.mockResolvedValue(deviceRecord);
    prismaMock.device.updateMany.mockImplementation((args: UpdateManyArgs) => {
      capturedUpdateManyArgs = args;

      return { count: 1 };
    });

    const result = await service.delete('device-1', {
      id: 'admin-1',
      role: UserRole.ADMIN,
    });

    expect(prismaMock.device.updateMany).toHaveBeenCalledTimes(1);
    expect(capturedUpdateManyArgs).toBeDefined();
    expect(capturedUpdateManyArgs?.where).toEqual({
      id: 'device-1',
      deleted_at: null,
    });
    expect(capturedUpdateManyArgs?.data.deleted_at).toBeInstanceOf(Date);
    expect(result).toEqual({ message: 'Device device-1 has been deleted' });
  });

  it('throws not found when updateMany affects zero rows during delete', async () => {
    prismaMock.device.findUnique.mockResolvedValue(deviceRecord);
    prismaMock.device.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.delete('device-1', {
        id: 'admin-1',
        role: UserRole.ADMIN,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps unique constraint errors to a bad request', async () => {
    prismaMock.device.create.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['serial_number'] },
    });

    await expect(
      service.create(
        {
          serialNumber: 'SN-001',
          deviceType: DeviceType.ANDROID_PHONE,
          platform: DevicePlatform.ANDROID,
          model: 'Model X',
        },
        { id: 'admin-1', role: UserRole.ADMIN },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
