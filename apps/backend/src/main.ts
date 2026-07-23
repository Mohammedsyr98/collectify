import { NestFactory } from '@nestjs/core';
import 'reflect-metadata';

import { AppModule } from './app.module';

function getPort(): number {
  const parsedPort = Number.parseInt(process.env.PORT ?? '3000', 10);
  return Number.isNaN(parsedPort) ? 3000 : parsedPort;
}

function getFrontendOrigins(): string[] {
  return (process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    credentials: true,
    origin: getFrontendOrigins(),
  });

  const port = getPort();
  await app.listen(port);

  console.log(`Backend listening on http://localhost:${port}/api`);
}

void bootstrap();
