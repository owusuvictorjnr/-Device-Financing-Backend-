import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  PaymentMethod,
  PaymentRecordedBy,
  PaymentStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class FindAllPaymentsQueryDto {
  @ApiPropertyOptional({
    description: 'Number of records to skip',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip = 0;

  @ApiPropertyOptional({
    description: 'Number of records to return',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take = 10;

  @ApiPropertyOptional({
    description: 'Filter by loan ID',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  loanId?: string;

  @ApiPropertyOptional({
    description: 'Filter by customer ID (admin/agent use cases)',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by payment status',
    enum: PaymentStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Filter by payment method',
    enum: PaymentMethod,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Filter by recorder type',
    enum: PaymentRecordedBy,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentRecordedBy)
  recordedBy?: PaymentRecordedBy;

  @ApiPropertyOptional({
    description: 'Filter by payment reference',
    required: false,
  })
  @IsOptional()
  @IsString()
  reference?: string;
}
