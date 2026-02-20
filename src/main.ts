import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { ErrorLoggingInterceptor } from './common/interceptors/error-logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://10.215.54.193:3000', 'http://10.215.54.193:3001', 'https://streetlike-lavonna-thoughtfully.ngrok-free.dev'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Increase payload limits for large bulk uploads
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  // Request Logging
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    res.on('finish', () => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} -> ${res.statusCode}`);
    });
    next();
  });

  // Global Error Logging
  app.useGlobalInterceptors(new ErrorLoggingInterceptor());

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Backend is running on: http://0.0.0.0:${port}`);
}
console.log("!!! BACKEND RESTARTED - ROLES CONFIG UPDATE !!!");
bootstrap();
