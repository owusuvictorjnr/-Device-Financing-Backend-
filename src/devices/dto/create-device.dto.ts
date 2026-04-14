import { ApiPropertyOptional } from '@nestjs/swagger';
import { DevicePlatform, DeviceStatus, DeviceType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateDeviceDto {
  @IsString()
  @IsNotEmpty()
  serialNumber: string;

  @IsEnum(DeviceType)
  deviceType: DeviceType;

  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsOptional()
  @IsEnum(DeviceStatus)
  @ApiPropertyOptional({
    description: 'Optional initial device status',
    enum: DeviceStatus,
  })
  status?: DeviceStatus;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({
    description: 'Optional customer assignment for the device',
    format: 'uuid',
  })
  customerId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @ApiPropertyOptional({
    description: 'Optional last-seen timestamp',
    type: String,
    format: 'date-time',
  })
  lastSeen?: Date;
}
