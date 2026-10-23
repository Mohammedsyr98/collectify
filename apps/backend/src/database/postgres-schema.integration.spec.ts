import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  startIntegrationPostgres,
  type IntegrationPostgres,
} from '../test-support/integration-postgres';
import {
  customerConstraints,
  debtConstraints,
  paymentConstraints,
  paymentIndexes,
  paymentTriggers,
} from './schema';

describe('Postgres migrations', () => {
  let postgres: IntegrationPostgres | undefined;

  beforeAll(async () => {
    postgres = await startIntegrationPostgres();
  });

  afterAll(async () => {
    await postgres?.stop();
  });

  it('stores a payment fact for an existing schedule item', async () => {
    await insertDebtCustomer('payment_persistence');
    await insertDebtFixture(
      'debt_payment_persistence_schema',
      'customer_payment_persistence',
    );
    await insertScheduleFixture({
      id: 'schedule_payment_persistence_schema',
      debtId: 'debt_payment_persistence_schema',
      amount: '100.00',
    });

    await postgres!.query(
      `
        INSERT INTO "payments" (
          "id",
          "schedule_item_id",
          "amount",
          "payment_date",
          "note",
          "idempotency_key",
          "request_fingerprint",
          "created_at",
          "updated_at"
        )
        VALUES ($1, $2, $3, $4::date, $5, $6::uuid, $7, now(), now())
      `,
      [
        'payment_persistence_schema',
        'schedule_payment_persistence_schema',
        '50.00',
        '2026-10-16',
        'Initial payment',
        '11111111-1111-4111-8111-111111111111',
        'normalized-payment-request-fingerprint',
      ],
    );

    const payments = await postgres!.query<{
      id: string;
      schedule_item_id: string;
      amount: string;
      payment_date: string;
      note: string | null;
      idempotency_key: string;
      request_fingerprint: string;
    }>(
      `
        SELECT
          "id",
          "schedule_item_id",
          "amount",
          "payment_date"::text,
          "note",
          "idempotency_key"::text,
          "request_fingerprint"
        FROM "payments"
        WHERE "id" = $1
      `,
      ['payment_persistence_schema'],
    );

    expect(payments).toEqual([
      {
        id: 'payment_persistence_schema',
        schedule_item_id: 'schedule_payment_persistence_schema',
        amount: '50.00',
        payment_date: '2026-10-16',
        note: 'Initial payment',
        idempotency_key: '11111111-1111-4111-8111-111111111111',
        request_fingerprint: 'normalized-payment-request-fingerprint',
      },
    ]);
  });

  it('rejects a non-positive payment amount at the database boundary', async () => {
    await insertDebtCustomer('payment_amount_constraint');
    await insertDebtFixture(
      'debt_payment_amount_constraint_schema',
      'customer_payment_amount_constraint',
    );
    await insertScheduleFixture({
      id: 'schedule_payment_amount_constraint_schema',
      debtId: 'debt_payment_amount_constraint_schema',
      amount: '100.00',
    });

    await expect(
      postgres!.query(
        `
          INSERT INTO "payments" (
            "id",
            "schedule_item_id",
            "amount",
            "payment_date",
            "idempotency_key",
            "request_fingerprint",
            "created_at",
            "updated_at"
          )
          VALUES ($1, $2, $3, $4::date, $5::uuid, $6, now(), now())
        `,
        [
          'payment_amount_constraint_schema',
          'schedule_payment_amount_constraint_schema',
          '0.00',
          '2026-10-16',
          '22222222-2222-4222-8222-222222222222',
          'payment-amount-constraint-fingerprint',
        ],
      ),
    ).rejects.toMatchObject({
      code: '23514',
      constraint: paymentConstraints.amountPositive,
    });
  });

  it('rejects a payment note longer than 500 characters', async () => {
    await insertDebtCustomer('payment_note_constraint');
    await insertDebtFixture(
      'debt_payment_note_constraint_schema',
      'customer_payment_note_constraint',
    );
    await insertScheduleFixture({
      id: 'schedule_payment_note_constraint_schema',
      debtId: 'debt_payment_note_constraint_schema',
      amount: '100.00',
    });

    await expect(
      postgres!.query(
        `
          INSERT INTO "payments" (
            "id",
            "schedule_item_id",
            "amount",
            "payment_date",
            "note",
            "idempotency_key",
            "request_fingerprint",
            "created_at",
            "updated_at"
          )
          VALUES ($1, $2, $3, $4::date, $5, $6::uuid, $7, now(), now())
        `,
        [
          'payment_note_constraint_schema',
          'schedule_payment_note_constraint_schema',
          '10.00',
          '2026-10-16',
          'x'.repeat(501),
          '33333333-3333-4333-8333-333333333333',
          'payment-note-constraint-fingerprint',
        ],
      ),
    ).rejects.toMatchObject({
      code: '23514',
      constraint: paymentConstraints.noteMaxLength,
    });
  });

  it('rejects duplicate payment idempotency keys', async () => {
    await insertDebtCustomer('payment_idempotency_constraint');
    await insertDebtFixture(
      'debt_payment_idempotency_constraint_schema',
      'customer_payment_idempotency_constraint',
    );
    await insertScheduleFixture({
      id: 'schedule_payment_idempotency_constraint_schema',
      debtId: 'debt_payment_idempotency_constraint_schema',
      amount: '100.00',
    });

    await insertPaymentFixture({
      id: 'payment_idempotency_first_schema',
      scheduleItemId: 'schedule_payment_idempotency_constraint_schema',
      amount: '10.00',
      idempotencyKey: '44444444-4444-4444-8444-444444444444',
      requestFingerprint: 'payment-idempotency-first-fingerprint',
    });

    await expect(
      insertPaymentFixture({
        id: 'payment_idempotency_duplicate_schema',
        scheduleItemId: 'schedule_payment_idempotency_constraint_schema',
        amount: '20.00',
        idempotencyKey: '44444444-4444-4444-8444-444444444444',
        requestFingerprint: 'payment-idempotency-duplicate-fingerprint',
      }),
    ).rejects.toMatchObject({
      code: '23505',
      constraint: paymentConstraints.idempotencyKeyUnique,
    });
  });

  it('restricts deleting a schedule item referenced by a payment', async () => {
    await insertDebtCustomer('payment_schedule_delete_constraint');
    await insertDebtFixture(
      'debt_payment_schedule_delete_constraint_schema',
      'customer_payment_schedule_delete_constraint',
    );
    await insertScheduleFixture({
      id: 'schedule_payment_delete_constraint_schema',
      debtId: 'debt_payment_schedule_delete_constraint_schema',
      amount: '100.00',
    });
    await insertPaymentFixture({
      id: 'payment_schedule_delete_constraint_schema',
      scheduleItemId: 'schedule_payment_delete_constraint_schema',
      amount: '10.00',
      idempotencyKey: '55555555-5555-4555-8555-555555555555',
      requestFingerprint: 'payment-schedule-delete-fingerprint',
    });

    await expect(
      postgres!.query(
        'DELETE FROM "debt_schedule_items" WHERE "id" = $1',
        ['schedule_payment_delete_constraint_schema'],
      ),
    ).rejects.toMatchObject({
      code: '23503',
      constraint: paymentConstraints.scheduleItemForeignKey,
    });
  });

  it('rejects changing a payment request fingerprint', async () => {
    await insertDebtCustomer('payment_fingerprint_constraint');
    await insertDebtFixture(
      'debt_payment_fingerprint_constraint_schema',
      'customer_payment_fingerprint_constraint',
    );
    await insertScheduleFixture({
      id: 'schedule_payment_fingerprint_constraint_schema',
      debtId: 'debt_payment_fingerprint_constraint_schema',
      amount: '100.00',
    });
    await insertPaymentFixture({
      id: 'payment_fingerprint_constraint_schema',
      scheduleItemId: 'schedule_payment_fingerprint_constraint_schema',
      amount: '10.00',
      idempotencyKey: '66666666-6666-4666-8666-666666666666',
      requestFingerprint: 'payment-fingerprint-original',
    });

    await expect(
      postgres!.query(
        `
          UPDATE "payments"
          SET "request_fingerprint" = $1
          WHERE "id" = $2
        `,
        ['payment-fingerprint-changed', 'payment_fingerprint_constraint_schema'],
      ),
    ).rejects.toMatchObject({
      code: '23514',
      constraint: paymentTriggers.requestFingerprintImmutable,
    });
  });

  it('creates the payment history index with ordered keys and included amount', async () => {
    const indexes = await postgres!.query<{ definition: string }>(`
      SELECT pg_get_indexdef(index_class.oid) AS definition
      FROM pg_class index_class
      JOIN pg_index ON pg_index.indexrelid = index_class.oid
      JOIN pg_class table_class ON table_class.oid = pg_index.indrelid
      WHERE table_class.relname = 'payments'
        AND index_class.relname = '${paymentIndexes.scheduleItemHistory}'
    `);

    expect(indexes).toHaveLength(1);
    const definition = indexes[0]!.definition.replace(/\s+/g, ' ');
    expect(definition).toContain('CREATE INDEX');
    expect(definition).toContain(
      '(schedule_item_id, payment_date DESC, created_at DESC, id DESC) INCLUDE (amount)',
    );
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
      'debt_schedule_items',
      'debts',
      'owner_profiles',
      'payments',
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

  it('creates the debt customer lookup index', async () => {
    const indexes = await postgres!.query<{ definition: string }>(`
      SELECT pg_get_indexdef(index_class.oid) AS definition
      FROM pg_class index_class
      JOIN pg_index ON pg_index.indexrelid = index_class.oid
      JOIN pg_class table_class ON table_class.oid = pg_index.indrelid
      WHERE table_class.relname = 'debts'
        AND index_class.relname = '${debtConstraints.customerIdIndex}'
    `);

    expect(indexes).toHaveLength(1);
    expect(indexes[0]!.definition).toContain('CREATE INDEX');
    expect(indexes[0]!.definition).toContain('customer_id');
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

  it('rejects a zero debt total at the database boundary', async () => {
    await insertDebtCustomer('debt_constraint_total');

    await expect(
      postgres!.query(`
        INSERT INTO "debts" (
          "id",
          "customer_id",
          "description",
          "total_amount",
          "currency",
          "created_at",
          "updated_at"
        )
        VALUES (
          'debt_zero_total_schema',
          'customer_debt_constraint_total',
          'Invalid debt',
          '0.00',
          'USD',
          now(),
          now()
        )
      `),
    ).rejects.toMatchObject({
      code: '23514',
      constraint: debtConstraints.totalAmountPositive,
    });
  });

  it('rejects a non-positive debt schedule position', async () => {
    await insertDebtCustomer('debt_constraint_position');
    await insertDebtFixture(
      'debt_invalid_position_schema',
      'customer_debt_constraint_position',
    );

    await expect(
      insertScheduleFixture({
        id: 'schedule_invalid_position_schema',
        debtId: 'debt_invalid_position_schema',
        position: 0,
      }),
    ).rejects.toMatchObject({
      code: '23514',
      constraint: debtConstraints.schedulePositionPositive,
    });
  });

  it('rejects a non-positive debt schedule amount', async () => {
    await insertDebtCustomer('debt_constraint_amount');
    await insertDebtFixture(
      'debt_invalid_amount_schema',
      'customer_debt_constraint_amount',
    );

    await expect(
      insertScheduleFixture({
        id: 'schedule_invalid_amount_schema',
        debtId: 'debt_invalid_amount_schema',
        position: 2,
        amount: '0.00',
      }),
    ).rejects.toMatchObject({
      code: '23514',
      constraint: debtConstraints.scheduleAmountPositive,
    });
  });

  it('rejects duplicate debt schedule positions', async () => {
    await insertDebtCustomer('debt_constraint_unique');
    await insertDebtFixture(
      'debt_duplicate_position_schema',
      'customer_debt_constraint_unique',
    );
    await insertScheduleFixture({
      id: 'schedule_first_position_schema',
      debtId: 'debt_duplicate_position_schema',
    });

    await expect(
      insertScheduleFixture({
        id: 'schedule_duplicate_position_schema',
        debtId: 'debt_duplicate_position_schema',
      }),
    ).rejects.toMatchObject({
      code: '23505',
      constraint: debtConstraints.debtPositionUnique,
    });
  });

  it('declares debt schedule positions as an initially immediate deferrable unique constraint', async () => {
    const constraints = await postgres!.query<{
      constraint_type: string;
      is_deferrable: boolean;
      initially_deferred: boolean;
    }>(`
      SELECT
        contype AS constraint_type,
        condeferrable AS is_deferrable,
        condeferred AS initially_deferred
      FROM pg_constraint
      WHERE conrelid = 'debt_schedule_items'::regclass
        AND conname = '${debtConstraints.debtPositionUnique}'
    `);

    expect(constraints).toEqual([
      {
        constraint_type: 'u',
        is_deferrable: true,
        initially_deferred: false,
      },
    ]);
  });

  it('cascades customer deletion through debts and schedule items', async () => {
    await insertDebtCustomer('debt_constraint_cascade');
    await insertDebtFixture(
      'debt_customer_cascade_schema',
      'customer_debt_constraint_cascade',
    );
    await insertScheduleFixture({
      id: 'schedule_customer_cascade_schema',
      debtId: 'debt_customer_cascade_schema',
    });

    await postgres!.query(
      'DELETE FROM "customers" WHERE "id" = $1',
      ['customer_debt_constraint_cascade'],
    );

    const remainingDebts = await postgres!.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM "debts" WHERE "id" = $1',
      ['debt_customer_cascade_schema'],
    );
    const remainingScheduleItems = await postgres!.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM "debt_schedule_items" WHERE "id" = $1',
      ['schedule_customer_cascade_schema'],
    );

    expect(remainingDebts).toEqual([{ count: 0 }]);
    expect(remainingScheduleItems).toEqual([{ count: 0 }]);
  });

  async function insertDebtCustomer(suffix: string): Promise<void> {
    await postgres!.query(
      `
        INSERT INTO "user" (
          "id",
          "name",
          "email",
          "email_verified",
          "created_at",
          "updated_at"
        )
        VALUES ($1, 'Debt Owner', $2, false, now(), now())
      `,
      [`user_${suffix}`, `${suffix}@example.test`],
    );
    await postgres!.query(
      `
        INSERT INTO "owner_profiles" (
          "id",
          "user_id",
          "preferred_language",
          "default_currency",
          "created_at",
          "updated_at"
        )
        VALUES ($1, $2, 'en', 'USD', now(), now())
      `,
      [`profile_${suffix}`, `user_${suffix}`],
    );
    await postgres!.query(
      `
        INSERT INTO "customers" (
          "id",
          "owner_profile_id",
          "name",
          "code",
          "phone_number",
          "created_at",
          "updated_at"
        )
        VALUES ($1, $2, 'Debt Customer', $3, '+90 555 123 45 67', now(), now())
      `,
      [
        `customer_${suffix}`,
        `profile_${suffix}`,
        `DEBT-${suffix.toUpperCase()}`,
      ],
    );
  }

  function insertDebtFixture(
    id: string,
    customerId: string,
  ): Promise<unknown[]> {
    return postgres!.query(
      `
        INSERT INTO "debts" (
          "id",
          "customer_id",
          "description",
          "total_amount",
          "currency",
          "created_at",
          "updated_at"
        )
        VALUES ($1, $2, 'Fixture debt', '125.50', 'USD', now(), now())
      `,
      [id, customerId],
    );
  }

  function insertScheduleFixture({
    amount = '125.50',
    debtId,
    dueDate = '2026-09-30',
    id,
    position = 1,
  }: {
    amount?: string;
    debtId: string;
    dueDate?: string;
    id: string;
    position?: number;
  }): Promise<unknown[]> {
    return postgres!.query(
      `
        INSERT INTO "debt_schedule_items" (
          "id",
          "debt_id",
          "position",
          "amount",
          "due_date",
          "created_at",
          "updated_at"
        )
        VALUES ($1, $2, $3, $4, $5::date, now(), now())
      `,
      [id, debtId, position, amount, dueDate],
    );
  }

  function insertPaymentFixture({
    amount,
    id,
    idempotencyKey,
    requestFingerprint,
    scheduleItemId,
  }: {
    amount: string;
    id: string;
    idempotencyKey: string;
    requestFingerprint: string;
    scheduleItemId: string;
  }): Promise<unknown[]> {
    return postgres!.query(
      `
        INSERT INTO "payments" (
          "id",
          "schedule_item_id",
          "amount",
          "payment_date",
          "idempotency_key",
          "request_fingerprint",
          "created_at",
          "updated_at"
        )
        VALUES ($1, $2, $3, '2026-10-16'::date, $4::uuid, $5, now(), now())
      `,
      [id, scheduleItemId, amount, idempotencyKey, requestFingerprint],
    );
  }
});
