import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
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

@Module({
  imports: [ConfigModule, DatabaseModule, RedisModule, HealthModule, AuthModule, UsersModule, AgentsModule, CustomersModule, DevicesModule, LoansModule, PaymentsModule, CommandsModule, NotificationsModule, JobsModule, AuditModule, ReportsModule, DeviceSyncModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
