import {
  BadRequestException,
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
import {
  getPrismaUniqueConstraintTarget,
  isPrismaErrorCode,
} from '../common/prisma/prisma-error.utils';
import { PrismaService } from '../database/prisma.service';
import {
  CreateDeviceDto,
  DeviceResponseDto,
  FindAllDevicesQueryDto,
  UpdateDeviceDto,
} from './dto';

type AuthActor = {
  id: string;
  role: UserRole;
};

type DeviceRecord = {
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
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createDeviceDto: CreateDeviceDto,
    actor: AuthActor,
  ): Promise<DeviceResponseDto> {
    // Explicit role validation for defense-in-depth
    if (actor.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot create devices');
    }

    // For AGENT, validate active agent record exists regardless of customer assignment
    if (actor.role === UserRole.AGENT) {
      await this.getActiveAgentByUserId(actor.id);
    }

    const customerId = await this.resolveTargetCustomerId(
      actor,
      createDeviceDto.customerId,
    );

    try {
      const device = await this.prisma.device.create({
        data: {
          serial_number: createDeviceDto.serialNumber,
          device_type: createDeviceDto.deviceType,
          platform: createDeviceDto.platform,
          model: createDeviceDto.model,
          status: createDeviceDto.status ?? DeviceStatus.ACTIVE,
          customer_id: customerId ?? null,
          last_seen: createDeviceDto.lastSeen ?? null,
        },
      });

      return this.mapDeviceToResponseDto(device);
    } catch (error: unknown) {
      this.handleUniqueConstraintError(error);
      this.handleRelatedRecordNotFoundError(error);
      throw error;
    }
  }

  async findAll(
    query: FindAllDevicesQueryDto,
    actor: AuthActor,
  ): Promise<DeviceResponseDto[]> {
    const where: {
      deleted_at: null;
      customer_id?: string;
      status?: DeviceStatus;
      device_type?: DeviceType;
      platform?: DevicePlatform;
      OR?: Array<
        | {
            customer_id: null;
          }
        | {
            customer: {
              deleted_at: null;
              agent_id: string;
            };
          }
      >;
      customer?: {
        deleted_at: null;
        agent_id?: string;
      };
    } = {
      deleted_at: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.deviceType) {
      where.device_type = query.deviceType;
    }

    if (query.platform) {
      where.platform = query.platform;
    }

    if (actor.role === UserRole.ADMIN) {
      if (query.customerId) {
        where.customer_id = query.customerId;
      }
    } else if (actor.role === UserRole.AGENT) {
      const agent = await this.getActiveAgentByUserId(actor.id);

      if (query.customerId) {
        await this.assertCustomerBelongsToAgent(query.customerId, agent.id);
        where.customer_id = query.customerId;
      } else {
        // Show devices either unassigned or assigned to agent's customers
        where.OR = [
          { customer_id: null },
          {
            customer: {
              deleted_at: null,
              agent_id: agent.id,
            },
          },
        ];
      }
    } else {
      const customer = await this.getActiveCustomerByUserId(actor.id);

      if (query.customerId && query.customerId !== customer.id) {
        throw new ForbiddenException('You can only access your own devices');
      }

      where.customer_id = customer.id;
    }

    const devices = await this.prisma.device.findMany({
      where,
      skip: query.skip,
      take: query.take,
      orderBy: { created_at: 'desc' },
    });

    return devices.map((device) => this.mapDeviceToResponseDto(device));
  }

  async findOne(id: string, actor: AuthActor): Promise<DeviceResponseDto> {
    const device = await this.getDeviceById(id);
    await this.assertDeviceAccess(device, actor);

    return this.mapDeviceToResponseDto(device);
  }

  async update(
    id: string,
    updateDeviceDto: UpdateDeviceDto,
    actor: AuthActor,
  ): Promise<DeviceResponseDto> {
    const device = await this.getDeviceById(id);
    await this.assertDeviceAccess(device, actor);

    let targetCustomerId: string | undefined;
    if (updateDeviceDto.customerId !== undefined) {
      targetCustomerId = await this.resolveTargetCustomerId(
        actor,
        updateDeviceDto.customerId,
      );
    }

    try {
      const updatedDevice = await this.prisma.device.update({
        where: { id },
        data: {
          ...(updateDeviceDto.serialNumber !== undefined
            ? { serial_number: updateDeviceDto.serialNumber }
            : {}),
          ...(updateDeviceDto.deviceType !== undefined
            ? { device_type: updateDeviceDto.deviceType }
            : {}),
          ...(updateDeviceDto.platform !== undefined
            ? { platform: updateDeviceDto.platform }
            : {}),
          ...(updateDeviceDto.model !== undefined
            ? { model: updateDeviceDto.model }
            : {}),
          ...(updateDeviceDto.status !== undefined
            ? { status: updateDeviceDto.status }
            : {}),
          ...(updateDeviceDto.customerId !== undefined
            ? { customer_id: targetCustomerId ?? null }
            : {}),
          ...(updateDeviceDto.lastSeen !== undefined
            ? { last_seen: updateDeviceDto.lastSeen }
            : {}),
        },
      });

      return this.mapDeviceToResponseDto(updatedDevice);
    } catch (error: unknown) {
      this.handleUniqueConstraintError(error);
      this.handleRecordNotFoundError(error, id);
      this.handleRelatedRecordNotFoundError(error);
      throw error;
    }
  }

  async delete(id: string, actor: AuthActor): Promise<{ message: string }> {
    const device = await this.getDeviceById(id);
    await this.assertDeviceAccess(device, actor);

    const result = await this.prisma.device.updateMany({
      where: {
        id,
        deleted_at: null,
      },
      data: { deleted_at: new Date() },
    });

    if (result.count === 0) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    return { message: `Device ${id} has been deleted` };
  }

  private async getDeviceById(id: string): Promise<DeviceRecord> {
    const device = await this.prisma.device.findUnique({
      where: { id },
    });

    if (!device || device.deleted_at) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    return device;
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

  private async getActiveCustomerByUserId(
    userId: string,
  ): Promise<{ id: string }> {
    const customer = await this.prisma.customer.findFirst({
      where: {
        user_id: userId,
        deleted_at: null,
      },
      select: { id: true },
    });

    if (!customer) {
      throw new ForbiddenException(
        'Authenticated user is not an active customer',
      );
    }

    return customer;
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

  private async resolveTargetCustomerId(
    actor: AuthActor,
    requestedCustomerId: string | null | undefined,
  ): Promise<string | undefined> {
    // If explicitly set to null, unassign the device
    if (requestedCustomerId === null) {
      return undefined;
    }

    if (!requestedCustomerId) {
      return undefined;
    }

    const customer = await this.getActiveCustomerById(requestedCustomerId);

    if (actor.role === UserRole.ADMIN) {
      return customer.id;
    }

    if (actor.role === UserRole.AGENT) {
      const agent = await this.getActiveAgentByUserId(actor.id);

      if (customer.agent_id !== agent.id) {
        throw new ForbiddenException(
          'Agents can only assign devices to their customers',
        );
      }

      return customer.id;
    }

    throw new ForbiddenException('Customers cannot assign devices');
  }

  private async assertCustomerBelongsToAgent(
    customerId: string,
    agentId: string,
  ): Promise<void> {
    const customer = await this.getActiveCustomerById(customerId);

    if (customer.agent_id !== agentId) {
      throw new ForbiddenException(
        'Agents can only access devices for their customers',
      );
    }
  }

  private async assertDeviceAccess(
    device: DeviceRecord,
    actor: AuthActor,
  ): Promise<void> {
    if (actor.role === UserRole.ADMIN) {
      return;
    }

    if (actor.role === UserRole.AGENT) {
      const agent = await this.getActiveAgentByUserId(actor.id);

      // Allow access to unassigned devices (inventory) or assigned to agent's customers
      if (device.customer_id) {
        await this.assertCustomerBelongsToAgent(device.customer_id, agent.id);
      }
      return;
    }

    const customer = await this.getActiveCustomerByUserId(actor.id);

    if (device.customer_id !== customer.id) {
      throw new ForbiddenException('You can only access your own devices');
    }
  }

  private mapDeviceToResponseDto(device: {
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
  }): DeviceResponseDto {
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

  private handleUniqueConstraintError(error: unknown): void {
    if (!isPrismaErrorCode(error, 'P2002')) {
      return;
    }

    const target = getPrismaUniqueConstraintTarget(error);

    if (target.includes('serial_number')) {
      throw new BadRequestException(
        'Device with provided serial number exists',
      );
    }

    throw new BadRequestException(
      'Device with provided details already exists',
    );
  }

  private handleRecordNotFoundError(error: unknown, id: string): void {
    if (!isPrismaErrorCode(error, 'P2025')) {
      return;
    }

    throw new NotFoundException(`Device with ID ${id} not found`);
  }

  private handleRelatedRecordNotFoundError(error: unknown): void {
    if (!isPrismaErrorCode(error, 'P2003')) {
      return;
    }

    throw new BadRequestException('Referenced customer does not exist');
  }
}
