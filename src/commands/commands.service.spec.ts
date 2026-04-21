import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommandStatus, CommandType, UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CommandsService } from './commands.service';
import { PrismaService } from '../database/prisma.service';

describe('CommandsService', () => {
  let service: CommandsService;
  type AsyncMock = jest.MockedFunction<(...args: any[]) => Promise<any>>;

  const prismaMock: {
    command: {
      create: AsyncMock;
      findMany: AsyncMock;
      findUnique: AsyncMock;
      update: AsyncMock;
      updateMany: AsyncMock;
    };
    loan: {
      findFirst: AsyncMock;
    };
    device: {
      findFirst: AsyncMock;
    };
    customer: {
      findFirst: AsyncMock;
    };
    agent: {
      findFirst: AsyncMock;
    };
  } = {
    command: {
      create: jest.fn() as AsyncMock,
      findMany: jest.fn() as AsyncMock,
      findUnique: jest.fn() as AsyncMock,
      update: jest.fn() as AsyncMock,
      updateMany: jest.fn() as AsyncMock,
    },
    loan: {
      findFirst: jest.fn() as AsyncMock,
    },
    device: {
      findFirst: jest.fn() as AsyncMock,
    },
    customer: {
      findFirst: jest.fn() as AsyncMock,
    },
    agent: {
      findFirst: jest.fn() as AsyncMock,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommandsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<CommandsService>(CommandsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects CUSTOMER command creation', async () => {
    await expect(
      service.create(
        {
          deviceId: 'device-1',
          loanId: 'loan-1',
          commandType: CommandType.LOCK,
        },
        {
          id: 'customer-1',
          role: UserRole.CUSTOMER,
        },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('creates a command for ADMIN', async () => {
    prismaMock.loan.findFirst.mockResolvedValue({
      id: 'loan-1',
      customer_id: 'customer-1',
      agent_id: 'agent-user-1',
      device_id: 'device-1',
    });
    prismaMock.device.findFirst.mockResolvedValue({ id: 'device-1' });
    prismaMock.command.create.mockResolvedValue({
      id: 'command-1',
      device_id: 'device-1',
      loan_id: 'loan-1',
      command_type: CommandType.LOCK,
      status: CommandStatus.PENDING,
      sent_at: null,
      acknowledged_at: null,
      retry_count: 0,
      issued_by_id: 'admin-1',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
      deleted_at: null,
    });

    const result = await service.create(
      {
        deviceId: 'device-1',
        loanId: 'loan-1',
        commandType: CommandType.LOCK,
      },
      {
        id: 'admin-1',
        role: UserRole.ADMIN,
      },
    );

    expect(prismaMock.command.create).toHaveBeenCalledWith({
      data: {
        device_id: 'device-1',
        loan_id: 'loan-1',
        command_type: CommandType.LOCK,
        status: CommandStatus.PENDING,
        sent_at: null,
        acknowledged_at: null,
        retry_count: 0,
        issued_by_id: 'admin-1',
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 'command-1',
        deviceId: 'device-1',
        loanId: 'loan-1',
        commandType: CommandType.LOCK,
      }),
    );
  });

  it('returns issued-by specific message for P2003 create errors', async () => {
    prismaMock.loan.findFirst.mockResolvedValue({
      id: 'loan-1',
      customer_id: 'customer-1',
      agent_id: 'agent-user-1',
      device_id: 'device-1',
    });
    prismaMock.device.findFirst.mockResolvedValue({ id: 'device-1' });
    prismaMock.command.create.mockRejectedValue({
      code: 'P2003',
      meta: { field_name: 'issued_by_id' },
    });

    await expect(
      service.create(
        {
          deviceId: 'device-1',
          loanId: 'loan-1',
          commandType: CommandType.LOCK,
        },
        {
          id: 'admin-1',
          role: UserRole.ADMIN,
        },
      ),
    ).rejects.toThrow('Referenced issuing user does not exist');
  });

  it('returns generic related-record message for unknown P2003 fields', async () => {
    prismaMock.loan.findFirst.mockResolvedValue({
      id: 'loan-1',
      customer_id: 'customer-1',
      agent_id: 'agent-user-1',
      device_id: 'device-1',
    });
    prismaMock.device.findFirst.mockResolvedValue({ id: 'device-1' });
    prismaMock.command.create.mockRejectedValue({
      code: 'P2003',
      meta: { field_name: 'unknown_fk' },
    });

    await expect(
      service.create(
        {
          deviceId: 'device-1',
          loanId: 'loan-1',
          commandType: CommandType.LOCK,
        },
        {
          id: 'admin-1',
          role: UserRole.ADMIN,
        },
      ),
    ).rejects.toThrow('A related record does not exist');
  });

  it('findAll for ADMIN always filters out commands with deleted loans', async () => {
    prismaMock.command.findMany.mockResolvedValue([]);

    await service.findAll(
      {
        skip: 0,
        take: 10,
        customerId: 'customer-1',
      },
      {
        id: 'admin-1',
        role: UserRole.ADMIN,
      },
    );

    expect(prismaMock.command.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deleted_at: null,
          loan: {
            deleted_at: null,
            customer_id: 'customer-1',
          },
        },
      }),
    );

    await service.findAll(
      {
        skip: 0,
        take: 10,
      },
      {
        id: 'admin-1',
        role: UserRole.ADMIN,
      },
    );

    expect(prismaMock.command.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          deleted_at: null,
          loan: {
            deleted_at: null,
          },
        },
      }),
    );
  });

  it('findAll for AGENT scopes results to agent-owned customers', async () => {
    prismaMock.agent.findFirst.mockResolvedValue({ id: 'agent-profile-1' });
    prismaMock.command.findMany.mockResolvedValue([]);

    await service.findAll(
      {
        skip: 0,
        take: 10,
      },
      {
        id: 'agent-user-1',
        role: UserRole.AGENT,
      },
    );

    expect(prismaMock.command.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deleted_at: null,
          loan: {
            deleted_at: null,
            agent_id: 'agent-user-1',
            customer: {
              agent_id: 'agent-profile-1',
            },
          },
        },
      }),
    );
  });

  it('findAll for CUSTOMER scopes results to the authenticated customer', async () => {
    prismaMock.customer.findFirst.mockResolvedValue({ id: 'customer-1' });
    prismaMock.command.findMany.mockResolvedValue([]);

    await service.findAll(
      {
        skip: 0,
        take: 10,
      },
      {
        id: 'customer-user-1',
        role: UserRole.CUSTOMER,
      },
    );

    expect(prismaMock.command.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deleted_at: null,
          loan: {
            deleted_at: null,
            customer_id: 'customer-1',
          },
        },
      }),
    );
  });

  it('rejects CUSTOMER command updates', async () => {
    await expect(
      service.update(
        'command-1',
        {
          status: CommandStatus.PENDING,
        },
        {
          id: 'customer-user-1',
          role: UserRole.CUSTOMER,
        },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects update when loan and device are inconsistent', async () => {
    prismaMock.command.findUnique.mockResolvedValue({
      id: 'command-1',
      device_id: 'device-1',
      loan_id: 'loan-1',
      command_type: CommandType.LOCK,
      status: CommandStatus.PENDING,
      sent_at: null,
      acknowledged_at: null,
      retry_count: 0,
      issued_by_id: 'admin-1',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
      deleted_at: null,
      loan: {
        customer_id: 'customer-1',
        agent_id: 'agent-user-1',
        deleted_at: null,
      },
    });
    prismaMock.loan.findFirst.mockResolvedValue({
      id: 'loan-2',
      customer_id: 'customer-1',
      agent_id: 'agent-user-1',
      device_id: 'device-2',
    });
    prismaMock.device.findFirst.mockResolvedValue({ id: 'device-1' });

    await expect(
      service.update(
        'command-1',
        {
          loanId: 'loan-2',
          deviceId: 'device-1',
        },
        {
          id: 'admin-1',
          role: UserRole.ADMIN,
        },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('soft-deletes a command by setting deleted_at', async () => {
    prismaMock.command.findUnique.mockResolvedValue({
      id: 'command-1',
      device_id: 'device-1',
      loan_id: 'loan-1',
      command_type: CommandType.LOCK,
      status: CommandStatus.PENDING,
      sent_at: null,
      acknowledged_at: null,
      retry_count: 0,
      issued_by_id: 'admin-1',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
      deleted_at: null,
      loan: {
        customer_id: 'customer-1',
        agent_id: 'agent-user-1',
        deleted_at: null,
      },
    });
    prismaMock.command.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.delete('command-1', {
      id: 'admin-1',
      role: UserRole.ADMIN,
    });

    expect(prismaMock.command.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'command-1',
        deleted_at: null,
      },
      data: {
        deleted_at: expect.any(Date),
      },
    });
    expect(result).toEqual({ message: 'Command command-1 has been deleted' });
  });

  it('throws not found when soft-delete affects no records', async () => {
    prismaMock.command.findUnique.mockResolvedValue({
      id: 'command-1',
      device_id: 'device-1',
      loan_id: 'loan-1',
      command_type: CommandType.LOCK,
      status: CommandStatus.PENDING,
      sent_at: null,
      acknowledged_at: null,
      retry_count: 0,
      issued_by_id: 'admin-1',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
      deleted_at: null,
      loan: {
        customer_id: 'customer-1',
        agent_id: 'agent-user-1',
        deleted_at: null,
      },
    });
    prismaMock.command.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.delete('command-1', {
        id: 'admin-1',
        role: UserRole.ADMIN,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
