import { Type } from 'class-transformer';
import { LoanStatus } from '@prisma/client';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsString,
  Matches,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateLoanDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Matches(/^(?!0+(?:\.0+)?$)\d+(?:\.\d+)?$/, {
    message: 'principalAmount must be a positive decimal string',
  })
  principalAmount?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Matches(/^(?!0+(?:\.0+)?$)\d+(?:\.\d+)?$/, {
    message: 'installmentAmount must be a positive decimal string',
  })
  installmentAmount?: string;

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
