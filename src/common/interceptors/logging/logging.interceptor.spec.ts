import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  const createExecutionContext = (
    method: string,
    url: string,
    statusCode: number,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ method, url }),
        getResponse: () => ({ statusCode }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should be defined', () => {
    expect(new LoggingInterceptor()).toBeDefined();
  });

  it('should log request info on successful completion', async () => {
    const interceptor = new LoggingInterceptor();
    const logSpy = jest.fn();

    (
      interceptor as unknown as {
        logger: {
          log: (...args: unknown[]) => void;
        };
      }
    ).logger = { log: logSpy };

    const dateNowSpy = jest.spyOn(Date, 'now');
    dateNowSpy.mockReturnValueOnce(1000).mockReturnValueOnce(1025);

    const context = createExecutionContext('GET', '/api/v1/health', 200);
    const next: CallHandler = {
      handle: () => of('ok'),
    };

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).resolves.toBe('ok');

    expect(logSpy).toHaveBeenCalledWith('GET /api/v1/health 200 25ms');

    dateNowSpy.mockRestore();
  });

  it('should log request info on error completion', async () => {
    const interceptor = new LoggingInterceptor();
    const logSpy = jest.fn();

    (
      interceptor as unknown as {
        logger: {
          log: (...args: unknown[]) => void;
        };
      }
    ).logger = { log: logSpy };

    const dateNowSpy = jest.spyOn(Date, 'now');
    dateNowSpy.mockReturnValueOnce(2000).mockReturnValueOnce(2015);

    const context = createExecutionContext('POST', '/api/v1/auth/login', 401);
    const next: CallHandler = {
      handle: () => throwError(() => new Error('Unauthorized')),
    };

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).rejects.toThrow('Unauthorized');

    expect(logSpy).toHaveBeenCalledWith('POST /api/v1/auth/login 401 15ms');

    dateNowSpy.mockRestore();
  });
});
