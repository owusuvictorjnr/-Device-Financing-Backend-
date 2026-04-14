import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { LoanStatus, Prisma, UserRole } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { LoansService } from './loans.service';

describe('LoansService', () => {
  let service: LoansService;
  const prismaMock = {
    $transaction: jest.fn(),
    agent: {
      findFirst: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
    },
    device: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    loan: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const loanRecord = {
    id: 'loan-1',
    customer_id: 'customer-1',
    device_id: 'device-1',
    agent_id: 'agent-user-1',
    principal_amount: new Prisma.Decimal(1000),
    installment_amount: new Prisma.Decimal(100),
    duration_days: 10,
    start_date: new Date('2026-01-01T00:00:00.000Z'),
    due_date: new Date('2026-01-11T00:00:00.000Z'),
    grace_period_days: 0,
    status: LoanStatus.ACTIVE,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-02T00:00:00.000Z'),
    deleted_at: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoansService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<LoansService>(LoansService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(
      async (callback: {
        (tx: {
          device: {
            updateMany: typeof prismaMock.device.updateMany;
            findUnique: typeof prismaMock.device.findUnique;
          };
          loan: {
            findFirst: typeof prismaMock.loan.findFirst;
            create: typeof prismaMock.loan.create;
          };
        }): Promise<unknown>;
      }) =>
        callback({
          device: {
            updateMany: prismaMock.device.updateMany,
            findUnique: prismaMock.device.findUnique,
          },
          loan: {
            findFirst: prismaMock.loan.findFirst,
            create: prismaMock.loan.create,
          },
        }),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates loan as ADMIN with explicit agentUserId', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: 'agent-user-2' });
    prismaMock.agent.findFirst.mockResolvedValue({
      id: 'agent-profile-1',
      user_id: 'agent-user-2',
    });
    prismaMock.customer.findFirst.mockResolvedValue({
      id: 'customer-1',
      agent_id: 'agent-profile-1',
    });
    prismaMock.device.findFirst.mockResolvedValue({
      id: 'device-1',
      customer_id: 'customer-1',
    });
    prismaMock.device.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.device.findUnique.mockResolvedValue({
      customer_id: 'customer-1',
    });
    prismaMock.loan.findFirst.mockResolvedValue(null);
    prismaMock.loan.create.mockResolvedValue(loanRecord);

    const result = await service.create(
      {
        customerId: 'customer-1',
        deviceId: 'device-1',
        principalAmount: 1000,
        installmentAmount: 100,
        durationDays: 10,
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        agentUserId: 'agent-user-2',
      },
      { id: 'admin-1', role: UserRole.ADMIN },
    );

    expect(prismaMock.loan.create).toHaveBeenCalled();
    expect(result.id).toBe('loan-1');
    expect(result.principalAmount).toBe('1000');
    expect(prismaMock.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(prismaMock.loan.findFirst).toHaveBeenCalledWith({
      where: {
        device_id: 'device-1',
        status: {
          not: LoanStatus.PAID,
        },
        deleted_at: null,
      },
      select: { id: true },
    });
  });

  it('rejects creation when device already has an outstanding loan', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: 'agent-user-2' });
    prismaMock.agent.findFirst.mockResolvedValue({
      id: 'agent-profile-1',
      user_id: 'agent-user-2',
    });
    prismaMock.customer.findFirst.mockResolvedValue({
      id: 'customer-1',
      agent_id: 'agent-profile-1',
    });
    prismaMock.device.findFirst.mockResolvedValue({
      id: 'device-1',
      customer_id: 'customer-1',
    });
    prismaMock.loan.findFirst.mockResolvedValue({ id: 'loan-overdue-1' });

    await expect(
      service.create(
        {
          customerId: 'customer-1',
          deviceId: 'device-1',
          principalAmount: 1000,
          installmentAmount: 100,
          durationDays: 10,
          startDate: new Date('2026-01-01T00:00:00.000Z'),
          agentUserId: 'agent-user-2',
        },
        { id: 'admin-1', role: UserRole.ADMIN },
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.loan.findFirst).toHaveBeenCalledWith({
      where: {
        device_id: 'device-1',
        status: {
          not: LoanStatus.PAID,
        },
        deleted_at: null,
      },
      select: { id: true },
    });
  });

  it('assigns unassigned device to customer before creating loan', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: 'agent-user-2' });
    prismaMock.agent.findFirst.mockResolvedValue({
      id: 'agent-profile-1',
      user_id: 'agent-user-2',
    });
    prismaMock.customer.findFirst.mockResolvedValue({
      id: 'customer-1',
      agent_id: 'agent-profile-1',
    });
    prismaMock.device.findFirst.mockResolvedValue({
      id: 'device-1',
      customer_id: null,
    });
    prismaMock.device.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.loan.findFirst.mockResolvedValue(null);
    prismaMock.loan.create.mockResolvedValue(loanRecord);

    await service.create(
      {
        customerId: 'customer-1',
        deviceId: 'device-1',
        principalAmount: 1000,
        installmentAmount: 100,
        durationDays: 10,
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        agentUserId: 'agent-user-2',
      },
      { id: 'admin-1', role: UserRole.ADMIN },
    );

    expect(prismaMock.device.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'device-1',
        customer_id: null,
        deleted_at: null,
      },
      data: {
        customer_id: 'customer-1',
      },
    });
    expect(prismaMock.loan.create).toHaveBeenCalled();
  });

  it('rejects ADMIN create when agentUserId is missing', async () => {
    await expect(
      service.create(
        {
          customerId: 'customer-1',
          deviceId: 'device-1',
          principalAmount: 1000,
          installmentAmount: 100,
          durationDays: 10,
          startDate: new Date('2026-01-01T00:00:00.000Z'),
        },
        { id: 'admin-1', role: UserRole.ADMIN },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects ADMIN create when selected agent is not assigned to the customer', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: 'agent-user-2' });
    prismaMock.agent.findFirst.mockResolvedValue({
      id: 'agent-profile-2',
      user_id: 'agent-user-2',
    });
    prismaMock.customer.findFirst.mockResolvedValue({
      id: 'customer-1',
      agent_id: 'agent-profile-1',
    });
    prismaMock.device.findFirst.mockResolvedValue({
      id: 'device-1',
      customer_id: 'customer-1',
    });

    await expect(
      service.create(
        {
          customerId: 'customer-1',
          deviceId: 'device-1',
          principalAmount: 1000,
          installmentAmount: 100,
          durationDays: 10,
          startDate: new Date('2026-01-01T00:00:00.000Z'),
          agentUserId: 'agent-user-2',
        },
        { id: 'admin-1', role: UserRole.ADMIN },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects AGENT create for customer outside portfolio', async () => {
    prismaMock.agent.findFirst.mockResolvedValue({
      id: 'agent-profile-1',
      user_id: 'agent-user-1',
    });
    prismaMock.customer.findFirst.mockResolvedValue({
      id: 'customer-1',
      agent_id: 'agent-profile-2',
    });
    prismaMock.device.findFirst.mockResolvedValue({
      id: 'device-1',
      customer_id: 'customer-1',
    });
    prismaMock.loan.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        {
          customerId: 'customer-1',
          deviceId: 'device-1',
          principalAmount: 1000,
          installmentAmount: 100,
          durationDays: 10,
          startDate: new Date('2026-01-01T00:00:00.000Z'),
        },
        { id: 'agent-user-1', role: UserRole.AGENT },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('uses a single agent profile lookup for AGENT create', async () => {
    prismaMock.agent.findFirst.mockResolvedValue({
      id: 'agent-profile-1',
      user_id: 'agent-user-1',
    });
    prismaMock.customer.findFirst.mockResolvedValue({
      id: 'customer-1',
      agent_id: 'agent-profile-1',
    });
    prismaMock.device.findFirst.mockResolvedValue({
      id: 'device-1',
      customer_id: 'customer-1',
    });
    prismaMock.device.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.device.findUnique.mockResolvedValue({
      customer_id: 'customer-1',
    });
    prismaMock.loan.findFirst.mockResolvedValue(null);
    prismaMock.loan.create.mockResolvedValue(loanRecord);

    await service.create(
      {
        customerId: 'customer-1',
        deviceId: 'device-1',
        principalAmount: 1000,
        installmentAmount: 100,
        durationDays: 10,
        startDate: new Date('2026-01-01T00:00:00.000Z'),
      },
      { id: 'agent-user-1', role: UserRole.AGENT },
    );

    expect(prismaMock.agent.findFirst).toHaveBeenCalledTimes(1);
  });

  it('scopes CUSTOMER visibility to own loans', async () => {
    prismaMock.customer.findFirst.mockResolvedValue({ id: 'customer-1' });
    prismaMock.loan.findMany.mockResolvedValue([loanRecord]);

    await service.findAll(
      { skip: 0, take: 10 },
      { id: 'customer-user-1', role: UserRole.CUSTOMER },
    );

    expect(prismaMock.loan.findMany).toHaveBeenCalledWith({
      where: {
        deleted_at: null,
        customer_id: 'customer-1',
      },
      skip: 0,
      take: 10,
      orderBy: { created_at: 'desc' },
    });
  });

  it('filters loans by agentUserId for ADMIN queries', async () => {
    prismaMock.loan.findMany.mockResolvedValue([loanRecord]);

    await service.findAll(
      {
        skip: 0,
        take: 10,
        agentUserId: 'agent-user-1',
      },
      { id: 'admin-1', role: UserRole.ADMIN },
    );

    expect(prismaMock.loan.findMany).toHaveBeenCalledWith({
      where: {
        deleted_at: null,
        agent_id: 'agent-user-1',
      },
      skip: 0,
      take: 10,
      orderBy: { created_at: 'desc' },
    });
  });

  it('updates loan and recomputes due_date when durationDays changes', async () => {
    prismaMock.loan.findUnique.mockResolvedValue(loanRecord);
    prismaMock.loan.update.mockResolvedValue({
      ...loanRecord,
      duration_days: 20,
      due_date: new Date('2026-01-21T00:00:00.000Z'),
    });

    const result = await service.update(
      'loan-1',
      { durationDays: 20 },
      { id: 'admin-1', role: UserRole.ADMIN },
    );

    expect(prismaMock.loan.update).toHaveBeenCalledWith({
      where: { id: 'loan-1' },
      data: {
        duration_days: 20,
        due_date: new Date('2026-01-21T00:00:00.000Z'),
      },
    });
    expect(result.durationDays).toBe(20);
  });

  it('rejects CUSTOMER from updating loans', async () => {
    await expect(
      service.update(
        'loan-1',
        { status: LoanStatus.PAID },
        { id: 'customer-user-1', role: UserRole.CUSTOMER },
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(prismaMock.loan.findUnique).not.toHaveBeenCalled();
  });

  it('soft-deletes loan and returns message', async () => {
    prismaMock.loan.findUnique.mockResolvedValue(loanRecord);
    prismaMock.loan.updateMany.mockResolvedValue({ count: 1 });
    jest.useFakeTimers();
    const deletedAt = new Date('2026-01-03T00:00:00.000Z');
    jest.setSystemTime(deletedAt);

    try {
      const result = await service.delete('loan-1', {
        id: 'admin-1',
        role: UserRole.ADMIN,
      });

      expect(prismaMock.loan.updateMany).toHaveBeenCalledWith({
        where: { id: 'loan-1', deleted_at: null },
        data: { deleted_at: deletedAt },
      });
      expect(result).toEqual({ message: 'Loan loan-1 has been deleted' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('rejects CUSTOMER from deleting loans', async () => {
    await expect(
      service.delete('loan-1', {
        id: 'customer-user-1',
        role: UserRole.CUSTOMER,
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(prismaMock.loan.findUnique).not.toHaveBeenCalled();
  });

  it('throws not found when loan does not exist', async () => {
    prismaMock.loan.findUnique.mockResolvedValue(null);

    await expect(
      service.findOne('loan-unknown', { id: 'admin-1', role: UserRole.ADMIN }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects AGENT access when agent profile is not active', async () => {
    prismaMock.loan.findUnique.mockResolvedValue(loanRecord);
    prismaMock.agent.findFirst.mockResolvedValue(null);

    await expect(
      service.findOne('loan-1', {
        id: 'agent-user-1',
        role: UserRole.AGENT,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects AGENT access when loan customer is outside their portfolio', async () => {
    prismaMock.loan.findUnique.mockResolvedValue({
      ...loanRecord,
      customer_id: 'customer-2',
      agent_id: 'agent-user-1',
    });
    prismaMock.agent.findFirst.mockResolvedValue({
      id: 'agent-profile-1',
      user_id: 'agent-user-1',
    });
    prismaMock.customer.findFirst.mockResolvedValue({
      id: 'customer-2',
      agent_id: 'agent-profile-2',
    });

    await expect(
      service.findOne('loan-1', {
        id: 'agent-user-1',
        role: UserRole.AGENT,
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
