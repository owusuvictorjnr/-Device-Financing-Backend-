import { HealthService } from './health.service';
import { Socket } from 'node:net';

describe('HealthService', () => {
  let service: HealthService;
  let originalDatabaseUrl: string | undefined;
  let originalRedisUrl: string | undefined;
  let originalRedisHost: string | undefined;
  let originalRedisPort: string | undefined;

  beforeEach(() => {
    service = new HealthService();
    originalDatabaseUrl = process.env.DATABASE_URL;
    originalRedisUrl = process.env.REDIS_URL;
    originalRedisHost = process.env.REDIS_HOST;
    originalRedisPort = process.env.REDIS_PORT;
  });

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }

    if (originalRedisUrl === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = originalRedisUrl;
    }

    if (originalRedisHost === undefined) {
      delete process.env.REDIS_HOST;
    } else {
      process.env.REDIS_HOST = originalRedisHost;
    }

    if (originalRedisPort === undefined) {
      delete process.env.REDIS_PORT;
    } else {
      process.env.REDIS_PORT = originalRedisPort;
    }

    jest.restoreAllMocks();
  });

  it('should return combined up/down status from checks', async () => {
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
      status: 'success',
      data: {
        database: 'up',
        redis: 'down',
      },
    });
  });

  it('should report down for database when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL;

    await expect(
      (
        service as unknown as {
          checkDatabase: () => Promise<'up' | 'down'>;
        }
      ).checkDatabase(),
    ).resolves.toBe('down');
  });

  it('should use REDIS_URL when provided', async () => {
    process.env.REDIS_URL = 'redis://cache.example.com:6380';

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
    delete process.env.REDIS_URL;
    process.env.REDIS_HOST = 'redis.internal';
    process.env.REDIS_PORT = '6381';

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
