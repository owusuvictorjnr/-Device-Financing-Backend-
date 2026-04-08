import { Injectable } from '@nestjs/common';
import { Socket } from 'node:net';
import { type HealthResponse } from './health.types';

@Injectable()
export class HealthService {
  async getHealth(): Promise<HealthResponse> {
    const database = await this.checkDatabase();
    const redis = await this.checkRedis();

    return {
      status: 'success',
      data: {
        database,
        redis,
      },
    };
  }

  private async checkDatabase(): Promise<'up' | 'down'> {
    return this.checkTcpFromUrl(process.env.DATABASE_URL, 5432);
  }

  private async checkRedis(): Promise<'up' | 'down'> {
    return this.checkTcpFromUrl(this.getRedisUrl(), 6379);
  }

  private getRedisUrl(): string {
    const redisUrl = process.env.REDIS_URL;

    if (redisUrl) {
      return redisUrl;
    }

    const redisHost = process.env.REDIS_HOST ?? 'localhost';
    const redisPort = process.env.REDIS_PORT ?? '6379';

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
