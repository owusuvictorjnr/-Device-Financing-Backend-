import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  loanId!: string;

  @IsString()
  @Matches(/^(?!0+(?:\.0+)?$)\d+(?:\.\d+)?$/, {
    message: 'amount must be a positive decimal string',
  })
  amount!: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsString()
  @MaxLength(100)
  reference!: string;

  @ApiPropertyOptional({
    description: 'Payment status, defaults to COMPLETED',
    enum: PaymentStatus,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({
    description:
      'Explicit payment timestamp, defaults to now when status is COMPLETED',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  paidAt?: Date;
}
