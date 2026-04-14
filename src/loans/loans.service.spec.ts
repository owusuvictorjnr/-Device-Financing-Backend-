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
    agent: {
      findFirst: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
    },
    device: {
      findFirst: jest.fn(),
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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates loan as ADMIN with explicit agentId', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: 'agent-user-2' });
    prismaMock.customer.findFirst.mockResolvedValue({
      id: 'customer-1',
      agent_id: 'agent-profile-1',
    });
    prismaMock.device.findFirst.mockResolvedValue({
      id: 'device-1',
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
        agentId: 'agent-user-2',
      },
      { id: 'admin-1', role: UserRole.ADMIN },
    );

    expect(prismaMock.loan.create).toHaveBeenCalled();
    expect(result.id).toBe('loan-1');
    expect(result.principalAmount).toBe(1000);
  });

  it('rejects ADMIN create when agentId is missing', async () => {
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

    const result = await service.delete('loan-1', {
      id: 'admin-1',
      role: UserRole.ADMIN,
    });

    expect(prismaMock.loan.updateMany).toHaveBeenCalledWith({
      where: { id: 'loan-1', deleted_at: null },
      data: { deleted_at: expect.any(Date) },
    });
    expect(result).toEqual({ message: 'Loan loan-1 has been deleted' });
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
});
