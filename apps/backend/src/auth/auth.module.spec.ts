import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';

describe('AuthModule', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  let app: INestApplication | null = null;

  afterEach(async () => {
    await app?.close();
    app = null;

    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
      return;
    }

    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it(
    'mounts Better Auth routes in the backend',
    async () => {
      process.env.DATABASE_URL =
        'postgresql://collectify:collectify@localhost:5432/collectify';

      const { AppModule } = await import('../app.module');
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleRef.createNestApplication({
        bodyParser: false,
      });
      app.setGlobalPrefix('api');
      await app.listen(0);

      const address = app.getHttpServer().address() as AddressInfo;
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const response = await fetch(`${baseUrl}/api/auth/ok`);

      expect(response.status).toBe(200);
    },
    30_000,
  );
});
