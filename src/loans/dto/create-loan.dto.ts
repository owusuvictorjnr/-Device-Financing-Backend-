import { Type } from 'class-transformer';
import { LoanStatus } from '@prisma/client';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateLoanDto {
  @IsUUID()
  customerId!: string;

  @IsUUID()
  deviceId!: string;

  @IsNumber()
  @IsPositive()
  principalAmount!: number;

  @IsNumber()
  @IsPositive()
  installmentAmount!: number;

  @IsInt()
  @Min(1)
  durationDays!: number;

  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @IsOptional()
  @IsInt()
  @Min(0)
  gracePeriodDays?: number;

  @IsOptional()
  @IsEnum(LoanStatus)
  status?: LoanStatus;

  @IsOptional()
  @IsUUID()
  agentId?: string;
}
