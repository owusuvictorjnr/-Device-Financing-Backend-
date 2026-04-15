import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { LoanStatus } from '@prisma/client';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

export class CreateLoanDto {
  @IsUUID()
  customerId!: string;

  @IsUUID()
  deviceId!: string;

  @Matches(/^(?!0+(?:\.0+)?$)\d+(?:\.\d+)?$/, {
    message: 'principalAmount must be a positive decimal string',
  })
  principalAmount!: string;

  @Matches(/^(?!0+(?:\.0+)?$)\d+(?:\.\d+)?$/, {
    message: 'installmentAmount must be a positive decimal string',
  })
  installmentAmount!: string;

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
}
