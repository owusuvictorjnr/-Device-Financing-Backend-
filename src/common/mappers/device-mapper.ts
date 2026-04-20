import { DevicePlatform, DeviceStatus, DeviceType } from '@prisma/client';

import type { DeviceResponseDto } from '../../devices/dto/device-response.dto';

export type DeviceMapperSource = {
  id: string;
  serial_number: string;
  device_type: DeviceType;
  platform: DevicePlatform;
  model: string;
  status: DeviceStatus;
  customer_id: string | null;
  last_seen: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export function mapDeviceToResponseDto(
  device: DeviceMapperSource,
): DeviceResponseDto {
  return {
    id: device.id,
    serialNumber: device.serial_number,
    deviceType: device.device_type,
    platform: device.platform,
    model: device.model,
    status: device.status,
    customerId: device.customer_id,
    lastSeen: device.last_seen,
    createdAt: device.created_at,
    updatedAt: device.updated_at,
    deletedAt: device.deleted_at,
  };
}