import { Module } from '@nestjs/common';
import { DeviceSyncController } from './device-sync.controller';
import { DeviceSyncService } from './device-sync.service';

@Module({
  controllers: [DeviceSyncController],
  providers: [DeviceSyncService]
})
export class DeviceSyncModule {}
