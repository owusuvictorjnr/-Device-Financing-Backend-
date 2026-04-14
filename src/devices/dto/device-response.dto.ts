import { DevicePlatform, DeviceStatus, DeviceType } from '@prisma/client';

export class DeviceResponseDto {
  id: string;
  serialNumber: string;
  deviceType: DeviceType;
  platform: DevicePlatform;
  model: string;
  status: DeviceStatus;
  customerId: string | null;
  lastSeen: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
