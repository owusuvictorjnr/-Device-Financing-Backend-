import { Type } from 'class-transformer';
import { LoanStatus } from '@prisma/client';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Min,
} from 'class-validator';

export class UpdateLoanDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  principalAmount?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  installmentAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @IsInt()
  @Min(0)
  gracePeriodDays?: number;

  @IsOptional()
  @IsEnum(LoanStatus)
  status?: LoanStatus;
}
