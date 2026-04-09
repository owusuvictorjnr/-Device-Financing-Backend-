import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';
/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-type-assertion */

describe('UsersService', () => {
  let service: UsersService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService as unknown as PrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService) as unknown as jest.Mocked<PrismaService>;
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

    it('should map Prisma P2002 email conflict to BadRequestException', async () => {
      const createUserDto = {
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        password: 'password123',
        role: UserRole.CUSTOMER,
      };

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['email'] },
      });

      await expect(service.create(createUserDto)).rejects.toThrow(
        'Email already in use',
      );
    });

    it('should map Prisma P2002 phone conflict to BadRequestException', async () => {
      const createUserDto = {
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        password: 'password123',
        role: UserRole.CUSTOMER,
      };

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['phone'] },
      });

      await expect(service.create(createUserDto)).rejects.toThrow(
        'Phone number already in use',
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

  describe('findByEmail', () => {
    it('should return user when email belongs to active user', async () => {
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

      prisma.user.findFirst.mockResolvedValue(user);

      const result = await service.findByEmail('john@example.com');

      expect(result).toEqual(user);
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'john@example.com',
          deleted_at: null,
        },
      });
    });

    it('should return null when user is soft-deleted', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const result = await service.findByEmail('deleted@example.com');

      expect(result).toBeNull();
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'deleted@example.com',
          deleted_at: null,
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated list of active users', async () => {
      const users = [
        {
          id: '1',
          name: 'John Doe',
          phone: '1234567890',
          email: 'john@example.com',
          password_hash: 'hash',
          role: UserRole.CUSTOMER,
          status: UserStatus.ACTIVE,
          created_at: new Date('2026-04-01'),
          updated_at: new Date('2026-04-01'),
          deleted_at: null,
        },
      ];

      prisma.user.findMany.mockResolvedValue(users);

      const result = await service.findAll(0, 10);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { deleted_at: null },
        skip: 0,
        take: 10,
        orderBy: { created_at: 'desc' },
      });
    });

    it('should exclude soft-deleted users from results', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await service.findAll(0, 10);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deleted_at: null },
        }),
      );
    });

    it('should apply pagination correctly', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await service.findAll(20, 5);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 5,
        }),
      );
    });
  });

  describe('update', () => {
    it('should update user without password', async () => {
      const updateUserDto = {
        name: 'Jane Doe',
        email: 'jane@example.com',
      };

      const existingUser = {
        id: '1',
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        password_hash: 'hash',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      const updatedUser = {
        ...existingUser,
        ...updateUserDto,
      };

      prisma.user.findUnique.mockResolvedValue(existingUser);
      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('1', updateUserDto);

      expect(result.name).toBe('Jane Doe');
      expect(result.email).toBe('jane@example.com');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining(updateUserDto),
      });
    });

    it('should hash password when provided in update', async () => {
      const updateUserDto = {
        password: 'newpassword123',
      };

      const existingUser = {
        id: '1',
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        password_hash: 'oldhash',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      const updatedUser = {
        ...existingUser,
        password_hash: 'newhash',
      };

      prisma.user.findUnique.mockResolvedValue(existingUser);
      prisma.user.update.mockResolvedValue(updatedUser);

      await service.update('1', updateUserDto);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          password_hash: expect.any(String),
        }),
      });
    });

    it('should throw BadRequestException if email is already in use', async () => {
      const updateUserDto = {
        email: 'taken@example.com',
      };

      const existingUser = {
        id: '1',
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        password_hash: 'hash',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      const otherUserWithEmail = {
        ...existingUser,
        id: '2',
        email: 'taken@example.com',
      };

      prisma.user.findUnique
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(otherUserWithEmail);

      await expect(service.update('1', updateUserDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should map Prisma P2002 email conflict to BadRequestException on update', async () => {
      const updateUserDto = {
        email: 'updated@example.com',
      };

      const existingUser = {
        id: '1',
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        password_hash: 'hash',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      prisma.user.findUnique.mockResolvedValue(existingUser);
      prisma.user.update.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['email'] },
      });

      await expect(service.update('1', updateUserDto)).rejects.toThrow(
        'Email already in use',
      );
    });

    it('should map Prisma P2002 phone conflict to BadRequestException on update', async () => {
      const updateUserDto = {
        phone: '0001112222',
      };

      const existingUser = {
        id: '1',
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        password_hash: 'hash',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      prisma.user.findUnique.mockResolvedValue(existingUser);
      prisma.user.update.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['phone'] },
      });

      await expect(service.update('1', updateUserDto)).rejects.toThrow(
        'Phone number already in use',
      );
    });

    it('should map Prisma P2025 to NotFoundException on update', async () => {
      const updateUserDto = {
        name: 'Jane Doe',
      };

      const existingUser = {
        id: '1',
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        password_hash: 'hash',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      prisma.user.findUnique.mockResolvedValue(existingUser);
      prisma.user.update.mockRejectedValue({
        code: 'P2025',
      });

      await expect(service.update('1', updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should soft delete user by setting deleted_at', async () => {
      const user = {
        id: '1',
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        password_hash: 'hash',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      const deletedUser = {
        ...user,
        deleted_at: new Date(),
      };

      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue(deletedUser);

      const result = await service.delete('1');

      expect(result.message).toContain('deleted');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { deleted_at: expect.any(Date) },
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
