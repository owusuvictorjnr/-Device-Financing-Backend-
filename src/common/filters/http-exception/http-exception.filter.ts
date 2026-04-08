import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorResponseBody {
  status: 'error';
  message: string;
  path: string;
  timestamp: string;
  errors?: string[];
}

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

    const defaultMessage =
      statusCode === 500 ? 'Internal server error' : 'Request failed';

    const { message, errors } =
      exception instanceof HttpException
        ? (() => {
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
              return {
                message: exceptionResponse,
              };
            }

            if (
              typeof exceptionResponse === 'object' &&
              exceptionResponse !== null &&
              'message' in exceptionResponse
            ) {
              const responseWithMessage = exceptionResponse as {
                message?: string | string[];
              };

              const responseMessage = responseWithMessage.message;

              if (Array.isArray(responseMessage)) {
                return {
                  message: responseMessage[0] ?? defaultMessage,
                  errors: responseMessage,
                };
              }

              return {
                message: responseMessage ?? defaultMessage,
              };
            }

            return {
              message: exception.message || defaultMessage,
            };
          })()
        : {
            message: defaultMessage,
          };

    const responseBody: ErrorResponseBody = {
      status: 'error',
      message,
      path: request.path,
      timestamp: new Date().toISOString(),
      ...(errors ? { errors } : {}),
    };

    response.status(statusCode).json(responseBody);
  }
}
