import { Test, TestingModule } from '@nestjs/testing';
import { LoanStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { PrismaService } from '../../database/prisma.service';
import { ReminderWorker } from './reminder.worker';

dayjs.extend(utc);

describe('ReminderWorker', () => {
  let worker: ReminderWorker;
  type AsyncMock = jest.MockedFunction<(...args: any[]) => Promise<any>>;
  const prismaMock: {
    loan: {
      findMany: AsyncMock;
    };
  } = {
    loan: {
      findMany: jest.fn() as AsyncMock,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReminderWorker,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    worker = module.get<ReminderWorker>(ReminderWorker);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(worker).toBeDefined();
  });

  it('returns due-soon loan reminders mapped to API shape', async () => {
    const dueDate = new Date('2026-04-22T10:00:00.000Z');
    prismaMock.loan.findMany.mockResolvedValue([
      {
        id: 'loan-1',
        customer_id: 'customer-1',
        due_date: dueDate,
      },
    ]);

    const result = await worker.getDueSoonLoans(1, 50);

    expect(prismaMock.loan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deleted_at: null,
          status: LoanStatus.ACTIVE,
        }),
        take: 50,
      }),
    );
    expect(result).toEqual([
      {
        id: 'loan-1',
        customerId: 'customer-1',
        dueDate,
      },
    ]);
  });

  it('uses UTC time window boundaries for due-soon lookup', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-21T10:30:00.000Z'));
    prismaMock.loan.findMany.mockResolvedValue([]);

    await worker.getDueSoonLoans(1, 100);

    expect(prismaMock.loan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          due_date: {
            gte: dayjs.utc('2026-04-21T10:30:00.000Z').toDate(),
            lte: dayjs
              .utc('2026-04-21T10:30:00.000Z')
              .add(1, 'day')
              .endOf('day')
              .toDate(),
          },
        }),
      }),
    );

    jest.useRealTimers();
  });
});
