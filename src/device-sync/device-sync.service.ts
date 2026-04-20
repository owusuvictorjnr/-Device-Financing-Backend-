import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

    const device = await this.prisma.device.findFirst({
      where: {
        serial_number: syncDeviceDto.serialNumber,
        deleted_at: null,
      },
      select: deviceSyncSelect,
    });

    if (!device) {
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

    const updated = await this.prisma.device.findFirst({
      where: {
        id: device.id,
        deleted_at: null,
      },
      select: deviceSyncSelect,
    });

    if (!updated) {
      throw new NotFoundException(
        `Device with serial number ${syncDeviceDto.serialNumber} not found`,
      );
    }

    return this.mapDeviceToResponseDto(updated);
  }

  private async getActiveAgentByUserId(
    userId: string,
  ): Promise<{ id: string }> {
    const agent = await this.prisma.agent.findFirst({
      where: {
        user_id: userId,
        deleted_at: null,
      },
      select: { id: true },
    });

    if (!agent) {
      throw new ForbiddenException('Authenticated user is not an active agent');
    }

    return agent;
  }

  private async getActiveCustomerById(
    customerId: string,
  ): Promise<{ id: string; agent_id: string }> {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        deleted_at: null,
      },
      select: {
        id: true,
        agent_id: true,
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    return customer;
  }

  private async assertDeviceSyncAccess(
    device: DeviceSyncRecord,
    actor: AuthActor,
  ): Promise<void> {
    if (actor.role === UserRole.ADMIN) {
      return;
    }

    if (actor.role === UserRole.AGENT) {
      const agent = await this.getActiveAgentByUserId(actor.id);

      // Allow sync for unassigned devices (inventory) or devices assigned to agent's customers.
      if (device.customer_id) {
        const customer = await this.getActiveCustomerById(device.customer_id);
        if (customer.agent_id !== agent.id) {
          throw new ForbiddenException(
            'Agents can only sync devices for their customers',
          );
        }
      }

      return;
    }

    throw new ForbiddenException('Customers cannot sync devices');
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
