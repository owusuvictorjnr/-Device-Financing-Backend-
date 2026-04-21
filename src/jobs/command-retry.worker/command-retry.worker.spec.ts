import { Test, TestingModule } from '@nestjs/testing';
import { CommandStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from '../../database/prisma.service';
import { CommandRetryWorker } from './command-retry.worker';

describe('CommandRetryWorker', () => {
  let worker: CommandRetryWorker;
  type AsyncMock = jest.MockedFunction<(...args: any[]) => Promise<any>>;
  const prismaMock: {
    command: {
      findMany: AsyncMock;
      updateMany: AsyncMock;
    };
  } = {
    command: {
      findMany: jest.fn() as AsyncMock,
      updateMany: jest.fn() as AsyncMock,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommandRetryWorker,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    worker = module.get<CommandRetryWorker>(CommandRetryWorker);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(worker).toBeDefined();
  });

  it('returns 0 when no failed commands are available', async () => {
    prismaMock.command.findMany.mockResolvedValue([]);

    const result = await worker.retryFailedCommands();

    expect(prismaMock.command.updateMany).not.toHaveBeenCalled();
    expect(result).toBe(0);
  });

  it('moves failed commands to pending and increments retry count', async () => {
    prismaMock.command.findMany.mockResolvedValue([
      { id: 'cmd-1' },
      { id: 'cmd-2' },
    ]);
    prismaMock.command.updateMany.mockResolvedValue({ count: 2 });

    const result = await worker.retryFailedCommands(5, 100);

    expect(prismaMock.command.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['cmd-1', 'cmd-2'] },
        deleted_at: null,
        status: CommandStatus.FAILED,
        retry_count: { lt: 5 },
      },
      data: {
        status: CommandStatus.PENDING,
        retry_count: { increment: 1 },
        sent_at: null,
      },
    });
    expect(result).toBe(2);
  });
});
