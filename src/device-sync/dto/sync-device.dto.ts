import { ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class SyncDeviceDto {
  @IsString()
  @IsNotEmpty()
  serialNumber!: string;

  @ApiPropertyOptional({
    description: 'Optional device status reported by the device',
    enum: DeviceStatus,
  })
  @IsOptional()
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;

  @ApiPropertyOptional({
    description: 'Optional timestamp reported by the device',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  lastSeen?: Date;
}
