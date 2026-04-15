import { ApiPropertyOptional } from '@nestjs/swagger';
import { LoanStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class FindAllLoansQueryDto {
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
    description: 'Filter by customer ID',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by device ID',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiPropertyOptional({
    description: 'Filter by agent user ID',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  agentUserId?: string;

  @ApiPropertyOptional({
    description: 'Filter by loan status',
    enum: LoanStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(LoanStatus)
  status?: LoanStatus;
}
