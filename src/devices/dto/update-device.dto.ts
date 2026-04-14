import { Type } from 'class-transformer';
import { DevicePlatform, DeviceStatus, DeviceType } from '@prisma/client';
import { IsDate, IsEnum, IsString, IsUUID, ValidateIf } from 'class-validator';

export class UpdateDeviceDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  serialNumber?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(DevicePlatform)
  platform?: DevicePlatform;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  model?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;

  @ValidateIf((_, value) => value !== undefined)
  @IsUUID()
  customerId?: string;

  @ValidateIf((_, value) => value !== undefined)
  @Type(() => Date)
  @IsDate()
  lastSeen?: Date;
}
