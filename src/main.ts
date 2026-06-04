import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import helmet from 'helmet';

async function bootstrap() {
  // rawBody: true makes req.rawBody (Buffer) available — required for
  // Shopify webhook HMAC-SHA256 verification at POST /webhooks/shopify/payment
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const allowedOrigins = (
    process.env.CORS_ORIGINS ?? 'http://localhost:3000'
  ).split(',').map((o) => o.trim());

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
