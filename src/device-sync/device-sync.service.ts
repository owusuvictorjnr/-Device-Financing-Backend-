import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  assertCustomerBelongsToAgent,
  getActiveAgentByUserId,
} from '../common/access/device-portfolio-access.utils';
import { mapDeviceToResponseDto } from '../common/mappers';
import {
  DevicePlatform,
  DeviceStatus,
  DeviceType,
  Prisma,
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

const deviceSyncSelect: Prisma.DeviceSelect = {
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

    const device = await this.prisma.device.findUnique({
      where: {
        serial_number: syncDeviceDto.serialNumber,
      },
      select: deviceSyncSelect,
    });

    if (!device || device.deleted_at) {
      throw new NotFoundException(
        `Device with serial number ${syncDeviceDto.serialNumber} not found`,
      );
    }

    await this.assertDeviceSyncAccess(device, actor);

    const updateResult = await this.prisma.device.updateMany({
      where: {
        id: device.id,
        deleted_at: null,
      },
      data: {
        last_seen: syncDeviceDto.lastSeen ?? new Date(),
        ...(syncDeviceDto.status !== undefined
          ? { status: syncDeviceDto.status }
          : {}),
      },
    });

    if (updateResult.count !== 1) {
      throw new NotFoundException(
        `Device with serial number ${syncDeviceDto.serialNumber} not found`,
      );
    }

    const updated = await this.prisma.device.findUnique({
      where: {
        id: device.id,
      },
      select: deviceSyncSelect,
    });

    if (!updated || updated.deleted_at) {
      throw new NotFoundException(
        `Device with serial number ${syncDeviceDto.serialNumber} not found`,
      );
    }

    return mapDeviceToResponseDto(updated);
  }

  private async assertDeviceSyncAccess(
    device: DeviceSyncRecord,
    actor: AuthActor,
  ): Promise<void> {
    if (actor.role === UserRole.ADMIN) {
      return;
    }

    if (actor.role === UserRole.AGENT) {
      const agent = await getActiveAgentByUserId(this.prisma, actor.id);

      // Allow sync for unassigned devices (inventory) or devices assigned to agent's customers.
      if (device.customer_id) {
        await assertCustomerBelongsToAgent(
          this.prisma,
          device.customer_id,
          agent.id,
          'Agents can only sync devices for their customers',
        );
      }

      return;
    }

    throw new ForbiddenException('Customers cannot sync devices');
  }
}
