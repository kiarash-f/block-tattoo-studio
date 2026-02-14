import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  const port = process.env.PORT ? Number(process.env.PORT) : 3100;
  await app.listen(port, '0.0.0.0');
  console.log(`API running on http://localhost:${port}`);
  console.log(`Swagger on http://localhost:${port}/docs`);
  console.log('ADMIN_JWT_SECRET present:', !!process.env.ADMIN_JWT_SECRET);
}

bootstrap();
