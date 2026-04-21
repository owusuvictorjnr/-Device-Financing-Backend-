import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { CommandType, UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CommandsController } from './commands.controller';
import { CommandsService } from './commands.service';

describe('CommandsController', () => {
  let controller: CommandsController;
  type AsyncMock = jest.MockedFunction<(...args: any[]) => Promise<any>>;
  const commandsServiceMock: {
    create: AsyncMock;
    findAll: AsyncMock;
    findOne: AsyncMock;
    update: AsyncMock;
    delete: AsyncMock;
  } = {
    create: jest.fn() as AsyncMock,
    findAll: jest.fn() as AsyncMock,
    findOne: jest.fn() as AsyncMock,
    update: jest.fn() as AsyncMock,
    delete: jest.fn() as AsyncMock,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommandsController],
      providers: [
        {
          provide: CommandsService,
          useValue: commandsServiceMock,
        },
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CommandsController>(CommandsController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('forwards create requests to service with authenticated actor context', async () => {
    commandsServiceMock.create.mockResolvedValue({ id: 'command-1' });

    await controller.create(
      {
        deviceId: 'device-1',
        loanId: 'loan-1',
        commandType: CommandType.LOCK,
      },
      'admin-1',
      UserRole.ADMIN,
    );

    expect(commandsServiceMock.create).toHaveBeenCalledWith(
      {
        deviceId: 'device-1',
        loanId: 'loan-1',
        commandType: CommandType.LOCK,
      },
      { id: 'admin-1', role: UserRole.ADMIN },
    );
  });

  it('rejects missing authenticated user context', () => {
    expect(() =>
      (
        controller as unknown as {
          getActor: (id: string, role: UserRole) => unknown;
        }
      ).getActor('', UserRole.ADMIN),
    ).toThrow(ForbiddenException);
  });
});
