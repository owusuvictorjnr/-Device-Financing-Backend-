import { ApiPropertyOptional } from '@nestjs/swagger';
import { DevicePlatform, DeviceStatus, DeviceType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class FindAllDevicesQueryDto {
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
    description: 'Filter by device status',
    enum: DeviceStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;

  @ApiPropertyOptional({
    description: 'Filter by device type',
    enum: DeviceType,
    required: false,
  })
  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  @ApiPropertyOptional({
    description: 'Filter by device platform',
    enum: DevicePlatform,
    required: false,
  })
  @IsOptional()
  @IsEnum(DevicePlatform)
  platform?: DevicePlatform;
}
