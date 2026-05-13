import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import express from 'express';
import { mkdirSync } from 'fs';
import { join } from 'path';
import {
  buildCorsOptions,
  resolveTrustProxy,
  shouldSkipRateLimit,
  splitOrigins,
} from './config/cors.config';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const uploadsDir = join(process.cwd(), 'uploads');
  const httpAdapter = app.getHttpAdapter().getInstance();
  const configuredOrigins = splitOrigins(
    process.env.CORS_ORIGINS,
    process.env.FRONTEND_URL,
  );

  mkdirSync(uploadsDir, { recursive: true });

  // Global response interceptor and exception filter
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.setGlobalPrefix('api');
  httpAdapter.set('trust proxy', resolveTrustProxy(process.env.TRUST_PROXY));
  app.enableCors(buildCorsOptions(process.env));

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use('/uploads', express.static(uploadsDir));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 1000,
      message: { statusCode: 429, message: 'Too many requests' },
      skip: (req) => shouldSkipRateLimit(req.method),
    }),
  );
  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 10,
      skip: (req) => shouldSkipRateLimit(req.method),
    }),
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Pilgrim API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.getHttpAdapter().get('/health', (req, res) => {
    res
      .status(200)
      .json({
        success: true,
        data: {
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        },
        message: 'Health check successful',
      });
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`App running on: http://localhost:${port}`);
  logger.log(`Docs: http://localhost:${port}/api/docs`);
  logger.log(
    `CORS origins: ${configuredOrigins.length > 0 ? configuredOrigins.join(', ') : 'localhost development origins'}`,
  );
}
bootstrap();
