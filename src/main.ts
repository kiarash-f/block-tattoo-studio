import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import helmet from 'helmet';
import * as crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Minimal HTTP Basic Auth for the Swagger routes in production. Compares a
 * hash of the presented credentials against a hash of the expected ones with
 * timingSafeEqual (hashing first gives equal-length buffers, which
 * timingSafeEqual requires, and avoids length leaks).
 */
function swaggerBasicAuth(user: string, password: string) {
  const expected = crypto
    .createHash('sha256')
    .update(`${user}:${password}`)
    .digest();

  return (req: Request, res: Response, next: NextFunction) => {
    const [scheme, encoded] = (req.headers.authorization ?? '').split(' ');
    if (scheme === 'Basic' && encoded) {
      const presented = crypto
        .createHash('sha256')
        .update(Buffer.from(encoded, 'base64'))
        .digest();
      if (crypto.timingSafeEqual(presented, expected)) return next();
    }
    res.setHeader('WWW-Authenticate', 'Basic realm="docs"');
    res.status(401).send('Authentication required');
  };
}

async function bootstrap() {
  // rawBody: true makes req.rawBody (Buffer) available — required for
  // Shopify webhook HMAC-SHA256 verification at POST /webhooks/shopify/payment
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // (recommended) Global validation for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Tattoo Studio API')
    .setDescription('Phase 1 MVP: Public booking intake + Admin review')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Paste token here: Bearer <JWT>',
        in: 'header',
      },
      'admin-jwt',
    )
    .build();

  // In production, /docs (UI + JSON/YAML spec) sits behind Basic Auth so the
  // full admin API surface isn't public. Credentials are validated as required
  // for production in env.validation.ts.
  if (process.env.NODE_ENV === 'production') {
    app.use(
      ['/docs', '/docs-json', '/docs-yaml'],
      swaggerBasicAuth(
        process.env.SWAGGER_USER ?? '',
        process.env.SWAGGER_PASSWORD ?? '',
      ),
    );
  }

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // keeps JWT in Swagger UI refreshes
    },
  });

  // Global Prisma exception filter
  app.useGlobalFilters(new PrismaExceptionFilter());

  app.use(helmet());

  const logger = new Logger('Bootstrap');
  const port = process.env.PORT ? Number(process.env.PORT) : 3102;
  await app.listen(port, '0.0.0.0');
  logger.log(`API running on http://localhost:${port}`);
  logger.log(`Swagger on http://localhost:${port}/docs`);
}

bootstrap();
