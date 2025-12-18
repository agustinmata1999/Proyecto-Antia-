import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body for Stripe webhooks
  });

  // Security
  app.use(helmet());
  app.use(cookieParser());

  // CORS - Allow all origins for development
  app.enableCors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'Accept'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Antia API')
    .setDescription('API completa para plataforma de pronósticos deportivos')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('access_token')
    .addTag('auth', 'Autenticación y registro')
    .addTag('users', 'Gestión de usuarios')
    .addTag('tipsters', 'Panel de Tipster')
    .addTag('clients', 'Panel de Cliente')
    .addTag('products', 'Productos y servicios')
    .addTag('orders', 'Órdenes y pagos')
    .addTag('referrals', 'Sistema de referidos')
    .addTag('commissions', 'Comisiones y ganancias')
    .addTag('payouts', 'Liquidaciones')
    .addTag('houses', 'Casas de apuestas')
    .addTag('webhooks', 'Webhooks externos')
    .addTag('tickets', 'Soporte y tickets')
    .addTag('admin', 'Panel de administración')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Start server
  const port = process.env.BACKEND_PORT || 8001;
  await app.listen(port, '0.0.0.0');
  
  console.log(`\n🚀 Antia Backend API running on: http://localhost:${port}/api`);
  console.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL?.split('@')[1] || 'PostgreSQL'}`);
  console.log(`📦 Redis: ${process.env.REDIS_URL || 'localhost:6379'}`);
}

bootstrap();
