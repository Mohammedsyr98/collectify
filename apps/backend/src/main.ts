import { NestFactory } from '@nestjs/core';
import 'dotenv/config';
import 'reflect-metadata';

import { AppModule } from './app.module';
import { readRuntimeConfig } from './config/runtime-config';

async function bootstrap() {
  const config = readRuntimeConfig();
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();
  app.setGlobalPrefix('api');
  app.enableCors({
    credentials: true,
    origin: config.frontendOrigins,
  });

  await app.listen(config.port);

  console.log(`Backend listening on http://localhost:${config.port}/api`);
}

void bootstrap();
