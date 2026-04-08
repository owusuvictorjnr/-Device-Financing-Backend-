import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (() => {
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
              return exceptionResponse;
            }

            if (
              typeof exceptionResponse === 'object' &&
              exceptionResponse !== null &&
              'message' in exceptionResponse
            ) {
              const responseWithMessage = exceptionResponse as {
                message?: string | string[];
              };

              return responseWithMessage.message ?? exception.message;
            }

            return exception.message;
          })()
        : 'Internal server error';

    response.status(statusCode).json({
      status: 'error',
      message,
      path: request.path,
      timestamp: new Date().toISOString(),
    });
  }
}
