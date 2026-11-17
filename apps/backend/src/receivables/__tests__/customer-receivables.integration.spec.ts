import type { Currency } from '@collectify/contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  createIntegrationDatabase,
  startIntegrationBackend,
  type IntegrationBackend,
  type IntegrationDatabase,
} from '../../test-support/integration-test-support';
import { createOwnerAuthClient } from '../../test-support/owner-auth-client';
import { CustomerReceivables } from '../customer-receivables';

describe('customer receivables', () => {
  const asOf = new Date('2026-11-16T12:00:00.000Z');

  let database: IntegrationDatabase | undefined;
  let backend: IntegrationBackend | undefined;
  let ownerAuth: ReturnType<typeof createOwnerAuthClient> | undefined;
  let customerReceivables: CustomerReceivables | undefined;

  beforeAll(async () => {
    database = createIntegrationDatabase();
    backend = await startIntegrationBackend();
    ownerAuth = createOwnerAuthClient(backend.baseUrl);
    customerReceivables = backend.app.get(CustomerReceivables);
  });

  beforeEach(async () => {
    await database!.reset();
  });

  afterAll(async () => {
    await backend?.app.close();
  });

  it('reports zero remaining and overdue amounts for a fully paid past-due debt', async () => {
    const ownerProfileId = await signUpOwner(
      'receivables-paid-overdue-owner@example.com',
    );
    const customerId = 'customer_paid_overdue';
    const scheduleItemId = 'schedule_paid_overdue';
    await insertCustomer(ownerProfileId, customerId);
    await insertDebt({
      id: 'debt_paid_overdue',
      customerId,
      totalAmount: '100.00',
      currency: 'USD',
      scheduleItems: [
        {
          id: scheduleItemId,
          amount: '100.00',
          dueDate: '2026-11-15',
        },
      ],
    });
    await insertPayment({
      id: 'payment_paid_overdue',
      scheduleItemId,
      amount: '100.00',
      idempotencyKey: '00000000-0000-4000-8000-000000000003',
    });

    const summariesByCustomerId = await customerReceivables!.summarizeCustomers({
      ownerProfileId,
      customerIds: [customerId],
      asOf,
      preferredCurrency: 'USD',
    });

    expect(summariesByCustomerId.get(customerId)).toEqual([
      {
        currency: 'USD',
        totalDebtAmount: '100.00',
        totalPaidAmount: '100.00',
        remainingAmount: '0.00',
        overdueAmount: '0.00',
      },
    ]);
  });

  it('aggregates multiple payments into exact balances independently per currency', async () => {
    const ownerProfileId = await signUpOwner(
      'receivables-payment-summary-owner@example.com',
    );
    const customerId = 'customer_payment_summary';
    await insertCustomer(ownerProfileId, customerId);
    await insertDebt({
      id: 'debt_summary_usd',
      customerId,
      totalAmount: '100.00',
      currency: 'USD',
      scheduleItems: [
        {
          id: 'schedule_summary_usd',
          amount: '100.00',
          dueDate: '2026-11-17',
        },
      ],
    });
    await insertDebt({
      id: 'debt_summary_eur',
      customerId,
      totalAmount: '80.00',
      currency: 'EUR',
      scheduleItems: [
        {
          id: 'schedule_summary_eur',
          amount: '80.00',
          dueDate: '2026-11-17',
        },
      ],
    });
    await insertPayment({
      id: 'payment_summary_usd_first',
      scheduleItemId: 'schedule_summary_usd',
      amount: '0.10',
      idempotencyKey: '00000000-0000-4000-8000-000000000004',
    });
    await insertPayment({
      id: 'payment_summary_usd_second',
      scheduleItemId: 'schedule_summary_usd',
      amount: '25.20',
      idempotencyKey: '00000000-0000-4000-8000-000000000005',
    });
    await insertPayment({
      id: 'payment_summary_eur',
      scheduleItemId: 'schedule_summary_eur',
      amount: '20.00',
      idempotencyKey: '00000000-0000-4000-8000-000000000006',
    });

    const summariesByCustomerId = await customerReceivables!.summarizeCustomers({
      ownerProfileId,
      customerIds: [customerId],
      asOf,
      preferredCurrency: 'USD',
    });
    const summaries = summariesByCustomerId.get(customerId) ?? [];
    const summariesByCurrency = Object.fromEntries(
      summaries.map(({ currency, ...summary }) => [currency, summary]),
    );

    expect(summaries).toHaveLength(2);
    expect(summariesByCurrency).toEqual({
      USD: {
        totalDebtAmount: '100.00',
        totalPaidAmount: '25.30',
        remainingAmount: '74.70',
        overdueAmount: '0.00',
      },
      EUR: {
        totalDebtAmount: '80.00',
        totalPaidAmount: '20.00',
        remainingAmount: '60.00',
        overdueAmount: '0.00',
      },
    });
  });

  it('orders currency summaries with the preferred currency first', async () => {
    const ownerProfileId = await signUpOwner(
      'receivables-currency-order-owner@example.com',
    );
    const customerId = 'customer_currency_order';
    await insertCustomer(ownerProfileId, customerId);
    await insertDebt({
      id: 'debt_order_eur',
      customerId,
      totalAmount: '40.00',
      currency: 'EUR',
      scheduleItems: [
        {
          id: 'schedule_order_eur',
          amount: '40.00',
          dueDate: '2026-11-17',
        },
      ],
    });
    await insertDebt({
      id: 'debt_order_usd',
      customerId,
      totalAmount: '25.50',
      currency: 'USD',
      scheduleItems: [
        {
          id: 'schedule_order_usd',
          amount: '25.50',
          dueDate: '2026-11-17',
        },
      ],
    });

    const summariesByCustomerId = await customerReceivables!.summarizeCustomers({
      ownerProfileId,
      customerIds: [customerId],
      asOf,
      preferredCurrency: 'USD',
    });

    expect(
      summariesByCustomerId.get(customerId)?.map(({ currency }) => currency),
    ).toEqual(['USD', 'EUR']);
  });

  it('sums past-due installments while excluding due-today and upcoming installments', async () => {
    const ownerProfileId = await signUpOwner(
      'receivables-installment-owner@example.com',
    );
    const customerId = 'customer_installment_summary';
    await insertCustomer(ownerProfileId, customerId);
    await insertDebt({
      id: 'debt_installment_summary',
      customerId,
      totalAmount: '100.00',
      currency: 'USD',
      scheduleItems: [
        {
          id: 'schedule_past_due_first',
          amount: '20.00',
          dueDate: '2026-11-14',
        },
        {
          id: 'schedule_past_due_second',
          amount: '30.00',
          dueDate: '2026-11-15',
        },
        {
          id: 'schedule_due_today',
          amount: '25.00',
          dueDate: '2026-11-16',
        },
        {
          id: 'schedule_upcoming',
          amount: '25.00',
          dueDate: '2026-11-17',
        },
      ],
    });

    const summariesByCustomerId = await customerReceivables!.summarizeCustomers({
      ownerProfileId,
      customerIds: [customerId],
      asOf,
      preferredCurrency: 'USD',
    });

    expect(summariesByCustomerId.get(customerId)).toEqual([
      {
        currency: 'USD',
        totalDebtAmount: '100.00',
        totalPaidAmount: '0.00',
        remainingAmount: '100.00',
        overdueAmount: '50.00',
      },
    ]);
  });

  async function signUpOwner(email: string): Promise<string> {
    const response = await ownerAuth!.signUpOwner({
      name: 'Owner',
      email,
      password: 'password123',
      preferredLanguage: 'en',
      defaultCurrency: 'USD',
    });

    if (response.status !== 200) {
      throw new Error(`Owner sign-up failed with status ${response.status}`);
    }

    const [ownerProfile] = await database!.query<{ id: string }>(
      `
        SELECT "owner_profiles"."id"
        FROM "owner_profiles"
        JOIN "user" ON "user"."id" = "owner_profiles"."user_id"
        WHERE "user"."email" = $1
      `,
      [email],
    );

    if (!ownerProfile) {
      throw new Error(`Owner profile was not created for ${email}`);
    }

    return ownerProfile.id;
  }

  function insertCustomer(
    ownerProfileId: string,
    customerId: string,
  ): Promise<unknown[]> {
    return database!.query(
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
        VALUES ($1, $2, $3, $4, $5, $6::timestamp, $6::timestamp)
      `,
      [
        customerId,
        ownerProfileId,
        'Receivables Customer',
        customerId.toUpperCase(),
        '+90 555 123 45 67',
        '2026-11-01 10:00:00',
      ],
    );
  }

  async function insertDebt({
    id,
    customerId,
    totalAmount,
    currency,
    scheduleItems,
  }: {
    id: string;
    customerId: string;
    totalAmount: string;
    currency: Currency;
    scheduleItems: Array<{
      id: string;
      amount: string;
      dueDate: string;
    }>;
  }): Promise<void> {
    await database!.query(
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
        VALUES ($1, $2, $3, $4, $5, $6::timestamp, $6::timestamp)
      `,
      [
        id,
        customerId,
        'Receivables debt',
        totalAmount,
        currency,
        '2026-11-01 10:00:00',
      ],
    );

    for (const [index, scheduleItem] of scheduleItems.entries()) {
      await database!.query(
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
          VALUES ($1, $2, $3, $4, $5::date, $6::timestamp, $6::timestamp)
        `,
        [
          scheduleItem.id,
          id,
          index + 1,
          scheduleItem.amount,
          scheduleItem.dueDate,
          '2026-11-01 10:00:00',
        ],
      );
    }
  }

  function insertPayment({
    id,
    scheduleItemId,
    amount,
    idempotencyKey,
  }: {
    id: string;
    scheduleItemId: string;
    amount: string;
    idempotencyKey: string;
  }): Promise<unknown[]> {
    return database!.query(
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
        VALUES ($1, $2, $3, '2026-11-16'::date, $4::uuid, $1, now(), now())
      `,
      [id, scheduleItemId, amount, idempotencyKey],
    );
  }
});
