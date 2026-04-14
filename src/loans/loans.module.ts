import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { CustomersModule } from '../customers/customers.module';
import { DatabaseModule } from '../database/database.module';
import { DevicesModule } from '../devices/devices.module';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';

@Module({
  imports: [DatabaseModule, AgentsModule, CustomersModule, DevicesModule],
  controllers: [LoansController],
  providers: [LoansService],
})
export class LoansModule {}
