import { ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { PaymentMethod, UserRole } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  const paymentsServiceMock = {
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
          provide: PaymentsService,
          useValue: paymentsServiceMock,
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
      controllers: [PaymentsController],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('forwards create requests to the service with authenticated actor context', async () => {
    const dto = {
      loanId: 'loan-1',
      amount: '100',
      paymentMethod: PaymentMethod.CASH,
      reference: 'PAY-1',
    };
    paymentsServiceMock.create.mockResolvedValue({ id: 'payment-1' });

    await controller.create(dto, 'customer-user-1', UserRole.CUSTOMER);

    expect(paymentsServiceMock.create).toHaveBeenCalledWith(dto, {
      id: 'customer-user-1',
      role: UserRole.CUSTOMER,
    });
  });

  it('forwards findAll requests to the service with query and authenticated actor context', async () => {
    const query = { skip: 0, take: 10 };
    paymentsServiceMock.findAll.mockResolvedValue([{ id: 'payment-1' }]);

    await controller.findAll(query, 'admin-user-1', UserRole.ADMIN);

    expect(paymentsServiceMock.findAll).toHaveBeenCalledWith(query, {
      id: 'admin-user-1',
      role: UserRole.ADMIN,
    });
  });

  it('forwards findOne requests to the service with params and authenticated actor context', async () => {
    paymentsServiceMock.findOne.mockResolvedValue({ id: 'payment-1' });

    await controller.findOne('payment-1', 'agent-user-1', UserRole.AGENT);

    expect(paymentsServiceMock.findOne).toHaveBeenCalledWith('payment-1', {
      id: 'agent-user-1',
      role: UserRole.AGENT,
    });
  });

  it('forwards update requests to the service with params, payload, and authenticated actor context', async () => {
    const dto = { amount: '150' };
    paymentsServiceMock.update.mockResolvedValue({ id: 'payment-1' });

    await controller.update('payment-1', dto, 'agent-user-1', UserRole.AGENT);

    expect(paymentsServiceMock.update).toHaveBeenCalledWith('payment-1', dto, {
      id: 'agent-user-1',
      role: UserRole.AGENT,
    });
  });

  it('forwards delete requests to the service with params and authenticated actor context', async () => {
    paymentsServiceMock.delete.mockResolvedValue({
      message: 'Payment payment-1 has been deleted',
    });

    await controller.delete('payment-1', 'admin-user-1', UserRole.ADMIN);

    expect(paymentsServiceMock.delete).toHaveBeenCalledWith('payment-1', {
      id: 'admin-user-1',
      role: UserRole.ADMIN,
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
