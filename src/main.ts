import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import cookieSession from 'cookie-session';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ==========================================
  // MIDDLEWARE ORDER IS CRITICAL:
  // ==========================================

  // 1. FIRST: Cookie session (MUST be before guards)
  app.use(
    cookieSession({
      name: 'session',
      keys: [
        process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
      ],
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    }),
  );

  // 2. SECOND: CORS (with credentials for cookies)
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });
  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('Meditory Pharmacy ERP API')
    .setDescription('Pharmacy ERP System Backend API with Vendure-inspired authentication')
    .setVersion('1.0.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Enter session token from login response',
    })
    .addCookieAuth('session', {
      type: 'apiKey',
      in: 'cookie',
      name: 'session',
      description: 'Session cookie (automatically set by login endpoint)',
    })
    .addTag('Authentication', 'User authentication and session management')
    .addTag('Users', 'User management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
