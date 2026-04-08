import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { PaymentEnforcementWorker } from './payment-enforcement.worker/payment-enforcement.worker';
import { CommandRetryWorker } from './command-retry.worker/command-retry.worker';
import { ReminderWorker } from './reminder.worker/reminder.worker';

@Module({
  providers: [JobsService, PaymentEnforcementWorker, CommandRetryWorker, ReminderWorker],
})
export class JobsModule {}
