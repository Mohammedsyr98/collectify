import type { TestProject } from 'vitest/node';

import {
  startIntegrationPostgresContainer,
  type IntegrationPostgresContainer,
} from './integration-postgres';

let postgres: IntegrationPostgresContainer | undefined;

export async function setup(project: TestProject): Promise<void> {
  postgres = await startIntegrationPostgresContainer();
  project.provide('integrationDatabaseUrl', postgres.connectionUri);
}

export async function teardown(): Promise<void> {
  await postgres?.stop();
}

declare module 'vitest' {
  interface ProvidedContext {
    integrationDatabaseUrl: string;
  }
}
