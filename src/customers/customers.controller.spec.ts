import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { JwtGuard } from '../common/guards/jwt/jwt.guard';
import { RolesGuard } from '../common/guards/roles/roles.guard';

describe('CustomersController', () => {
  let controller: CustomersController;
  const customersServiceMock = {
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
      controllers: [CustomersController],
      providers: [
        {
          provide: CustomersService,
          useValue: customersServiceMock,
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

    controller = module.get<CustomersController>(CustomersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create() forwards dto and actor context to service', async () => {
    const dto = {
      userId: 'user-customer-1',
      agentId: 'agent-1',
      nationalId: 'NAT-001',
      address: 'Accra',
    };
    const serviceResult = {
      id: 'customer-1',
      userId: 'user-customer-1',
      agentId: 'agent-1',
      nationalId: 'NAT-001',
      address: 'Accra',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    customersServiceMock.create.mockResolvedValue(serviceResult);

    const result = await controller.create(dto, 'admin-1', UserRole.ADMIN);

    expect(customersServiceMock.create).toHaveBeenCalledWith(dto, {
      id: 'admin-1',
      role: UserRole.ADMIN,
    });
    expect(result).toEqual(serviceResult);
  });

  it('findAll() forwards query and actor context to service', async () => {
    const query = { skip: 0, take: 10, agentId: 'agent-1' };
    const serviceResult = [
      {
        id: 'customer-1',
        userId: 'user-customer-1',
        agentId: 'agent-1',
        nationalId: 'NAT-001',
        address: 'Accra',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ];

    customersServiceMock.findAll.mockResolvedValue(serviceResult);

    const result = await controller.findAll(query, 'admin-1', UserRole.ADMIN);

    expect(customersServiceMock.findAll).toHaveBeenCalledWith(query, {
      id: 'admin-1',
      role: UserRole.ADMIN,
    });
    expect(result).toEqual(serviceResult);
  });

  it('findOne() forwards id and actor context to service', async () => {
    const serviceResult = {
      id: 'customer-1',
      userId: 'user-customer-1',
      agentId: 'agent-1',
      nationalId: 'NAT-001',
      address: 'Accra',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    customersServiceMock.findOne.mockResolvedValue(serviceResult);

    const result = await controller.findOne(
      'customer-1',
      'agent-user-1',
      UserRole.AGENT,
    );

    expect(customersServiceMock.findOne).toHaveBeenCalledWith('customer-1', {
      id: 'agent-user-1',
      role: UserRole.AGENT,
    });
    expect(result).toEqual(serviceResult);
  });

  it('update() forwards id, dto, and actor context to service', async () => {
    const dto = {
      address: 'Kumasi',
      nationalId: 'NAT-002',
    };
    const serviceResult = {
      id: 'customer-1',
      userId: 'user-customer-1',
      agentId: 'agent-1',
      nationalId: 'NAT-002',
      address: 'Kumasi',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    customersServiceMock.update.mockResolvedValue(serviceResult);

    const result = await controller.update(
      'customer-1',
      dto,
      'admin-1',
      UserRole.ADMIN,
    );

    expect(customersServiceMock.update).toHaveBeenCalledWith(
      'customer-1',
      dto,
      {
        id: 'admin-1',
        role: UserRole.ADMIN,
      },
    );
    expect(result).toEqual(serviceResult);
  });

  it('delete() forwards id and actor context to service', async () => {
    const serviceResult = { message: 'Customer customer-1 has been deleted' };
    customersServiceMock.delete.mockResolvedValue(serviceResult);

    const result = await controller.delete(
      'customer-1',
      'agent-user-1',
      UserRole.AGENT,
    );

    expect(customersServiceMock.delete).toHaveBeenCalledWith('customer-1', {
      id: 'agent-user-1',
      role: UserRole.AGENT,
    });
    expect(result).toEqual(serviceResult);
  });

  it('throws when authenticated user context is missing', async () => {
    await expect(
      controller.findAll({ skip: 0, take: 10 }, '', UserRole.ADMIN),
    ).rejects.toThrow('Missing authenticated user context');

    expect(customersServiceMock.findAll).not.toHaveBeenCalled();
  });
});
