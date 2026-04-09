import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';
/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-call */

describe('UsersService', () => {
  let service: UsersService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto = {
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        password: 'password123',
        role: UserRole.CUSTOMER,
      };

      const prismaMockedUser = {
        id: '1',
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        password_hash: 'hashedpassword',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(prismaMockedUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual({
        id: '1',
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        created_at: prismaMockedUser.created_at,
        updated_at: prismaMockedUser.updated_at,
        deleted_at: null,
      });
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if email already exists', async () => {
      const createUserDto = {
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        password: 'password123',
        role: UserRole.CUSTOMER,
      };

      const mockUser = {
        id: '2',
        name: 'Jane Doe',
        email: 'john@example.com',
        phone: '',
        password_hash: 'hash',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should find a user by ID', async () => {
      const user = {
        id: '1',
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        password_hash: 'hashedpassword',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findOne('1');

      expect(result).toEqual({
        id: '1',
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        created_at: user.created_at,
        updated_at: user.updated_at,
        deleted_at: null,
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
