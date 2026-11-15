import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AddressInfo } from 'node:net';
import { inject } from 'vitest';

import { AppModule } from '../app.module';
import { queryRows, resetDatabase } from './integration-postgres';

export interface IntegrationBackend {
  app: INestApplication;
  baseUrl: string;
}

export interface IntegrationDatabase {
  query<T = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<T[]>;
  reset(): Promise<void>;
}

export function createIntegrationDatabase(): IntegrationDatabase {
  const connectionUri = configureIntegrationEnvironment();

  return {
    query: (sql, values) => queryRows(connectionUri, sql, values),
    reset: () => resetDatabase(connectionUri),
  };
}

export async function startIntegrationBackend(): Promise<IntegrationBackend> {
  configureIntegrationEnvironment();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();

  app.setGlobalPrefix('api');
  await app.listen(0);

  const address = app.getHttpServer().address() as AddressInfo;

  return {
    app,
    baseUrl: `http://127.0.0.1:${address.port}/api`,
  };
}

function configureIntegrationEnvironment(): string {
  const connectionUri = inject('integrationDatabaseUrl');

  process.env.DATABASE_URL = connectionUri;
  process.env.BETTER_AUTH_SECRET = 'collectify-integration-auth-secret-with-32-characters';
  process.env.BETTER_AUTH_URL = 'http://127.0.0.1/api/auth';
  process.env.FRONTEND_ORIGIN = 'http://127.0.0.1';

  return connectionUri;
}
