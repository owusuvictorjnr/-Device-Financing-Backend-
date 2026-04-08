import { Test, TestingModule } from '@nestjs/testing';
import { DeviceSyncService } from './device-sync.service';

describe('DeviceSyncService', () => {
  let service: DeviceSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeviceSyncService],
    }).compile();

    service = module.get<DeviceSyncService>(DeviceSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
