import { Test, TestingModule } from '@nestjs/testing';
import { ReminderWorker } from './reminder.worker';

describe('ReminderWorker', () => {
  let provider: ReminderWorker;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReminderWorker],
    }).compile();

    provider = module.get<ReminderWorker>(ReminderWorker);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
