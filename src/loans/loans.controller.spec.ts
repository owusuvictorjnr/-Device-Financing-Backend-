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

  it('forwards findAll requests to the service with query and authenticated actor context', async () => {
    const query = { skip: 0, take: 10 };
    loansServiceMock.findAll.mockResolvedValue([{ id: 'loan-1' }]);

    await controller.findAll(query, 'admin-user-1', UserRole.ADMIN);

    expect(loansServiceMock.findAll).toHaveBeenCalledWith(query, {
      id: 'admin-user-1',
      role: UserRole.ADMIN,
    });
  });

  it('rejects findAll when authenticated user context is missing', async () => {
    await expect(
      controller.findAll({ skip: 0, take: 10 }, '', UserRole.ADMIN),
    ).rejects.toThrow(ForbiddenException);
    expect(loansServiceMock.findAll).not.toHaveBeenCalled();
  });

  it('forwards findOne requests to the service with params and authenticated actor context', async () => {
    loansServiceMock.findOne.mockResolvedValue({ id: 'loan-1' });

    await controller.findOne('loan-1', 'agent-user-1', UserRole.AGENT);

    expect(loansServiceMock.findOne).toHaveBeenCalledWith('loan-1', {
      id: 'agent-user-1',
      role: UserRole.AGENT,
    });
  });

  it('rejects findOne when authenticated user context is missing', async () => {
    await expect(
      controller.findOne('loan-1', '', UserRole.ADMIN),
    ).rejects.toThrow(ForbiddenException);
    expect(loansServiceMock.findOne).not.toHaveBeenCalled();
  });

  it('forwards update requests to the service with params, payload, and authenticated actor context', async () => {
    const dto = {
      principalAmount: 1200,
      installmentAmount: 120,
    };
    loansServiceMock.update.mockResolvedValue({ id: 'loan-1' });

    await controller.update('loan-1', dto, 'agent-user-1', UserRole.AGENT);

    expect(loansServiceMock.update).toHaveBeenCalledWith('loan-1', dto, {
      id: 'agent-user-1',
      role: UserRole.AGENT,
    });
  });

  it('rejects update when authenticated user context is missing', async () => {
    await expect(
      controller.update(
        'loan-1',
        { principalAmount: 1200 },
        '',
        UserRole.ADMIN,
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(loansServiceMock.update).not.toHaveBeenCalled();
  });

  it('forwards delete requests to the service with params and authenticated actor context', async () => {
    loansServiceMock.delete.mockResolvedValue({
      message: 'Loan loan-1 has been deleted',
    });

    await controller.delete('loan-1', 'admin-user-1', UserRole.ADMIN);

    expect(loansServiceMock.delete).toHaveBeenCalledWith('loan-1', {
      id: 'admin-user-1',
      role: UserRole.ADMIN,
    });
  });

  it('rejects delete when authenticated user context is missing', async () => {
    await expect(
      controller.delete('loan-1', '', UserRole.ADMIN),
    ).rejects.toThrow(ForbiddenException);
    expect(loansServiceMock.delete).not.toHaveBeenCalled();
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
