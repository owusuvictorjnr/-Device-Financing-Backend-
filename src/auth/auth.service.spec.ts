import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcrypt';
import { UserRole, UserStatus } from '@prisma/client';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

const TEST_BCRYPT_ROUNDS = 4;

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    create: jest.Mock;
    findByEmail: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
  };

  beforeEach(async () => {
    const mockUsersService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
    };

    const mockJwtService = {
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = mockUsersService;
    jwtService = mockJwtService;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should create a customer user', async () => {
      const registerDto = {
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        password: 'password123',
      };

      const createdUser = {
        id: '1',
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      usersService.create.mockResolvedValue(createdUser);

      const result = await service.register(registerDto);

      expect(result).toEqual(createdUser);
      expect(usersService.create).toHaveBeenCalledWith({
        ...registerDto,
        role: UserRole.CUSTOMER,
      });
    });
  });

  describe('login', () => {
    it('should authenticate and return token plus user payload', async () => {
      const loginDto = {
        email: 'john@example.com',
        password: 'password123',
      };

      const passwordHash = await hash(loginDto.password, TEST_BCRYPT_ROUNDS);
      const user = {
        id: '1',
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        password_hash: passwordHash,
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      usersService.findByEmail.mockResolvedValue(user);
      jwtService.signAsync.mockResolvedValue('jwt-token');

      const result = await service.login(loginDto);

      expect(result).toEqual({
        accessToken: 'jwt-token',
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          status: user.status,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          deletedAt: user.deleted_at,
        },
      });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'missing@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const user = {
        id: '1',
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        password_hash: await hash('different-password', TEST_BCRYPT_ROUNDS),
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      usersService.findByEmail.mockResolvedValue(user);

      await expect(
        service.login({
          email: 'john@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const user = {
        id: '1',
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        password_hash: await hash('password123', TEST_BCRYPT_ROUNDS),
        role: UserRole.CUSTOMER,
        status: UserStatus.INACTIVE,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      usersService.findByEmail.mockResolvedValue(user);

      await expect(
        service.login({
          email: 'john@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user is suspended', async () => {
      const user = {
        id: '1',
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        password_hash: await hash('password123', TEST_BCRYPT_ROUNDS),
        role: UserRole.CUSTOMER,
        status: UserStatus.SUSPENDED,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      usersService.findByEmail.mockResolvedValue(user);

      await expect(
        service.login({
          email: 'john@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });
});
