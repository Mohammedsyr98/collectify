import {
  customerApiErrorCode,
  customerErrorResponseSchema,
  paymentApiErrorCode,
  paymentErrorResponseSchema,
  paymentTargetListResponseSchema,
} from '@collectify/contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { getSetCookie, toCookieHeader } from '../test-support/http-cookies';
import {
  startIntegrationPostgres,
  type IntegrationBackend,
  type IntegrationPostgres,
} from '../test-support/integration-postgres';
import { createOwnerAuthClient } from '../test-support/owner-auth-client';

describe('payment target routes', () => {
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

  it('returns eligible unpaid and partially paid schedule items with debt and plan context', async () => {
    const owner = await signUpOwner('payment-target-list-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    await insertDebt();
    await insertPayment({
      id: 'payment_target_paid',
      scheduleItemId: 'payment_target_item_1',
      amount: '100.00',
      idempotencyKey: '10000000-0000-4000-8000-000000000101',
    });
    await insertPayment({
      id: 'payment_target_partial',
      scheduleItemId: 'payment_target_item_2',
      amount: '25.00',
      idempotencyKey: '10000000-0000-4000-8000-000000000102',
    });

    const response = await fetch(
      `${backend!.baseUrl}/customers/payment_target_customer/payment-targets`,
      { headers: { cookie: owner.cookieHeader } },
    );

    expect(response.status).toBe(200);
    const rawBody = await response.json();

    expect(rawBody.items[0]).not.toHaveProperty('debtRemainingAmount');
    expect(rawBody.items[0].plan).not.toHaveProperty('itemCount');
    expect(rawBody.items[1]).not.toHaveProperty('debtRemainingAmount');
    expect(rawBody.items[1].plan).not.toHaveProperty('itemCount');

    const body = paymentTargetListResponseSchema.parse(rawBody);

    expect(body).toMatchObject({
      page: 1,
      pageSize: 10,
      totalItems: 2,
      totalPages: 1,
      items: [
        {
          scheduleItemId: 'payment_target_item_2',
          debtId: 'payment_target_debt',
          debtDescription: 'Installment debt',
          currency: 'USD',
          debtVersion: 1,
          amount: '100.00',
          remainingAmount: '75.00',
          dueDate: '2026-10-02',
          paymentState: 'partiallyPaid',
          plan: { type: 'installment', position: 2 },
        },
        {
          scheduleItemId: 'payment_target_item_3',
          debtId: 'payment_target_debt',
          debtDescription: 'Installment debt',
          currency: 'USD',
          debtVersion: 1,
          amount: '100.00',
          remainingAmount: '100.00',
          dueDate: '2026-10-03',
          paymentState: 'unpaid',
          plan: { type: 'installment', position: 3 },
        },
      ],
    });
  });

  it('filters payment targets by debt description and calculates pagination metadata from the matching targets', async () => {
    const owner = await signUpOwner('payment-target-search-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    await insertDebt();
    await insertOnePaymentDebt({
      debtId: 'non_matching_debt',
      scheduleItemId: 'non_matching_item',
      description: 'Office chairs',
    });

    const response = await fetch(
      `${backend!.baseUrl}/customers/payment_target_customer/payment-targets?search=installment`,
      { headers: { cookie: owner.cookieHeader } },
    );

    expect(response.status).toBe(200);
    const body = paymentTargetListResponseSchema.parse(await response.json());

    expect(body.items.map(({ scheduleItemId }) => scheduleItemId)).toEqual([
      'payment_target_item_1',
      'payment_target_item_2',
      'payment_target_item_3',
    ]);
    expect(body).toMatchObject({
      page: 1,
      pageSize: 10,
      totalItems: 3,
      totalPages: 1,
    });
  });

  it('filters payment targets by payment state and calculates pagination metadata from the matching targets', async () => {
    const owner = await signUpOwner('payment-target-state-filter-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    await insertDebt();
    await insertPayment({
      id: 'payment_target_paid_for_state_filter',
      scheduleItemId: 'payment_target_item_1',
      amount: '100.00',
      idempotencyKey: '10000000-0000-4000-8000-000000000103',
    });
    await insertPayment({
      id: 'payment_target_partial_for_state_filter',
      scheduleItemId: 'payment_target_item_2',
      amount: '25.00',
      idempotencyKey: '10000000-0000-4000-8000-000000000104',
    });

    const expectations = [
      {
        paymentState: 'unpaid',
        scheduleItemId: 'payment_target_item_3',
      },
      {
        paymentState: 'partiallyPaid',
        scheduleItemId: 'payment_target_item_2',
      },
    ] as const;

    for (const expectation of expectations) {
      const response = await fetch(
        `${backend!.baseUrl}/customers/payment_target_customer/payment-targets?paymentState=${expectation.paymentState}`,
        { headers: { cookie: owner.cookieHeader } },
      );

      expect(response.status).toBe(200);
      const body = paymentTargetListResponseSchema.parse(await response.json());

      expect(body.items.map(({ scheduleItemId }) => scheduleItemId)).toEqual([
        expectation.scheduleItemId,
      ]);
      expect(body).toMatchObject({
        page: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      });
    }
  });

  it('returns payment-target pages in due-date and installment order with accurate pagination metadata', async () => {
    const owner = await signUpOwner('payment-target-pagination-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    await insertTwelveItemDebtForPagination();

    const firstPageResponse = await fetch(
      `${backend!.baseUrl}/customers/payment_target_customer/payment-targets`,
      { headers: { cookie: owner.cookieHeader } },
    );

    expect(firstPageResponse.status).toBe(200);
    const firstPage = paymentTargetListResponseSchema.parse(await firstPageResponse.json());

    expect(firstPage.items.map(({ scheduleItemId }) => scheduleItemId)).toEqual([
      'pagination_item_12',
      'pagination_item_11',
      'pagination_item_10',
      'pagination_item_09',
      'pagination_item_08',
      'pagination_item_07',
      'pagination_item_06',
      'pagination_item_05',
      'pagination_item_04',
      'pagination_item_03',
    ]);
    expect(firstPage).toMatchObject({
      page: 1,
      pageSize: 10,
      totalItems: 12,
      totalPages: 2,
    });

    const secondPageResponse = await fetch(
      `${backend!.baseUrl}/customers/payment_target_customer/payment-targets?page=2`,
      { headers: { cookie: owner.cookieHeader } },
    );

    expect(secondPageResponse.status).toBe(200);
    const secondPage = paymentTargetListResponseSchema.parse(await secondPageResponse.json());

    expect(secondPage.items.map(({ scheduleItemId }) => scheduleItemId)).toEqual([
      'pagination_item_01',
      'pagination_item_02',
    ]);
    expect(secondPage).toMatchObject({
      page: 2,
      pageSize: 10,
      totalItems: 12,
      totalPages: 2,
    });
  });

  it('returns one-payment plan context for a debt with a single schedule item', async () => {
    const owner = await signUpOwner('one-payment-target-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    await insertOnePaymentDebt({
      debtId: 'one_payment_target_debt',
      scheduleItemId: 'one_payment_target_item',
      description: 'One-payment debt',
    });

    const response = await fetch(
      `${backend!.baseUrl}/customers/payment_target_customer/payment-targets`,
      { headers: { cookie: owner.cookieHeader } },
    );

    expect(response.status).toBe(200);
    const body = paymentTargetListResponseSchema.parse(await response.json());

    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      scheduleItemId: 'one_payment_target_item',
      debtId: 'one_payment_target_debt',
      plan: { type: 'onePayment' },
    });
    expect(body.items[0]!.plan).toEqual({ type: 'onePayment' });
  });

  it('returns an empty page for an owned customer with no payment targets', async () => {
    const owner = await signUpOwner('empty-payment-target-owner@example.com');
    await insertCustomer(owner.ownerProfileId);

    const response = await fetch(
      `${backend!.baseUrl}/customers/payment_target_customer/payment-targets`,
      { headers: { cookie: owner.cookieHeader } },
    );

    expect(response.status).toBe(200);
    expect(paymentTargetListResponseSchema.parse(await response.json())).toEqual({
      items: [],
      page: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
    });
  });

  it('returns customer-not-found when the customer does not exist', async () => {
    const owner = await signUpOwner('missing-payment-target-customer-owner@example.com');

    const response = await fetch(
      `${backend!.baseUrl}/customers/missing_payment_target_customer/payment-targets`,
      { headers: { cookie: owner.cookieHeader } },
    );

    expect(response.status).toBe(404);
    const body = customerErrorResponseSchema.parse(await response.json());
    expect(body.code).toBe(customerApiErrorCode.customerNotFound);
  });

  it('returns customer-not-found when the customer belongs to another owner', async () => {
    const customerOwner = await signUpOwner('payment-target-customer-owner@example.com');
    const otherOwner = await signUpOwner('payment-target-other-owner@example.com');
    await insertCustomer(customerOwner.ownerProfileId);

    const response = await fetch(
      `${backend!.baseUrl}/customers/payment_target_customer/payment-targets`,
      { headers: { cookie: otherOwner.cookieHeader } },
    );

    expect(response.status).toBe(404);
    const body = customerErrorResponseSchema.parse(await response.json());
    expect(body.code).toBe(customerApiErrorCode.customerNotFound);
  });

  it('rejects a malformed payment-target page query with a validation error', async () => {
    const owner = await signUpOwner('invalid-payment-target-page-owner@example.com');

    const response = await fetch(
      `${backend!.baseUrl}/customers/payment_target_customer/payment-targets?page=invalid`,
      { headers: { cookie: owner.cookieHeader } },
    );

    expect(response.status).toBe(400);
    const body = paymentErrorResponseSchema.parse(await response.json());
    expect(body.code).toBe(paymentApiErrorCode.validationError);
    expect(body.fieldErrors?.page).toEqual([expect.any(String)]);
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
        'payment_target_customer',
        ownerProfileId,
        'Payment Target Customer',
        'PAYMENT-TARGET',
        '+90 555 123 45 67',
      ],
    );
  }

  async function insertDebt(): Promise<void> {
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
        VALUES ($1, $2, $3, $4, $5, now(), now())
      `,
      ['payment_target_debt', 'payment_target_customer', 'Installment debt', '300.00', 'USD'],
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
        VALUES
          ($1, $4, 1, '100.00', '2026-10-01'::date, now(), now()),
          ($2, $4, 2, '100.00', '2026-10-02'::date, now(), now()),
          ($3, $4, 3, '100.00', '2026-10-03'::date, now(), now())
      `,
      [
        'payment_target_item_1',
        'payment_target_item_2',
        'payment_target_item_3',
        'payment_target_debt',
      ],
    );
  }

  async function insertOnePaymentDebt(input: {
    debtId: string;
    scheduleItemId: string;
    description: string;
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
        VALUES ($1, $2, $3, '50.00', 'USD', now(), now())
      `,
      [input.debtId, 'payment_target_customer', input.description],
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
        VALUES ($1, $2, 1, '50.00', '2026-10-04'::date, now(), now())
      `,
      [input.scheduleItemId, input.debtId],
    );
  }

  async function insertTwelveItemDebtForPagination(): Promise<void> {
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
        VALUES ($1, $2, $3, '1200.00', 'USD', now(), now())
      `,
      ['pagination_debt', 'payment_target_customer', 'Pagination debt'],
    );

    const insertionOrder = [1, 12, 2, 11, 3, 10, 4, 9, 5, 8, 6, 7];

    for (const position of insertionOrder) {
      const dueDay = position <= 2 ? 11 : 13 - position;
      const itemId = `pagination_item_${position.toString().padStart(2, '0')}`;
      const dueDate = `2026-11-${dueDay.toString().padStart(2, '0')}`;

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
          VALUES ($1, $2, $3, '100.00', $4::date, now(), now())
        `,
        [itemId, 'pagination_debt', position, dueDate],
      );
    }
  }

  function insertPayment(input: {
    id: string;
    scheduleItemId: string;
    amount: string;
    idempotencyKey: string;
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
        VALUES ($1, $2, $3, '2026-09-15'::date, $4::uuid, $1, now(), now())
      `,
      [input.id, input.scheduleItemId, input.amount, input.idempotencyKey],
    );
  }
});
