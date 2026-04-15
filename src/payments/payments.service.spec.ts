import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentMethod,
  PaymentRecordedBy,
  PaymentStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  const prismaMock = {
    agent: {
      findFirst: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
    },
    loan: {
      findFirst: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const paymentRecord = {
    id: 'payment-1',
    loan_id: 'loan-1',
    amount: new Prisma.Decimal('100'),
    payment_method: PaymentMethod.CASH,
    reference: 'PAY-1',
    status: PaymentStatus.COMPLETED,
    paid_at: new Date('2026-01-01T00:00:00.000Z'),
    recorded_by: PaymentRecordedBy.CUSTOMER,
    recorded_by_id: 'customer-user-1',
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    deleted_at: null,
    loan: {
      customer_id: 'customer-1',
      agent_id: 'agent-user-1',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates payment as CUSTOMER for own loan', async () => {
    jest.useFakeTimers();
    const paidAt = new Date('2026-01-05T00:00:00.000Z');
    jest.setSystemTime(paidAt);
    const createdPaymentRecord = {
      ...paymentRecord,
      paid_at: paidAt,
      created_at: paidAt,
      updated_at: paidAt,
    };

    prismaMock.loan.findFirst.mockResolvedValue({
      id: 'loan-1',
      customer_id: 'customer-1',
      agent_id: 'agent-user-1',
      status: 'ACTIVE',
    });
    prismaMock.customer.findFirst.mockResolvedValue({ id: 'customer-1' });
    prismaMock.payment.create.mockResolvedValue(createdPaymentRecord);

    try {
      const result = await service.create(
        {
          loanId: 'loan-1',
          amount: '100',
          paymentMethod: PaymentMethod.CASH,
          reference: 'PAY-1',
        },
        { id: 'customer-user-1', role: UserRole.CUSTOMER },
      );

      expect(result.id).toBe('payment-1');
      expect(result.amount).toBe('100');
      expect(prismaMock.payment.create).toHaveBeenCalledWith({
        data: {
          loan_id: 'loan-1',
          amount: '100',
          payment_method: PaymentMethod.CASH,
          reference: 'PAY-1',
          status: PaymentStatus.COMPLETED,
          paid_at: paidAt,
          recorded_by: PaymentRecordedBy.CUSTOMER,
          recorded_by_id: 'customer-user-1',
        },
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('creates payment as ADMIN with SYSTEM recorder and null recorded_by_id', async () => {
    jest.useFakeTimers();
    const paidAt = new Date('2026-01-07T00:00:00.000Z');
    jest.setSystemTime(paidAt);
    const createdPaymentRecord = {
      ...paymentRecord,
      paid_at: paidAt,
      created_at: paidAt,
      updated_at: paidAt,
      recorded_by: PaymentRecordedBy.SYSTEM,
      recorded_by_id: null,
    };

    prismaMock.loan.findFirst.mockResolvedValue({
      id: 'loan-1',
      customer_id: 'customer-1',
      agent_id: 'agent-user-1',
      status: 'ACTIVE',
    });
    prismaMock.payment.create.mockResolvedValue(createdPaymentRecord);

    try {
      const result = await service.create(
        {
          loanId: 'loan-1',
          amount: '100',
          paymentMethod: PaymentMethod.CASH,
          reference: 'PAY-ADMIN-1',
        },
        { id: 'admin-user-1', role: UserRole.ADMIN },
      );

      expect(result.id).toBe('payment-1');
      expect(result.recordedBy).toBe(PaymentRecordedBy.SYSTEM);
      expect(result.recordedByUserId).toBeNull();
      expect(prismaMock.payment.create).toHaveBeenCalledWith({
        data: {
          loan_id: 'loan-1',
          amount: '100',
          payment_method: PaymentMethod.CASH,
          reference: 'PAY-ADMIN-1',
          status: PaymentStatus.COMPLETED,
          paid_at: paidAt,
          recorded_by: PaymentRecordedBy.SYSTEM,
          recorded_by_id: null,
        },
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('rejects CUSTOMER create for loan outside ownership', async () => {
    prismaMock.loan.findFirst.mockResolvedValue({
      id: 'loan-1',
      customer_id: 'customer-2',
      agent_id: 'agent-user-1',
      status: 'ACTIVE',
    });
    prismaMock.customer.findFirst.mockResolvedValue({ id: 'customer-1' });

    await expect(
      service.create(
        {
          loanId: 'loan-1',
          amount: '100',
          paymentMethod: PaymentMethod.CASH,
          reference: 'PAY-1',
        },
        { id: 'customer-user-1', role: UserRole.CUSTOMER },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects AGENT access when customer is reassigned to another agent', async () => {
    prismaMock.agent.findFirst.mockResolvedValue({ id: 'agent-profile-1' });
    prismaMock.customer.findFirst.mockResolvedValue({
      id: 'customer-1',
      agent_id: 'agent-profile-2',
    });
    prismaMock.payment.findUnique.mockResolvedValue(paymentRecord);

    await expect(
      service.findOne('payment-1', {
        id: 'agent-user-1',
        role: UserRole.AGENT,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('scopes AGENT findAll to the agent profile and customer assignment', async () => {
    prismaMock.agent.findFirst.mockResolvedValue({ id: 'agent-profile-1' });
    prismaMock.payment.findMany.mockResolvedValue([paymentRecord]);

    await service.findAll(
      { skip: 0, take: 10 },
      { id: 'agent-user-1', role: UserRole.AGENT },
    );

    expect(prismaMock.payment.findMany).toHaveBeenCalledWith({
      where: {
        deleted_at: null,
        loan: {
          customer: {
            agent_id: 'agent-profile-1',
          },
        },
      },
      skip: 0,
      take: 10,
      orderBy: { created_at: 'desc' },
    });
  });

  it('rejects AGENT findAll when customer is assigned to another agent', async () => {
    prismaMock.agent.findFirst.mockResolvedValue({ id: 'agent-profile-1' });
    prismaMock.customer.findFirst.mockResolvedValue({
      id: 'customer-1',
      agent_id: 'agent-profile-2',
    });

    await expect(
      service.findAll(
        { skip: 0, take: 10, customerId: 'customer-1' },
        { id: 'agent-user-1', role: UserRole.AGENT },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects create for PAID loan', async () => {
    prismaMock.loan.findFirst.mockResolvedValue({
      id: 'loan-1',
      customer_id: 'customer-1',
      agent_id: 'agent-user-1',
      status: 'PAID',
    });

    await expect(
      service.create(
        {
          loanId: 'loan-1',
          amount: '100',
          paymentMethod: PaymentMethod.CASH,
          reference: 'PAY-1',
        },
        { id: 'admin-user-1', role: UserRole.ADMIN },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('falls back to a generic message when unique constraint target is missing', async () => {
    prismaMock.loan.findFirst.mockResolvedValue({
      id: 'loan-1',
      customer_id: 'customer-1',
      agent_id: 'agent-user-1',
      status: 'ACTIVE',
    });
    prismaMock.customer.findFirst.mockResolvedValue({ id: 'customer-1' });
    prismaMock.payment.create.mockRejectedValue({
      code: 'P2002',
      meta: {},
    });

    await expect(
      service.create(
        {
          loanId: 'loan-1',
          amount: '100',
          paymentMethod: PaymentMethod.CASH,
          reference: 'PAY-1',
        },
        { id: 'customer-user-1', role: UserRole.CUSTOMER },
      ),
    ).rejects.toThrow('Payment violates a unique constraint');
  });

  it('scopes CUSTOMER findAll to own payments', async () => {
    prismaMock.customer.findFirst.mockResolvedValue({ id: 'customer-1' });
    prismaMock.payment.findMany.mockResolvedValue([paymentRecord]);

    await service.findAll(
      { skip: 0, take: 10 },
      { id: 'customer-user-1', role: UserRole.CUSTOMER },
    );

    expect(prismaMock.payment.findMany).toHaveBeenCalledWith({
      where: {
        deleted_at: null,
        loan: {
          customer_id: 'customer-1',
        },
      },
      skip: 0,
      take: 10,
      orderBy: { created_at: 'desc' },
    });
  });

  it('rejects CUSTOMER update', async () => {
    await expect(
      service.update(
        'payment-1',
        { amount: '150' },
        { id: 'customer-user-1', role: UserRole.CUSTOMER },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('clears paid_at when status changes to FAILED without an explicit paidAt', async () => {
    prismaMock.payment.findUnique.mockResolvedValue(paymentRecord);
    prismaMock.payment.update.mockResolvedValue({
      ...paymentRecord,
      status: PaymentStatus.FAILED,
      paid_at: null,
      loan: {
        customer_id: 'customer-1',
        agent_id: 'agent-user-1',
      },
    });

    await service.update(
      'payment-1',
      { status: PaymentStatus.FAILED },
      { id: 'admin-user-1', role: UserRole.ADMIN },
    );

    expect(prismaMock.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: {
        status: PaymentStatus.FAILED,
        paid_at: null,
      },
    });
  });

  it('does not overwrite paid_at when status stays COMPLETED without explicit paidAt', async () => {
    prismaMock.payment.findUnique.mockResolvedValue(paymentRecord);
    prismaMock.payment.update.mockResolvedValue({
      ...paymentRecord,
      status: PaymentStatus.COMPLETED,
      loan: {
        customer_id: 'customer-1',
        agent_id: 'agent-user-1',
      },
    });

    await service.update(
      'payment-1',
      { status: PaymentStatus.COMPLETED },
      { id: 'admin-user-1', role: UserRole.ADMIN },
    );

    expect(prismaMock.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: {
        status: PaymentStatus.COMPLETED,
      },
    });
  });

  it('soft-deletes payment and returns message', async () => {
    jest.useFakeTimers();
    const deletedAt = new Date('2026-01-06T00:00:00.000Z');
    jest.setSystemTime(deletedAt);

    prismaMock.payment.findUnique.mockResolvedValue(paymentRecord);
    prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });

    try {
      const result = await service.delete('payment-1', {
        id: 'admin-user-1',
        role: UserRole.ADMIN,
      });

      expect(prismaMock.payment.updateMany).toHaveBeenCalledWith({
        where: { id: 'payment-1', deleted_at: null },
        data: { deleted_at: deletedAt },
      });
      expect(result).toEqual({ message: 'Payment payment-1 has been deleted' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('throws not found for missing payment', async () => {
    prismaMock.payment.findUnique.mockResolvedValue(null);

    await expect(
      service.findOne('payment-unknown', {
        id: 'admin-user-1',
        role: UserRole.ADMIN,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
