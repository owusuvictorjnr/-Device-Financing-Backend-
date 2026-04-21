import { Injectable, Logger } from '@nestjs/common';
import { CommandStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CommandRetryWorker {
  private readonly logger = new Logger(CommandRetryWorker.name);

  constructor(private readonly prisma: PrismaService) {}

  async retryFailedCommands(maxRetries = 5, batchSize = 100): Promise<number> {
    const failedCommands = await this.prisma.command.findMany({
      where: {
        deleted_at: null,
        status: CommandStatus.FAILED,
        retry_count: { lt: maxRetries },
      },
      orderBy: { updated_at: 'asc' },
      take: batchSize,
      select: { id: true },
    });

    if (failedCommands.length === 0) {
      return 0;
    }

    const result = await this.prisma.command.updateMany({
      where: {
        id: { in: failedCommands.map((command) => command.id) },
        deleted_at: null,
        status: CommandStatus.FAILED,
        retry_count: { lt: maxRetries },
      },
      data: {
        status: CommandStatus.PENDING,
        retry_count: { increment: 1 },
        sent_at: null,
      },
    });

    this.logger.log(`Queued ${result.count} failed commands for retry`);
    return result.count;
  }
}
