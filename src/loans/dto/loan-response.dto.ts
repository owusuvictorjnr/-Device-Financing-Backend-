import { LoanStatus } from '@prisma/client';

export class LoanResponseDto {
  id!: string;
  customerId!: string;
  deviceId!: string;
  agentId!: string;
  principalAmount!: string;
  installmentAmount!: string;
  durationDays!: number;
  startDate!: Date;
  dueDate!: Date;
  gracePeriodDays!: number;
  status!: LoanStatus;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
}
