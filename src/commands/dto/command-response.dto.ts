import { CommandStatus, CommandType } from '@prisma/client';

export class CommandResponseDto {
  id!: string;
  deviceId!: string;
  loanId!: string;
  commandType!: CommandType;
  status!: CommandStatus;
  sentAt!: Date | null;
  acknowledgedAt!: Date | null;
  retryCount!: number;
  issuedById!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
}
