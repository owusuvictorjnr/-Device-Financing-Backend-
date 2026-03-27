import { Test, TestingModule } from '@nestjs/testing';
import { DeviceSyncController } from './device-sync.controller';

describe('DeviceSyncController', () => {
  let controller: DeviceSyncController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviceSyncController],
    }).compile();

    controller = module.get<DeviceSyncController>(DeviceSyncController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
