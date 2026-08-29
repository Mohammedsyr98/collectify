import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  startIntegrationPostgres,
  type IntegrationPostgres,
} from '../test-support/integration-postgres';
import { customerConstraints } from './schema';

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
      'customers',
      'owner_profiles',
      'session',
      'user',
      'verification',
    ]);
    expect(constraints.map((constraint) => constraint.constraint_name)).toEqual(
      expect.arrayContaining([
        'owner_profiles_user_id_key',
        'owner_profiles_user_id_user_id_fkey',
        'customers_owner_profile_id_owner_profiles_id_fkey',
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

  it('enforces customer ownership and case-insensitive code uniqueness in Postgres', async () => {
    await postgres!.query(`
      INSERT INTO "user" ("id", "name", "email", "email_verified", "created_at", "updated_at")
      VALUES
        ('user_customer_a', 'Owner A', 'owner-a@example.test', false, now(), now()),
        ('user_customer_b', 'Owner B', 'owner-b@example.test', false, now(), now())
    `);
    await postgres!.query(`
      INSERT INTO "owner_profiles" ("id", "user_id", "preferred_language", "default_currency", "created_at", "updated_at")
      VALUES
        ('profile_customer_a', 'user_customer_a', 'en', 'USD', now(), now()),
        ('profile_customer_b', 'user_customer_b', 'en', 'USD', now(), now())
    `);
    await postgres!.query(`
      INSERT INTO "customers" ("id", "owner_profile_id", "name", "code", "phone_number", "created_at", "updated_at")
      VALUES ('customer_a', 'profile_customer_a', 'Customer A', 'ACME', '+90 555 111 11 11', now(), now())
    `);
    await postgres!.query(`
      INSERT INTO "customers" ("id", "owner_profile_id", "name", "code", "phone_number", "created_at", "updated_at")
      VALUES ('customer_b', 'profile_customer_b', 'Customer B', 'acme', '+90 555 222 22 22', now(), now())
    `);

    await expect(
      postgres!.query(`
        INSERT INTO "customers" ("id", "owner_profile_id", "name", "code", "phone_number", "created_at", "updated_at")
        VALUES ('customer_duplicate', 'profile_customer_a', 'Duplicate', 'acme', '+90 555 333 33 33', now(), now())
      `),
    ).rejects.toMatchObject({
      code: '23505',
      constraint: customerConstraints.ownerProfileLowerCodeUnique,
    });
  });

  it('creates the customer code uniqueness index with trimmed comparison', async () => {
    const indexes = await postgres!.query<{ definition: string }>(`
      SELECT pg_get_indexdef(index_class.oid) AS definition
      FROM pg_class index_class
      JOIN pg_index ON pg_index.indexrelid = index_class.oid
      JOIN pg_class table_class ON table_class.oid = pg_index.indrelid
      WHERE table_class.relname = 'customers'
        AND index_class.relname = '${customerConstraints.ownerProfileLowerCodeUnique}'
    `);

    expect(indexes).toHaveLength(1);
    expect(indexes[0]!.definition).toContain('CREATE UNIQUE INDEX');
    expect(indexes[0]!.definition).toContain('owner_profile_id');
    expect(indexes[0]!.definition).toContain('lower(TRIM(BOTH FROM code))');
  });

  it('enforces trimmed customer code uniqueness without collapsing separators in Postgres', async () => {
    await postgres!.query(`
      INSERT INTO "user" ("id", "name", "email", "email_verified", "created_at", "updated_at")
      VALUES ('user_customer_code_trim', 'Owner', 'trimmed-code@example.test', false, now(), now())
    `);
    await postgres!.query(`
      INSERT INTO "owner_profiles" ("id", "user_id", "preferred_language", "default_currency", "created_at", "updated_at")
      VALUES ('profile_customer_code_trim', 'user_customer_code_trim', 'en', 'USD', now(), now())
    `);
    await postgres!.query(`
      INSERT INTO "customers" ("id", "owner_profile_id", "name", "code", "phone_number", "created_at", "updated_at")
      VALUES
        ('customer_code_space', 'profile_customer_code_trim', 'Customer Space', 'C 104', '+90 555 100 00 01', now(), now()),
        ('customer_code_dash', 'profile_customer_code_trim', 'Customer Dash', 'C-104', '+90 555 100 00 02', now(), now()),
        ('customer_code_plain', 'profile_customer_code_trim', 'Customer Plain', 'C104', '+90 555 100 00 03', now(), now())
    `);

    await expect(
      postgres!.query(`
        INSERT INTO "customers" ("id", "owner_profile_id", "name", "code", "phone_number", "created_at", "updated_at")
        VALUES ('customer_code_trimmed_duplicate', 'profile_customer_code_trim', 'Customer Duplicate', ' c 104 ', '+90 555 100 00 04', now(), now())
      `),
    ).rejects.toMatchObject({
      code: '23505',
      constraint: customerConstraints.ownerProfileLowerCodeUnique,
    });
  });
});
