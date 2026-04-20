import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { DeviceSyncController } from './device-sync.controller';
import { DeviceSyncService } from './device-sync.service';

@Module({
  imports: [DatabaseModule],
  controllers: [DeviceSyncController],
  providers: [DeviceSyncService],
})
export class DeviceSyncModule {}
