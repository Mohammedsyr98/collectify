import {
  customerApiErrorCode,
  customerErrorResponseSchema,
  paymentApiErrorCode,
  paymentErrorResponseSchema,
  paymentHistoryListResponseSchema,
} from '@collectify/contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  createIntegrationDatabase,
  startIntegrationBackend,
  type IntegrationBackend,
  type IntegrationDatabase,
} from '../../test-support/integration-test-support';
import { createOwnerAuthClient } from '../../test-support/owner-auth-client';
import {
  createPaymentTestHelpers,
  type PaymentTestContext,
} from './payment-integration-test-support';

describe('payment history route', () => {
  let database: IntegrationDatabase | undefined;
  let backend: IntegrationBackend | undefined;
  let ownerAuth: ReturnType<typeof createOwnerAuthClient> | undefined;
  let context: PaymentTestContext;

  beforeAll(async () => {
    database = createIntegrationDatabase();
    backend = await startIntegrationBackend();
    ownerAuth = createOwnerAuthClient(backend.baseUrl);
    context = {
      database,
      backend,
      ownerAuth,
    };
  });

  beforeEach(async () => {
    await database!.reset();
  });

  afterAll(async () => {
    await backend?.app.close();
  });

  it('returns the newest 10 payments with current debt and installment context', async () => {
    const helpers = createPaymentTestHelpers(() => context);
    const owner = await helpers.signUpOwner('payment-history-owner@example.com');
    await helpers.insertCustomer(owner.ownerProfileId, {
      id: 'payment_history_customer',
    });
    await helpers.insertDebt({
      id: 'payment_history_debt',
      customerId: 'payment_history_customer',
      totalAmount: '200.00',
      currency: 'EUR',
      version: 4,
      scheduleItems: [
        {
          id: 'payment_history_schedule_1',
          amount: '100.00',
          dueDate: '2026-10-30',
        },
        {
          id: 'payment_history_schedule_2',
          amount: '100.00',
          dueDate: '2026-11-30',
        },
      ],
    });
    await insertHistoryPayments(database!, {
      count: 11,
      scheduleItemId: 'payment_history_schedule_2',
    });

    const response = await fetch(
      `${backend!.baseUrl}/customers/payment_history_customer/payments`,
      { headers: { cookie: owner.cookieHeader } },
    );

    expect(response.status).toBe(200);
    const body = paymentHistoryListResponseSchema.parse(await response.json());

    expect(body.items.map(({ id }) => id)).toEqual([
      'history_payment_11',
      'history_payment_10',
      'history_payment_09',
      'history_payment_08',
      'history_payment_07',
      'history_payment_06',
      'history_payment_05',
      'history_payment_04',
      'history_payment_03',
      'history_payment_02',
    ]);
    expect(body).toMatchObject({
      pageSize: 10,
      totalItems: 11,
      nextCursor: expect.any(String),
    });
    expect(body.items[0]).toEqual({
      id: 'history_payment_11',
      scheduleItemId: 'payment_history_schedule_2',
      debtId: 'payment_history_debt',
      debtDescription: 'Payment debt',
      debtVersion: 4,
      amount: '1.00',
      currency: 'EUR',
      paymentDate: '2026-10-11',
      note: 'Newest payment note',
      plan: { type: 'installment', position: 2, total: 2 },
    });
  });

  it('uses the cursor boundary when a newer payment is inserted between pages', async () => {
    const helpers = createPaymentTestHelpers(() => context);
    const owner = await helpers.signUpOwner('payment-history-cursor-owner@example.com');
    await helpers.insertCustomer(owner.ownerProfileId, {
      id: 'payment_history_cursor_customer',
    });
    await helpers.insertDebt({
      id: 'payment_history_cursor_debt',
      customerId: 'payment_history_cursor_customer',
      totalAmount: '100.00',
      scheduleItems: [
        {
          id: 'payment_history_cursor_schedule',
          amount: '100.00',
          dueDate: '2026-10-30',
        },
      ],
    });
    await insertHistoryPayments(database!, {
      count: 12,
      scheduleItemId: 'payment_history_cursor_schedule',
    });

    const firstResponse = await fetch(
      `${backend!.baseUrl}/customers/payment_history_cursor_customer/payments`,
      { headers: { cookie: owner.cookieHeader } },
    );
    const firstPage = paymentHistoryListResponseSchema.parse(
      await firstResponse.json(),
    );

    expect(firstPage.nextCursor).toEqual(expect.any(String));
    await insertSingleHistoryPayment(database!, {
      id: 'history_payment_newer',
      scheduleItemId: 'payment_history_cursor_schedule',
      paymentDate: '2026-10-31',
      createdAt: '2026-10-31 10:00:00.000000',
      idempotencyKey: '20000000-0000-4000-8000-999999999999',
    });

    const olderResponse = await fetch(
      `${backend!.baseUrl}/customers/payment_history_cursor_customer/payments?cursor=${encodeURIComponent(firstPage.nextCursor!)}`,
      { headers: { cookie: owner.cookieHeader } },
    );

    expect(olderResponse.status).toBe(200);
    const olderPage = paymentHistoryListResponseSchema.parse(
      await olderResponse.json(),
    );

    expect(olderPage.items.map(({ id }) => id)).toEqual([
      'history_payment_02',
      'history_payment_01',
    ]);
    expect(olderPage.nextCursor).toBeNull();
    expect(
      firstPage.items.some((item) =>
        olderPage.items.some((olderItem) => olderItem.id === item.id),
      ),
    ).toBe(false);
  });

  it('rejects a malformed opaque cursor as a validation error', async () => {
    const helpers = createPaymentTestHelpers(() => context);
    const owner = await helpers.signUpOwner('payment-history-invalid-cursor@example.com');
    await helpers.insertCustomer(owner.ownerProfileId, {
      id: 'payment_history_invalid_cursor_customer',
    });

    const response = await fetch(
      `${backend!.baseUrl}/customers/payment_history_invalid_cursor_customer/payments?cursor=not-a-valid-cursor`,
      { headers: { cookie: owner.cookieHeader } },
    );

    expect(response.status).toBe(400);
    const body = paymentErrorResponseSchema.parse(await response.json());
    expect(body.code).toBe(paymentApiErrorCode.validationError);
    expect(body.fieldErrors?.cursor).toEqual([expect.any(String)]);
  });

  it('orders equal payment dates and creation timestamps by descending ID', async () => {
    const helpers = createPaymentTestHelpers(() => context);
    const owner = await helpers.signUpOwner('payment-history-ties@example.com');
    await helpers.insertCustomer(owner.ownerProfileId, {
      id: 'payment_history_ties_customer',
    });
    await helpers.insertDebt({
      id: 'payment_history_ties_debt',
      customerId: 'payment_history_ties_customer',
      scheduleItems: [
        {
          id: 'payment_history_ties_schedule',
          amount: '100.00',
          dueDate: '2026-10-30',
        },
      ],
    });

    for (const [index, id] of ['payment_tie_a', 'payment_tie_c', 'payment_tie_b'].entries()) {
      await insertSingleHistoryPayment(database!, {
        id,
        scheduleItemId: 'payment_history_ties_schedule',
        paymentDate: '2026-10-20',
        createdAt: '2026-10-20 10:00:00.123456',
        idempotencyKey: `30000000-0000-4000-8000-${(index + 1).toString().padStart(12, '0')}`,
      });
    }

    const response = await fetch(
      `${backend!.baseUrl}/customers/payment_history_ties_customer/payments`,
      { headers: { cookie: owner.cookieHeader } },
    );
    const body = paymentHistoryListResponseSchema.parse(await response.json());

    expect(body.items.map(({ id }) => id)).toEqual([
      'payment_tie_c',
      'payment_tie_b',
      'payment_tie_a',
    ]);
    expect(body.items.every(({ plan }) => plan.type === 'onePayment')).toBe(true);
  });

  it('returns an empty page for an owned customer without payments', async () => {
    const helpers = createPaymentTestHelpers(() => context);
    const owner = await helpers.signUpOwner('payment-history-empty@example.com');
    await helpers.insertCustomer(owner.ownerProfileId, {
      id: 'payment_history_empty_customer',
    });

    const response = await fetch(
      `${backend!.baseUrl}/customers/payment_history_empty_customer/payments`,
      { headers: { cookie: owner.cookieHeader } },
    );

    expect(response.status).toBe(200);
    expect(paymentHistoryListResponseSchema.parse(await response.json())).toEqual({
      items: [],
      pageSize: 10,
      totalItems: 0,
      nextCursor: null,
    });
  });

  it('isolates another owner customer behind the same not-found response as a missing customer', async () => {
    const helpers = createPaymentTestHelpers(() => context);
    const customerOwner = await helpers.signUpOwner('payment-history-customer-owner@example.com');
    const otherOwner = await helpers.signUpOwner('payment-history-other-owner@example.com');
    await helpers.insertCustomer(customerOwner.ownerProfileId, {
      id: 'payment_history_private_customer',
    });

    for (const customerId of [
      'payment_history_private_customer',
      'payment_history_missing_customer',
    ]) {
      const response = await fetch(
        `${backend!.baseUrl}/customers/${customerId}/payments`,
        { headers: { cookie: otherOwner.cookieHeader } },
      );

      expect(response.status).toBe(404);
      const body = customerErrorResponseSchema.parse(await response.json());
      expect(body.code).toBe(customerApiErrorCode.customerNotFound);
    }
  });
});

async function insertHistoryPayments(
  database: IntegrationDatabase,
  input: { count: number; scheduleItemId: string },
): Promise<void> {
  for (let sequence = 1; sequence <= input.count; sequence += 1) {
    const paddedSequence = sequence.toString().padStart(2, '0');
    const paymentDate = `2026-10-${paddedSequence}`;
    const idempotencySuffix = sequence.toString().padStart(12, '0');

    await database.query(
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
        VALUES ($1, $2, '1.00', $3::date, $4, $5::uuid, $1, $6::timestamp, $6::timestamp)
      `,
      [
        `history_payment_${paddedSequence}`,
        input.scheduleItemId,
        paymentDate,
        sequence === input.count ? 'Newest payment note' : null,
        `20000000-0000-4000-8000-${idempotencySuffix}`,
        `2026-10-${paddedSequence} 10:00:00.000000`,
      ],
    );
  }
}

function insertSingleHistoryPayment(
  database: IntegrationDatabase,
  input: {
    id: string;
    scheduleItemId: string;
    paymentDate: string;
    createdAt: string;
    idempotencyKey: string;
  },
): Promise<unknown[]> {
  return database.query(
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
      VALUES ($1, $2, '1.00', $3::date, $4::uuid, $1, $5::timestamp, $5::timestamp)
    `,
    [
      input.id,
      input.scheduleItemId,
      input.paymentDate,
      input.idempotencyKey,
      input.createdAt,
    ],
  );
}
