import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CommandRetryWorker } from './command-retry.worker/command-retry.worker';
import { JobsService } from './jobs.service';
import { PaymentEnforcementWorker } from './payment-enforcement.worker/payment-enforcement.worker';
import { ReminderWorker } from './reminder.worker/reminder.worker';

describe('JobsService', () => {
  let service: JobsService;
  type EnforceOverdueLoansMock = jest.MockedFunction<
    (batchSize?: number) => Promise<number>
  >;
  type RetryFailedCommandsMock = jest.MockedFunction<
    (maxRetries?: number, batchSize?: number) => Promise<number>
  >;
  type GetDueSoonLoansMock = jest.MockedFunction<
    (
      daysAhead?: number,
      batchSize?: number,
    ) => Promise<Array<{ id: string; customerId: string; dueDate: Date }>>
  >;

  const paymentWorkerMock: {
    enforceOverdueLoans: EnforceOverdueLoansMock;
  } = {
    enforceOverdueLoans: jest.fn() as EnforceOverdueLoansMock,
  };
  const commandRetryWorkerMock: {
    retryFailedCommands: RetryFailedCommandsMock;
  } = {
    retryFailedCommands: jest.fn() as RetryFailedCommandsMock,
  };
  const reminderWorkerMock: {
    getDueSoonLoans: GetDueSoonLoansMock;
  } = {
    getDueSoonLoans: jest.fn() as GetDueSoonLoansMock,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: PaymentEnforcementWorker,
          useValue: paymentWorkerMock,
        },
        {
          provide: CommandRetryWorker,
          useValue: commandRetryWorkerMock,
        },
        {
          provide: ReminderWorker,
          useValue: reminderWorkerMock,
        },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('runs payment enforcement with provided batch size', async () => {
    paymentWorkerMock.enforceOverdueLoans.mockResolvedValue(3);

    const result = await service.runPaymentEnforcement(50);

    expect(paymentWorkerMock.enforceOverdueLoans).toHaveBeenCalledWith(50);
    expect(result).toBe(3);
  });

  it('runs command retry with provided maxRetries and batch size', async () => {
    commandRetryWorkerMock.retryFailedCommands.mockResolvedValue(4);

    const result = await service.runCommandRetry(7, 25);

    expect(commandRetryWorkerMock.retryFailedCommands).toHaveBeenCalledWith(
      7,
      25,
    );
    expect(result).toBe(4);
  });

  it('returns reminder candidate count', async () => {
    reminderWorkerMock.getDueSoonLoans.mockResolvedValue([
      { id: 'loan-1', customerId: 'customer-1', dueDate: new Date() },
      { id: 'loan-2', customerId: 'customer-2', dueDate: new Date() },
    ]);

    const result = await service.runReminders(2, 40);

    expect(reminderWorkerMock.getDueSoonLoans).toHaveBeenCalledWith(2, 40);
    expect(result).toBe(2);
  });

  it('runs all jobs and returns a summary', async () => {
    paymentWorkerMock.enforceOverdueLoans.mockResolvedValue(2);
    commandRetryWorkerMock.retryFailedCommands.mockResolvedValue(5);
    reminderWorkerMock.getDueSoonLoans.mockResolvedValue([
      { id: 'loan-1', customerId: 'customer-1', dueDate: new Date() },
    ]);

    const result = await service.runAll();

    expect(result.createdLockCommands).toBe(2);
    expect(result.requeuedCommands).toBe(5);
    expect(result.dueSoonReminders).toBe(1);
    expect(result.executedAt).toBeInstanceOf(Date);
  });
});
