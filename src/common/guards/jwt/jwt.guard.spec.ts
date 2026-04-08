import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtGuard } from './jwt.guard';

describe('JwtGuard', () => {
  const createExecutionContext = (request: {
    headers?: { authorization?: string };
    user?: unknown;
  }): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  let jwtService: { verify: jest.Mock };
  let guard: JwtGuard;

  beforeEach(() => {
    jwtService = {
      verify: jest.fn(),
    };

    guard = new JwtGuard(jwtService as unknown as JwtService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw when bearer token is missing', () => {
    const request = {
      headers: {},
    };

    expect(() => guard.canActivate(createExecutionContext(request))).toThrow(
      UnauthorizedException,
    );
  });

  it('should throw when bearer token is invalid', () => {
    const request = {
      headers: {
        authorization: 'Bearer invalid-token',
      },
    };

    jwtService.verify.mockImplementation(() => {
      throw new Error('invalid token');
    });

    expect(() => guard.canActivate(createExecutionContext(request))).toThrow(
      UnauthorizedException,
    );
  });

  it('should set request.user and return true when bearer token is valid', () => {
    const payload = {
      sub: 'user-123',
      email: 'customer@example.com',
      role: 'CUSTOMER',
    };

    const request: {
      headers: { authorization: string };
      user?: unknown;
    } = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    jwtService.verify.mockReturnValue(payload);

    const result = guard.canActivate(createExecutionContext(request));

    expect(result).toBe(true);
    expect(request.user).toEqual(payload);
    expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
  });
});
