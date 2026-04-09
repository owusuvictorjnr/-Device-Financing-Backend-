import { ConfigService } from '@nestjs/config';
import { HealthService } from './health.service';
import { Socket } from 'node:net';

describe('HealthService', () => {
  let service: HealthService;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string): string | undefined => {
        const config: Record<string, string | undefined> = {
          DATABASE_URL: 'postgresql://localhost:5432/test',
          REDIS_URL: undefined,
          REDIS_HOST: 'localhost',
          REDIS_PORT: '6379',
        };

        const value = config[key];
        return value !== undefined ? value : defaultValue;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    service = new HealthService(mockConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return error when any dependency is down', async () => {
    jest
      .spyOn(
        service as unknown as { checkDatabase: () => Promise<'up' | 'down'> },
        'checkDatabase',
      )
      .mockResolvedValue('up');
    jest
      .spyOn(
        service as unknown as { checkRedis: () => Promise<'up' | 'down'> },
        'checkRedis',
      )
      .mockResolvedValue('down');

    await expect(service.getHealth()).resolves.toEqual({
      status: 'error',
      data: {
        database: 'up',
        redis: 'down',
      },
    });
  });

  it('should return success when all dependencies are up', async () => {
    jest
      .spyOn(
        service as unknown as { checkDatabase: () => Promise<'up' | 'down'> },
        'checkDatabase',
      )
      .mockResolvedValue('up');
    jest
      .spyOn(
        service as unknown as { checkRedis: () => Promise<'up' | 'down'> },
        'checkRedis',
      )
      .mockResolvedValue('up');

    await expect(service.getHealth()).resolves.toEqual({
      status: 'success',
      data: {
        database: 'up',
        redis: 'up',
      },
    });
  });

  it('should report down for database when DATABASE_URL is missing', async () => {
    mockConfigService.get.mockImplementation(
      (key: string, defaultValue?: string): string | undefined => {
        const config: Record<string, string | undefined> = {
          DATABASE_URL: undefined,
          REDIS_URL: undefined,
          REDIS_HOST: 'localhost',
          REDIS_PORT: '6379',
        };

        const value = config[key];
        return value !== undefined ? value : defaultValue;
      },
    );

    await expect(
      (
        service as unknown as {
          checkDatabase: () => Promise<'up' | 'down'>;
        }
      ).checkDatabase(),
    ).resolves.toBe('down');
  });

  it('should use REDIS_URL when provided', async () => {
    mockConfigService.get.mockImplementation(
      (key: string, defaultValue?: string): string | undefined => {
        const config: Record<string, string | undefined> = {
          DATABASE_URL: 'postgresql://localhost:5432/test',
          REDIS_URL: 'redis://cache.example.com:6380',
          REDIS_HOST: 'localhost',
          REDIS_PORT: '6379',
        };

        const value = config[key];
        return value !== undefined ? value : defaultValue;
      },
    );

    const checkTcpFromUrlSpy = jest
      .spyOn(
        service as unknown as {
          checkTcpFromUrl: (
            connectionUrl: string | undefined,
            defaultPort: number,
          ) => Promise<'up' | 'down'>;
        },
        'checkTcpFromUrl',
      )
      .mockResolvedValue('up');

    await expect(
      (
        service as unknown as {
          checkRedis: () => Promise<'up' | 'down'>;
        }
      ).checkRedis(),
    ).resolves.toBe('up');

    expect(checkTcpFromUrlSpy).toHaveBeenCalledWith(
      'redis://cache.example.com:6380',
      6379,
    );
  });

  it('should fallback to REDIS_HOST and REDIS_PORT when REDIS_URL is missing', async () => {
    mockConfigService.get.mockImplementation(
      (key: string, defaultValue?: string): string | undefined => {
        const config: Record<string, string | undefined> = {
          DATABASE_URL: 'postgresql://localhost:5432/test',
          REDIS_URL: undefined,
          REDIS_HOST: 'redis.internal',
          REDIS_PORT: '6381',
        };

        const value = config[key];
        return value !== undefined ? value : defaultValue;
      },
    );

    const checkTcpFromUrlSpy = jest
      .spyOn(
        service as unknown as {
          checkTcpFromUrl: (
            connectionUrl: string | undefined,
            defaultPort: number,
          ) => Promise<'up' | 'down'>;
        },
        'checkTcpFromUrl',
      )
      .mockResolvedValue('down');

    await expect(
      (
        service as unknown as {
          checkRedis: () => Promise<'up' | 'down'>;
        }
      ).checkRedis(),
    ).resolves.toBe('down');

    expect(checkTcpFromUrlSpy).toHaveBeenCalledWith(
      'redis://redis.internal:6381',
      6379,
    );
  });

  it('should return up when socket connect succeeds', async () => {
    jest
      .spyOn(Socket.prototype, 'connect')
      .mockImplementation(function mockConnect(this: Socket): Socket {
        setImmediate(() => {
          this.emit('connect');
        });

        return this;
      });

    await expect(
      (
        service as unknown as {
          checkTcp: (host: string, port: number) => Promise<'up' | 'down'>;
        }
      ).checkTcp('localhost', 6379),
    ).resolves.toBe('up');
  });

  it('should return down when socket connect errors', async () => {
    jest
      .spyOn(Socket.prototype, 'connect')
      .mockImplementation(function mockConnect(this: Socket): Socket {
        setImmediate(() => {
          this.emit('error', new Error('connection failed'));
        });

        return this;
      });

    await expect(
      (
        service as unknown as {
          checkTcp: (host: string, port: number) => Promise<'up' | 'down'>;
        }
      ).checkTcp('localhost', 6379),
    ).resolves.toBe('down');
  });
});
