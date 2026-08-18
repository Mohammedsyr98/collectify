import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  startIntegrationPostgres,
  type IntegrationPostgres,
} from '../test-support/integration-postgres';

describe('Postgres migrations', () => {
  let postgres: IntegrationPostgres | undefined;

  beforeAll(async () => {
    postgres = await startIntegrationPostgres();
  });

  afterAll(async () => {
    await postgres?.stop();
  });

  it('creates the auth and owner profile schema with Postgres constraints', async () => {
    const tables = await postgres!.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    const constraints = await postgres!.query<{ constraint_name: string }>(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
      ORDER BY constraint_name
    `);
    const languages = await postgres!.query<{ enumlabel: string }>(`
      SELECT enumlabel
      FROM pg_enum
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
      WHERE pg_type.typname = 'owner_language'
      ORDER BY pg_enum.enumsortorder
    `);

    expect(tables.map((table) => table.table_name)).toEqual([
      'account',
      'owner_profiles',
      'session',
      'user',
      'verification',
    ]);
    expect(constraints.map((constraint) => constraint.constraint_name)).toEqual(
      expect.arrayContaining([
        'owner_profiles_user_id_key',
        'owner_profiles_user_id_user_id_fkey',
        'user_email_key',
      ]),
    );
    expect(languages.map((language) => language.enumlabel)).toEqual([
      'en',
      'tr',
      'ar',
    ]);
  });

  it('accepts Arabic as a persisted owner profile language', async () => {
    await postgres!.query(`
      INSERT INTO "user" ("id", "name", "email", "email_verified", "created_at", "updated_at")
      VALUES ('user_arabic_language', 'Owner', 'arabic-language@example.test', false, now(), now())
    `);
    await postgres!.query(`
      INSERT INTO "owner_profiles" ("id", "user_id", "preferred_language", "default_currency", "created_at", "updated_at")
      VALUES ('profile_arabic_language', 'user_arabic_language', 'ar', 'USD', now(), now())
    `);

    const profiles = await postgres!.query<{ preferred_language: string }>(`
      SELECT "preferred_language"
      FROM "owner_profiles"
      WHERE "id" = 'profile_arabic_language'
    `);

    expect(profiles).toEqual([{ preferred_language: 'ar' }]);
  });

  it('enforces owner profile cascades through real foreign keys', async () => {
    await postgres!.query(`
      INSERT INTO "user" ("id", "name", "email", "email_verified", "created_at", "updated_at")
      VALUES ('user_cascade', 'Owner', 'cascade@example.test', false, now(), now())
    `);
    await postgres!.query(`
      INSERT INTO "owner_profiles" ("id", "user_id", "preferred_language", "default_currency", "created_at", "updated_at")
      VALUES ('profile_cascade', 'user_cascade', 'en', 'USD', now(), now())
    `);

    await postgres!.query(`DELETE FROM "user" WHERE "id" = 'user_cascade'`);

    const profiles = await postgres!.query<{ id: string }>(
      `SELECT "id" FROM "owner_profiles" WHERE "id" = 'profile_cascade'`,
    );
    expect(profiles).toEqual([]);
  });
});
