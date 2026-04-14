import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CustomersModule } from '../customers/customers.module';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

@Module({
  imports: [DatabaseModule, CustomersModule],
  controllers: [DevicesController],
  providers: [DevicesService],
})
export class DevicesModule {}
