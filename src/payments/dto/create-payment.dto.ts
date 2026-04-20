import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
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

  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
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
