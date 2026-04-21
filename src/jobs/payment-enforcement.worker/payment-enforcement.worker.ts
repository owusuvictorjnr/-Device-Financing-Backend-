import { Injectable, Logger } from '@nestjs/common';
import { CommandStatus, CommandType, LoanStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PaymentEnforcementWorker {
  private readonly logger = new Logger(PaymentEnforcementWorker.name);
  // Keep in sync with CommandRetryWorker default maxRetries.
  private readonly retryableFailedCommandMaxRetries = 5;

  constructor(private readonly prisma: PrismaService) {}

  async enforceOverdueLoans(batchSize = 100): Promise<number> {
    const overdueLoans = await this.prisma.loan.findMany({
      where: {
        deleted_at: null,
        due_date: { lt: new Date() },
        status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] },
      },
      orderBy: { due_date: 'asc' },
      take: batchSize,
      select: {
        id: true,
        device_id: true,
      },
    });

    if (overdueLoans.length === 0) {
      return 0;
    }

    const loanIds = overdueLoans.map((loan) => loan.id);

    await this.prisma.loan.updateMany({
      where: {
        id: { in: loanIds },
        deleted_at: null,
        status: LoanStatus.ACTIVE,
      },
      data: {
        status: LoanStatus.OVERDUE,
      },
    });

    const existingLockCommands = await this.prisma.command.findMany({
      where: {
        deleted_at: null,
        loan_id: { in: loanIds },
        command_type: CommandType.LOCK,
        OR: [
          {
            status: {
              in: [
                CommandStatus.PENDING,
                CommandStatus.SENT,
                CommandStatus.ACKNOWLEDGED,
              ],
            },
          },
          {
            status: CommandStatus.FAILED,
            retry_count: { lt: this.retryableFailedCommandMaxRetries },
          },
        ],
      },
      select: {
        loan_id: true,
      },
    });

    const loanIdsWithOpenLock = new Set(
      existingLockCommands.map((command) => command.loan_id),
    );

    const lockCommandsToCreate = overdueLoans
      .filter((loan) => !loanIdsWithOpenLock.has(loan.id))
      .map((loan) => ({
        device_id: loan.device_id,
        loan_id: loan.id,
        command_type: CommandType.LOCK,
        status: CommandStatus.PENDING,
        retry_count: 0,
      }));

    if (lockCommandsToCreate.length === 0) {
      return 0;
    }

    const result = await this.prisma.command.createMany({
      data: lockCommandsToCreate,
    });

    this.logger.log(`Created ${result.count} lock commands for overdue loans`);
    return result.count;
  }
}
