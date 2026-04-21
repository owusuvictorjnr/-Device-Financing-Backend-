import { Injectable } from '@nestjs/common';
import { LoanStatus } from '@prisma/client';
import dayjs from 'dayjs';
import { PrismaService } from '../../database/prisma.service';

type ReminderCandidate = {
  id: string;
  customerId: string;
  dueDate: Date;
};

@Injectable()
export class ReminderWorker {
  constructor(private readonly prisma: PrismaService) {}

  async getDueSoonLoans(
    daysAhead = 1,
    batchSize = 100,
  ): Promise<ReminderCandidate[]> {
    const now = dayjs();
    const dueUntil = now.add(daysAhead, 'day').endOf('day');

    const loans = await this.prisma.loan.findMany({
      where: {
        deleted_at: null,
        status: LoanStatus.ACTIVE,
        due_date: {
          gte: now.toDate(),
          lte: dueUntil.toDate(),
        },
      },
      orderBy: { due_date: 'asc' },
      take: batchSize,
      select: {
        id: true,
        customer_id: true,
        due_date: true,
      },
    });

    return loans.map((loan) => ({
      id: loan.id,
      customerId: loan.customer_id,
      dueDate: loan.due_date,
    }));
  }
}
