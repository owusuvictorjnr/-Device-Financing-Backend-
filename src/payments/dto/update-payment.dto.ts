import { Type } from 'class-transformer';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import {
  IsDate,
  IsEnum,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdatePaymentDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Matches(/^(?!0+(?:\.0+)?$)\d+(?:\.\d+)?$/, {
    message: 'amount must be a positive decimal string',
  })
  amount?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(100)
  reference?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ValidateIf((_, value) => value !== undefined)
  @Type(() => Date)
  @IsDate()
  paidAt?: Date;
}
