import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, path } = request;
    const startTime = Date.now();

    response.once('finish', () => {
      const responseTimeMs = Date.now() - startTime;
      const statusCode = response.statusCode;
      this.logger.log(`${method} ${path} ${statusCode} ${responseTimeMs}ms`);
    });

    return next.handle();
  }
}
