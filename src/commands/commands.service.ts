import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommandStatus, CommandType, Prisma, UserRole } from '@prisma/client';
import type { AuthActor } from '../common/types/auth-actor.type';
import {
  getPrismaUniqueConstraintTarget,
  isPrismaErrorCode,
} from '../common/prisma/prisma-error.utils';
import { PrismaService } from '../database/prisma.service';
import {
  CommandResponseDto,
  CreateCommandDto,
  FindAllCommandsQueryDto,
  UpdateCommandDto,
} from './dto';

type CommandRecord = {
  id: string;
  device_id: string;
  loan_id: string;
  command_type: CommandType;
  status: CommandStatus;
  sent_at: Date | null;
  acknowledged_at: Date | null;
  retry_count: number;
  issued_by_id: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

type CommandWithLoanRecord = CommandRecord & {
  loan: {
    customer_id: string;
    agent_id: string;
    deleted_at: Date | null;
  };
};

@Injectable()
export class CommandsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createCommandDto: CreateCommandDto,
    actor: AuthActor,
  ): Promise<CommandResponseDto> {
    if (actor.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot create commands');
    }

    const loan = await this.getExistingLoanById(createCommandDto.loanId);
    await this.assertLoanAccess(loan, actor);

    const device = await this.getExistingDeviceById(createCommandDto.deviceId);
    if (loan.device_id !== device.id) {
      throw new BadRequestException('Loan is not associated with the device');
    }

    const status = createCommandDto.status ?? CommandStatus.PENDING;

    try {
      const command = await this.prisma.command.create({
        data: {
          device_id: createCommandDto.deviceId,
          loan_id: createCommandDto.loanId,
          command_type: createCommandDto.commandType,
          status,
          sent_at: createCommandDto.sentAt ?? null,
          acknowledged_at: createCommandDto.acknowledgedAt ?? null,
          retry_count: createCommandDto.retryCount ?? 0,
          issued_by_id: actor.id,
        },
      });

      return this.mapCommandToResponseDto(command);
    } catch (error: unknown) {
      this.handleRelatedRecordNotFoundError(error);
      throw error;
    }
  }

  async findAll(
    query: FindAllCommandsQueryDto,
    actor: AuthActor,
  ): Promise<CommandResponseDto[]> {
    const where: Prisma.CommandWhereInput = {
      deleted_at: null,
    };

    if (query.deviceId) {
      where.device_id = query.deviceId;
    }

    if (query.loanId) {
      where.loan_id = query.loanId;
    }

    if (query.commandType) {
      where.command_type = query.commandType;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (actor.role === UserRole.ADMIN) {
      if (query.customerId) {
        where.loan = {
          deleted_at: null,
          customer_id: query.customerId,
        };
      }
    } else if (actor.role === UserRole.AGENT) {
      const agentProfile = await this.getActiveAgentProfileByUserId(actor.id);

      if (query.customerId) {
        const customer = await this.getActiveCustomerById(query.customerId);
        if (customer.agent_id !== agentProfile.id) {
          throw new ForbiddenException(
            'Agents can only access commands for their own customers',
          );
        }

        where.loan = {
          deleted_at: null,
          agent_id: actor.id,
          customer_id: query.customerId,
          customer: {
            agent_id: agentProfile.id,
          },
        };
      } else {
        where.loan = {
          deleted_at: null,
          agent_id: actor.id,
          customer: {
            agent_id: agentProfile.id,
          },
        };
      }
    } else {
      const customer = await this.getActiveCustomerByUserId(actor.id);

      if (query.customerId && query.customerId !== customer.id) {
        throw new ForbiddenException('You can only access your own commands');
      }

      where.loan = {
        deleted_at: null,
        customer_id: customer.id,
      };
    }

    const commands = await this.prisma.command.findMany({
      where,
      skip: query.skip,
      take: query.take,
      orderBy: { created_at: 'desc' },
    });

    return commands.map((command) => this.mapCommandToResponseDto(command));
  }

  async findOne(id: string, actor: AuthActor): Promise<CommandResponseDto> {
    const command = await this.getCommandById(id);
    await this.assertCommandAccess(command, actor);

    return this.mapCommandToResponseDto(command);
  }

  async update(
    id: string,
    updateCommandDto: UpdateCommandDto,
    actor: AuthActor,
  ): Promise<CommandResponseDto> {
    if (actor.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot update commands');
    }

    const command = await this.getCommandById(id);
    await this.assertCommandAccess(command, actor);

    if (updateCommandDto.loanId || updateCommandDto.deviceId) {
      const targetLoanId = updateCommandDto.loanId ?? command.loan_id;
      const targetDeviceId = updateCommandDto.deviceId ?? command.device_id;

      const loan = await this.getExistingLoanById(targetLoanId);
      await this.assertLoanAccess(loan, actor);

      const device = await this.getExistingDeviceById(targetDeviceId);
      if (loan.device_id !== device.id) {
        throw new BadRequestException('Loan is not associated with the device');
      }
    }

    try {
      const updated = await this.prisma.command.update({
        where: { id },
        data: {
          ...(updateCommandDto.deviceId !== undefined
            ? { device_id: updateCommandDto.deviceId }
            : {}),
          ...(updateCommandDto.loanId !== undefined
            ? { loan_id: updateCommandDto.loanId }
            : {}),
          ...(updateCommandDto.commandType !== undefined
            ? { command_type: updateCommandDto.commandType }
            : {}),
          ...(updateCommandDto.status !== undefined
            ? { status: updateCommandDto.status }
            : {}),
          ...(updateCommandDto.sentAt !== undefined
            ? { sent_at: updateCommandDto.sentAt }
            : {}),
          ...(updateCommandDto.acknowledgedAt !== undefined
            ? { acknowledged_at: updateCommandDto.acknowledgedAt }
            : {}),
          ...(updateCommandDto.retryCount !== undefined
            ? { retry_count: updateCommandDto.retryCount }
            : {}),
        },
      });

      return this.mapCommandToResponseDto(updated);
    } catch (error: unknown) {
      this.handleRecordNotFoundError(error, id);
      this.handleRelatedRecordNotFoundError(error);
      throw error;
    }
  }

  async delete(id: string, actor: AuthActor): Promise<{ message: string }> {
    if (actor.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot delete commands');
    }

    const command = await this.getCommandById(id);
    await this.assertCommandAccess(command, actor);

    const result = await this.prisma.command.updateMany({
      where: {
        id,
        deleted_at: null,
      },
      data: { deleted_at: new Date() },
    });

    if (result.count === 0) {
      throw new NotFoundException(`Command with ID ${id} not found`);
    }

    return { message: `Command ${id} has been deleted` };
  }

  private async getCommandById(id: string): Promise<CommandWithLoanRecord> {
    const command = await this.prisma.command.findUnique({
      where: { id },
      include: {
        loan: {
          select: {
            customer_id: true,
            agent_id: true,
            deleted_at: true,
          },
        },
      },
    });

    if (
      !command ||
      command.deleted_at ||
      !command.loan ||
      command.loan.deleted_at
    ) {
      throw new NotFoundException(`Command with ID ${id} not found`);
    }

    return command;
  }

  private async getExistingLoanById(loanId: string): Promise<{
    id: string;
    customer_id: string;
    agent_id: string;
    device_id: string;
  }> {
    const loan = await this.prisma.loan.findFirst({
      where: {
        id: loanId,
        deleted_at: null,
      },
      select: {
        id: true,
        customer_id: true,
        agent_id: true,
        device_id: true,
      },
    });

    if (!loan) {
      throw new NotFoundException(`Loan with ID ${loanId} not found`);
    }

    return loan;
  }

  private async getExistingDeviceById(
    deviceId: string,
  ): Promise<{ id: string }> {
    const device = await this.prisma.device.findFirst({
      where: {
        id: deviceId,
        deleted_at: null,
      },
      select: { id: true },
    });

    if (!device) {
      throw new NotFoundException(`Device with ID ${deviceId} not found`);
    }

    return device;
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

  private async getActiveAgentProfileByUserId(
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

  private async assertLoanAccess(
    loan: { customer_id: string; agent_id: string },
    actor: AuthActor,
  ): Promise<void> {
    if (actor.role === UserRole.ADMIN) {
      return;
    }

    if (actor.role === UserRole.AGENT) {
      const agentProfile = await this.getActiveAgentProfileByUserId(actor.id);
      const customer = await this.getActiveCustomerById(loan.customer_id);

      if (customer.agent_id !== agentProfile.id || loan.agent_id !== actor.id) {
        throw new ForbiddenException(
          'Agents can only access commands for their own customers',
        );
      }
      return;
    }

    const customer = await this.getActiveCustomerByUserId(actor.id);
    if (loan.customer_id !== customer.id) {
      throw new ForbiddenException('You can only access your own commands');
    }
  }

  private async assertCommandAccess(
    command: CommandWithLoanRecord,
    actor: AuthActor,
  ): Promise<void> {
    await this.assertLoanAccess(
      {
        customer_id: command.loan.customer_id,
        agent_id: command.loan.agent_id,
      },
      actor,
    );
  }

  private mapCommandToResponseDto(command: CommandRecord): CommandResponseDto {
    return {
      id: command.id,
      deviceId: command.device_id,
      loanId: command.loan_id,
      commandType: command.command_type,
      status: command.status,
      sentAt: command.sent_at,
      acknowledgedAt: command.acknowledged_at,
      retryCount: command.retry_count,
      issuedById: command.issued_by_id,
      createdAt: command.created_at,
      updatedAt: command.updated_at,
      deletedAt: command.deleted_at,
    };
  }

  private handleRecordNotFoundError(error: unknown, id: string): void {
    if (!isPrismaErrorCode(error, 'P2025')) {
      return;
    }

    throw new NotFoundException(`Command with ID ${id} not found`);
  }

  private handleRelatedRecordNotFoundError(error: unknown): void {
    if (!isPrismaErrorCode(error, 'P2003')) {
      return;
    }

    throw new BadRequestException('Referenced loan or device does not exist');
  }

  private handleUniqueConstraintError(error: unknown): void {
    if (!isPrismaErrorCode(error, 'P2002')) {
      return;
    }

    const target = getPrismaUniqueConstraintTarget(error);
    throw new BadRequestException(
      `Command already exists for unique fields: ${target.join(', ')}`,
    );
  }
}
