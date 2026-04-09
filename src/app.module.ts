import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AgentsModule } from './agents/agents.module';
import { CustomersModule } from './customers/customers.module';
import { DevicesModule } from './devices/devices.module';
import { LoansModule } from './loans/loans.module';
import { PaymentsModule } from './payments/payments.module';
import { CommandsModule } from './commands/commands.module';
import { NotificationsModule } from './notifications/notifications.module';
import { JobsModule } from './jobs/jobs.module';
import { AuditModule } from './audit/audit.module';
import { ReportsModule } from './reports/reports.module';
import { DeviceSyncModule } from './device-sync/device-sync.module';

const DEFAULT_RATE_LIMIT = 100;
// @nestjs/throttler expects ttl in milliseconds.
const DEFAULT_RATE_TTL_MS = 60_000;

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsedValue = value !== undefined ? Number(value) : Number.NaN;

  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
}

@Module({
  imports: [
    AppConfigModule,
    ThrottlerModule.forRoot([
      {
        // ttl unit is milliseconds.
        ttl: parsePositiveInteger(
          process.env.RATE_LIMIT_TTL_MS,
          DEFAULT_RATE_TTL_MS,
        ),
        limit: parsePositiveInteger(
          process.env.RATE_LIMIT_MAX,
          DEFAULT_RATE_LIMIT,
        ),
      },
    ]),
    DatabaseModule,
    RedisModule,
    HealthModule,
    AuthModule,
    UsersModule,
    AgentsModule,
    CustomersModule,
    DevicesModule,
    LoansModule,
    PaymentsModule,
    CommandsModule,
    NotificationsModule,
    JobsModule,
    AuditModule,
    ReportsModule,
    DeviceSyncModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
