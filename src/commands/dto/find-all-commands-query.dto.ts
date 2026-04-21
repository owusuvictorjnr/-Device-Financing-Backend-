import { ApiPropertyOptional } from '@nestjs/swagger';
import { CommandStatus, CommandType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class FindAllCommandsQueryDto {
  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip = 0;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take = 10;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  loanId?: string;

  @ApiPropertyOptional({ enum: CommandType })
  @IsOptional()
  @IsEnum(CommandType)
  commandType?: CommandType;

  @ApiPropertyOptional({ enum: CommandStatus })
  @IsOptional()
  @IsEnum(CommandStatus)
  status?: CommandStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  customerId?: string;
}
