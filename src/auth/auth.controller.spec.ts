import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole, UserStatus } from '@prisma/client';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
  };

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = mockAuthService;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should register a customer', async () => {
    const registerDto = {
      name: 'John Doe',
      phone: '1234567890',
      email: 'john@example.com',
      password: 'password123',
    };

    const user = {
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

    authService.register.mockResolvedValue(user);

    const result = await controller.register(registerDto);

    expect(result).toEqual(user);
    expect(authService.register).toHaveBeenCalledWith(registerDto);
  });

  it('should login and return access token', async () => {
    const loginDto = {
      email: 'john@example.com',
      password: 'password123',
    };

    const authResponse = {
      accessToken: 'jwt-token',
      user: {
        id: '1',
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    };

    authService.login.mockResolvedValue(authResponse);

    const result = await controller.login(loginDto);

    expect(result).toEqual(authResponse);
    expect(authService.login).toHaveBeenCalledWith(loginDto);
  });
});
