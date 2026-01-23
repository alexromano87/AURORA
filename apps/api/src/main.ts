import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5174',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('AURORA API')
    .setDescription('Personal Investment Intelligence System API')
    .setVersion('0.1.0')
    .addTag('health', 'Health Check')
    .addTag('ips', 'Investment Policy Statement')
    .addTag('portfolios', 'Portfolio Management')
    .addTag('transactions', 'Transactions')
    .addTag('engine', 'Analytics Engine')
    .addTag('alerts', 'Alerts & Notifications')
    .addTag('instruments', 'ETF & Instruments')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3005;
  await app.listen(port);

  console.log(`🚀 AURORA API running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
