import { Injectable, Logger } from '@nestjs/common';
import { CommandRetryWorker } from './command-retry.worker/command-retry.worker';
import { PaymentEnforcementWorker } from './payment-enforcement.worker/payment-enforcement.worker';
import { ReminderWorker } from './reminder.worker/reminder.worker';

export type JobsRunSummary = {
  executedAt: Date;
  createdLockCommands: number;
  requeuedCommands: number;
  dueSoonReminders: number;
  failures?: {
    paymentEnforcement?: string;
    commandRetry?: string;
    reminders?: string;
  };
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
    const [paymentEnforcement, commandRetry, reminders] =
      await Promise.allSettled([
        this.runPaymentEnforcement(),
        this.runCommandRetry(),
        this.runReminders(),
      ]);

    const failures: NonNullable<JobsRunSummary['failures']> = {};
    const createdLockCommands =
      paymentEnforcement.status === 'fulfilled' ? paymentEnforcement.value : 0;
    const requeuedCommands =
      commandRetry.status === 'fulfilled' ? commandRetry.value : 0;
    const dueSoonReminders =
      reminders.status === 'fulfilled' ? reminders.value : 0;

    if (paymentEnforcement.status === 'rejected') {
      failures.paymentEnforcement = this.getErrorMessage(
        paymentEnforcement.reason,
      );
      this.logger.error(
        `Payment enforcement job failed: ${failures.paymentEnforcement}`,
      );
    }

    if (commandRetry.status === 'rejected') {
      failures.commandRetry = this.getErrorMessage(commandRetry.reason);
      this.logger.error(`Command retry job failed: ${failures.commandRetry}`);
    }

    if (reminders.status === 'rejected') {
      failures.reminders = this.getErrorMessage(reminders.reason);
      this.logger.error(`Reminder job failed: ${failures.reminders}`);
    }

    const summary: JobsRunSummary = {
      executedAt: new Date(),
      createdLockCommands,
      requeuedCommands,
      dueSoonReminders,
      ...(Object.keys(failures).length > 0 ? { failures } : {}),
    };

    this.logger.log(
      `Jobs completed: locks=${summary.createdLockCommands}, retries=${summary.requeuedCommands}, reminders=${summary.dueSoonReminders}`,
    );

    return summary;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'Unknown error';
  }
}
