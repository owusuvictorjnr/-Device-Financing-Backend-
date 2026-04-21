import { ApiPropertyOptional } from '@nestjs/swagger';
import { CommandStatus, CommandType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateCommandDto {
  @IsUUID()
  deviceId!: string;

  @IsUUID()
  loanId!: string;

  @IsEnum(CommandType)
  commandType!: CommandType;

  @ApiPropertyOptional({ enum: CommandStatus })
  @IsOptional()
  @IsEnum(CommandStatus)
  status?: CommandStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  sentAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  acknowledgedAt?: Date;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  retryCount?: number;
}
