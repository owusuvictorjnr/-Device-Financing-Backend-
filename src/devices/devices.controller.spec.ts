import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DevicePlatform, DeviceType, UserRole } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';

describe('DevicesController', () => {
  let controller: DevicesController;
  const devicesServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevicesController],
      providers: [
        {
          provide: DevicesService,
          useValue: devicesServiceMock,
        },
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DevicesController>(DevicesController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('forwards create requests to the service with authenticated actor context', async () => {
    devicesServiceMock.create.mockResolvedValue({ id: 'device-1' });

    await controller.create(
      {
        serialNumber: 'SN-001',
        deviceType: DeviceType.ANDROID_PHONE,
        platform: DevicePlatform.ANDROID,
        model: 'Model X',
      },
      'admin-1',
      UserRole.ADMIN,
    );

    expect(devicesServiceMock.create).toHaveBeenCalledWith(
      {
        serialNumber: 'SN-001',
        deviceType: DeviceType.ANDROID_PHONE,
        platform: DevicePlatform.ANDROID,
        model: 'Model X',
      },
      { id: 'admin-1', role: UserRole.ADMIN },
    );
  });

  it('rejects missing authenticated user context', () => {
    expect(() =>
      (
        controller as unknown as {
          getActor: (id: string, role: UserRole) => unknown;
        }
      ).getActor('', UserRole.ADMIN),
    ).toThrow(ForbiddenException);
  });
});
