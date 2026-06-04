"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./instrument");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const prisma_exception_filter_1 = require("./common/filters/prisma-exception.filter");
const helmet_1 = __importDefault(require("helmet"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { rawBody: true });
    app.enableCors({
        origin: ['http://localhost:3000', 'http://192.168.178.127:3000'],
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Tattoo Studio API')
        .setDescription('Phase 1 MVP: Public booking intake + Admin review')
        .setVersion('1.0.0')
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Paste token here: Bearer <JWT>',
        in: 'header',
    }, 'admin-jwt')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
        },
    });
    app.useGlobalFilters(new prisma_exception_filter_1.PrismaExceptionFilter());
    app.use((0, helmet_1.default)());
    const port = process.env.PORT ? Number(process.env.PORT) : 3102;
    await app.listen(port, '0.0.0.0');
    console.log(`API running on http://localhost:${port}`);
    console.log(`Swagger on http://localhost:${port}/docs`);
    console.log('ADMIN_JWT_SECRET present:', !!process.env.ADMIN_JWT_SECRET);
}
bootstrap();
//# sourceMappingURL=main.js.map