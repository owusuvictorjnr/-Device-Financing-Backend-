import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

type AuthenticatedRequest = {
  headers?: {
    authorization?: string;
  };
  user?: unknown;
};

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorizationHeader = request.headers?.authorization;

    if (!authorizationHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authorizationHeader.slice(7).trim();

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const payload: unknown = this.jwtService.verify(token) as unknown;
      request.user = this.normalizePayload(payload);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private normalizePayload(payload: unknown): unknown {
    if (!payload || typeof payload !== 'object') {
      return payload;
    }

    const parsedPayload = payload as Record<string, unknown>;
    const sub = parsedPayload.sub;

    if (typeof parsedPayload.id === 'string') {
      return parsedPayload;
    }

    if (typeof sub !== 'string') {
      return parsedPayload;
    }

    return {
      ...parsedPayload,
      id: sub,
    };
  }
}
