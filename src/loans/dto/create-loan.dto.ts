import { ApiPropertyOptional } from '@nestjs/swagger';
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

  @ApiPropertyOptional({
    description: 'Optional grace period in days before loan enforcement',
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  gracePeriodDays?: number;

  @ApiPropertyOptional({
    description: 'Initial loan status, defaults to ACTIVE',
    enum: LoanStatus,
  })
  @IsOptional()
  @IsEnum(LoanStatus)
  status?: LoanStatus;

  @ApiPropertyOptional({
    description:
      'Agent user ID for ADMIN-created loans; AGENT requests default to the authenticated agent',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  agentUserId?: string;

  @ApiPropertyOptional({
    description: 'Deprecated alias for agentUserId (kept for backward compatibility)',
    format: 'uuid',
    deprecated: true,
  })
  @IsOptional()
  @IsUUID()
  agentId?: string;
}
