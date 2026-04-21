import { Test, TestingModule } from '@nestjs/testing';
import { CommandStatus, CommandType, LoanStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from '../../database/prisma.service';
import { PaymentEnforcementWorker } from './payment-enforcement.worker';

describe('PaymentEnforcementWorker', () => {
  let worker: PaymentEnforcementWorker;
  type AsyncMock = jest.MockedFunction<(...args: any[]) => Promise<any>>;
  const prismaMock: {
    loan: {
      findMany: AsyncMock;
      updateMany: AsyncMock;
    };
    command: {
      findMany: AsyncMock;
      createMany: AsyncMock;
    };
  } = {
    loan: {
      findMany: jest.fn() as AsyncMock,
      updateMany: jest.fn() as AsyncMock,
    },
    command: {
      findMany: jest.fn() as AsyncMock,
      createMany: jest.fn() as AsyncMock,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentEnforcementWorker,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    worker = module.get<PaymentEnforcementWorker>(PaymentEnforcementWorker);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(worker).toBeDefined();
  });

  it('returns 0 when no overdue loans are found', async () => {
    prismaMock.loan.findMany.mockResolvedValue([]);

    const result = await worker.enforceOverdueLoans();

    expect(prismaMock.command.createMany).not.toHaveBeenCalled();
    expect(result).toBe(0);
  });

  it('creates lock commands only for overdue loans without open lock commands', async () => {
    prismaMock.loan.findMany.mockResolvedValue([
      { id: 'loan-1', device_id: 'device-1' },
      { id: 'loan-2', device_id: 'device-2' },
    ]);
    prismaMock.loan.updateMany.mockResolvedValue({ count: 2 });
    prismaMock.command.findMany.mockResolvedValue([{ loan_id: 'loan-1' }]);
    prismaMock.command.createMany.mockResolvedValue({ count: 1 });

    const result = await worker.enforceOverdueLoans(100);

    expect(prismaMock.loan.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['loan-1', 'loan-2'] },
        deleted_at: null,
        status: LoanStatus.ACTIVE,
      },
      data: {
        status: LoanStatus.OVERDUE,
      },
    });

    expect(prismaMock.command.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          loan_id: { in: ['loan-1', 'loan-2'] },
          command_type: CommandType.LOCK,
          status: {
            in: [
              CommandStatus.PENDING,
              CommandStatus.SENT,
              CommandStatus.ACKNOWLEDGED,
            ],
          },
        }),
      }),
    );

    expect(prismaMock.command.createMany).toHaveBeenCalledWith({
      data: [
        {
          device_id: 'device-2',
          loan_id: 'loan-2',
          command_type: CommandType.LOCK,
          status: CommandStatus.PENDING,
          retry_count: 0,
        },
      ],
    });
    expect(result).toBe(1);
  });
});
