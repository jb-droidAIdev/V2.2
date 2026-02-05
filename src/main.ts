import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

// Check for required env vars early
if (!process.env.GEMINI_API_KEY) {
  console.warn('WARNING: GEMINI_API_KEY is not set in the environment.');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Increase payload limits for large bulk uploads
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Backend is running on: http://0.0.0.0:${port}`);
}
console.log("!!! BACKEND RESTARTED - NUCLEAR DUMP ACTIVE !!!");
bootstrap();
