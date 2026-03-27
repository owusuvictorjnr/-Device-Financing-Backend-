import { Test, TestingModule } from '@nestjs/testing';
import { CommandRetryWorker } from './command-retry.worker';

describe('CommandRetryWorker', () => {
  let provider: CommandRetryWorker;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommandRetryWorker],
    }).compile();

    provider = module.get<CommandRetryWorker>(CommandRetryWorker);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
