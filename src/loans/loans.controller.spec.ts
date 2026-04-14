import { ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';

describe('LoansController', () => {
  let controller: LoansController;
  const loansServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: LoansService,
          useValue: loansServiceMock,
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
      controllers: [LoansController],
    }).compile();

    controller = module.get<LoansController>(LoansController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('forwards create requests to the service with authenticated actor context', async () => {
    const dto = {
      customerId: 'customer-1',
      deviceId: 'device-1',
      principalAmount: 1000,
      installmentAmount: 100,
      durationDays: 10,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
    };

    loansServiceMock.create.mockResolvedValue({ id: 'loan-1' });

    await controller.create(dto, 'agent-user-1', UserRole.AGENT);

    expect(loansServiceMock.create).toHaveBeenCalledWith(dto, {
      id: 'agent-user-1',
      role: UserRole.AGENT,
    });
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
