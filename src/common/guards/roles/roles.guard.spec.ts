import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const createExecutionContext = (request: {
    user?: {
      role?: string;
    };
  }): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  let reflector: { getAllAndOverride: jest.Mock };
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };

    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when no roles metadata is defined', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const result = guard.canActivate(createExecutionContext({}));

    expect(result).toBe(true);
  });

  it('should deny access when roles are required but user role is missing', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);

    const result = guard.canActivate(createExecutionContext({}));

    expect(result).toBe(false);
  });

  it('should allow access when user role matches required roles', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN', 'AGENT']);

    const result = guard.canActivate(
      createExecutionContext({ user: { role: 'AGENT' } }),
    );

    expect(result).toBe(true);
  });

  it('should deny access when user role does not match required roles', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);

    const result = guard.canActivate(
      createExecutionContext({ user: { role: 'CUSTOMER' } }),
    );

    expect(result).toBe(false);
  });
});
