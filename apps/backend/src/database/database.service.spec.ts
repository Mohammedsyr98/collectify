import { afterEach, describe, expect, it } from 'vitest';

import { DatabaseService } from './database.service';

describe('DatabaseService', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
      return;
    }

    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it('creates a Drizzle client without querying the database', async () => {
    process.env.DATABASE_URL =
      'postgresql://collectify:collectify@localhost:5432/collectify';

    const service = new DatabaseService();

    expect(service.db).toBeDefined();
    expect(typeof service.db.execute).toBe('function');

    await service.onModuleDestroy();
  });

  it('throws a clear error when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;

    expect(() => new DatabaseService()).toThrow(
      'DATABASE_URL is required to initialize the database.',
    );
  });
});
