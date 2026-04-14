import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { JwtGuard } from '../common/guards/jwt/jwt.guard';
import { RolesGuard } from '../common/guards/roles/roles.guard';

describe('AgentsController', () => {
  let controller: AgentsController;
  const agentsServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentsController],
      providers: [
        {
          provide: AgentsService,
          useValue: agentsServiceMock,
        },
        {
          provide: JwtGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
        {
          provide: JwtService,
          useValue: { verify: jest.fn() },
        },
        {
          provide: RolesGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
      ],
    }).compile();

    controller = module.get<AgentsController>(AgentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create() forwards dto to service', async () => {
    const dto = {
      userId: 'user-agent-1',
      region: 'Greater Accra',
      commissionRate: 10,
    };
    const serviceResult = {
      id: 'agent-1',
      userId: 'user-agent-1',
      region: 'Greater Accra',
      commissionRate: 10,
      customerCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    agentsServiceMock.create.mockResolvedValue(serviceResult);

    const result = await controller.create(dto);

    expect(agentsServiceMock.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(serviceResult);
  });

  it('findAll() maps query pagination values to service params', async () => {
    const serviceResult = [
      {
        id: 'agent-1',
        userId: 'user-agent-1',
        region: 'Greater Accra',
        commissionRate: 10,
        customerCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ];

    agentsServiceMock.findAll.mockResolvedValue(serviceResult);

    const result = await controller.findAll({ skip: 5, take: 20 });

    expect(agentsServiceMock.findAll).toHaveBeenCalledWith(5, 20);
    expect(result).toEqual(serviceResult);
  });

  it('findOne() forwards id to service', async () => {
    const serviceResult = {
      id: 'agent-1',
      userId: 'user-agent-1',
      region: 'Greater Accra',
      commissionRate: 10,
      customerCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    agentsServiceMock.findOne.mockResolvedValue(serviceResult);

    const result = await controller.findOne('agent-1');

    expect(agentsServiceMock.findOne).toHaveBeenCalledWith('agent-1');
    expect(result).toEqual(serviceResult);
  });

  it('update() forwards id and dto to service', async () => {
    const dto = {
      region: 'Ashanti',
      commissionRate: 12,
    };
    const serviceResult = {
      id: 'agent-1',
      userId: 'user-agent-1',
      region: 'Ashanti',
      commissionRate: 12,
      customerCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    agentsServiceMock.update.mockResolvedValue(serviceResult);

    const result = await controller.update('agent-1', dto);

    expect(agentsServiceMock.update).toHaveBeenCalledWith('agent-1', dto);
    expect(result).toEqual(serviceResult);
  });

  it('delete() forwards id to service', async () => {
    const serviceResult = { message: 'Agent agent-1 has been deleted' };
    agentsServiceMock.delete.mockResolvedValue(serviceResult);

    const result = await controller.delete('agent-1');

    expect(agentsServiceMock.delete).toHaveBeenCalledWith('agent-1');
    expect(result).toEqual(serviceResult);
  });
});
