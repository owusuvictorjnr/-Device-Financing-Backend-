import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';
/* eslint-disable @typescript-eslint/unbound-method */

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

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
    }).compile();

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
});
