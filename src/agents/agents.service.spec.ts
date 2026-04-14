import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AgentsService } from './agents.service';
import { PrismaService } from '../database/prisma.service';

describe('AgentsService', () => {
  let service: AgentsService;
  const prismaMock = {
    user: {
      findUnique: jest.fn(),
    },
    agent: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const agentRecord = {
    id: 'agent-1',
    user_id: 'user-agent-1',
    region: 'Greater Accra',
    commission_rate: 12,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-02T00:00:00.000Z'),
    deleted_at: null,
    _count: {
      customers: 2,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<AgentsService>(AgentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates an agent when user role is AGENT', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-agent-1',
      role: UserRole.AGENT,
      deleted_at: null,
    });
    prismaMock.agent.create.mockResolvedValue(agentRecord);

    const result = await service.create({
      userId: 'user-agent-1',
      region: 'Greater Accra',
      commissionRate: 12,
    });

    expect(prismaMock.agent.create).toHaveBeenCalledWith({
      data: {
        user_id: 'user-agent-1',
        region: 'Greater Accra',
        commission_rate: 12,
      },
      include: {
        _count: {
          select: {
            customers: {
              where: {
                deleted_at: null,
              },
            },
          },
        },
      },
    });
    expect(result).toEqual({
      id: agentRecord.id,
      userId: agentRecord.user_id,
      region: agentRecord.region,
      commissionRate: agentRecord.commission_rate,
      customerCount: 2,
      createdAt: agentRecord.created_at,
      updatedAt: agentRecord.updated_at,
      deletedAt: null,
    });
  });

  it('rejects create when linked user does not have AGENT role', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-customer-1',
      role: UserRole.CUSTOMER,
      deleted_at: null,
    });

    await expect(
      service.create({
        userId: 'user-customer-1',
        region: 'Greater Accra',
        commissionRate: 12,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('maps create unique-constraint error on user_id', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-agent-1',
      role: UserRole.AGENT,
      deleted_at: null,
    });
    prismaMock.agent.create.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['user_id'] },
    });

    await expect(
      service.create({
        userId: 'user-agent-1',
        region: 'Greater Accra',
        commissionRate: 12,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws not found when findOne target does not exist', async () => {
    prismaMock.agent.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing-agent')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects update when new userId already belongs to another agent profile', async () => {
    prismaMock.agent.findUnique
      .mockResolvedValueOnce(agentRecord)
      .mockResolvedValueOnce({ id: 'agent-2' });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-agent-2',
      role: UserRole.AGENT,
      deleted_at: null,
    });

    await expect(
      service.update('agent-1', { userId: 'user-agent-2' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('applies update payload with explicit undefined checks', async () => {
    prismaMock.agent.findUnique.mockResolvedValue(agentRecord);
    prismaMock.agent.update.mockResolvedValue({
      ...agentRecord,
      region: '',
      commission_rate: 18,
    });

    await service.update('agent-1', {
      region: '',
      commissionRate: 18,
    });

    expect(prismaMock.agent.update).toHaveBeenCalledWith({
      where: { id: 'agent-1' },
      data: {
        region: '',
        commission_rate: 18,
      },
      include: {
        _count: {
          select: {
            customers: {
              where: {
                deleted_at: null,
              },
            },
          },
        },
      },
    });
  });

  it('maps update P2025 into domain not-found exception', async () => {
    prismaMock.agent.findUnique.mockResolvedValue(agentRecord);
    prismaMock.agent.update.mockRejectedValue({ code: 'P2025' });

    await expect(
      service.update('agent-1', { region: 'Ashanti' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('soft deletes an agent and returns confirmation message', async () => {
    type DeleteUpdateManyArgs = {
      where: { id: string; deleted_at: null };
      data: { deleted_at: Date };
    };

    let capturedArgs: DeleteUpdateManyArgs | undefined;

    prismaMock.agent.updateMany.mockImplementation(
      (args: DeleteUpdateManyArgs) => {
        capturedArgs = args;

        return {
          count: 1,
        };
      },
    );

    const result = await service.delete('agent-1');

    expect(prismaMock.agent.updateMany).toHaveBeenCalledTimes(1);
    expect(capturedArgs?.where).toEqual({ id: 'agent-1', deleted_at: null });
    expect(capturedArgs?.data.deleted_at).toBeInstanceOf(Date);
    expect(result).toEqual({ message: 'Agent agent-1 has been deleted' });
  });

  it('throws not found when delete updateMany affects zero rows', async () => {
    prismaMock.agent.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.delete('missing-agent')).rejects.toThrow(
      NotFoundException,
    );
  });
});
