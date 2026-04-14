import { Type } from 'class-transformer';
import { LoanStatus } from '@prisma/client';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsPositive,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateLoanDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsNumber()
  @IsPositive()
  principalAmount?: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsNumber()
  @IsPositive()
  installmentAmount?: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(1)
  durationDays?: number;

  @ValidateIf((_, value) => value !== undefined)
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  gracePeriodDays?: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(LoanStatus)
  status?: LoanStatus;
}
