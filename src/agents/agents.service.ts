import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import {
  getPrismaUniqueConstraintTarget,
  isPrismaErrorCode,
} from '../common/prisma/prisma-error.utils';
import { PrismaService } from '../database/prisma.service';
import { AgentResponseDto, CreateAgentDto, UpdateAgentDto } from './dto';

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAgentDto: CreateAgentDto): Promise<AgentResponseDto> {
    await this.assertValidAgentUser(createAgentDto.userId);

    try {
      const agent = await this.prisma.agent.create({
        data: {
          user_id: createAgentDto.userId,
          region: createAgentDto.region,
          commission_rate: createAgentDto.commissionRate,
        },
        include: {
          _count: {
            select: {
              customers: true,
            },
          },
        },
      });

      return this.mapAgentToResponseDto(agent);
    } catch (error: unknown) {
      this.handleUniqueConstraintError(error);
      this.handleRelatedRecordNotFoundError(error);
      throw error;
    }
  }

  async findAll(skip = 0, take = 10): Promise<AgentResponseDto[]> {
    const agents = await this.prisma.agent.findMany({
      where: { deleted_at: null },
      skip,
      take,
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: {
            customers: true,
          },
        },
      },
    });

    return agents.map((agent) => this.mapAgentToResponseDto(agent));
  }

  async findOne(id: string): Promise<AgentResponseDto> {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            customers: true,
          },
        },
      },
    });

    if (!agent || agent.deleted_at) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }

    return this.mapAgentToResponseDto(agent);
  }

  async update(
    id: string,
    updateAgentDto: UpdateAgentDto,
  ): Promise<AgentResponseDto> {
    const existingAgent = await this.prisma.agent.findUnique({
      where: { id },
      select: {
        id: true,
        deleted_at: true,
      },
    });

    if (!existingAgent || existingAgent.deleted_at) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }

    if (updateAgentDto.userId !== undefined) {
      await this.assertValidAgentUser(updateAgentDto.userId);

      const existingAgentForUser = await this.prisma.agent.findUnique({
        where: { user_id: updateAgentDto.userId },
      });

      if (existingAgentForUser && existingAgentForUser.id !== id) {
        throw new BadRequestException('User already has an agent profile');
      }
    }

    try {
      const agent = await this.prisma.agent.update({
        where: { id },
        data: {
          ...(updateAgentDto.userId !== undefined
            ? { user_id: updateAgentDto.userId }
            : {}),
          ...(updateAgentDto.region !== undefined
            ? { region: updateAgentDto.region }
            : {}),
          ...(updateAgentDto.commissionRate !== undefined
            ? { commission_rate: updateAgentDto.commissionRate }
            : {}),
        },
        include: {
          _count: {
            select: {
              customers: true,
            },
          },
        },
      });

      return this.mapAgentToResponseDto(agent);
    } catch (error: unknown) {
      this.handleUniqueConstraintError(error);
      this.handleRecordNotFoundError(error, id);
      this.handleRelatedRecordNotFoundError(error);
      throw error;
    }
  }

  async delete(id: string): Promise<{ message: string }> {
    const result = await this.prisma.agent.updateMany({
      where: {
        id,
        deleted_at: null,
      },
      data: { deleted_at: new Date() },
    });

    if (result.count === 0) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }

    return { message: `Agent ${id} has been deleted` };
  }

  private async assertValidAgentUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deleted_at) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (user.role !== UserRole.AGENT) {
      throw new BadRequestException('User must have AGENT role');
    }
  }

  private mapAgentToResponseDto(agent: {
    id: string;
    user_id: string;
    region: string;
    commission_rate: number;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    _count?: {
      customers: number;
    };
  }): AgentResponseDto {
    return {
      id: agent.id,
      userId: agent.user_id,
      region: agent.region,
      commissionRate: agent.commission_rate,
      customerCount: agent._count?.customers ?? 0,
      createdAt: agent.created_at,
      updatedAt: agent.updated_at,
      deletedAt: agent.deleted_at,
    };
  }

  private handleUniqueConstraintError(error: unknown): void {
    if (!isPrismaErrorCode(error, 'P2002')) {
      return;
    }

    const target = getPrismaUniqueConstraintTarget(error);

    if (target.includes('user_id')) {
      throw new BadRequestException('User already has an agent profile');
    }

    throw new BadRequestException('Agent with provided details already exists');
  }

  private handleRecordNotFoundError(error: unknown, id: string): void {
    if (!isPrismaErrorCode(error, 'P2025')) {
      return;
    }

    throw new NotFoundException(`Agent with ID ${id} not found`);
  }

  private handleRelatedRecordNotFoundError(error: unknown): void {
    if (!isPrismaErrorCode(error, 'P2003')) {
      return;
    }

    throw new BadRequestException('Referenced user does not exist');
  }
}
