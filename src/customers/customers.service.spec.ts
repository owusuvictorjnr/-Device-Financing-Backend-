import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CustomersService } from './customers.service';
import { PrismaService } from '../database/prisma.service';

describe('CustomersService', () => {
  let service: CustomersService;
  const prismaMock = {
    user: {
      findUnique: jest.fn(),
    },
    agent: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    customer: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const customerRecord = {
    id: 'customer-1',
    user_id: 'user-customer-1',
    agent_id: 'agent-1',
    national_id: 'NAT-001',
    address: 'Accra',
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-02T00:00:00.000Z'),
    deleted_at: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a customer for ADMIN when agentId is provided', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-customer-1',
      role: UserRole.CUSTOMER,
      deleted_at: null,
    });
    prismaMock.agent.findUnique.mockResolvedValue({
      id: 'agent-1',
      deleted_at: null,
    });
    prismaMock.customer.create.mockResolvedValue(customerRecord);

    const result = await service.create(
      {
        userId: 'user-customer-1',
        agentId: 'agent-1',
        nationalId: 'NAT-001',
        address: 'Accra',
      },
      { id: 'admin-1', role: UserRole.ADMIN },
    );

    expect(prismaMock.customer.create).toHaveBeenCalledWith({
      data: {
        user_id: 'user-customer-1',
        agent_id: 'agent-1',
        national_id: 'NAT-001',
        address: 'Accra',
      },
    });
    expect(result).toEqual({
      id: customerRecord.id,
      userId: customerRecord.user_id,
      agentId: customerRecord.agent_id,
      nationalId: customerRecord.national_id,
      address: customerRecord.address,
      createdAt: customerRecord.created_at,
      updatedAt: customerRecord.updated_at,
      deletedAt: customerRecord.deleted_at,
    });
  });

  it('rejects create for ADMIN when agentId is missing', async () => {
    await expect(
      service.create(
        {
          userId: 'user-customer-1',
          nationalId: 'NAT-001',
          address: 'Accra',
        },
        { id: 'admin-1', role: UserRole.ADMIN },
      ),
    ).rejects.toThrow(new BadRequestException('agentId is required'));
  });

  it('rejects create when linked user is not CUSTOMER role', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-agent-1',
      role: UserRole.AGENT,
      deleted_at: null,
    });
    prismaMock.agent.findUnique.mockResolvedValue({
      id: 'agent-1',
      deleted_at: null,
    });

    await expect(
      service.create(
        {
          userId: 'user-agent-1',
          agentId: 'agent-1',
          nationalId: 'NAT-001',
          address: 'Accra',
        },
        { id: 'admin-1', role: UserRole.ADMIN },
      ),
    ).rejects.toThrow(new BadRequestException('User must have CUSTOMER role'));
  });

  it('maps unique-constraint error during create to domain exception', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-customer-1',
      role: UserRole.CUSTOMER,
      deleted_at: null,
    });
    prismaMock.agent.findUnique.mockResolvedValue({
      id: 'agent-1',
      deleted_at: null,
    });
    prismaMock.customer.create.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['national_id'] },
    });

    await expect(
      service.create(
        {
          userId: 'user-customer-1',
          agentId: 'agent-1',
          nationalId: 'NAT-001',
          address: 'Accra',
        },
        { id: 'admin-1', role: UserRole.ADMIN },
      ),
    ).rejects.toThrow(new BadRequestException('National ID already in use'));
  });

  it('scopes findAll results to authenticated agent', async () => {
    prismaMock.agent.findFirst.mockResolvedValue({ id: 'agent-1' });
    prismaMock.customer.findMany.mockResolvedValue([customerRecord]);

    await service.findAll(
      { skip: 0, take: 10 },
      { id: 'agent-user-1', role: UserRole.AGENT },
    );

    expect(prismaMock.customer.findMany).toHaveBeenCalledWith({
      where: {
        deleted_at: null,
        agent_id: 'agent-1',
      },
      skip: 0,
      take: 10,
      orderBy: { created_at: 'desc' },
    });
  });

  it('rejects update when userId conflicts with another customer profile', async () => {
    prismaMock.customer.findUnique
      .mockResolvedValueOnce(customerRecord)
      .mockResolvedValueOnce({ id: 'customer-2' });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-customer-2',
      role: UserRole.CUSTOMER,
      deleted_at: null,
    });

    await expect(
      service.update(
        'customer-1',
        { userId: 'user-customer-2' },
        { id: 'admin-1', role: UserRole.ADMIN },
      ),
    ).rejects.toThrow(
      new BadRequestException('User already has a customer profile'),
    );
  });

  it('soft-deletes customer and returns success message', async () => {
    type DeleteUpdateArgs = {
      where: { id: string };
      data: { deleted_at: Date };
    };

    let capturedUpdateArgs: DeleteUpdateArgs | undefined;

    prismaMock.customer.findUnique.mockResolvedValue(customerRecord);
    prismaMock.customer.update.mockImplementation((args: DeleteUpdateArgs) => {
      capturedUpdateArgs = args;

      return {
        ...customerRecord,
        deleted_at: new Date(),
      };
    });

    const result = await service.delete('customer-1', {
      id: 'admin-1',
      role: UserRole.ADMIN,
    });

    expect(prismaMock.customer.update).toHaveBeenCalledTimes(1);
    expect(capturedUpdateArgs).toBeDefined();
    expect(capturedUpdateArgs?.where).toEqual({ id: 'customer-1' });
    expect(capturedUpdateArgs?.data.deleted_at).toBeInstanceOf(Date);
    expect(result).toEqual({ message: 'Customer customer-1 has been deleted' });
  });
});
