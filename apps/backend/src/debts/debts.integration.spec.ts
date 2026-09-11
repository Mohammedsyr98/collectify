import {
  debtListResponseSchema,
  debtResponseSchema,
} from '@collectify/contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { getSetCookie, toCookieHeader } from '../test-support/http-cookies';
import {
  startIntegrationPostgres,
  type IntegrationBackend,
  type IntegrationPostgres,
} from '../test-support/integration-postgres';
import { createOwnerAuthClient } from '../test-support/owner-auth-client';
import { getIstanbulBusinessDate } from './debt-timing';

describe('debt routes', () => {
  let postgres: IntegrationPostgres | undefined;
  let backend: IntegrationBackend | undefined;
  let ownerAuth: ReturnType<typeof createOwnerAuthClient> | undefined;

  beforeAll(async () => {
    postgres = await startIntegrationPostgres();
    backend = await postgres.startBackend();
    ownerAuth = createOwnerAuthClient(backend.baseUrl);
  });

  beforeEach(async () => {
    await postgres!.reset();
  });

  afterAll(async () => {
    await backend?.app.close();
    await postgres?.stop();
  });

  it('creates a durable one-payment debt and retrieves it from the customer list', async () => {
    const owner = await signUpOwner('debt-owner@example.com');
    await insertCustomer(owner.ownerProfileId);

    const createResponse = await fetch(
      `${backend!.baseUrl}/customers/customer_debt/debts`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: owner.cookieHeader,
        },
        body: JSON.stringify({
          description: 'Website redesign',
          totalAmount: '125.50',
          currency: 'USD',
          paymentPlan: {
            type: 'onePayment',
            dueDate: '2026-09-30',
          },
        }),
      },
    );

    expect(createResponse.status).toBe(201);
    const created = debtResponseSchema.parse(await createResponse.json());
    expect(created).toMatchObject({
      customerId: 'customer_debt',
      description: 'Website redesign',
      totalAmount: '125.50',
      currency: 'USD',
      paymentPlanType: 'onePayment',
      scheduleItems: [
        {
          position: 1,
          amount: '125.50',
          dueDate: '2026-09-30',
        },
      ],
    });

    const listResponse = await fetch(
      `${backend!.baseUrl}/customers/customer_debt/debts`,
      {
        headers: {
          cookie: owner.cookieHeader,
        },
      },
    );

    expect(listResponse.status).toBe(200);
    const list = debtListResponseSchema.parse(await listResponse.json());
    expect(list).toMatchObject({
      items: [created],
      page: 1,
      pageSize: 5,
      totalItems: 1,
      totalPages: 1,
    });

    const scheduleRows = await postgres!.query<{
      debt_id: string;
      position: number;
      amount: string;
    }>(`
      SELECT "debt_id", "position", "amount"
      FROM "debt_schedule_items"
      WHERE "debt_id" = $1
    `, [created.id]);

    expect(scheduleRows).toEqual([
      {
        debt_id: created.id,
        position: 1,
        amount: '125.50',
      },
    ]);
  });

  it('returns the Istanbul timing for a debt schedule item', async () => {
    const owner = await signUpOwner('debt-timing-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    const dueDate = '2999-01-01';

    const response = await fetch(
      `${backend!.baseUrl}/customers/customer_debt/debts`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: owner.cookieHeader,
        },
        body: JSON.stringify({
          description: 'Timing debt',
          totalAmount: '125.50',
          currency: 'USD',
          paymentPlan: {
            type: 'onePayment',
            dueDate,
          },
        }),
      },
    );

    expect(response.status).toBe(201);
    const created = await response.json();

    expect(created.scheduleItems[0]).toMatchObject({
      dueDate,
      timing: 'upcoming',
    });
  });

  it('returns due-today and overdue timing for listed debts', async () => {
    const owner = await signUpOwner('debt-timing-list-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    await insertDebt({
      id: 'debt_timing_today',
      createdAt: '2026-09-07 10:00:00',
      dueDate: getIstanbulBusinessDate(new Date()),
    });
    await insertDebt({
      id: 'debt_timing_overdue',
      createdAt: '2026-09-06 10:00:00',
      dueDate: '1900-01-01',
    });

    const response = await fetch(
      `${backend!.baseUrl}/customers/customer_debt/debts`,
      {
        headers: {
          cookie: owner.cookieHeader,
        },
      },
    );

    expect(response.status).toBe(200);
    const list = debtListResponseSchema.parse(await response.json());

    expect(
      list.items.map((debt) => [
        debt.id,
        debt.scheduleItems[0].timing,
      ]),
    ).toEqual([
      ['debt_timing_today', 'dueToday'],
      ['debt_timing_overdue', 'overdue'],
    ]);
  });

  it('lists only the newest five debts with truthful pagination metadata', async () => {
    const owner = await signUpOwner('debt-page-owner@example.com');
    await insertCustomer(owner.ownerProfileId);

    for (const debt of [
      { id: 'debt_page_001', createdAt: '2026-09-01 10:00:00' },
      { id: 'debt_page_002', createdAt: '2026-09-02 10:00:00' },
      { id: 'debt_page_003', createdAt: '2026-09-03 10:00:00' },
      { id: 'debt_page_004', createdAt: '2026-09-04 10:00:00' },
      { id: 'debt_page_005', createdAt: '2026-09-05 10:00:00' },
      { id: 'debt_page_006', createdAt: '2026-09-05 10:00:00' },
    ]) {
      await insertDebt(debt);
    }

    const response = await fetch(
      `${backend!.baseUrl}/customers/customer_debt/debts`,
      {
        headers: {
          cookie: owner.cookieHeader,
        },
      },
    );

    expect(response.status).toBe(200);
    const list = debtListResponseSchema.parse(await response.json());

    expect(list.items.map((debt) => debt.id)).toEqual([
      'debt_page_006',
      'debt_page_005',
      'debt_page_004',
      'debt_page_003',
      'debt_page_002',
    ]);
    expect(list).toMatchObject({
      page: 1,
      pageSize: 5,
      totalItems: 6,
      totalPages: 2,
    });
  });

  it('returns the same not-found response for missing and non-owned customers', async () => {
    const firstOwner = await signUpOwner('debt-first-owner@example.com');
    const secondOwner = await signUpOwner('debt-second-owner@example.com');
    await insertCustomer(firstOwner.ownerProfileId);

    const missingResponse = await fetch(
      `${backend!.baseUrl}/customers/missing/debts`,
      {
        headers: {
          cookie: firstOwner.cookieHeader,
        },
      },
    );
    const nonOwnedResponse = await fetch(
      `${backend!.baseUrl}/customers/customer_debt/debts`,
      {
        headers: {
          cookie: secondOwner.cookieHeader,
        },
      },
    );

    expect(missingResponse.status).toBe(404);
    expect(nonOwnedResponse.status).toBe(404);
    await expect(missingResponse.json()).resolves.toEqual({
      code: 'CUSTOMER_NOT_FOUND',
      message: 'Customer was not found.',
    });
    await expect(nonOwnedResponse.json()).resolves.toEqual({
      code: 'CUSTOMER_NOT_FOUND',
      message: 'Customer was not found.',
    });
  });

  it('does not expose one owner’s debts to another owner', async () => {
    const firstOwner = await signUpOwner('debt-isolation-first@example.com');
    const secondOwner = await signUpOwner('debt-isolation-second@example.com');
    await insertCustomer(firstOwner.ownerProfileId, {
      id: 'customer_isolation_first',
      code: 'DEBT-FIRST',
    });
    await insertCustomer(secondOwner.ownerProfileId, {
      id: 'customer_isolation_second',
      code: 'DEBT-SECOND',
    });
    await insertDebt({
      id: 'debt_isolation_first',
      customerId: 'customer_isolation_first',
      createdAt: '2026-09-05 10:00:00',
    });

    const firstOwnerResponse = await fetch(
      `${backend!.baseUrl}/customers/customer_isolation_first/debts`,
      {
        headers: {
          cookie: firstOwner.cookieHeader,
        },
      },
    );
    const secondOwnerResponse = await fetch(
      `${backend!.baseUrl}/customers/customer_isolation_first/debts`,
      {
        headers: {
          cookie: secondOwner.cookieHeader,
        },
      },
    );

    expect(firstOwnerResponse.status).toBe(200);
    expect(
      debtListResponseSchema.parse(await firstOwnerResponse.json()).items.map(
        (debt) => debt.id,
      ),
    ).toEqual(['debt_isolation_first']);
    expect(secondOwnerResponse.status).toBe(404);
    await expect(secondOwnerResponse.json()).resolves.toEqual({
      code: 'CUSTOMER_NOT_FOUND',
      message: 'Customer was not found.',
    });
  });

  it('rolls back the debt when schedule insertion fails', async () => {
    await postgres!.query(`
      CREATE FUNCTION fail_debt_schedule_insert()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NEW.amount = 999.99::numeric THEN
          RAISE EXCEPTION 'Injected schedule insert failure'
            USING ERRCODE = 'P0001';
        END IF;
        RETURN NEW;
      END;
      $$
    `);
    await postgres!.query(`
      CREATE TRIGGER debt_schedule_items_injected_failure
      BEFORE INSERT ON "debt_schedule_items"
      FOR EACH ROW
      EXECUTE FUNCTION fail_debt_schedule_insert()
    `);

    try {
      const owner = await signUpOwner('debt-rollback-owner@example.com');
      await insertCustomer(owner.ownerProfileId, {
        id: 'customer_rollback',
        code: 'DEBT-ROLLBACK',
      });

      const response = await fetch(
        `${backend!.baseUrl}/customers/customer_rollback/debts`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            cookie: owner.cookieHeader,
          },
          body: JSON.stringify({
            description: 'Injected failure debt',
            totalAmount: '999.99',
            currency: 'USD',
            paymentPlan: {
              type: 'onePayment',
              dueDate: '2026-09-30',
            },
          }),
        },
      );

      expect(response.status).toBe(500);

      const remainingDebts = await postgres!.query<{ count: number }>(
        'SELECT count(*)::int AS count FROM "debts" WHERE "customer_id" = $1',
        ['customer_rollback'],
      );
      const remainingScheduleItems = await postgres!.query<{ count: number }>(
        `
          SELECT count(*)::int AS count
          FROM "debt_schedule_items"
          JOIN "debts" ON "debts"."id" = "debt_schedule_items"."debt_id"
          WHERE "debts"."customer_id" = $1
        `,
        ['customer_rollback'],
      );

      expect(remainingDebts).toEqual([{ count: 0 }]);
      expect(remainingScheduleItems).toEqual([{ count: 0 }]);
    } finally {
      await postgres!.query(
        'DROP TRIGGER debt_schedule_items_injected_failure ON "debt_schedule_items"',
      );
      await postgres!.query('DROP FUNCTION fail_debt_schedule_insert()');
    }
  });

  async function signUpOwner(
    email: string,
  ): Promise<{ cookieHeader: string; ownerProfileId: string }> {
    const response = await ownerAuth!.signUpOwner({
      name: 'Owner',
      email,
      password: 'password123',
      preferredLanguage: 'en',
      defaultCurrency: 'USD',
    });

    expect(response.status).toBe(200);

    const [ownerProfile] = await postgres!.query<{ id: string }>(
      `
        SELECT "owner_profiles"."id"
        FROM "owner_profiles"
        JOIN "user" ON "user"."id" = "owner_profiles"."user_id"
        WHERE "user"."email" = $1
      `,
      [email],
    );

    expect(ownerProfile).toBeDefined();

    return {
      cookieHeader: toCookieHeader(getSetCookie(response.headers)),
      ownerProfileId: ownerProfile!.id,
    };
  }

  function insertCustomer(
    ownerProfileId: string,
    {
      code = 'DEBT-001',
      id = 'customer_debt',
    }: { code?: string; id?: string } = {},
  ): Promise<unknown[]> {
    return postgres!.query(
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
        VALUES ($1, $2, $3, $4, $5, now(), now())
      `,
      [id, ownerProfileId, 'Debt Customer', code, '+90 555 123 45 67'],
    );
  }

  async function insertDebt({
    customerId = 'customer_debt',
    createdAt,
    dueDate = '2026-09-30',
    id,
  }: {
    customerId?: string;
    createdAt: string;
    dueDate?: string;
    id: string;
  }): Promise<void> {
    await postgres!.query(
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
        VALUES ($1, $2, 'Page debt', '125.50', 'USD', $3::timestamp, $3::timestamp)
      `,
      [id, customerId, createdAt],
    );

    await postgres!.query(
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
        VALUES ($1, $2, 1, '125.50', $3::date, $4::timestamp, $4::timestamp)
      `,
      [`${id}_schedule`, id, dueDate, createdAt],
    );
  }
});
