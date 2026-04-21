import { Injectable, Logger } from '@nestjs/common';
import { CommandRetryWorker } from './command-retry.worker/command-retry.worker';
import { PaymentEnforcementWorker } from './payment-enforcement.worker/payment-enforcement.worker';
import { ReminderWorker } from './reminder.worker/reminder.worker';

export type JobsRunSummary = {
  executedAt: Date;
  createdLockCommands: number;
  requeuedCommands: number;
  dueSoonReminders: number;
};

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly paymentEnforcementWorker: PaymentEnforcementWorker,
    private readonly commandRetryWorker: CommandRetryWorker,
    private readonly reminderWorker: ReminderWorker,
  ) {}

  async runPaymentEnforcement(batchSize = 100): Promise<number> {
    return this.paymentEnforcementWorker.enforceOverdueLoans(batchSize);
  }

  async runCommandRetry(maxRetries = 5, batchSize = 100): Promise<number> {
    return this.commandRetryWorker.retryFailedCommands(maxRetries, batchSize);
  }

  async runReminders(daysAhead = 1, batchSize = 100): Promise<number> {
    const reminderCandidates = await this.reminderWorker.getDueSoonLoans(
      daysAhead,
      batchSize,
    );

    // Future integration point: dispatch reminder notifications.
    return reminderCandidates.length;
  }

  async runAll(): Promise<JobsRunSummary> {
    const [createdLockCommands, requeuedCommands, dueSoonReminders] =
      await Promise.all([
        this.runPaymentEnforcement(),
        this.runCommandRetry(),
        this.runReminders(),
      ]);

    const summary: JobsRunSummary = {
      executedAt: new Date(),
      createdLockCommands,
      requeuedCommands,
      dueSoonReminders,
    };

    this.logger.log(
      `Jobs completed: locks=${summary.createdLockCommands}, retries=${summary.requeuedCommands}, reminders=${summary.dueSoonReminders}`,
    );

    return summary;
  }
}
