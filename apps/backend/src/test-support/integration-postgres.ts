import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';

import { AppModule } from '../app.module';

const drizzleMigrationsDirectory = join(__dirname, '..', '..', 'drizzle');

export interface IntegrationBackend {
  app: INestApplication;
  baseUrl: string;
}

export interface IntegrationPostgres {
  connectionUri: string;
  query<T = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<T[]>;
  reset(): Promise<void>;
  startBackend(): Promise<IntegrationBackend>;
  stop(): Promise<void>;
}

export async function startIntegrationPostgres(): Promise<IntegrationPostgres> {
  const previousEnv = snapshotEnvironment();
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('collectify_test')
    .withUsername('collectify')
    .withPassword('collectify')
    .start();
  const connectionUri = container.getConnectionUri();

  process.env.DATABASE_URL = connectionUri;
  process.env.BETTER_AUTH_SECRET = 'collectify-integration-auth-secret-with-32-characters';
  process.env.BETTER_AUTH_URL = 'http://127.0.0.1/api/auth';
  process.env.FRONTEND_ORIGIN = 'http://127.0.0.1';

  try {
    await runMigrations(connectionUri);
  } catch (error) {
    restoreEnvironment(previousEnv);
    await container.stop();
    throw error;
  }

  return {
    connectionUri,
    query: (sql, values) => queryRows(connectionUri, sql, values),
    reset: () => resetDatabase(connectionUri),
    startBackend,
    stop: async () => {
      try {
        await container.stop();
      } finally {
        restoreEnvironment(previousEnv);
      }
    },
  };
}

async function startBackend(): Promise<IntegrationBackend> {
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

async function runMigrations(connectionUri: string): Promise<void> {
  const client = new Client({ connectionString: connectionUri });
  await client.connect();

  try {
    for (const migrationFile of await readMigrationFiles()) {
      const migration = await readFile(migrationFile, 'utf8');
      for (const statement of migration.split('--> statement-breakpoint')) {
        const sql = statement.trim();

        if (sql) {
          await client.query(sql);
        }
      }
    }
  } finally {
    await client.end();
  }
}

async function readMigrationFiles(): Promise<string[]> {
  const entries = await readdir(drizzleMigrationsDirectory, {
    withFileTypes: true,
  });
  const migrationFiles = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(drizzleMigrationsDirectory, entry.name, 'migration.sql'))
    .sort();

  const existingMigrationFiles = await Promise.all(
    migrationFiles.map(async (migrationFile) => ({
      migrationFile,
      exists: await isFile(migrationFile),
    })),
  );

  return existingMigrationFiles
    .filter((migrationFile) => migrationFile.exists)
    .map((migrationFile) => migrationFile.migrationFile);
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function resetDatabase(connectionUri: string): Promise<void> {
  await queryRows(
    connectionUri,
    'TRUNCATE TABLE "account", "owner_profiles", "session", "user", "verification" RESTART IDENTITY CASCADE',
  );
}

async function queryRows<T = Record<string, unknown>>(
  connectionUri: string,
  sql: string,
  values?: unknown[],
): Promise<T[]> {
  const client = new Client({ connectionString: connectionUri });
  await client.connect();

  try {
    const result = await client.query(sql, values);

    return result.rows as T[];
  } finally {
    await client.end();
  }
}

function snapshotEnvironment(): Partial<NodeJS.ProcessEnv> {
  return {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN,
  };
}

function restoreEnvironment(snapshot: Partial<NodeJS.ProcessEnv>): void {
  restoreEnvironmentValue('BETTER_AUTH_SECRET', snapshot.BETTER_AUTH_SECRET);
  restoreEnvironmentValue('BETTER_AUTH_URL', snapshot.BETTER_AUTH_URL);
  restoreEnvironmentValue('DATABASE_URL', snapshot.DATABASE_URL);
  restoreEnvironmentValue('FRONTEND_ORIGIN', snapshot.FRONTEND_ORIGIN);
}

function restoreEnvironmentValue(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
