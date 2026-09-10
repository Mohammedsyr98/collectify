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

  function insertCustomer(ownerProfileId: string): Promise<unknown[]> {
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
      [
        'customer_debt',
        ownerProfileId,
        'Debt Customer',
        'DEBT-001',
        '+90 555 123 45 67',
      ],
    );
  }

  async function insertDebt({
    createdAt,
    id,
  }: {
    createdAt: string;
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
        VALUES ($1, 'customer_debt', 'Page debt', '125.50', 'USD', $2::timestamp, $2::timestamp)
      `,
      [id, createdAt],
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
        VALUES ($1, $2, 1, '125.50', '2026-09-30'::date, $3::timestamp, $3::timestamp)
      `,
      [`${id}_schedule`, id, createdAt],
    );
  }
});
