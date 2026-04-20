import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
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
});
