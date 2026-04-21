import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { JobsService } from './jobs.service';
import { PaymentEnforcementWorker } from './payment-enforcement.worker/payment-enforcement.worker';
import { CommandRetryWorker } from './command-retry.worker/command-retry.worker';
import { ReminderWorker } from './reminder.worker/reminder.worker';

@Module({
  imports: [DatabaseModule],
  providers: [
    JobsService,
    PaymentEnforcementWorker,
    CommandRetryWorker,
    ReminderWorker,
  ],
  exports: [JobsService],
})
export class JobsModule {}
