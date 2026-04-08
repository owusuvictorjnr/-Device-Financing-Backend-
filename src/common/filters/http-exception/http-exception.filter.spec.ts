import {
  BadRequestException,
  type ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  const createHost = (path: string) => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ path }),
      }),
    } as unknown as ArgumentsHost;

    return { host, status, json };
  };

  it('should be defined', () => {
    expect(new HttpExceptionFilter()).toBeDefined();
  });

  it('should serialize generic HttpException response', () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = createHost('/api/v1/test');
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'Forbidden',
        path: '/api/v1/test',
      }),
    );
  });

  it('should serialize validation errors from HttpException response payload', () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = createHost('/api/v1/users');
    const exception = new BadRequestException({
      statusCode: 400,
      message: ['email must be an email', 'password should not be empty'],
      error: 'Bad Request',
    });

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'email must be an email',
        path: '/api/v1/users',
        errors: ['email must be an email', 'password should not be empty'],
      }),
    );
  });

  it('should serialize unknown errors as internal server errors', () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = createHost('/api/v1/health');

    filter.catch(new Error('unexpected'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'Internal server error',
        path: '/api/v1/health',
      }),
    );
  });
});
