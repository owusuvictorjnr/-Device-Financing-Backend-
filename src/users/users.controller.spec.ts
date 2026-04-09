import { Test, TestingModule } from '@nestjs/testing';
import type { CanActivate } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';
import { JwtGuard } from '../common/guards/jwt/jwt.guard';
import { RolesGuard } from '../common/guards/roles/roles.guard';
import { UserRole, UserStatus } from '@prisma/client';
/* eslint-disable @typescript-eslint/unbound-method */

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockGuard: CanActivate = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    })
      .overrideGuard(JwtGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a user', async () => {
      const createUserDto = {
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        password: 'password123',
        role: UserRole.CUSTOMER,
      };

      const user = {
        id: '1',
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      jest.spyOn(service, 'create').mockResolvedValue(user);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(user);
      expect(service.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('findAll', () => {
    it('should return a list of users', async () => {
      const users = [
        {
          id: '1',
          name: 'John Doe',
          phone: '1234567890',
          email: 'john@example.com',
          role: UserRole.CUSTOMER,
          status: UserStatus.ACTIVE,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      ];

      jest.spyOn(service, 'findAll').mockResolvedValue(users);

      const result = await controller.findAll(0, 10);

      expect(result).toEqual(users);
      expect(service.findAll).toHaveBeenCalledWith(0, 10);
    });
  });

  describe('findOne', () => {
    it('should return a single user', async () => {
      const user = {
        id: '1',
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(user);

      const result = await controller.findOne('1');

      expect(result).toEqual(user);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('update', () => {
    const updatedUser = {
      id: '2',
      name: 'Jane Smith Updated',
      phone: '9876543210',
      email: 'jane.updated@example.com',
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    };

    it('should allow ADMIN to update any user', async () => {
      const updateUserDto = {
        name: 'Jane Smith Updated',
        phone: '9876543210',
        email: 'jane.updated@example.com',
        role: UserRole.AGENT,
      };

      const adminUserId = '1';
      const adminUserRole = UserRole.ADMIN;

      jest.spyOn(service, 'update').mockResolvedValue(updatedUser);

      const result = await controller.update(
        '2',
        updateUserDto,
        adminUserId,
        adminUserRole,
      );

      expect(result).toEqual(updatedUser);
      expect(service.update).toHaveBeenCalledWith('2', updateUserDto);
    });

    it('should allow user to update their own profile', async () => {
      const updateUserDto = {
        name: 'Jane Smith Updated',
        phone: '9876543210',
      };

      const userId = '2';
      const userRole = UserRole.CUSTOMER;

      jest.spyOn(service, 'update').mockResolvedValue(updatedUser);

      const result = await controller.update(
        '2',
        updateUserDto,
        userId,
        userRole,
      );

      expect(result).toEqual(updatedUser);
      expect(service.update).toHaveBeenCalled();
    });

    it('should prevent non-ADMIN from updating another user', async () => {
      const updateUserDto = {
        name: 'Jane Smith Updated',
      };

      const userId = '1';
      const userRole = UserRole.CUSTOMER;

      await expect(
        controller.update('2', updateUserDto, userId, userRole),
      ).rejects.toThrow('You can only update your own profile');
    });

    it('should filter role/status fields for non-ADMIN users', async () => {
      const updateUserDto = {
        name: 'Jane Smith Updated',
        role: UserRole.ADMIN,
        status: UserStatus.SUSPENDED,
      };

      const userId = '2';
      const userRole = UserRole.CUSTOMER;

      jest.spyOn(service, 'update').mockResolvedValue(updatedUser);

      // Make a copy to verify original wasn't modified
      const dtoToPass = { ...updateUserDto };

      await controller.update('2', dtoToPass, userId, userRole);

      // Verify role and status were filtered out
      expect(service.update).toHaveBeenCalledWith(
        '2',
        expect.not.objectContaining({
          role: UserRole.ADMIN,
          status: UserStatus.SUSPENDED,
        }),
      );
    });
  });
});
