import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Device Financing Backend API')
    .setDescription('API documentation for the device financing platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  const envPort = process.env.PORT;
  const parsedPort = envPort !== undefined ? Number(envPort) : undefined;
  const port =
    parsedPort !== undefined &&
    Number.isInteger(parsedPort) &&
    parsedPort >= 1 &&
    parsedPort <= 65535
      ? parsedPort
      : 3000;

  await app.listen(port);
}
const bootstrapLogger = new Logger('Bootstrap');

bootstrap().catch((error: unknown) => {
  const errorMessage =
    error instanceof Error ? error.message : 'Unknown bootstrap error';
  const errorStack = error instanceof Error ? error.stack : undefined;

  bootstrapLogger.error(
    `Failed to start application: ${errorMessage}`,
    errorStack,
  );
  process.exit(1);
});
