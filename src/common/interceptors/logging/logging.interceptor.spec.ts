import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { lastValueFrom, of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  const createExecutionContext = (
    method: string,
    path: string,
    statusCode: number,
  ): {
    context: ExecutionContext;
    response: EventEmitter & { statusCode: number };
  } => {
    const response = new EventEmitter() as EventEmitter & {
      statusCode: number;
    };
    response.statusCode = statusCode;

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ method, path }),
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;

    return { context, response };
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

    const { context, response } = createExecutionContext(
      'GET',
      '/api/v1/health',
      200,
    );
    const next: CallHandler = {
      handle: () => of('ok'),
    };

    const resultPromise = lastValueFrom(interceptor.intercept(context, next));

    response.emit('finish');

    await expect(resultPromise).resolves.toBe('ok');

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

    const { context, response } = createExecutionContext(
      'POST',
      '/api/v1/auth/login',
      401,
    );
    const next: CallHandler = {
      handle: () => throwError(() => new Error('Unauthorized')),
    };

    const resultPromise = lastValueFrom(interceptor.intercept(context, next));

    response.emit('finish');

    await expect(resultPromise).rejects.toThrow('Unauthorized');

    expect(logSpy).toHaveBeenCalledWith('POST /api/v1/auth/login 401 15ms');

    dateNowSpy.mockRestore();
  });
});
