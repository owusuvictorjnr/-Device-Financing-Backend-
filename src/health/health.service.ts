import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'node:net';
import { type HealthResponse } from './health.types';

@Injectable()
export class HealthService {
  constructor(private readonly configService: ConfigService) {}
  async getHealth(): Promise<HealthResponse> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ] as const);

    const status = database === 'up' && redis === 'up' ? 'success' : 'error';

    return {
      status,
      data: {
        database,
        redis,
      },
    };
  }

  private async checkDatabase(): Promise<'up' | 'down'> {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    return this.checkTcpFromUrl(databaseUrl, 5432);
  }

  private async checkRedis(): Promise<'up' | 'down'> {
    return this.checkTcpFromUrl(this.getRedisUrl(), 6379);
  }

  private getRedisUrl(): string {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (redisUrl) {
      return redisUrl;
    }

    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<string>('REDIS_PORT', '6379');

    return `redis://${redisHost}:${redisPort}`;
  }

  private async checkTcpFromUrl(
    connectionUrl: string | undefined,
    defaultPort: number,
  ): Promise<'up' | 'down'> {
    if (!connectionUrl) {
      return 'down';
    }

    try {
      const parsedUrl = new URL(connectionUrl);
      const host = parsedUrl.hostname;
      const port = parsedUrl.port ? Number(parsedUrl.port) : defaultPort;

      if (!host || Number.isNaN(port)) {
        return 'down';
      }

      return await this.checkTcp(host, port);
    } catch {
      return 'down';
    }
  }

  private checkTcp(host: string, port: number): Promise<'up' | 'down'> {
    return new Promise((resolve) => {
      const socket = new Socket();

      const closeWithStatus = (status: 'up' | 'down'): void => {
        socket.removeAllListeners();
        socket.destroy();
        resolve(status);
      };

      socket.setTimeout(1500);
      socket.once('connect', () => closeWithStatus('up'));
      socket.once('timeout', () => closeWithStatus('down'));
      socket.once('error', () => closeWithStatus('down'));
      socket.connect(port, host);
    });
  }
}
