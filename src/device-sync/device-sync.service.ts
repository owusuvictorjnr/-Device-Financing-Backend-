import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DevicePlatform,
  DeviceStatus,
  DeviceType,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { DeviceResponseDto } from '../devices/dto';
import { SyncDeviceDto } from './dto/sync-device.dto';

type AuthActor = {
  id: string;
  role: UserRole;
};

type DeviceSyncRecord = {
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

@Injectable()
export class DeviceSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async sync(
    syncDeviceDto: SyncDeviceDto,
    actor: AuthActor,
  ): Promise<DeviceResponseDto> {
    if (actor.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot sync devices');
    }

    const device = await this.prisma.device.findFirst({
      where: {
        serial_number: syncDeviceDto.serialNumber,
        deleted_at: null,
      },
      select: {
        id: true,
        serial_number: true,
        device_type: true,
        platform: true,
        model: true,
        status: true,
        customer_id: true,
        last_seen: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

    if (!device) {
      throw new NotFoundException(
        `Device with serial number ${syncDeviceDto.serialNumber} not found`,
      );
    }

    const updated = await this.prisma.device.update({
      where: { id: device.id },
      data: {
        last_seen: syncDeviceDto.lastSeen ?? new Date(),
        ...(syncDeviceDto.status !== undefined
          ? { status: syncDeviceDto.status }
          : {}),
      },
    });

    return this.mapDeviceToResponseDto(updated);
  }

  private mapDeviceToResponseDto(device: DeviceSyncRecord): DeviceResponseDto {
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
}
